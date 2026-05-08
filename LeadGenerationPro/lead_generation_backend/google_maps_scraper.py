import logging
from typing import List, Dict, Any
from playwright.async_api import async_playwright, Page
from datetime import datetime
import re
from models import ScrapeRequest, ScrapeResponse
import random

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def is_google_maps_url(url: str) -> bool:
    """Check if URL is a Google Maps URL."""
    url_lower = url.lower()
    return 'google.com/maps' in url_lower or 'maps.google.com' in url_lower

def extract_search_query_from_url(url: str) -> str:
    """Extract search query from Google Maps URL if present."""
    patterns = [
        r'[?&]q=([^&]+)',
        r'[?&]query=([^&]+)',
        r'/search/([^/]+)',
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            from urllib.parse import unquote
            return unquote(match.group(1).replace('+', ' '))
    return "businesses"

def normalize_field_name(field_name: str) -> str:
    """Normalize field name to match Google Maps canonical fields."""
    field_lower = field_name.lower().strip().replace('_', '').replace(' ', '')
    field_mappings = {
        'name': ['name', 'businessname', 'placename', 'title'],
        'address': ['address', 'location', 'streetaddress', 'fulladdress'],
        'phone': ['phone', 'phonenumber', 'contact', 'telephone', 'tel'],
        'website': ['website', 'url', 'web', 'site', 'link'],
        'rating': ['rating', 'reviewsaverage', 'averagerating', 'score', 'stars'],
        'reviews_count': ['reviewscount', 'reviewcount', 'totalreviews', 'numberofreviews', 'numreviews'],
        'category': ['category', 'type', 'placetype', 'businesstype', 'kind'],
        'hours': ['hours', 'opensat', 'openinghours', 'businesshours', 'timing'],
        'description': ['description', 'introduction', 'about', 'overview', 'summary'],
    }
    for canonical, aliases in field_mappings.items():
        if field_lower in aliases:
            return canonical
    return None

async def extract_text_async(page: Page, xpath: str) -> str:
    """Async version of extract_text."""
    try:
        locator = page.locator(xpath)
        if await locator.count() > 0:
            return await locator.first.inner_text()
    except Exception as e:
        logger.warning(f"Failed to extract text for xpath {xpath}: {e}")
    return ""

async def wait_for_search_input(page: Page, timeout: int = 60000) -> bool:
    """
    Try multiple selectors to find the search input box.
    Returns True if found, False otherwise.
    """
    selectors = [
        '//input[@id="searchboxinput"]',                        # old Maps
        '//input[contains(@class,"UGojuc")]',                   # new Maps (from your HTML)
        '//input[@name="q"]',                                   # fallback by name attr
        '//form[contains(@class,"NhWQq")]//input',             # fallback by form class
        '//div[@role="search"]//input',                         # generic search role
    ]
    for selector in selectors:
        try:
            await page.wait_for_selector(selector, timeout=10000, state="visible")
            logger.info(f"Found search input with selector: {selector}")
            return selector
        except Exception:
            logger.debug(f"Selector not found: {selector}")
    return None

async def extract_google_maps_place(page: Page, field_mappings: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extract place data from Google Maps based on field mappings.
    Intelligently maps user field names to Google Maps XPaths.
    """
    xpath_library = {
        'name': '//div[@class="TIHn2 "]//h1[@class="DUwDvf lfPIob"]',
        'address': '//button[@data-item-id="address"]//div[contains(@class, "fontBodyMedium")]',
        'website': '//a[@data-item-id="authority"]//div[contains(@class, "fontBodyMedium")]',
        'phone': '//button[contains(@data-item-id, "phone:tel:")]//div[contains(@class, "fontBodyMedium")]',
        'reviews_count': '//div[@class="TIHn2 "]//div[@class="fontBodyMedium dmRWX"]//div//span//span//span[@aria-label]',
        'rating': '//div[@class="TIHn2 "]//div[@class="fontBodyMedium dmRWX"]//div//span[@aria-hidden]',
        'category': '//div[@class="LBgpqf"]//button[@class="DkEaL "]',
        'hours': '//button[contains(@data-item-id, "oh")]//div[contains(@class, "fontBodyMedium")]',
        'description': '//div[@class="WeS02d fontBodyMedium"]//div[@class="PYvSYb "]',
    }

    place_data = {}

    for user_field_name, field_config in field_mappings.items():
        canonical_name = normalize_field_name(user_field_name)

        if field_config.selector and field_config.selector.strip():
            try:
                locator = page.locator(field_config.selector)
                if await locator.count() > 0:
                    if field_config.extract == 'href':
                        value = await locator.first.get_attribute('href')
                    elif field_config.extract == 'src':
                        value = await locator.first.get_attribute('src')
                    elif field_config.extract == 'html':
                        value = await locator.first.inner_html()
                    else:
                        value = await locator.first.inner_text()
                    place_data[user_field_name] = value if value else None
                else:
                    place_data[user_field_name] = None
            except Exception as e:
                logger.warning(f"Failed to extract custom selector for {user_field_name}: {e}")
                place_data[user_field_name] = None

        elif canonical_name and canonical_name in xpath_library:
            xpath = xpath_library[canonical_name]
            value = await extract_text_async(page, xpath)

            if canonical_name == 'reviews_count' and value:
                try:
                    value = value.replace('\xa0', '').replace('(', '').replace(')', '').replace(',', '')
                    value = int(value)
                except Exception:
                    pass

            elif canonical_name == 'rating' and value:
                try:
                    value = value.replace(' ', '').replace(',', '.')
                    value = float(value)
                except Exception:
                    pass

            elif canonical_name == 'hours' and value:
                if '⋅' in value:
                    parts = value.split('⋅')
                    value = parts[1].replace("\u202f", "").strip() if len(parts) > 1 else value

            place_data[user_field_name] = value if value else None
        else:
            logger.warning(f"Field '{user_field_name}' not supported by Google Maps scraper")
            place_data[user_field_name] = None

    return place_data


async def scrape_google_maps(request: ScrapeRequest) -> ScrapeResponse:
    """
    Scrape Google Maps using Playwright based on ScrapeRequest.
    Supports both auto-extraction and custom selectors.
    """
    logger.info(f"Starting Google Maps scraping for: {request.url}")

    places_data = []
    search_query = extract_search_query_from_url(str(request.url))
    max_items = request.max_items or 40
    logger.info(f"Search query: {search_query}, Max items: {max_items}")

    try:
        async with async_playwright() as p:
            import platform

            # ── Browser launch ──────────────────────────────────────────────
            launch_args = [
                "--no-sandbox",
                "--disable-blink-features=AutomationControlled",
                "--disable-dev-shm-usage",
            ]

            if platform.system() == "Windows":
                browser_path = r"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
                try:
                    browser = await p.chromium.launch(
                        executable_path=browser_path,
                        headless=True,
                        args=launch_args,
                    )
                except Exception:
                    browser = await p.chromium.launch(headless=True, args=launch_args)
            else:
                browser = await p.chromium.launch(headless=True, args=launch_args)

            # ── Context with realistic user-agent ──────────────────────────
            context = await browser.new_context(
                user_agent=(
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/124.0.0.0 Safari/537.36"
                ),
                viewport={"width": 1280, "height": 800},
                locale="en-US",
            )
            page = await context.new_page()

            # Hide webdriver flag
            await page.add_init_script(
                "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"
            )

            try:
                # ── Strategy 1: navigate directly to the search URL ────────
                # This skips filling the search box entirely when a proper
                # Maps search URL is provided.
                direct_url = str(request.url)
                navigated_directly = False

                if is_google_maps_url(direct_url) and '/search/' in direct_url or 'q=' in direct_url:
                    logger.info("Navigating directly to Maps search URL")
                    await page.goto(direct_url, wait_until="domcontentloaded", timeout=60000)
                    await page.wait_for_timeout(3000)
                    navigated_directly = True

                # ── Strategy 2: go to homepage and search ──────────────────
                if not navigated_directly:
                    logger.info("Navigating to Maps homepage and searching")
                    await page.goto(
                        "https://www.google.com/maps",
                        wait_until="domcontentloaded",
                        timeout=60000,
                    )
                    await page.wait_for_timeout(3000)

                    input_selector = await wait_for_search_input(page, timeout=60000)
                    if not input_selector:
                        raise Exception(
                            "Could not locate the Maps search input with any known selector"
                        )

                    await page.locator(input_selector).first.fill(search_query)
                    await page.keyboard.press("Enter")

                # ── Wait for listing links to appear ───────────────────────
                listing_xpath = '//a[contains(@href, "https://www.google.com/maps/place")]'
                try:
                    await page.wait_for_selector(listing_xpath, timeout=30000)
                except Exception:
                    # Fallback: wait for the results feed
                    await page.wait_for_selector('//div[@role="feed"]', timeout=30000)

                await page.wait_for_timeout(2000)

                # ── Scroll to load more results ────────────────────────────
                scrollable_element = page.locator('//div[@role="feed"]')
                previously_counted = 0
                scroll_attempts = 0
                max_scroll_attempts = 20

                while scroll_attempts < max_scroll_attempts:
                    await scrollable_element.evaluate(
                        'el => el.scrollBy(0, el.scrollHeight)'
                    )
                    await page.wait_for_timeout(random.uniform(3000, 4000))

                    found = await page.locator(listing_xpath).count()
                    logger.info(
                        f"Scroll attempt {scroll_attempts + 1}: "
                        f"Found {found} places (target: {max_items})"
                    )

                    if found >= max_items:
                        logger.info(f"Reached target of {max_items} places")
                        break

                    if found == previously_counted:
                        logger.info(f"No new results after scrolling. Total found: {found}")
                        break

                    previously_counted = found
                    scroll_attempts += 1

                # Check end-of-list marker
                end_message = await page.locator(
                    '//span[contains(text(), "reached the end")]'
                ).count()
                if end_message > 0:
                    logger.info("Reached end of available results")

                # ── Collect listings ───────────────────────────────────────
                listings = await page.locator(listing_xpath).all()
                listings = listings[:max_items]
                logger.info(f"Processing {len(listings)} places")

                # ── Extract detail data for each listing ───────────────────
                for idx, listing in enumerate(listings):
                    try:
                        parent = listing.locator("xpath=..")
                        await parent.click()

                        # Wait for the detail panel to load
                        detail_loaded = False
                        for detail_selector in [
                            '//div[@class="TIHn2 "]//h1[@class="DUwDvf lfPIob"]',
                            '//h1[contains(@class,"DUwDvf")]',
                            '//div[contains(@class,"TIHn2")]//h1',
                        ]:
                            try:
                                await page.wait_for_selector(
                                    detail_selector, timeout=15000
                                )
                                detail_loaded = True
                                break
                            except Exception:
                                continue

                        if not detail_loaded:
                            logger.warning(
                                f"Detail panel did not load for listing {idx + 1}, skipping"
                            )
                            continue

                        await page.wait_for_timeout(random.uniform(1500, 2000))

                        place_data = await extract_google_maps_place(page, request.field_mappings)
                        place_data['index'] = idx + 1
                        logger.info(f"place data : {place_data}")

                        if any(v for v in place_data.values() if v is not None and v != idx + 1):
                            places_data.append(place_data)
                        else:
                            logger.warning(f"No data found for listing {idx + 1}")

                    except Exception as e:
                        logger.warning(f"Failed to extract listing {idx + 1}: {e}")
                        continue

            finally:
                await context.close()
                await browser.close()

        return ScrapeResponse(
            entity_name=request.entity_name,
            url=str(request.url),
            scraped_at=datetime.now(),
            total_items=len(places_data),
            data=places_data,
            success=True,
            message=f"Successfully scraped {len(places_data)} places from Google Maps",
        )

    except Exception as e:
        logger.error(f"Google Maps scraping failed: {e}", exc_info=True)
        return ScrapeResponse(
            entity_name=request.entity_name,
            url=str(request.url),
            scraped_at=datetime.now(),
            total_items=0,
            data=[],
            success=False,
            message=f"Google Maps scraping failed: {str(e)}",
        )