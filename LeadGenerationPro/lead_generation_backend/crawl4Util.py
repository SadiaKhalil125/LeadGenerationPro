import json
import asyncio
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse
from crawl4ai import AsyncWebCrawler, CrawlerRunConfig, CacheMode, JsonCssExtractionStrategy
from models import ScrapeRequest, ScrapeResponse, FieldMapping, PaginationConfig, AuthConfig
from datetime import datetime

def build_paginated_url(base_url: str, page: int, pagination: PaginationConfig) -> str:
    """Build next page URL based on pagination type."""
    if pagination.type == "query_param":
        param = pagination.param_name or "page"
        parsed = urlparse(base_url)
        query = parse_qs(parsed.query)
        query[param] = [str(page)]
        new_query = urlencode(query, doseq=True)
        return urlunparse(parsed._replace(query=new_query))

    elif pagination.type == "offset":
        param = pagination.param_name or "offset"
        page_size = pagination.page_size or 10
        offset_value = (page - 1) * page_size
        parsed = urlparse(base_url)
        query = parse_qs(parsed.query)
        query[param] = [str(offset_value)]
        new_query = urlencode(query, doseq=True)
        return urlunparse(parsed._replace(query=new_query))

    elif pagination.type == "path":
        # e.g., pattern = "/page/{page}"
        pattern = pagination.path_pattern or "{page}"
        parsed = urlparse(base_url)
        new_path = parsed.path.rstrip('/') + pattern.replace("{page}", str(page))
        return urlunparse(parsed._replace(path=new_path))
    
    else:
        #fallback: original
        return base_url     


def build_extraction_schema(request: ScrapeRequest):
    # Filter out fields with empty selectors to avoid CSS parser errors
    # Empty selectors are used for Google Maps auto-extraction and should be handled by Google Maps scraper
    fields = [
        {
            "name": name,
            "selector": fm.selector,
            "type": fm.extract
        }
        for name, fm in request.field_mappings.items()
        if fm.selector and fm.selector.strip()  # Only include fields with non-empty selectors
    ]

    if not fields:
        raise ValueError("No valid field mappings with selectors provided for CSS scraping. Empty selectors are for Google Maps auto-extraction.")

    return {
        "name": request.entity_name,
        "baseSelector": request.container_selector or "body",
        "fields": fields
    }


def base_config(extraction_strategy, request: ScrapeRequest):
    return CrawlerRunConfig(
        cache_mode=CacheMode.BYPASS,
        extraction_strategy=extraction_strategy,
        page_timeout=(request.timeout * 1000) if request.timeout else 15000
    )


# Authentication helper - builds login JavaScript
def build_login_js(auth: AuthConfig) -> str:
    """Generate JavaScript for form login."""
    js = []
    js.append("(async () => {")
    
    # Fill username - try common selectors if not specified
    if auth.username_selector:
        js.append(f"  const userField = document.querySelector('{auth.username_selector}');")
    else:
        js.append(f"  const userField = document.querySelector('input[name=\"username\"], input[type=\"email\"], input[name=\"email\"], input[name=\"login\"]');")
    js.append(f"  if (userField) {{ userField.value = '{auth.username}'; userField.dispatchEvent(new Event('input', {{ bubbles: true }})); }}")
    
    # Fill password
    if auth.password_selector:
        js.append(f"  const passField = document.querySelector('{auth.password_selector}');")
    else:
        js.append(f"  const passField = document.querySelector('input[type=\"password\"]');")
    js.append(f"  if (passField) {{ passField.value = '{auth.password}'; passField.dispatchEvent(new Event('input', {{ bubbles: true }})); }}")
    
    # Submit form
    if auth.submit_selector:
        js.append(f"  const submitBtn = document.querySelector('{auth.submit_selector}');")
        js.append(f"  if (submitBtn) submitBtn.click();")
    else:
        js.append("  if (userField && userField.form) userField.form.submit();")
    
    js.append("  await new Promise(r => setTimeout(r, 5000));")  # Wait for redirect/login to process
    js.append("})();")
    return "\n".join(js)


# HELPERS: PAGINATION CONFIG BUILDERS

