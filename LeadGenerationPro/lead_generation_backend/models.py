from pydantic import BaseModel
from typing import Dict, List, Optional, Any
from pydantic import HttpUrl
from datetime import datetime

class FieldMapping(BaseModel):
    selector: str
    extract: str = "text"  # text, href, src, or attribute name


class EntityMappingRequest(BaseModel):
    entity_name: str              # e.g., "company", "job", "person" 
    container_selector: Optional[str] = None
    field_mappings: Dict[str, FieldMapping]
    # key = field name (e.g., "company_name"), value = FieldMapping selector/extract info

class MappingFormRequest(BaseModel):
    source:str
    url: HttpUrl
    entity_mappings: List[EntityMappingRequest]


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


class EntityInfo(BaseModel):
    name: str
    columns: List[str]
    created_at: Optional[datetime] = None

class EntitiesListResponse(BaseModel):
    total_entities: int
    entities: List[EntityInfo]

class MappingInfo(BaseModel):
    id: int
    entity_name: str
    mapping_name: str
    container_selector: Optional[str] = None
    field_mappings: Dict[str, Any]
    created_at: datetime
    source_id: int
    source_name: str
    url: str

class MappingsListResponse(BaseModel):
    total_mappings: int
    mappings: List[MappingInfo]

class SourceInfo(BaseModel):
    id: int
    name: str
    url: str

class SourcesListResponse(BaseModel):
    total_sources: int
    sources: List[SourceInfo]

class TaskRequest(BaseModel):
    source_id: int
    mapping_id: int  
    scheduled_time: datetime
    task_name: Optional[str] = None  # Optional custom task name

class TaskInfo(BaseModel):
    id: int
    task_name: str
    source_id: int
    source_name: str
    mapping_id: int
    mapping_name: str
    entity_name: str
    scheduled_time: datetime
    created_at: datetime

class TasksListResponse(BaseModel):
    total_tasks: int
    tasks: List[TaskInfo]

class TaskUpdateRequest(BaseModel):
    scheduled_time: datetime
    task_name: Optional[str] = None