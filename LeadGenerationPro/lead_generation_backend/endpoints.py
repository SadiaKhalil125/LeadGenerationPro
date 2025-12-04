import sys
import asyncio
import httpx
# Set event loop policy FIRST, before any other imports
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
from fastapi.responses import HTMLResponse
from fastapi import FastAPI, HTTPException
from datetime import datetime
import asyncio
from models import SourceInfo, SourcesListResponse, FieldMapping, ScrapeRequest, ScrapeResponse, EntityRequest, EntityMappingRequest, EntityInfo, EntitiesListResponse, Attribute, MappingsListResponse, MappingInfo, MappingFormRequest, TaskInfo,TaskRequest,TasksListResponse, TaskUpdateRequest, FetchContentRequest, QuickExtractRequest, QuickExtractResponse
from utils import extract_value, fetch_page
from fastapi.middleware.cors import CORSMiddleware
import logging
from crawl4Util import extract_website
from scraping_router import route_scraping_request
from routers import entity_crud, source_crud, entity_mappings_crud, task_crud, chat_crud
from routers.scheduler_config import scheduler, task_lifespan

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Dynamic Web Scraper API",
    description="A flexible web scraper that accepts entity configurations at runtime",
    version="1.0.0",
    lifespan=task_lifespan
)


app.include_router(entity_crud.router, prefix="/entity", tags=["Entity Management"])
app.include_router(source_crud.router, prefix="/source", tags=["Source Management"])
app.include_router(entity_mappings_crud.router, prefix="/mapping", tags=["Entity Mappings Management"])
app.include_router(task_crud.router, prefix="/task", tags=["Task Management"])
app.include_router(chat_crud.router, prefix="/chat", tags=["Chat Management"])

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
@app.post("/fetchcontent")
async def fetch_content(request: FetchContentRequest):
    try:
        async with httpx.AsyncClient(follow_redirects=True) as client:
            resp = await client.get(request.url, timeout=10000)
            return {"success": True, "content": resp.text}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.post("/scrapedynamic", response_model=ScrapeResponse)
