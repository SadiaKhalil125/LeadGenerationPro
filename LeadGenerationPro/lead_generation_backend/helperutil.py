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
        start_page = pagination.start_page if pagination.start_page is not None else 1
        # Calculate offset based on start_page: if start_page=0, use page*page_size; if start_page=1, use (page-1)*page_size
        if start_page == 0:
            offset_value = page * page_size
        else:
            offset_value = (page - start_page) * page_size
        query[param] = [str(offset_value)]

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

        # TEXT or ATTRIBUTE - JsonCssExtractionStrategy expects type="attribute" for attributes
        # If extract is None or "text", use "text", otherwise use "attribute" type
        if fm.extract and fm.extract not in [None, "text"]:
            # This is an attribute extraction (href, src, etc.)
            field_def = {
                "name": name,
                "selector": fm.selector,
                "type": "attribute",
                "attribute": fm.extract  # href, src, etc.
            }
        else:
            # This is a text extraction
            field_def = {
                "name": name,
                "selector": fm.selector,
                "type": "text"
            }
        fields.append(field_def)

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
        
        print(f"    🔍 Looking for URL for '{fl.name}':")
        print(f"       - Temp field name: {temp_field_name}")
        print(f"       - Temp field value: {url_val}")
        print(f"       - Row keys: {list(row.keys())}")
        
        # If not found, try treating selector as a field name (backward compatibility)
        if not url_val:
            url_val = row.get(fl.selector)
            print(f"       - Tried selector as field name '{fl.selector}': {url_val}")

        if not url_val:
            print(f"       ⚠️ No URL found for '{fl.name}' with selector '{fl.selector}'")
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
        # Build extraction schema once (it's the same for all pages)
        schema = build_extraction_schema(request, include_follow_links=True)
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
    start_page = pagination.start_page if pagination else 1
    page = start_page
    final_data = []  # Store final merged data
    max_items = request.max_items

    # Log pagination setup
    if pagination:
        print(f"🔄 PAGINATION ENABLED: type={pagination.type}, start_page={start_page}, max_pages={pagination.max_pages}, max_items={max_items}")
    else:
        print(f"📄 NO PAGINATION: Single page extraction, max_items={max_items}")

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
                print(f"❌ Failed to fetch page {page}: {result.error_message if hasattr(result, 'error_message') else 'Unknown error'}")
                break

            # Debug: Check what we got from the extraction
            extracted_content = result.extracted_content
            print(f"🔍 DEBUG Page {page}: extracted_content type={type(extracted_content)}, length={len(extracted_content) if extracted_content else 0}")
            if extracted_content:
                print(f"🔍 DEBUG Page {page}: extracted_content preview (first 500 chars): {extracted_content[:500]}")
            
            try:
                page_data = json.loads(extracted_content) if extracted_content else []
            except json.JSONDecodeError as e:
                print(f"❌ JSON decode error on page {page}: {e}")
                print(f"   Content: {extracted_content[:1000] if extracted_content else 'None'}")
                page_data = []
            
            if not page_data:
                print(f"⚠️ No data extracted from page {page}")
                print(f"   extracted_content is: {extracted_content[:200] if extracted_content else 'None/Empty'}")
                print(f"   result.success: {result.success}")
                print(f"   result.markdown length: {len(result.markdown) if hasattr(result, 'markdown') and result.markdown else 0}")
                print(f"   Container selector: {request.container_selector or 'body'}")
                print(f"   Schema baseSelector: {schema.get('baseSelector', 'N/A')}")
                print(f"   Schema fields count: {len(schema.get('fields', []))}")
                # Check if HTML was actually fetched
                if hasattr(result, 'html') and result.html:
                    html_preview = result.html[:500] if result.html else "No HTML"
                    print(f"   HTML preview (first 500 chars): {html_preview}")
                elif hasattr(result, 'markdown') and result.markdown:
                    md_preview = result.markdown[:500] if result.markdown else "No markdown"
                    print(f"   Markdown preview (first 500 chars): {md_preview}")
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
                
                # Start with base row data
                merged = {k: v for k, v in row.items() if k != "_follow_urls"}
                follow_urls = row.get("_follow_urls", {})
                
                print(f"  📋 Page {page}, Row {row_idx + 1}: Found {len(follow_urls)} follow URL(s)")

                # Process each follow-up URL for this row
                for link_name, link_url in follow_urls.items():
                    print(f"    → Following link '{link_name}': {link_url}")
                    
                    # Validate URL scheme - skip javascript: and other invalid schemes
                    if not link_url.startswith(('http://', 'https://')):
                        print(f"      ⚠️ Skipping invalid URL scheme: {link_url}")
                        continue
                    
                    follow_fields = get_follow_fields(link_name, request)
                    
                    if not follow_fields:
                        print(f"      ⚠️ No field mappings found for link '{link_name}'")
                        continue
                    
                    print(f"      ✓ Found {len(follow_fields)} field(s) to extract")

                    # Detail pages have different structure, so don't use the main page's container selector
                    # Use None (which defaults to "body" in build_extraction_schema)
                    follow_req = ScrapeRequest(
                        entity_name=f"{request.entity_name}_{link_name}",
                        url=link_url,
                        container_selector=None,  # Detail pages use body as base selector
                        field_mappings=follow_fields,
                        timeout=request.timeout
                    )

                    try:
                        follow_schema = build_extraction_schema(follow_req)
                        follow_strategy = JsonCssExtractionStrategy(follow_schema, verbose=True)  # Enable verbose for debugging
                        follow_config = base_config(follow_strategy, follow_req)

                        print(f"      🚀 Crawling detail page: {link_url}")
                        print(f"      📋 Container selector: None (detail page uses body)")
                        print(f"      📋 Field mappings: {list(follow_fields.keys())}")
                        print(f"      📋 Schema baseSelector: {follow_schema.get('baseSelector', 'N/A')}")
                        print(f"      📋 Schema fields: {[f.get('name') for f in follow_schema.get('fields', [])]}")
                        for field in follow_schema.get('fields', []):
                            print(f"         - {field.get('name')}: selector='{field.get('selector')}', type='{field.get('type')}', attribute='{field.get('attribute', 'N/A')}'")
                        
                        follow_res = await crawler.arun(link_url, follow_config)
                        
                        # Debug: Check what we got
                        print(f"      🔍 Detail page extraction result:")
                        print(f"         - success: {follow_res.success}")
                        print(f"         - extracted_content type: {type(follow_res.extracted_content)}")
                        print(f"         - extracted_content length: {len(follow_res.extracted_content) if follow_res.extracted_content else 0}")
                        
                        if follow_res.extracted_content:
                            print(f"         - extracted_content preview: {follow_res.extracted_content[:500]}")
                        else:
                            print(f"         - ⚠️ No extracted_content returned")
                            if hasattr(follow_res, 'markdown') and follow_res.markdown:
                                print(f"         - Markdown length: {len(follow_res.markdown)}")
                            if hasattr(follow_res, 'html') and follow_res.html:
                                print(f"         - HTML length: {len(follow_res.html)}")
                        
                        follow_data = json.loads(follow_res.extracted_content or "[]")

                        if follow_data:
                            print(f"      ✅ Extracted {len(follow_data)} item(s) from detail page")
                            print(f"      📊 Extracted fields: {list(follow_data[0].keys()) if follow_data else 'N/A'}")
                            for k, v in follow_data[0].items():
                                # Use the field name directly from the mapping (k) - no prefixing
                                merged[k] = v
                        else:
                            print(f"      ⚠️ No data extracted from detail page")
                            print(f"         - extracted_content was: {follow_res.extracted_content[:200] if follow_res.extracted_content else 'None/Empty'}")
                    except Exception as e:
                        print(f"      ❌ Error crawling detail page: {str(e)}")
                        import traceback
                        traceback.print_exc()

                # Add merged row to page results
                page_final_data.append(merged)
            
            # Add all rows from this page to final data
            final_data.extend(page_final_data)
            print(f"📊 Page {page} complete: {len(page_final_data)} items processed, Total items: {len(final_data)}/{max_items if max_items else 'unlimited'}")
            
            # ===============================================
            # STEP 3: CHECK IF WE SHOULD CONTINUE PAGINATION
            # ===============================================
            # Check max_items after processing page and follow-ups
            if max_items and len(final_data) >= max_items:
                final_data = final_data[:max_items]  # Trim to exact limit
                print(f"✅ Reached max_items limit ({max_items}) after processing page {page}")
                break

            # Check pagination limits
            if not pagination:
                print(f"🛑 No pagination configured, stopping after first page")
                break
            # Stop if we've reached max_items
            if request.max_items and len(all_rows) >= request.max_items:
                print(f"ℹ️  Reached max_items limit ({request.max_items}). Stopping pagination.")
                break
            if pagination.max_pages and page >= pagination.max_pages:
                print(f"🛑 Reached max_pages limit ({pagination.max_pages}), stopping pagination")
                break

            # Move to next page
            page += 1
            print(f"➡️ Moving to next page: {page}")

    return ScrapeResponse(
        entity_name=request.entity_name,
        url=str(request.url),
        scraped_at=datetime.now(),
        total_items=len(final_data),
        data=final_data,
        success=True,
        message="Scraped and merged multi-page entity data"
    )
