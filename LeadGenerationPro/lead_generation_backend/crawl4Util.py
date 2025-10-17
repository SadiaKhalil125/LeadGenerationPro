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
        # fallback — just return original
        return base_url


async def extract_website(request: ScrapeRequest) -> ScrapeResponse:
    # 1. Build extraction schema
    fields = [
        {
            "name": field_name,
            "selector": field_mapping.selector,
            "type": field_mapping.extract
        }
        for field_name, field_mapping in request.field_mappings.items()
    ]

    schema = {
        "name": request.entity_name,
        "baseSelector": request.container_selector or "body",
        "fields": fields
    }

    extraction_strategy = JsonCssExtractionStrategy(schema, verbose=True)
    config = CrawlerRunConfig(
        cache_mode=CacheMode.BYPASS,
        extraction_strategy=extraction_strategy,
        page_timeout=request.timeout * 1000 if request.timeout else 15000
    )

    pagination = request.pagination_config
    page = pagination.start_page if pagination and pagination.start_page else 1
    max_pages = pagination.max_pages if pagination and pagination.max_pages else 10  # default safety limit

    all_data = []

    try:
        async with AsyncWebCrawler(verbose=True) as crawler:
            while True:
                # 2. Build target URL for this page
                if pagination:
                    target_url = build_paginated_url(str(request.url), page, pagination)
                    print(f"Fetching page {page} from built url: {target_url}")    
                else:
                    target_url = str(request.url)
                    print(f"Fetching: {target_url}")

                # 3. Run crawl
                result = await crawler.arun(url=target_url, config=config)
                if not result.success:
                    print(f"❌ Page {page} failed: {result.error_message}")
                    break

                page_data = json.loads(result.extracted_content) if result.extracted_content else []
                if not page_data:
                    print(f"⚠️ No more data found at page {page}")
                    break

                all_data.extend(page_data)
                print(f"✅ Page {page}: {len(page_data)} items extracted (total={len(all_data)})")

                # 4. Stop conditions
                if request.max_items and len(all_data) >= request.max_items:
                    all_data = all_data[:request.max_items]
                    break

                if pagination and pagination.max_pages and page >= pagination.max_pages:
                    break

                # No pagination config? only run once.
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
