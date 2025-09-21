import json
import asyncio
from crawl4ai import AsyncWebCrawler, CrawlerRunConfig, CacheMode
from crawl4ai import JsonCssExtractionStrategy
from .models import ScrapeRequest, ScrapeResponse, FieldMapping
from datetime import datetime

async def extract_website(request: ScrapeRequest) -> ScrapeResponse:
    # 1. Build schema from ScrapeRequest
    fields = []
    for field_name, field_mapping in request.field_mappings.items():
        field_def = {
            "name": field_name,
            "selector": field_mapping.selector,
            "type": field_mapping.extract
        }
        fields.append(field_def)
    
    schema = {
        "name": request.entity_name,
        "baseSelector": request.container_selector or "body",
        "fields": fields
    }

    # 2. Create the extraction strategy
    extraction_strategy = JsonCssExtractionStrategy(schema, verbose=True)

    # 3. Set up your crawler config (if needed)
    config = CrawlerRunConfig(
        # e.g., pass js_code or wait_for if the page is dynamic
        # wait_for="css:.crypto-row:nth-child(20)"
        cache_mode = CacheMode.BYPASS,
        extraction_strategy=extraction_strategy,
    )

    try:
        async with AsyncWebCrawler(verbose=True) as crawler:
            # 4. Run the crawl and extraction
            result = await crawler.arun(
                url=str(request.url), 
                config=config
            )

            if not result.success:
                print("Crawl failed:", result.error_message)
                return ScrapeResponse(
                    entity_name=request.entity_name,
                    url=str(request.url),
                    scraped_at=datetime.now(),
                    total_items=0,
                    data=[],
                    success=False,
                    message=f"Crawl failed: {result.error_message}"
                )

            # 5. Parse the extracted JSON
            data = json.loads(result.extracted_content) if result.extracted_content else []
            
            # Limit items if max_items is specified
            if request.max_items and len(data) > request.max_items:
                data = data[:request.max_items]
            
            print(f"Extracted {len(data)} {request.entity_name} entries")
            print(json.dumps(data, indent=2) if data else "No data found")
            
            return ScrapeResponse(
                entity_name=request.entity_name,
                url=str(request.url),
                scraped_at=datetime.now(),
                total_items=len(data),
                data=data,
                success=True,
                message="Successfully scraped data"
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
