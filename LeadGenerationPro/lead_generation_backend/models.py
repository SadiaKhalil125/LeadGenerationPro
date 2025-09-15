from pydantic import BaseModel
from typing import Dict, List, Optional, Any
from pydantic import HttpUrl
from datetime import datetime

class FieldMapping(BaseModel):
    selector: str
    extract: str = "text"  # text, href, src, or attribute name

class EntityMappingRequest(BaseModel):
   
    entity_name: str              # e.g., "company", "job", "person"
    url: HttpUrl    
    container_selector: Optional[str] = None
    field_mappings: Dict[str, FieldMapping]
    # key = field name (e.g., "company_name"), value = FieldMapping selector/extract info


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
    
class Attribute(BaseModel):
    name: str
    datatype: str   # e.g. "text", "int", "bool"

class EntityRequest(BaseModel):
    name: str   # table name
    attributes: List[Attribute]