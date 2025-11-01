import logging
from typing import List, Dict, Any
from playwright.async_api import async_playwright, Page
from datetime import datetime
import re
from models import ScrapeRequest, ScrapeResponse

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
    
    # Field aliases mapping
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
            return await locator.inner_text()
    except Exception as e:
        logger.warning(f"Failed to extract text for xpath {xpath}: {e}")
    return ""

async def extract_google_maps_place(page: Page, field_mappings: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extract place data from Google Maps based on field mappings.
    Intelligently maps user field names to Google Maps XPaths.
    """
    # Google Maps XPath definitions
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
        # Try to find canonical field name
        canonical_name = normalize_field_name(user_field_name)
        
        # Use custom selector if provided, otherwise use Google Maps XPath
        if field_config.selector and field_config.selector.strip():
            # User provided custom CSS selector - use Playwright's CSS selector
            try:
                locator = page.locator(field_config.selector)
                if await locator.count() > 0:
                    # Extract based on metadata type
                    if field_config.extract == 'href':
                        value = await locator.get_attribute('href')
                    elif field_config.extract == 'src':
                        value = await locator.get_attribute('src')
                    elif field_config.extract == 'html':
                        value = await locator.inner_html()
                    else:  # default to text
                        value = await locator.inner_text()
                    
                    place_data[user_field_name] = value if value else None
                else:
                    place_data[user_field_name] = None
            except Exception as e:
                logger.warning(f"Failed to extract custom selector for {user_field_name}: {e}")
                place_data[user_field_name] = None
        
        elif canonical_name and canonical_name in xpath_library:
            # Use Google Maps pre-defined XPath
            xpath = xpath_library[canonical_name]
            value = await extract_text_async(page, xpath)
            
            # Post-process specific fields
            if canonical_name == 'reviews_count' and value:
                try:
                    value = value.replace('\xa0', '').replace('(', '').replace(')', '').replace(',', '')
                    value = int(value)
                except:
                    pass
            
            elif canonical_name == 'rating' and value:
                try:
                    value = value.replace(' ', '').replace(',', '.')
                    value = float(value)
                except:
                    pass
            
            elif canonical_name == 'hours' and value:
                if '⋅' in value:
                    parts = value.split('⋅')
                    value = parts[1].replace("\u202f", "").strip() if len(parts) > 1 else value
            
            place_data[user_field_name] = value if value else None
        else:
            # Field not supported by Google Maps
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
            # Launch browser
            import platform
            if platform.system() == "Windows":
                browser_path = r"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
                try:
                    browser = await p.chromium.launch(executable_path=browser_path, headless=True)
                except:
                    browser = await p.chromium.launch(headless=True)
            else:
                browser = await p.chromium.launch(headless=True)
            
            page = await browser.new_page()
            
            try:
                # Navigate to Google Maps
                await page.goto("https://www.google.com/maps", timeout=60000)
                await page.wait_for_timeout(2000)
                
                # Search for the query
                await page.locator('//input[@id="searchboxinput"]').fill(search_query)
                await page.keyboard.press("Enter")
                await page.wait_for_selector('//a[contains(@href, "https://www.google.com/maps/place")]', timeout=30000)
                
                # Scroll within the results panel to load more listings
                # First, locate the scrollable results container
                await page.wait_for_timeout(2000)
                
                # The scrollable element is the left panel with results
                scrollable_element = page.locator('//div[@role="feed"]')
                
                previously_counted = 0
                scroll_attempts = 0
                max_scroll_attempts = 20
                
                while scroll_attempts < max_scroll_attempts:
                    # Scroll the results panel
                    await scrollable_element.evaluate('el => el.scrollBy(0, el.scrollHeight)')
                    await page.wait_for_timeout(3000)  # Increased wait time for loading
                    
                    found = await page.locator('//a[contains(@href, "https://www.google.com/maps/place")]').count()
                    logger.info(f"Scroll attempt {scroll_attempts + 1}: Found {found} places (target: {max_items})")
                    
                    # Stop if we have enough results
                    if found >= max_items:
                        logger.info(f"Reached target of {max_items} places")
                        break
                    
                    # Stop if no new results after scrolling
                    if found == previously_counted:
                        logger.info(f"No new results after scrolling. Total found: {found}")
                        break
                    
                    previously_counted = found
                    scroll_attempts += 1
                
                # Check if we hit "You've reached the end of the list"
                end_message = await page.locator('//span[contains(text(), "reached the end")]').count()
                if end_message > 0:
                    logger.info("Reached end of available results")
                
                # Get all listing elements
                listings = await page.locator('//a[contains(@href, "https://www.google.com/maps/place")]').all()
                listings = listings[:max_items]
                
                logger.info(f"Processing {len(listings)} places")
                
                # Extract data from each listing
                for idx, listing in enumerate(listings):
                    try:
                        # Click on the listing
                        parent = listing.locator("xpath=..")
                        await parent.click()
                        
                        # Wait for details to load
                        await page.wait_for_selector(
                            '//div[@class="TIHn2 "]//h1[@class="DUwDvf lfPIob"]',
                            timeout=100000000
                        )
                        await page.wait_for_timeout(1500)
                        
                        # Extract place data based on field mappings
                        place_data = await extract_google_maps_place(page, request.field_mappings)
                        
                        # Add index
                        place_data['index'] = idx + 1
                        logger.info(f'place data : {place_data}')
                        if place_data.get(list(request.field_mappings.keys())[0]) or any(v for v in place_data.values() if v is not None):
                            places_data.append(place_data)
                        else:
                            logger.warning(f"No data found for listing {idx + 1}")
                            
                    except Exception as e:
                        logger.warning(f"Failed to extract listing {idx + 1}: {e}")
                        continue
                
            finally:
                await browser.close()
        
        return ScrapeResponse(
            entity_name=request.entity_name,
            url=str(request.url),
            scraped_at=datetime.now(),
            total_items=len(places_data),
            data=places_data,
            success=True,
            message=f"Successfully scraped {len(places_data)} places from Google Maps"
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
            message=f"Google Maps scraping failed: {str(e)}"
        )