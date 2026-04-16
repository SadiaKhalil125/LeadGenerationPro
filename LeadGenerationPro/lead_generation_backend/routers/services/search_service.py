"""
search_service.py
-----------------
Unified search provider for lead enrichment.

Priority:
  1. DuckDuckGo (free, no key required)
  2. SerpAPI  (Google results, requires SERPAPI_KEY in .env)

Both return the same normalised schema:
  { "title": str, "href": str, "body": str }

The caller in ai_enrichment_service.py just calls `search(query)` and
gets back a deduplicated list ready to be formatted into a Gemini prompt.
"""

import logging
from typing import List, Dict

from ddgs import DDGS

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# DuckDuckGo
# ---------------------------------------------------------------------------

def search_duckduckgo(query: str, max_results: int = 5) -> List[Dict[str, str]]:
    """
    Free search via DuckDuckGo. Returns normalised result dicts.
    """
    logger.info(f"[DDG] Searching: {query}")
    try:
        with DDGS() as ddgs:
            raw = list(ddgs.text(query, max_results=max_results))
        # ddgs already returns {"title", "href", "body"} — pass through
        return raw
    except Exception as e:
        logger.error(f"[DDG] Search failed: {e}")
        return []


# ---------------------------------------------------------------------------
# SerpAPI  (Google)
# ---------------------------------------------------------------------------

def search_serpapi(query: str, serpapi_key: str, max_results: int = 5) -> List[Dict[str, str]]:
    """
    Search via SerpAPI (Google engine). Returns normalised result dicts.
    Requires a valid SERPAPI_KEY.
    Uses the serpapi v1 SDK: serpapi.search()
    """
    logger.info(f"[SerpAPI] Searching: {query}")
    try:
        import serpapi

        params = {
            "engine": "google",
            "q": query,
            "api_key": serpapi_key,
            "num": max_results,
        }
        results = serpapi.search(params)

        return [
            {
                "title": r.get("title", ""),
                "href":  r.get("link", ""),
                "body":  r.get("snippet", ""),
            }
            for r in results.get("organic_results", [])
        ]
    except Exception as e:
        logger.error(f"[SerpAPI] Search failed: {e}")
        return []


# ---------------------------------------------------------------------------
# Combined: DDG first, SerpAPI as fallback
# ---------------------------------------------------------------------------

def search(query: str, serpapi_key: str = None, max_results: int = 5) -> List[Dict[str, str]]:
    """
    Search using SerpAPI (Google) if a key is provided.
    Falls back to DuckDuckGo (free) only if no key is available.
    """
    if serpapi_key:
        logger.info(f"[Search] Using SerpAPI (Google) for query: '{query}'")
        return search_serpapi(query, serpapi_key, max_results=max_results)
    
    logger.info(f"[Search] No SerpAPI key provided — falling back to DuckDuckGo")
    return search_duckduckgo(query, max_results=max_results)


# ---------------------------------------------------------------------------
# Formatting helper
# ---------------------------------------------------------------------------

def format_search_results(results: List[Dict[str, str]]) -> str:
    """
    Convert a list of result dicts into a human-readable string block
    suitable for injection into a Gemini prompt.
    """
    if not results:
        return "No search results found."

    lines = []
    for i, r in enumerate(results, 1):
        lines.append(
            f"Source {i}: {r.get('title')}\n"
            f"URL: {r.get('href')}\n"
            f"Snippet: {r.get('body')}\n"
        )
    return "\n".join(lines)
