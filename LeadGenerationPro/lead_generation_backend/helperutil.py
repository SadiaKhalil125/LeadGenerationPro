import json
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse
from datetime import datetime
from crawl4ai import (
    AsyncWebCrawler,
    CrawlerRunConfig,
    CacheMode,
    JsonCssExtractionStrategy
)
from models import (
    ScrapeRequest,
    ScrapeResponse,
    FieldMapping,
    PaginationConfig,
    FollowLink
)
from CapSolverUtil import solve_captcha_auto

CAPSOLVER_API_KEY = "CAP-BA92F348AE81B7F394B902A4C1F9559828C02FE0B9E32A73BF8C08A5C3941E17"

# ===================================================
# PAGINATION URL BUILDERS
# ===================================================

def build_paginated_url(base_url: str, page: int, pagination: PaginationConfig) -> str:
    parsed = urlparse(base_url)
    query = parse_qs(parsed.query)

    if pagination.type == "query_param":
        param = pagination.param_name or "page"
        query[param] = [str(page)]

    elif pagination.type == "offset":
        param = pagination.param_name or "offset"
        page_size = pagination.page_size or 10
        query[param] = [str((page - 1) * page_size)]

    elif pagination.type == "path":
        pattern = pagination.path_pattern or "{page}"
        new_path = parsed.path.rstrip("/") + pattern.replace("{page}", str(page))
        return urlunparse(parsed._replace(path=new_path))

    return urlunparse(parsed._replace(query=urlencode(query, doseq=True)))


# ===================================================
# EXTRACTION SCHEMA (CRITICAL FIX)
# ===================================================

def build_extraction_schema(request: ScrapeRequest, include_follow_links: bool = False):
    fields = []

    for name, fm in request.field_mappings.items():
        if not fm.selector:
            continue

        # TEXT
        if fm.extract in [None, "text"]:
            fields.append({
                "name": name,
                "selector": fm.selector,
                "type": "text"
            })

        # ATTRIBUTE (href, src, data-*)
        else:
            fields.append({
                "name": name,
                "selector": fm.selector,
                "type": "attribute",
                "attribute": fm.extract
            })

    # Include follow link selectors as temporary fields if requested
    if include_follow_links and request.follow_links:
        for fl in request.follow_links:
            if fl.selector:
                fields.append({
                    "name": f"_follow_link_{fl.name}",
                    "selector": fl.selector,
                    "type": "attribute",
                    "attribute": "href"
                })

    if not fields:
        raise ValueError("No valid field mappings")

    return {
        "name": request.entity_name,
        "baseSelector": request.container_selector or "body",
        "fields": fields
    }


def base_config(strategy, request: ScrapeRequest):
    return CrawlerRunConfig(
        cache_mode=CacheMode.BYPASS,
        extraction_strategy=strategy,
        page_timeout=(request.timeout or 15) * 1000
    )


# ===================================================
# FOLLOW LINK HELPERS (FIXED)
# ===================================================

def extract_follow_urls(row: dict, follow_links: list[FollowLink], base_url: str):
    """
    Extract URLs from row data.
    fl.selector is a CSS selector that was used to extract href into a temporary field.
    The extracted value is stored in row as "_follow_link_{fl.name}".
    """
    urls = {}

    for fl in follow_links:
        # Look for the temporary field created by the extraction schema
        temp_field_name = f"_follow_link_{fl.name}"
        url_val = row.get(temp_field_name)
        
        # If not found, try treating selector as a field name (backward compatibility)
        if not url_val:
            url_val = row.get(fl.selector)

        if not url_val:
            continue

        if url_val.startswith("/"):
            parsed = urlparse(base_url)
            url_val = f"{parsed.scheme}://{parsed.netloc}{url_val}"

        urls[fl.name] = url_val.strip()
        print(f"    ✓ Extracted URL for '{fl.name}': {url_val.strip()}")

    return urls


def get_follow_fields(link_name: str, request: ScrapeRequest):
    for fl in request.follow_links or []:
        if fl.name == link_name:
            return fl.field_mappings
    return {}


# ===================================================
# MAIN SCRAPER
# ===================================================

