import re
import time
import logging
from typing import Optional
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

# ── logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)

# ── regex patterns ────────────────────────────────────────────────────────────
EMAIL_RE = re.compile(
    r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}",
    re.IGNORECASE,
)

PHONE_RE = re.compile(
    r"""
    (?:
        \+?1?\s*                         # optional country code
        [\(\-\.]?                        # optional opening paren / dash / dot
        \d{3}                            # area code
        [\)\-\.\s]?                      # separator
        \d{3}                            # first 3 digits
        [\-\.\s]?                        # separator
        \d{4}                            # last 4 digits
    )
    """,
    re.VERBOSE,
)

# ── common fallback contact paths ─────────────────────────────────────────────
CONTACT_HINTS = [
    "/contact",
    "/contact-us",
    "/contact_us",
    "/contactus",
    # "/get-in-touch",
    # "/reach-us",
    # "/about/contact",
    # "/support/contact",
    # "/about-us",
    # "/support",
]

# ── keywords used to identify contact URLs inside a sitemap ──────────────────
CONTACT_KEYWORDS = {"contact", "reach", "get-in-touch", "getintouch", "contactus"}

# ── HTTP session ──────────────────────────────────────────────────────────────
SESSION = requests.Session()
SESSION.headers.update(
    {
        "User-Agent": (
            "Mozilla/5.0 (X11; Linux x86_64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/123.0 Safari/537.36"
        ),
        "Accept-Language": "en-US,en;q=0.9",
    }
)
TIMEOUT = 10  # Reduced to 10 seconds per request for faster background processing


# ── helpers ───────────────────────────────────────────────────────────────────

def _normalize(url: str) -> str:
    """Ensure the URL has a scheme."""
    url = url.strip()
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    return url.rstrip("/")


def _get(url: str) -> Optional[requests.Response]:
    """GET with error handling; returns None on failure."""
    try:
        resp = SESSION.get(url, timeout=TIMEOUT, allow_redirects=True)
        resp.raise_for_status()
        return resp
    except Exception as exc:
        log.debug("GET %s failed: %s", url, exc)
        return None


def _extract_emails(text: str) -> list[str]:
    """Return unique, de-noised email addresses found in text."""
    found = EMAIL_RE.findall(text)
    # Filter out common image/asset false-positives
    filtered = [
        e for e in found
        if not re.search(r"\.(png|jpg|jpeg|gif|svg|webp|css|js)$", e, re.I)
    ]
    return list(dict.fromkeys(filtered))  # preserve order, deduplicate


def _extract_phones(text: str) -> list[str]:
    """Return unique phone numbers found in text."""
    raw = PHONE_RE.findall(text)
    # Normalise whitespace and filter out numbers with < 10 digits
    cleaned = []
    for p in raw:
        digits = re.sub(r"\D", "", p)
        if len(digits) >= 10:
            cleaned.append(p.strip())
    return list(dict.fromkeys(cleaned))


def _is_contact_url(url: str) -> bool:
    path = urlparse(url).path.lower()
    return any(kw in path for kw in CONTACT_KEYWORDS)


# ── core logic ────────────────────────────────────────────────────────────────

def find_contact_url_in_sitemap(base_url: str) -> Optional[str]:
    """
    Fetch `base_url/sitemap.xml`, parse all <loc> entries, and return
    the first URL that looks like a contact page.
    Handles sitemap index files (nested sitemaps) one level deep.
    """
    sitemap_url = f"{base_url}/sitemap.xml"
    log.info("Fetching sitemap: %s", sitemap_url)
    resp = _get(sitemap_url)
    if resp is None:
        return None

    content_type = resp.headers.get("Content-Type", "")
    if "html" in content_type:
        log.debug("Sitemap returned HTML — probably a 404 page.")
        return None

    return _parse_sitemap_xml(resp.text, base_url)


