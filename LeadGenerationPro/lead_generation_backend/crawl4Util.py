import json
import asyncio
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse
from crawl4ai import AsyncWebCrawler, CrawlerRunConfig, CacheMode, JsonCssExtractionStrategy
from models import ScrapeRequest, ScrapeResponse, FieldMapping, PaginationConfig
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
    fields = [
        {
            "name": name,
            "selector": fm.selector,
            "type": fm.extract
        }
        for name, fm in request.field_mappings.items()
    ]

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


# def apply_button_click_pagination(config, pagination, page):
#     print(f"Handling button/ajax click pagination for page {page}")
#     if page == pagination.start_page:
#         # First page: standard load
#         config.session_id = "btn_pg_session"
#         config.js_only = False
#         config.js_code = None
#         config.wait_for = None
#         config.delay_before_return_html = 5
#     else:
#         click_selector = pagination.button_selector
#         js_click = f"""
#             const btn = document.querySelector("{click_selector}");
#             if (btn) btn.click();
#         """
#         config.session_id = "btn_pg_session"
#         config.js_only = True
#         config.js_code = js_click

#         # ⬇️ WAIT 5 SECONDS AFTER CLICK
#         config.wait_for = None
#         config.delay_before_return_html = 5

#     return config


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
    config = base_config(extraction_strategy, request)

    pagination = request.pagination_config
    page = pagination.start_page if pagination and pagination.start_page else 1

    all_data = []

    try:
        async with AsyncWebCrawler(verbose=True) as crawler:
            while True:

                # ---- Apply pagination logic ----
                if pagination:
                    if pagination.type == "scroll":
                        config = apply_scroll_pagination(config, pagination)

                    elif pagination.type in ["button_click", "ajax_click"]:
                        config = apply_button_click_pagination(config, pagination)

                # ---- Determine target URL ----
                target_url = get_target_url(request, pagination, page)
                
                # ---- Run crawl ----
                result = await crawler.arun(url=target_url, config=config)

                if not result.success:
                    print(f"❌ Page {page} failed: {result.error_message}")
                    break

                page_data = json.loads(result.extracted_content) if result.extracted_content else []
                if not page_data:
                    print(f"⚠️ No more data found at page {page}")
                    break

                all_data.extend(page_data)
                print(f"✅ Page {page}: {len(page_data)} items (total={len(all_data)})")

                # moved these 2 stopping conditions before max_items to support next preview (that needs all items returned to show last 5 items from the next page/scroll)
                
                # ---- 1. Stop by pagination max pages ----
                if pagination and pagination.max_pages and page >= pagination.max_pages:
                    break
                
                 # ---- 2. Scroll AND Click pagination runs only once ----
                if pagination and (pagination.type in ["button_click", "ajax_click", "scroll"]):
                    break

                # ---- 3. Stop by max items ----
                if request.max_items and len(all_data) >= request.max_items:
                    all_data = all_data[:request.max_items]
                    break

                # ---- No pagination? Only one iteration ----
                if not pagination:
                    break

                page += 1

            return ScrapeResponse(

                entity_name=request.entity_name,
                url=str(request.url),
                scraped_at=datetime.now(),
                total_items=len(all_data),
                data=all_data,
                success=True,
                message=f"Scraped {len(all_data)} items across {page} pages"
            )

    except Exception as e:
        print(f"Error during scraping: {str(e)}")
        return ScrapeResponse(
            entity_name=request.entity_name,
            url=str(request.url),
            scraped_at=datetime.now(),
            total_items=0,
            data=[],
            success=False,
            message=f"Error during scraping: {str(e)}"
        )
