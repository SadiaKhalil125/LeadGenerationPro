import logging
import asyncio
import re
from typing import Dict, Optional

import google.generativeai as genai

from .outreach_config import settings
from .search_service import search, format_search_results

# ---------------------------------------------------------------------------
# Setup
# ---------------------------------------------------------------------------

GEMINI_API_KEY = settings.GEMINI_API_KEY
genai.configure(api_key=GEMINI_API_KEY)

MODEL_NAME = "models/gemini-flash-latest"

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Regex (robust extraction layer)
# ---------------------------------------------------------------------------

EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")
PHONE_RE = re.compile(r"\+?\d[\d\s\-\(\)]{7,}")

# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def find_contact_info_via_search(
    name: str,
    company: str,
    domain: str,
) -> Dict[str, Optional[str]]:

    if not GEMINI_API_KEY:
        logger.error("Gemini API key missing")
        return _empty()

    query = f'"{company}" contact email OR phone site:{domain}'

    # Step 1: Search (SerpAPI)
    results = search(query, serpapi_key=settings.SERPAPI_KEY)
    context = format_search_results(results)
    print(context)
    logger.info(f"[Search] {len(results)} results found")

    # Step 2: Prompt Gemini (NO JSON mode)
    prompt = _build_prompt(name, company, domain, context)

    try:
        return await asyncio.to_thread(_call_gemini, prompt)
    except Exception as exc:
        logger.exception(f"AI fallback failed: {exc}")
        return _empty()


# ---------------------------------------------------------------------------
# Gemini call (SAFE VERSION)
# ---------------------------------------------------------------------------

def _call_gemini(prompt: str) -> Dict[str, Optional[str]]:
    try:
        model = genai.GenerativeModel(model_name=MODEL_NAME)

        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                temperature=0.0,
                max_output_tokens=512,
            )
        )

        if not response or not response.text:
            logger.error("Empty Gemini response")
            return _empty()

        text = response.text.strip()
        logger.info(f"[Gemini RAW] {text[:300]}")

        return _extract_from_text(text)

    except Exception as exc:
        logger.error(f"Gemini call failed: {exc}")
        return _empty()


# ---------------------------------------------------------------------------
# Prompt (simplified + stable)
# ---------------------------------------------------------------------------

def _build_prompt(name: str, company: str, domain: str, context: str) -> str:
    return f"""
Extract contact information from the search results.

Name: {name}
Company: {company}
Domain: {domain}

Search Results:
{context}

Rules:
- Use ONLY provided information
- Do NOT guess
- If not found, skip it

Return format (plain text only):
email: ...
phone: ...
"""


# ---------------------------------------------------------------------------
# Extraction layer (IMPORTANT FIX)
# ---------------------------------------------------------------------------

def _extract_from_text(text: str) -> Dict[str, Optional[str]]:
    email = _extract_email(text)
    phone = _extract_phone(text)

    return {
        "email": email,
        "phone": phone,
        "source": None
    }


def _extract_email(text: str) -> Optional[str]:
    match = EMAIL_RE.search(text)
    return match.group() if match else None


def _extract_phone(text: str) -> Optional[str]:
    match = PHONE_RE.search(text)
    if not match:
        return None

    phone = match.group()
    digits = re.sub(r"\D", "", phone)

    # filter garbage numbers
    if len(digits) < 10:
        return None

    return phone


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _empty() -> Dict[str, Optional[str]]:
    return {
        "email": None,
        "phone": None,
        "source": None
    }