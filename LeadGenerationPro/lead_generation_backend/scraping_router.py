from models import ScrapeRequest, ScrapeResponse
from google_maps_scraper import scrape_google_maps, is_google_maps_url
from crawl4Util import extract_website
import re

# Google Maps supported fields with their canonical names and aliases
GOOGLE_MAPS_SUPPORTED_FIELDS = {
    'name': ['name', 'business_name', 'place_name', 'title', 'company_name'],
    'address': ['address', 'location', 'street_address', 'full_address'],
    'phone': ['phone', 'phone_number', 'contact', 'telephone'],
    'website': ['website', 'url', 'web', 'site'],
    'rating': ['rating', 'reviews_average', 'average_rating', 'score'],
    'reviews_count': ['reviews_count', 'review_count', 'total_reviews', 'number_of_reviews'],
    'category': ['category', 'type', 'place_type', 'business_type'],
    'hours': ['hours', 'opens_at', 'opening_hours', 'business_hours'],
    'description': ['description', 'introduction', 'about', 'overview'],
}

def normalize_field_name(field_name: str) -> str:
    """Normalize field name to canonical Google Maps field name."""
    field_lower = field_name.lower().strip()
    
    # Check if it matches any canonical name or alias
    for canonical, aliases in GOOGLE_MAPS_SUPPORTED_FIELDS.items():
        if field_lower in aliases:
            return canonical
    
    return None  # Not a supported Google Maps field

def has_google_maps_support(field_mappings: dict) -> tuple[bool, dict, dict]:
    """
    Check if field mappings can be handled by Google Maps scraper.
    
    Returns:
        tuple: (can_use_google_maps, supported_mappings, unsupported_mappings)
    """
    supported = {}
    unsupported = {}
    
    for field_name, field_mapping in field_mappings.items():
        canonical_name = normalize_field_name(field_name)
        
        if canonical_name:
            # Field is supported by Google Maps
            # Only include in supported if selector is empty (for auto-extraction)
            # If selector is provided, user wants custom CSS scraping
            if not field_mapping.selector or not field_mapping.selector.strip():
                # Empty selector = use Google Maps auto-extraction
                supported[field_name] = {
                    'canonical': canonical_name,
                    'original_mapping': field_mapping
                }
            else:
                # Custom selector provided = use CSS scraping
                unsupported[field_name] = field_mapping
        else:
            # Field requires custom CSS selector
            if field_mapping.selector and field_mapping.selector.strip():
                unsupported[field_name] = field_mapping
    
    # Can use Google Maps if at least one field remains in supported (has empty selector)
    can_use_google = len(supported) > 0
    
    return can_use_google, supported, unsupported

async def route_scraping_request(request: ScrapeRequest) -> ScrapeResponse:
    """
    Intelligently route scraping request to appropriate scraper.
    
    Logic:
    1. If URL is Google Maps AND user hasn't provided custom selectors for fields:
       - Use Google Maps scraper for supported fields
       - Use custom scraper for unsupported fields (if any)
    2. Otherwise, use custom CSS scraper for all fields
    """
    url_str = str(request.url)
    is_google_maps = is_google_maps_url(url_str)
    
    if is_google_maps:
        can_use_google, supported, unsupported = has_google_maps_support(request.field_mappings)
        
        if can_use_google and len(supported) > 0:
            # Build field mappings for Google Maps scraper using canonical names
            google_maps_mappings = {}
            for field_name, info in supported.items():
                google_maps_mappings[field_name] = request.field_mappings[field_name]
            
            # Create request for Google Maps scraper
            google_request = ScrapeRequest(
                entity_name=request.entity_name,
                url=request.url,
                container_selector=None,  # Google Maps doesn't use container selector
                field_mappings=google_maps_mappings,
                max_items=request.max_items,
                timeout=request.timeout
            )
            
            # Scrape with Google Maps scraper
            google_response = await scrape_google_maps(google_request)
            
            # If there are unsupported fields, we could optionally merge with custom scraping
            # For now, just return Google Maps results
            if unsupported:
                google_response.message += f" (Note: {len(unsupported)} custom fields were skipped - Google Maps scraper only)"
            
            return google_response
    
    # Fall back to custom CSS scraper for non-Google Maps or when custom selectors provided
    return await extract_website(request)