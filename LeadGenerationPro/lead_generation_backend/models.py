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
    enabled: bool = True
    # key = field name (e.g., "company_name"), value = FieldMapping selector/extract info

class MappingFormRequest(BaseModel):
    source:str
    url: HttpUrl
    entity_mappings: List[EntityMappingRequest]
    
class FetchContentRequest(BaseModel):
    url: str

class PaginationConfig(BaseModel):
    type: str  # "query_param" | "offset" | "path" | "button_click" | "scroll" | "ajax_click"
    param_name: Optional[str] = "page"  # for query or offset
    start_page: Optional[int] = 1
    page_size: Optional[int] = None   # for offset
    max_pages: Optional[int] = None

    # for path
    path_pattern: Optional[str] = None

    # for button click or ajax
    button_selector: Optional[str] = None
    wait_selector: Optional[str] = None

    # for scroll
    scroll_steps: Optional[int] = None
class ScrapeRequest(BaseModel):
    entity_name: str
    url: HttpUrl
    container_selector: Optional[str] = None
    field_mappings: Dict[str, FieldMapping]
    max_items: Optional[int] = 10
    timeout: Optional[int] = 15
    pagination_config: Optional[PaginationConfig] = None

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
    enabled:Optional[bool] = True
    source_name: str
    url: str

class MappingsListResponse(BaseModel):
    total_mappings: int
    mappings: List[MappingInfo]

class PaginationConfig(BaseModel):
    type: str  # "query_param" | "offset" | "path" | "button_click" | "scroll" | "ajax_click"
    param_name: Optional[str] = "page"  # for query or offset
    start_page: Optional[int] = 1
    page_size: Optional[int] = None   # for offset
    max_pages: Optional[int] = None

    # for path
    path_pattern: Optional[str] = None

    # for button click or ajax
    button_selector: Optional[str] = None
    wait_selector: Optional[str] = None

    # for scroll
    scroll_steps: Optional[int] = None
class SourceInfo(BaseModel):
    id: int
    name: str
    url: str
    pagination_config: Optional[PaginationConfig] = None

class SourcesListResponse(BaseModel):
    total_sources: int
    sources: List[SourceInfo]

class SourceUpdateRequest(BaseModel):
    name: str
    url: str
    pagination_config: Optional[PaginationConfig] = None

class TaskRequest(BaseModel):
    source_id: int
    mapping_id: int  
    scheduled_time: datetime
    task_name: Optional[str] = None  # Optional custom task name
    max_items: Optional[int] = 10
    repeat: str = "once"  # once, weekly, monthly, yearly


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
    repeat: str
    last_executed_at: Optional[datetime] = None
    max_items: Optional[int]

class TasksListResponse(BaseModel):
    total_tasks: int
    tasks: List[TaskInfo]

class TaskUpdateRequest(BaseModel):
    scheduled_time: datetime
    task_name: Optional[str] = None
    repeat: str = "once"  # once, weekly, monthly, yearly
    max_items: Optional[int] = 10


class PreviewMappingRequest(BaseModel):
    url: str
    entity_name: str
    container_selector: Optional[str] = None
    field_mappings: Dict[str, FieldMapping]