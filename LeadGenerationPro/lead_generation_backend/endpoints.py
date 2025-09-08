from fastapi import FastAPI, HTTPException
import requests
from bs4 import BeautifulSoup
import re
from datetime import datetime
import asyncio
import aiohttp
from models import FieldMapping, ScrapeRequest, ScrapeResponse
from utils import extract_value, fetch_page
from playwright.sync_api import sync_playwright
from pydantic import BaseModel, HttpUrl
from typing import Dict, List, Optional, Any
import time
from fastapi.middleware.cors import CORSMiddleware
import traceback
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Dynamic Web Scraper API",
    description="A flexible web scraper that accepts entity configurations at runtime",
    version="1.0.0"
)


# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



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
    
@app.post("/scraperesponse", response_model=ScrapeResponse)
def dynamic_scraper(request: ScrapeRequest) -> ScrapeResponse:
    """Dynamic web scraper using Playwright with enhanced error handling"""
    start_time = datetime.now()
    
    def extract_value(element, extract_type: str) -> str:
        if not element:
            return ''
        try:
            if extract_type == 'href':
                return element.get_attribute('href') or ''
            elif extract_type == 'src':
                return element.get_attribute('src') or ''
            elif extract_type in ['text', 'inner_text']:
                text = element.inner_text()
                return re.sub(r'\s+', ' ', text).strip()
            else:  # assume it's an attribute name
                return element.get_attribute(extract_type) or ''
        except Exception as e:
            logger.warning(f"Extract value error for {extract_type}: {str(e)}")
            return ''
    
    browser = None
    try:
        logger.info(f"Starting scrape for {request.entity_name} at {request.url}")
        
        with sync_playwright() as p:
            # Enhanced browser launch args for Docker/server environments
            browser_args = [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process',
                '--disable-gpu',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-renderer-backgrounding'
            ]
            
            browser = p.chromium.launch(
                headless=True,
                args=browser_args
            )
            
            context = browser.new_context(
                viewport={'width': 1280, 'height': 720},
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            )
            
            page = context.new_page()
            
            # Add request interceptor for better debugging
            def handle_request(request_obj):
                logger.info(f"Request: {request_obj.method} {request_obj.url}")
            
            def handle_response(response):
                logger.info(f"Response: {response.status} {response.url}")
            
            page.on("request", handle_request)
            page.on("response", handle_response)
            
            # Navigate with retries
            max_retries = 3
            for attempt in range(max_retries):
                try:
                    logger.info(f"Navigation attempt {attempt + 1}")
                    response = page.goto(
                        str(request.url), 
                        wait_until="networkidle",
                        timeout=request.timeout * 1000
                    )
                    
                    if response and response.status >= 400:
                        raise Exception(f"HTTP {response.status}: {response.status_text}")
                    
                    logger.info("Page loaded successfully")
                    break
                    
                except Exception as e:
                    logger.warning(f"Navigation attempt {attempt + 1} failed: {str(e)}")
                    if attempt == max_retries - 1:
                        raise
                    time.sleep(2)
            
            # Wait for dynamic content
            logger.info("Waiting for dynamic content...")
            time.sleep(3)
            
            # Enhanced scrolling with progress logging
            logger.info("Scrolling to load more content...")
            for i in range(5):  # Increased scroll count
                try:
                    page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                    page.wait_for_timeout(1500)
                    logger.info(f"Scroll {i+1}/5 completed")
                except Exception as e:
                    logger.warning(f"Scroll {i+1} failed: {str(e)}")
            
            data = []
            
            # Enhanced scraping with detailed logging
            if request.container_selector:
                logger.info(f"Looking for containers: {request.container_selector}")
                containers = page.query_selector_all(request.container_selector)
                logger.info(f"Found {len(containers)} containers")
                
                if not containers:
                    # Try alternative selectors or debug
                    page_content = page.content()
                    logger.warning(f"No containers found. Page title: {page.title()}")
                    logger.warning(f"Page URL: {page.url}")
                    logger.warning(f"Page content length: {len(page_content)}")
                
                for i, container in enumerate(containers):
                    if request.max_items and i >= request.max_items:
                        break
                        
                    row = {}
                    for field_name, field_mapping in request.field_mappings.items():
                        try:
                            element = container.query_selector(field_mapping.selector)
                            value = extract_value(element, field_mapping.extract)
                            row[field_name] = value
                            if value:
                                logger.debug(f"Extracted {field_name}: {value[:50]}")
                        except Exception as e:
                            logger.warning(f"Field extraction failed for {field_name}: {str(e)}")
                            row[field_name] = ''
                    
                    if any(str(v).strip() for v in row.values()):
                        row['index'] = i + 1
                        data.append(row)
                        logger.debug(f"Added row {i+1}")
            else:
                # Single item scraping
                row = {}
                for field_name, field_mapping in request.field_mappings.items():
                    try:
                        element = page.query_selector(field_mapping.selector)
                        value = extract_value(element, field_mapping.extract)
                        row[field_name] = value
                        logger.debug(f"Extracted {field_name}: {value[:50]}")
                    except Exception as e:
                        logger.warning(f"Field extraction failed for {field_name}: {str(e)}")
                        row[field_name] = ''
                
                if any(str(v).strip() for v in row.values()):
                    data.append(row)
            
            logger.info(f"Extraction complete. Found {len(data)} items")
            
            context.close()
            browser.close()
            
            return ScrapeResponse(
                entity_name=request.entity_name,
                url=str(request.url),
                scraped_at=start_time,
                total_items=len(data),
                data=data,
                success=True,
                message=f"Successfully scraped {len(data)} items"
            )
            
    except Exception as e:
        error_msg = f"Scraping failed: {str(e)}"
        error_details = traceback.format_exc()
        logger.error(f"{error_msg}\n{error_details}")
        
        if browser:
            try:
                browser.close()
            except:
                pass
        
        return ScrapeResponse(
            entity_name=request.entity_name,
            url=str(request.url),
            scraped_at=start_time,
            total_items=0,
            data=[],
            success=False,
            message=error_msg
        )




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

# if __name__ == "__main__":
#     import uvicorn
#     uvicorn.run(app, host="0.0.0.0", port=8001)