async def extract_website(request: ScrapeRequest) -> ScrapeResponse:
    try:
        # Include follow link selectors in the main extraction schema
        schema = build_extraction_schema(request, include_follow_links=True)
        strategy = JsonCssExtractionStrategy(schema, verbose=True)
        config = base_config(strategy, request)
    except Exception as e:
        return ScrapeResponse(
            entity_name=request.entity_name,
            url=str(request.url),
            scraped_at=datetime.now(),
            total_items=0,
            data=[],
            success=False,
            message=str(e)
        )

    pagination = request.pagination_config
    page = pagination.start_page if pagination else 1
    all_rows = []

    async with AsyncWebCrawler(verbose=True) as crawler:
        while True:
            # Check if we've reached max_items BEFORE fetching the next page
            if request.max_items and len(all_rows) >= request.max_items:
                print(f"ℹ️  Reached max_items limit ({request.max_items}). Stopping pagination.")
                break

            target_url = (
                build_paginated_url(str(request.url), page, pagination)
                if pagination and page > 1
                else str(request.url)
            )

            result = await crawler.arun(url=target_url, config=config)
            if not result.success:
                break

            page_data = json.loads(result.extracted_content or "[]")
            if not page_data:
                break

            for row in page_data:
                # Stop adding rows if we've reached max_items
                if request.max_items and len(all_rows) >= request.max_items:
                    break
                
                row = dict(row)
                # Extract follow URLs from the row (they were extracted as temporary fields)
                row["_follow_urls"] = extract_follow_urls(
                    row,
                    request.follow_links or [],
                    str(request.url)
                )
                # Remove temporary follow link fields from the row
                for fl in request.follow_links or []:
                    temp_field = f"_follow_link_{fl.name}"
                    if temp_field in row:
                        del row[temp_field]
                all_rows.append(row)

            if not pagination:
                break
            # Stop if we've reached max_items
            if request.max_items and len(all_rows) >= request.max_items:
                print(f"ℹ️  Reached max_items limit ({request.max_items}). Stopping pagination.")
                break
            if pagination.max_pages and page >= pagination.max_pages:
                break

            page += 1

        # ===============================================
        # FOLLOW PAGE CRAWLING & MERGE
        # ===============================================
        final_data = []
        
        print(f"🔗 Processing {len(all_rows)} rows with follow_links: {len(request.follow_links or [])}")

        for idx, row in enumerate(all_rows):
            merged = {k: v for k, v in row.items() if k != "_follow_urls"}
            follow_urls = row.get("_follow_urls", {})
            
            print(f"  Row {idx + 1}: Found {len(follow_urls)} follow URL(s)")

            for link_name, link_url in follow_urls.items():
                print(f"    → Following link '{link_name}': {link_url}")
                follow_fields = get_follow_fields(link_name, request)
                
                if not follow_fields:
                    print(f"      ⚠️ No field mappings found for link '{link_name}'")
                    continue
                
                print(f"      ✓ Found {len(follow_fields)} field(s) to extract")

                follow_req = ScrapeRequest(
                    entity_name=f"{request.entity_name}_{link_name}",
                    url=link_url,
                    field_mappings=follow_fields,
                    timeout=request.timeout
                )

                try:
                    follow_schema = build_extraction_schema(follow_req)
                    follow_strategy = JsonCssExtractionStrategy(follow_schema, verbose=False)
                    follow_config = base_config(follow_strategy, follow_req)

                    print(f"      🚀 Crawling detail page...")
                    follow_res = await crawler.arun(link_url, follow_config)
                    follow_data = json.loads(follow_res.extracted_content or "[]")

                    if follow_data:
                        print(f"      ✅ Extracted {len(follow_data)} item(s) from detail page")
                        for k, v in follow_data[0].items():
                            # Use the field name directly from the mapping (k) - no prefixing
                            # The field name 'k' already matches the entity attribute name the user configured
                            # If there's a conflict, the detail page value will overwrite the main page value
                            merged[k] = v
                    else:
                        print(f"      ⚠️ No data extracted from detail page")
                except Exception as e:
                    print(f"      ❌ Error crawling detail page: {str(e)}")
                    import traceback
                    traceback.print_exc()

            final_data.append(merged)

    return ScrapeResponse(
        entity_name=request.entity_name,
        url=str(request.url),
        scraped_at=datetime.now(),
        total_items=len(final_data),
        data=final_data,
        success=True,
        message="Scraped and merged multi-page entity data"
    )