async def scrape_dynamic(request: ScrapeRequest):
    """
    Async version of dynamic scraping to avoid blocking.
    Routes requests intelligently (Google Maps vs CSS scraper).
    """
    try:
        response = await route_scraping_request(request)
        return response
    except Exception as e:
        logger.error("Error during dynamic scraping", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Scraping error: {e}")


@app.post("/scrapestatic", response_model=ScrapeResponse)
async def scrape_website(request: ScrapeRequest):
    """
    Scrape a website based on the provided entity configuration
    
    Example request:
    ```json
    {
        "entity_name": "business_listings",
        "url": "https://www.hotfrog.com/search/usa/business-networking",
        "container_selector": ".col-8",
        "field_mappings": {
            "company_name": {"selector": "h3 strong", "extract": "text"},
            "company_link": {"selector": "h3 a", "extract": "href"},
            "address": {"selector": "span.small:nth-child(2)", "extract": "text"},
            "description": {"selector": "p.mb-0", "extract": "text"}
        },
        "max_items": 50
    }
    ```
    """
    
    try:
        # Fetch and parse the page
        soup = await fetch_page(request.url, request.timeout)
        
        # Extract data
        data = []
        
        if request.container_selector:
            # Multiple items scenario
            containers = soup.select(request.container_selector)
            
            if not containers:
                return ScrapeResponse(
                    entity_name=request.entity_name,
                    url=str(request.url),
                    scraped_at=datetime.now(),
                    total_items=0,
                    data=[],
                    success=False,
                    message=f"No containers found with selector: {request.container_selector}"
                )
            
            # Limit items if max_items is specified
            if request.max_items:
                containers = containers[:request.max_items]
            
            for i, container in enumerate(containers, 1):
                row = {"index": i}
                
                for field_name, mapping in request.field_mappings.items():
                    element = container.select_one(mapping.selector)
                    row[field_name] = extract_value(element, mapping.extract)
                
                # Only add row if it has some non-empty values
                if any(v for k, v in row.items() if k != "index" and v):
                    data.append(row)
        
        else:
            # Single item scenario
            row = {}
            
            for field_name, mapping in request.field_mappings.items():
                element = soup.select_one(mapping.selector)
                row[field_name] = extract_value(element, mapping.extract)
            
            # Only add if has some non-empty values
            if any(row.values()):
                data.append(row)
        
        return ScrapeResponse(
            entity_name=request.entity_name,
            url=str(request.url),
            scraped_at=datetime.now(),
            total_items=len(data),
            data=data,
            success=True,
            message=f"Successfully scraped {len(data)} {request.entity_name} items"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scraping failed: {str(e)}")

@app.post("/quick-extract", response_model=QuickExtractResponse)
async def quick_extract(request: QuickExtractRequest):
    """
    Quick extraction endpoint that doesn't require entity_name and doesn't save to database.
    Perfect for one-off scraping tasks.
    """
    try:
        # Convert QuickExtractRequest to ScrapeRequest format for existing scraping logic
        # Use a dummy entity_name since it's required by ScrapeRequest but won't be saved
        scrape_request = ScrapeRequest(
            entity_name="quick_extract",  # Dummy name, not used
            url=request.url,
            container_selector=request.container_selector,
            field_mappings=request.field_mappings,
            max_items=request.max_items,
            timeout=request.timeout,
            pagination_config=request.pagination_config,
            captcha_params=request.captcha_params
        )
        
        # Use existing routing logic
        scrape_response = await route_scraping_request(scrape_request)
        
        # Convert ScrapeResponse to QuickExtractResponse (remove entity_name)
        return QuickExtractResponse(
            url=scrape_response.url,
            scraped_at=scrape_response.scraped_at,
            total_items=scrape_response.total_items,
            data=scrape_response.data,
            success=scrape_response.success,
            message=scrape_response.message
        )
    except Exception as e:
        logger.error("Error during quick extraction", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Quick extraction error: {e}")

@app.post("/quick-extract/preview", response_model=QuickExtractResponse)
async def quick_extract_preview(request: QuickExtractRequest):
    """
    Preview endpoint for quick extraction - returns first 5 items for testing.
    """
    try:
        # Limit to 5 items for preview
        preview_request = QuickExtractRequest(
            url=request.url,
            container_selector=request.container_selector,
            field_mappings=request.field_mappings,
            max_items=5,  # Limit preview to 5 items
            timeout=request.timeout,
            pagination_config=request.pagination_config,
            captcha_params=request.captcha_params
        )
        
        # Convert to ScrapeRequest
        scrape_request = ScrapeRequest(
            entity_name="quick_extract_preview",
            url=preview_request.url,
            container_selector=preview_request.container_selector,
            field_mappings=preview_request.field_mappings,
            max_items=preview_request.max_items,
            timeout=preview_request.timeout,
            pagination_config=preview_request.pagination_config,
            captcha_params=preview_request.captcha_params
        )
        
        # Use existing routing logic
        scrape_response = await route_scraping_request(scrape_request)
        
        # Limit to first 5 items for preview
        preview_data = scrape_response.data[:5] if scrape_response.data else []
        
        return QuickExtractResponse(
            url=scrape_response.url,
            scraped_at=scrape_response.scraped_at,
            total_items=scrape_response.total_items,
            data=preview_data,
            success=scrape_response.success,
            message=f"Preview successful - showing first {len(preview_data)} items" if scrape_response.success else scrape_response.message
        )
    except Exception as e:
        logger.error("Error during quick extract preview", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Quick extract preview error: {e}")

    
@app.get("/")
async def root():
    return {
        "message": "Dynamic Web Scraper API",
        "docs": "/docs",
        "endpoints": {
            "POST /scrape": "Scrape a website with dynamic configuration",
            "POST /scrape/test-selectors": "Test CSS selectors before scraping"
        }
    }