def apply_scroll_pagination(config, pagination):
    '''Scroll complete page (or upto given steps) to load all items first, then scrape.
       So that crawler doesn't keep scraping the same items at the top of the page after each scroll'''
    
    print("Handling infinite scroll")

    scroll_steps = pagination.scroll_steps or 15
    scroll_delay = 1

    js_scroll = f"""
        async function scrollPage() {{
            for (let i = 0; i < {scroll_steps}; i++) {{
                window.scrollTo(0, document.body.scrollHeight);
                await new Promise(r => setTimeout(r, {scroll_delay * 1000}));
            }}
        }}
        scrollPage();
    """

    config.session_id = "scroll_session"
    config.js_only = False
    config.wait_for = None
    config.js_code = js_scroll
    config.delay_before_return_html = scroll_steps * scroll_delay

    return config

def apply_button_click_pagination(config, pagination):
    '''Click again and again (upto click_steps or till button disappears) to load all items first, then scrape.
       So that crawler doesn't keep scraping the same items at the top of the page after each scroll'''
    
    print("Handling button/ajax click pagination")

    click_steps = pagination.click_steps if pagination.click_steps else 15     # total number of clicks to perform (hard-coded to avoid infinite loops)
    click_delay = 3      # seconds between clicks
    selector = pagination.button_selector

    js_click_loop = f"""
        async function clickButtonLoop() {{
            for (let i = 0; i < {click_steps}; i++) {{

                // Try up to 3 times to find the button
                let btn = null;
                for (let t = 0; t < 3; t++) {{
                    btn = document.querySelector("{selector}");
                    if (btn) break;
                    await new Promise(r => setTimeout(r, 1000)); 

                    // wait 1s before retry (bcz button may be taking time to load/appear)
                }}

                if (!btn) break;

                btn.click();
                await new Promise(r => setTimeout(r, {click_delay * 1000}));
            }}
        }}
        clickButtonLoop();
    """

    config.session_id = "btn_pg_session"
    config.js_only = False
    config.wait_for = None
    config.js_code = js_click_loop

    # total wait = number of clicks × delay per click
    config.delay_before_return_html = click_steps * click_delay
    return config


def get_target_url(request, pagination, page):
    if not pagination or (pagination.type in ["button_click", "ajax_click", "scroll"]):
        print(f"Fetching: {request.url}")
        return str(request.url)
    if (page>1):
        target = build_paginated_url(str(request.url), page, pagination)
    else:
        target=str(request.url) #use base url for first page

    print(f"Fetching page {page} from url: {target}")
    return target


