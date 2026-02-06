"""
API Source Models - Pydantic models for API-based data sources
Defines structure for API sources that can be scheduled as tasks
"""

from pydantic import BaseModel, HttpUrl, Field
from typing import Dict, List, Optional, Any
from datetime import datetime

class ApiTaskOverrides(BaseModel):
    """Allows a specific task to override Source defaults"""
    params: Optional[Dict[str, Any]] = None  # Query params (e.g., vs_currency=usd)
    headers: Optional[Dict[str, str]] = None # Specific headers
    body: Optional[Dict[str, Any]] = None    # Specific body payload

class ApiRequestTemplate(BaseModel):
    """HTTP request configuration for API calls"""
    method: str = "GET"  # GET, POST, PUT, DELETE, PATCH
    headers: Dict[str, str] = Field(default_factory=dict)
    params: Optional[Dict[str, Any]] = Field(default_factory=dict)  # Query params
    body: Optional[Dict[str, Any]] = Field(default_factory=dict)    # Request body for POST/PUT
    timeout: Optional[int] = 30


class ApiResponseStructure(BaseModel):
    """Expected structure of API response"""
    data_path: str = "data"  # JSONPath to array, e.g., "data.items" or "results"
    sample_response: Optional[Dict[str, Any]] = None  # For validation


class FieldMappingItem(BaseModel):
    """Maps one API response field to database column"""
    api_field: str       # Path in response JSON, e.g., "user.profile.email"
    db_field: str        # Column name in entity table
    transform: Optional[str] = None  # "uppercase", "lowercase", "extract_domain", etc.
    required: Optional[bool] = False


class ApiSourceRequest(BaseModel):
    """Request to create/update API source"""
    name: str
    api_url: str  # Changed from HttpUrl to str for flexibility
    api_key: Optional[str] = None  # Will be encrypted before storage
    request_template: ApiRequestTemplate = Field(default_factory=ApiRequestTemplate)
    response_structure: ApiResponseStructure = Field(default_factory=ApiResponseStructure)
    entity_name: str  # Which entity table to store results
    field_mappings: List[FieldMappingItem]


class ApiSourceInfo(BaseModel):
    """Response model fully populated for the frontend"""
    id: int
    name: str
    api_url: str
    entity_name: str
    # Return full objects so frontend form can populate
    request_template: Dict[str, Any] 
    response_structure: Dict[str, Any]
    field_mappings: List[FieldMappingItem]
    created_at: datetime

class ApiSourcesListResponse(BaseModel):
    total_sources: int
    sources: List[ApiSourceInfo]

class ApiSourceTestRequest(BaseModel):
    """Request to test API source connection"""
    limit: Optional[int] = 10  # How many items to fetch for preview


class ApiSourceTestResponse(BaseModel):
    """Response from testing API source"""
    success: bool
    message: str
    sample_item: Optional[Dict[str, Any]] = None
    total_items: Optional[int] = None
    error: Optional[str] = None
    response_keys: Optional[List[str]] = None
