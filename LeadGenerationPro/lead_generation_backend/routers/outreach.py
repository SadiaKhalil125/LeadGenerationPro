from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional
import logging
from models import OutreachRequest

from .services.csv_service import parse_csv
from .services.ai_service import generate_email
from .services.outreach_service import execute_campaign
from .services.template_service import render_template

router = APIRouter()
logger = logging.getLogger(__name__)

class AIRequest(BaseModel):
    prompt: str

class PreviewRequest(BaseModel):
    template: str
    contact: Dict


@router.post("/upload")
async def upload_csv(file: UploadFile = File(...)):
    """Upload and parse CSV file"""
    try:
        print(f"Received file: {file.filename}, type: {file.content_type}")
        # Validate file type
        if not file.filename.endswith('.csv'):
            raise HTTPException(status_code=400, detail="Only CSV files are allowed")
        
        contacts = await parse_csv(file)
        
        # Normalize keys to lowercase for consistent processing
        contacts = [{k.lower(): v for k, v in row.items()} for row in contacts]
        
        initial_count = len(contacts)
        # Filter out contacts without an email
        contacts = [c for c in contacts if c.get('email') and str(c.get('email')).strip()]
        removed_count = initial_count - len(contacts)

        logger.info(f"CSV Upload: {len(contacts)} valid contacts, {removed_count} removed (no email)")

        return {
            "count": len(contacts), 
            "removed_count": removed_count,
            "contacts": contacts,
            "message": f"Successfully loaded {len(contacts)} contacts. {removed_count} removed due to missing emails."
        }
    except Exception as e:
        logger.error(f"CSV upload failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"CSV processing failed: {str(e)}")


@router.post("/generate-ai")
async def generate_ai(request: AIRequest):
    """Generate email content using AI"""
    try:
        content = await generate_email(request.prompt)
        return {"generated": content}
    except Exception as e:
        logger.error(f"AI generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")


@router.post("/preview")
async def preview_email(request: PreviewRequest):
    """Preview email with template variables"""
    try:
        # Use the template service for rendering
        rendered = render_template(request.template, request.contact)
        
        # Also replace any remaining variables just in case
        for key, value in request.contact.items():
            placeholder = f"{{{{{key}}}}}"
            if placeholder in rendered:
                rendered = rendered.replace(placeholder, str(value))

        logger.info(f"Preview generated for contact: {request.contact.get('email', 'unknown')}")
        return {"preview": rendered}
    except Exception as e:
        logger.error(f"Preview generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Preview failed: {str(e)}")


@router.post("/send")
async def send_outreach(request: OutreachRequest):
    """Execute email campaign"""
    #request=request.model_dump()
    print(f"Received outreach request: provider={request.provider}, contacts={len(request.contacts)}")
    
    try:
        # Validate required fields
        if not request.contacts:
            raise HTTPException(status_code=400, detail="No contacts provided")
        
        if not request.subject or not request.message:
            raise HTTPException(status_code=400, detail="Subject and message are required")
        
        # Validate provider config
        # if request.provider == "sendgrid" and not request.config.get("api_key"):
        #     raise HTTPException(status_code=400, detail="SendGrid API key is required")
        
        print(f"Executing campaign with provider: {request.provider}")
        results = await execute_campaign(request)

        success = sum(1 for r in results if r["status"] == "sent")
        failed = sum(1 for r in results if r["status"] == "failed")

        return {
            "total": len(results),
            "success": success,
            "failed": failed,
            "details": results,
            "message": f"Campaign completed: {success} sent, {failed} failed"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Campaign failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Campaign failed: {str(e)}")
    
# Add this new Pydantic model
class EnrichRequest(BaseModel):
    contacts: List[Dict]

# Add this new endpoint
@router.post("/enrich")
async def enrich_contacts(request: EnrichRequest):
    """Enrich contact data using AI"""
    try:
        from .services.ai_service import enrich_contacts as enrich_service
        
        enriched_contacts = await enrich_service(request.contacts)
        
        # Count how many were enriched
        enriched_count = sum(1 for original, enriched in zip(request.contacts, enriched_contacts) 
                           if original != enriched)
        
        return {
            "contacts": enriched_contacts,
            "enriched_count": enriched_count,
            "message": f"Successfully enriched {enriched_count} contacts"
        }
    except Exception as e:
        logger.error(f"Enrichment failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Enrichment failed: {str(e)}")