# MAIN EXTRACTION FUNCTION
async def extract_website(request: ScrapeRequest) -> ScrapeResponse:

    schema = build_extraction_schema(request)
    extraction_strategy = JsonCssExtractionStrategy(schema, verbose=True)
    
    pagination = request.pagination_config
    page = pagination.start_page if pagination and pagination.start_page else 1

    all_data = []

    # Log pagination setup (unchanged)
    if pagination:
        print(f"📍 Pagination configured - Type: {pagination.type}, Start Page: {page}, Max Items: {request.max_items}")
        print(f"   ├─ Pagination details: {pagination}")
    else:
        print(f"📍 No pagination configured - Single page extraction only, Max Items: {request.max_items}")
    
    print(f"   └─ Starting loop with max_items={request.max_items}, page={page}, pagination={pagination is not None}")

    # Generate a unique session ID for this scrape job if authentication is needed
    session_id = f"scrape_session_{datetime.now().timestamp()}" if request.auth_config else None

    try:
        async with AsyncWebCrawler(verbose=True) as crawler:
            
            # ---- AUTHENTICATION HANDLING (only if auth_config exists) ----
            if request.auth_config:
                print(f"🔐 Authentication required for {request.auth_config.login_url}")
                try:
                    # Step 1: Login - creates session
                    login_config = CrawlerRunConfig(
                        session_id=session_id,
                        js_code=build_login_js(request.auth_config),
                        wait_for=request.auth_config.success_indicator or "body",
                        page_timeout=30000,
                        cache_mode=CacheMode.BYPASS
                    )
                    
                    # FIXED: url as first argument, config as second
                    login_result = await crawler.arun(
                        url=str(request.auth_config.login_url),
                        config=login_config
                    )
                    
                    if not login_result.success:
                        print(f"❌ Login failed: {login_result.error_message}")
                        print("⚠️  Continuing without authentication - may fail if content is protected")
                        session_id = None  # Reset session ID to avoid using failed auth session
                    else:
                        print("✅ Authentication successful, session established")
                        
                except Exception as e:
                    print(f"❌ Authentication error: {str(e)}")
                    print("⚠️  Continuing without authentication - may fail if content is protected")
                    session_id = None  # Reset session ID to avoid using failed auth session
            
            # ---- MAIN SCRAPING LOOP (identical to original for non-auth) ----
            while True:

                # ---- Base config (same as original base_config) ----
                scrape_config = CrawlerRunConfig(
                    cache_mode=CacheMode.BYPASS,
                    extraction_strategy=extraction_strategy,
                    page_timeout=(request.timeout * 1000) if request.timeout else 15000
                )
                
                # Add session ID ONLY if we have one from successful auth
                if session_id:
                    scrape_config.session_id = session_id

                # ---- Apply pagination logic (unchanged) ----
                if pagination:
                    if pagination.type == "scroll":
                        scrape_config = apply_scroll_pagination(scrape_config, pagination)
                    elif pagination.type in ["button_click", "ajax_click"]:
                        scrape_config = apply_button_click_pagination(scrape_config, pagination)

                # ---- Determine target URL (unchanged) ----
                target_url = get_target_url(request, pagination, page)
                
                # ---- FIXED: Run crawl with url as first arg, config as second ----
                result = await crawler.arun(
                    url=target_url,
                    config=scrape_config
                )

                # ---- Rest of the loop is COMPLETELY UNCHANGED ----
                if not result.success:
                    print(f"❌ Page {page} failed: {result.error_message}")
                    break

                page_data = json.loads(result.extracted_content) if result.extracted_content else []
                if not page_data:
                    print(f"⚠️ No more data found at page {page}")
                    break

                all_data.extend(page_data)
                print(f"✅ Page {page}: {len(page_data)} items (total={len(all_data)})")

                # ---- 1. Stop by max items ----
                if request.max_items and len(all_data) >= request.max_items:
                    all_data = all_data[:request.max_items]
                    print(f"   ✅ Condition 1: Reached max_items limit ({request.max_items}), stopping pagination")
                    break

                # ---- 2. Stop by pagination max pages ----
                if pagination and pagination.max_pages and page >= pagination.max_pages:
                    print(f"   ✅ Condition 2: Reached max_pages limit ({pagination.max_pages}), stopping pagination")
                    break
                
                # ---- 3. Scroll AND Click pagination runs only once ----
                if pagination and (pagination.type in ["button_click", "ajax_click", "scroll"]):
                    print(f"   ✅ Condition 3: {pagination.type} pagination complete (all items loaded in single crawl)")
                    break

                # ---- 4. No pagination? Only one iteration ----
                if not pagination:
                    print(f"   ✅ Condition 4: No pagination configured - stopping after first page")
                    break

                # ---- Continue to next page ----
                print(f"   ➡️  No break conditions met. Continuing to page {page + 1} (current items: {len(all_data)}, target: {request.max_items})")
                page += 1

            # ---- Clean up session if we created one ----
            if session_id:
                try:
                    await crawler.crawler_strategy.kill_session(session_id)
                    print("🧹 Session cleaned up")
                except:
                    pass

            # ---- Build response (unchanged) ----
            page_size = None
            if pagination and pagination.type == "scroll":
                page_size = len(all_data)/pagination.scroll_steps if pagination.scroll_steps else len(all_data)
            elif pagination and pagination.type in ["button_click", "ajax_click"]:
                page_size = len(all_data)/pagination.click_steps if pagination.click_steps else len(all_data)
            else:
                page_size = len(all_data)/page if page>0 else len(all_data)

            return ScrapeResponse(
                entity_name=request.entity_name,
                url=str(request.url),
                scraped_at=datetime.now(),
                total_items=len(all_data),
                data=all_data,
                success=True,
                message=f"Scraped {len(all_data)} items across {page} pages",
                page_size = int(page_size) if page_size else 0
            )

    except Exception as e:
        print(f"Error during scraping: {str(e)}")
        # Clean up session on error
        if 'session_id' in locals() and session_id and 'crawler' in locals():
            try:
                await crawler.crawler_strategy.kill_session(session_id)
            except:
                pass
        return ScrapeResponse(
            entity_name=request.entity_name,
            url=str(request.url),
            scraped_at=datetime.now(),
            total_items=0,
            data=[],
            success=False,
            message=f"Error during scraping: {str(e)}"
        )