def _parse_sitemap_xml(xml_text: str, base_url: str) -> Optional[str]:
    """Parse sitemap XML and return first contact-looking URL."""
    soup = BeautifulSoup(xml_text, "lxml-xml")

    # Sitemap index: recurse into child sitemaps
    sitemap_tags = soup.find_all("sitemap")
    if sitemap_tags:
        for tag in sitemap_tags:
            loc = tag.find("loc")
            if loc:
                child_resp = _get(loc.text.strip())
                if child_resp:
                    result = _parse_sitemap_xml(child_resp.text, base_url)
                    if result:
                        return result
        return None  # no contact URL found in any child sitemap

    # Regular sitemap
    for loc in soup.find_all("loc"):
        url = loc.text.strip()
        if _is_contact_url(url):
            return url

    return None


def find_contact_url_heuristic(base_url: str) -> Optional[str]:
    """Try common contact path heuristics."""
    for path in CONTACT_HINTS:
        url = urljoin(base_url + "/", path.lstrip("/"))
        log.info("Trying heuristic: %s", url)
        resp = _get(url)
        if resp is not None and "html" in resp.headers.get("Content-Type", ""):
            # Make sure it's not a redirect to the home page
            parsed_base = urlparse(base_url)
            parsed_resp = urlparse(resp.url)
            if parsed_resp.path not in ("/", ""):
                return resp.url  # follow redirects
    return None


def extract_contact_info(contact_url: str) -> tuple[list[str], list[str]]:
    """Visit the contact page and return (emails, phones)."""
    log.info("Scraping contact page: %s", contact_url)
    resp = _get(contact_url)
    if resp is None:
        return [], []

    soup = BeautifulSoup(resp.text, "html.parser")

    # --- emails: check mailto links first, then raw text ---
    emails: list[str] = []
    for tag in soup.find_all("a", href=True):
        href = tag.get("href", "")
        if href.startswith("mailto:"):
            addr = href[7:].split("?")[0].strip()
            if addr:
                emails.append(addr)

    # Also scan raw visible text
    page_text = soup.get_text(separator=" ")
    emails += _extract_emails(page_text)
    emails = list(dict.fromkeys(emails))

    # --- phones: check tel links first, then raw text ---
    phones: list[str] = []
    for tag in soup.find_all("a", href=True):
        href = tag.get("href", "")
        if href.startswith("tel:"):
            number = href[4:].strip()
            if number:
                phones.append(number)

    phones += _extract_phones(page_text)
    phones = list(dict.fromkeys(phones))

    # To be conservative, match User's request and logic, slice to first item
    return emails[:1], phones[:1]


def scrape_site(raw_url: str, delay: float = 1.0) -> dict:
    """
    Full pipeline for a single website URL.

    Returns:
        {
            "url": str,
            "contact_page": str | None,
            "emails": list[str],
            "phones": list[str],
            "error": str | None,
        }
    """
    base_url = _normalize(raw_url)
    result = {
        "url": base_url,
        "contact_page": None,
        "emails": [],
        "phones": [],
        "error": None,
    }

    try:
        # 1. Try heuristics first (often more reliable and direct)
        log.info("Trying heuristics for %s", base_url)
        contact_url = find_contact_url_heuristic(base_url)

        # 2. Fallback to sitemap if heuristics fail
        if not contact_url:
            log.info("Heuristics failed — trying sitemap for %s", base_url)
            contact_url = find_contact_url_in_sitemap(base_url)

        if not contact_url:
            log.warning("Could not find a contact page for %s", base_url)
            result["error"] = "contact page not found"
            return result

        result["contact_page"] = contact_url

        # 3. Extract contact info
        emails, phones = extract_contact_info(contact_url)
        result["emails"] = emails
        result["phones"] = phones

    except Exception as exc:
        log.exception("Unexpected error for %s: %s", base_url, exc)
        result["error"] = str(exc)

    finally:
        time.sleep(delay)  # be polite

    return result


def scrape_all(urls: list[str], delay: float = 1.0) -> list[dict]:
    """
    Scrape a list of website URLs and return aggregated results.
    """
    results = []
    total = len(urls)
    for i, url in enumerate(urls, 1):
        log.info("── [%d/%d] Processing: %s", i, total, url)
        result = scrape_site(url, delay=delay)
        results.append(result)
        log.info(
            "   Found → emails: %s | phones: %s",
            result["emails"] or "none",
            result["phones"] or "none",
        )
    return results
