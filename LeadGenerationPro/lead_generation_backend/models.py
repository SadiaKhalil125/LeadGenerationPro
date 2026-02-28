from pydantic import BaseModel, EmailStr
from typing import Dict, List, Literal, Optional, Any
from pydantic import HttpUrl
from datetime import datetime
from api_source_models import ApiRequestTemplate, ApiResponseStructure, FieldMappingItem

class FieldMapping(BaseModel):
    selector: str
    extract: str = "text"  # text, href, src, or attribute name

class FollowLink(BaseModel):
    name: str
    selector: str
    field_mappings: Dict[str, FieldMapping]

class EntityMappingRequest(BaseModel):
    entity_name: str              # e.g., "company", "job", "person" 
    container_selector: Optional[str] = None
    field_mappings: Dict[str, FieldMapping]
    enabled: bool = True
    follow_links: Optional[List[FollowLink]] = []   # <-- Added
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

    # for button click or ajax or scroll (with wait)
    button_selector: Optional[str] = None
    wait_selector: Optional[str] = None

    # for scroll
    scroll_steps: Optional[int] = None
    click_steps: Optional[int] = None

class CaptchaParams(BaseModel):
    api_key: Optional[str] = None
    site_url: str
    captcha_type: Optional[str] = None  # e.g., "recaptcha_v2", "recaptcha_v3", "turnstile", etc.
    site_key: Optional[str] = None
    
class AuthConfig(BaseModel):
    """Authentication configuration for protected websites"""
    login_url: str
    username: str
    password: str
    auth_type: Literal["form", "basic"] = "form"
    username_selector: Optional[str] = None
    password_selector: Optional[str] = None
    submit_selector: Optional[str] = None
    success_indicator: Optional[str] = None

class ScrapeRequest(BaseModel):
    entity_name: str
    url: HttpUrl
    container_selector: Optional[str] = None
    field_mappings: Dict[str, FieldMapping]
    max_items: Optional[int] = 10
    timeout: Optional[int] = 15
    follow_links: Optional[List[FollowLink]] = []
    pagination_config: Optional[PaginationConfig] = None
    captcha_params: Optional[CaptchaParams] = None
    auth_config: Optional[AuthConfig] = None

class ScrapeResponse(BaseModel):
    entity_name: str
    url: str
    scraped_at: datetime
    total_items: int
    data: List[Dict[str, Any]]
    success: bool
    message: str
    page_size: Optional[int] = None 
class Attribute(BaseModel):
    name: str
    datatype: str   # e.g. "text", "int", "bool"
    check_for_unique: Optional[bool] = False

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
    follow_links: Optional[List[Dict[str, Any]]] = None
    created_at: datetime
    source_id: Optional[int] = None
    enabled: Optional[bool] = True
    source_name: Optional[str] = "Unknown Source"
    url: Optional[str] = ""

class MappingsListResponse(BaseModel):
    total_mappings: int
    mappings: List[MappingInfo]

class SourceInfo(BaseModel):
    id: int
    name: str
    url: str
    pagination_config: Optional[PaginationConfig] = None
    is_captcha_protected: bool = False
    captcha_params: Optional[CaptchaParams] = None


class SourcesListResponse(BaseModel):
    total_sources: int
    sources: List[SourceInfo]

class SourceUpdateRequest(BaseModel):
    name: str
    url: str
    pagination_config: Optional[PaginationConfig] = None

class TaskRequest(BaseModel):
    # Web source fields
    source_id: Optional[int] = None
    mapping_id: Optional[int] = None
    
    # API source fields
    source_type: str = "web"
    api_source_id: Optional[int] = None
    
    # NEW: Allow specific params for this task execution
    api_request_config: Optional[ApiRequestTemplate] = None 
    # Or simpler: api_overrides: Optional[Dict[str, Any]] = None

    # Common fields
    scheduled_time: datetime
    task_name: Optional[str] = None
    max_items: Optional[int] = 10
    repeat: str = "once"

# --- UPDATE TaskInfo ---
class TaskInfo(BaseModel):
    id: int
    task_name: str
    source_id: Optional[int] = None # Changed to Optional as API tasks might not have it
    source_name: Optional[str] = None
    mapping_id: Optional[int] = None
    mapping_name: Optional[str] = None
    entity_name: str
    scheduled_time: datetime
    created_at: datetime
    repeat: str
    last_executed_at: Optional[datetime] = None
    max_items: Optional[int]
    source_type: str = "web"
    api_source_id: Optional[int] = None
    # NEW: Return the config so UI can show it
    api_request_config: Optional[Dict[str, Any]] = None

# class TaskRequest(BaseModel):
#     # Web source fields (existing - for backward compatibility)
#     source_id: Optional[int] = None
#     mapping_id: Optional[int] = None
    
#     # API source fields (new)
#     source_type: str = "web"  # "web" or "api"
#     api_source_id: Optional[int] = None
    
#     # Common fields
#     scheduled_time: datetime
#     task_name: Optional[str] = None  # Optional custom task name
#     max_items: Optional[int] = 10
#     repeat: str = "once"  # once, weekly, monthly, yearly


# class TaskInfo(BaseModel):
#     id: int
#     task_name: str
#     source_id: int
#     source_name: str
#     mapping_id: int
#     mapping_name: str
#     entity_name: str
#     scheduled_time: datetime
#     created_at: datetime
#     repeat: str
#     last_executed_at: Optional[datetime] = None
#     max_items: Optional[int]
#     source_type: str = "web"
#     api_source_id: Optional[int] = None

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
    follow_links: Optional[List[FollowLink]] = []
    preview_step:Optional[int] = 1
    
class MessageRequest(BaseModel):
    text: str

class MessageResponse(BaseModel):
    id: int
    sender: str
    text: str
    timestamp: str

class QuickExtractRequest(BaseModel):
    """Request model for quick extraction with optional entity storage."""
    url: HttpUrl
    container_selector: Optional[str] = None
    field_mappings: Dict[str, FieldMapping]
    max_items: Optional[int] = None
    timeout: Optional[int] = 15
    pagination_config: Optional[PaginationConfig] = None
    captcha_params: Optional[CaptchaParams] = None
    follow_links: Optional[List[FollowLink]] = []
    entity_name: Optional[str] = None  # Optional: store data in this entity table
    create_entity: Optional[bool] = False  # If true, create entity table from field mappings
    source_name: Optional[str] = "Quick Extract"  # Source name for stored data
    preview_step: Optional[int] = 1  # For previewing extraction steps

class QuickExtractResponse(BaseModel):
    """Response model for quick extraction."""
    url: str
    scraped_at: datetime
    total_items: int
    data: List[Dict[str, Any]]
    success: bool
    message: str

class SelectorRequest(BaseModel):
    url: str
    container_selector: str

class UserSignup(BaseModel):
    full_name: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

from pydantic import BaseModel
from typing import List, Dict, Optional

class OutreachRequest(BaseModel):
    provider: str
    # Setting the default to an empty dict makes it "optional" during initialization
    config: Optional[Dict] = {} 
    subject: str
    message: str
    contacts: List[Dict]