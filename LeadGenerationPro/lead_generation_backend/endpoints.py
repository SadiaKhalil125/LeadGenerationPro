import sys
import asyncio

# Set event loop policy FIRST, before any other imports
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
from models import FetchURLRequest
import httpx
from fastapi.responses import JSONResponse
from fastapi import FastAPI, HTTPException
from datetime import datetime
import asyncio
from models import SourceInfo, SourcesListResponse, FieldMapping, ScrapeRequest, ScrapeResponse, EntityRequest, EntityMappingRequest, EntityInfo, EntitiesListResponse, Attribute, MappingsListResponse, MappingInfo, MappingFormRequest, TaskInfo,TaskRequest,TasksListResponse, TaskUpdateRequest
from utils import extract_value, fetch_page
from fastapi.middleware.cors import CORSMiddleware
import logging
from crawl4Util import extract_website
from routers import entity_crud, source_crud, entity_mappings_crud, task_crud
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

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



@app.post("/utils/fetch-url-content")
async def fetch_url_content(request: FetchURLRequest):
    """
    Fetches the HTML content of a given URL from the server-side to bypass browser restrictions.
    """
    url_to_fetch = request.url
    # Use a realistic browser User-Agent to avoid being blocked
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Connection": "keep-alive",
    }
    try:
        # Use a timeout to prevent the request from hanging indefinitely
        async with httpx.AsyncClient(follow_redirects=True, timeout=15.0) as client:
            response = await client.get(url_to_fetch, headers=headers)
            # Raise an exception for bad status codes like 404 or 500
            response.raise_for_status()

            return {
                "success": True,
                "content": response.text,
                "final_url": str(response.url), # The final URL after any redirects
            }

    except httpx.HTTPStatusError as e:
        return JSONResponse(
            status_code=400,
            content={"success": False, "error": f"Website returned an error (Status {e.response.status_code})"},
        )
    except httpx.RequestError as e:
        return JSONResponse(
            status_code=400,
            content={"success": False, "error": f"Could not connect to the website: {type(e).__name__}"},
        )
    except Exception as e:
        # Catch any other unexpected errors
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")


@app.post("/scrapedynamic", response_model=ScrapeResponse)
async def scrape_dynamic(request: ScrapeRequest):
    """
    Async version of dynamic scraping to avoid blocking
    """
    try:
        response = await extract_website(request)
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