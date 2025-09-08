from pydantic import BaseModel
from typing import Dict, List, Optional, Any
from pydantic import HttpUrl
from datetime import datetime
class FieldMapping(BaseModel):
    selector: str
    extract: str = "text"  # text, href, src, or attribute name

class ScrapeRequest(BaseModel):
    entity_name: str
    url: HttpUrl
    container_selector: Optional[str] = None
    field_mappings: Dict[str, FieldMapping]
    max_items: Optional[int] = None
    timeout: Optional[int] = 15

class ScrapeResponse(BaseModel):
    entity_name: str
    url: str
    scraped_at: datetime
    total_items: int
    data: List[Dict[str, Any]]
    success: bool
    message: str
