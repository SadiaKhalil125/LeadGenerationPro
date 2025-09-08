import re
from bs4 import BeautifulSoup
import aiohttp
from fastapi import HTTPException
from datetime import datetime
def extract_value(element, extract_type: str) -> str:
    """Extract value from BeautifulSoup element based on extract type"""
    if not element:
        return ''
    
    if extract_type == 'href':
        return element.get('href', '')
    elif extract_type == 'src':
        return element.get('src', '')
    elif extract_type == 'text':
        return re.sub(r'\s+', ' ', element.get_text()).strip()
    else:
        # Treat as attribute name
        return element.get(extract_type, '')

async def fetch_page(url: str, timeout: int = 15) -> BeautifulSoup:
    """Asynchronously fetch and parse a web page"""
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    async with aiohttp.ClientSession(headers=headers, timeout=aiohttp.ClientTimeout(total=timeout)) as session:
        try:
            async with session.get(str(url)) as response:
                response.raise_for_status()
                content = await response.text()
                return BeautifulSoup(content, 'html.parser')
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to fetch page: {str(e)}")
