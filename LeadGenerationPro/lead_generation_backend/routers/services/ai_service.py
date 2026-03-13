# ai_service.py
import json
import logging
import asyncio
from typing import Dict, List, Optional
import google.generativeai as genai
import os
from .outreach_config import settings

GEMINI_API_KEY = settings.GEMINI_API_KEY

logger = logging.getLogger(__name__)

# Configure Gemini
genai.configure(api_key=GEMINI_API_KEY)

# Use the appropriate Gemini model
MODEL = "gemini-3.1-flash-lite-preview"  # or "gemini-1.5-flash" for faster/cheaper responses

# Create a single model instance to reuse (optional optimization)
_model = None

def get_model():
    """Get or create Gemini model instance"""
    global _model
    if _model is None:
        _model = genai.GenerativeModel(MODEL)
    return _model

async def generate_email(prompt: str) -> str:
    """
    Generate a personalized email using Gemini based on campaign details.
    """
    # Extract campaign details from the prompt
    # The prompt comes from frontend with product, audience, and goal
    
    system_prompt = """You are an expert email copywriter specializing in B2B sales outreach. 
    Your task is to write a compelling, personalized cold outreach email based on the user's campaign details.

    CRITICAL RULES:
    1. You MUST ALWAYS use ONLY these three placeholders: {{name}}, {{company}}, {{sender_name}}
    2. DO NOT create custom placeholders like {{Product Name}}, {{Your Name}}, {{industry}} etc.
    3. You MUST end the email exactly with "Best regards," followed by a new line and the placeholder {{sender_name}}
    4. The email should have a clear subject line starting with "Subject: "
    5. Keep it concise (150-200 words)
    6. Include a clear call-to-action based on the user's goal
    7. Make it sound natural and conversational, not robotic
    
    Format:
    Subject: [Compelling subject line with {{company}} if relevant]
    
    Hi {{name}},
    
    [Email body with personalization and value proposition]
    
    [Call-to-action]
    
    Best regards,
    {{sender_name}}
    """
    
    try:
        full_prompt = f"{system_prompt}\n\nUser Campaign: {prompt}\n\nGenerate the email now:"
        
        email_content = await asyncio.to_thread(
            generate_email_sync,
            full_prompt
        )
        
        # Clean up any remaining invalid placeholders
        email_content = clean_placeholders(email_content)
        
        return email_content
            
    except Exception as e:
        logger.error(f"Error generating email with Gemini: {str(e)}")
        return get_fallback_email()

def generate_email_sync(prompt: str) -> str:
    """Synchronous function to generate email"""
    try:
        model = get_model()
        
        response = model.generate_content(
            prompt,
            generation_config={
                "temperature": 0.7,
                "max_output_tokens": 800,
                "top_p": 0.95,
                "top_k": 40
            }
        )
        
        if response and response.text:
            return response.text.strip()
        else:
            logger.error("Empty response from Gemini")
            return get_fallback_email()
    except Exception as e:
        logger.error(f"Error in sync email generation: {str(e)}")
        return get_fallback_email()

def clean_placeholders(email: str) -> str:
    """Clean up any invalid placeholders"""
    # Define allowed placeholders
    allowed_placeholders = ['{{name}}', '{{company}}']
    
    # Split into lines to process
    lines = email.split('\n')
    cleaned_lines = []
    
    for line in lines:
        # Check if line has any placeholders
        if '{{' in line and '}}' in line:
            # Extract all placeholders in this line
            words = line.split()
            cleaned_words = []
            
            for word in words:
                if word.startswith('{{') and word.endswith('}}'):
                    # This is a placeholder
                    placeholder = word.lower()
                    if placeholder not in allowed_placeholders:
                        # Replace invalid placeholder with appropriate one
                        if 'name' in placeholder:
                            cleaned_words.append('{{name}}')
                        elif 'company' in placeholder:
                            cleaned_words.append('{{company}}')
                        else:
                            # Skip invalid placeholders
                            continue
                    else:
                        cleaned_words.append(word)
                else:
                    cleaned_words.append(word)
            
            cleaned_lines.append(' '.join(cleaned_words))
        else:
            cleaned_lines.append(line)
    
    return '\n'.join(cleaned_lines)

def get_fallback_email() -> str:
    """Return a clean fallback email template"""
    return """Subject: Quick question about {{company}}

Hi {{name}},

I hope this email finds you well. I've been following {{company}}'s work and I'm impressed by what you're building.

We help companies like yours streamline their operations and achieve better results. I'd love to show you how we could help {{company}}.

Would you be open to a quick 15-minute call next week to discuss this further?

Best regards,
[Your name]"""

async def enrich_lead(lead_data: Dict[str, str]) -> Dict[str, str]:
    """
    Enrich lead data with additional information using Gemini.
    Fully async implementation using asyncio.to_thread.
    Falls back gracefully if information cannot be found.
    """
    enriched = lead_data.copy()
    
    # Skip enrichment if we already have enough data
    if (lead_data.get('company') and lead_data.get('industry') and 
        lead_data.get('linkedin') and lead_data.get('role')):
        return enriched
    
    # Build prompt for enrichment
    prompt = f"""Based on the following lead information, provide relevant details about the person and their company.
    Only provide information you're highly confident about. If unsure, leave fields empty.
    
    Lead Information:
    - Name: {lead_data.get('name', 'Unknown')}
    - Email: {lead_data.get('email', 'Unknown')}
    - Company: {lead_data.get('company', 'Unknown')}
    - Role: {lead_data.get('role', 'Unknown')}
    
    Please provide ONLY the following fields in valid JSON format, leave empty if uncertain:
    {{
        "company_website": "website if you can infer from company name",
        "industry": "industry based on company name",
        "company_size": "small/medium/large based on company name",
        "likely_challenges": ["challenge 1", "challenge 2"],
        "personalization_hook": "a specific detail to mention in outreach"
    }}
    
    IMPORTANT: Do NOT hallucinate. Only provide information you're certain about.
    Return ONLY the JSON object, no other text."""
    
    try:
        # Run the synchronous enrichment in a thread pool
        enriched_data = await asyncio.to_thread(
            enrich_lead_sync,
            prompt,
            enriched
        )
        
        return enriched_data
        
    except Exception as e:
        logger.error(f"Error enriching lead with Gemini: {str(e)}")
        return lead_data  # Return original data if enrichment fails

def enrich_lead_sync(prompt: str, enriched: Dict) -> Dict:
    """Synchronous function to enrich lead (runs in thread pool)"""
    try:
        model = get_model()
        
        response = model.generate_content(
            prompt,
            generation_config={
                "temperature": 0.3,  # Lower temperature for more factual responses
                "max_output_tokens": 500,
                "top_p": 0.95,
                "top_k": 40
            }
        )
        
        if response and response.text:
            enrichment_data = response.text.strip()
            
            # Try to parse JSON response
            try:
                # Clean the response to extract JSON (remove markdown if present)
                json_str = enrichment_data
                if '```json' in json_str:
                    json_str = json_str.split('```json')[1].split('```')[0]
                elif '```' in json_str:
                    json_str = json_str.split('```')[1].split('```')[0]
                
                enrichment_dict = json.loads(json_str.strip())
                
                # Only add non-empty values
                for key, value in enrichment_dict.items():
                    if value and str(value).strip():
                        enriched[key] = value
            except json.JSONDecodeError:
                logger.warning(f"Could not parse enrichment JSON: {enrichment_data}")
                # Try to extract information if it's not proper JSON
                enriched = extract_info_from_text(enriched, enrichment_data)
        
        return enriched
        
    except Exception as e:
        logger.error(f"Error in sync enrichment: {str(e)}")
        return enriched


def extract_info_from_text(enriched: Dict, text: str) -> Dict:
    """
    Fallback method to extract information from text if JSON parsing fails
    """
    text_lower = text.lower()
    
    # Simple extraction for common fields
    if 'website:' in text_lower:
        # Try to extract website
        pass
    if 'industry:' in text_lower:
        # Try to extract industry
        pass
    
    return enriched


# In ai_service.py, modify the enrich_contacts function

async def enrich_contacts(contacts: List[Dict[str, str]]) -> List[Dict[str, str]]:
    """
    Enrich multiple contacts with better rate limit handling
    """
    if not contacts:
        return []
    
    total = len(contacts)
    logger.info(f"Starting enrichment for {total} contacts")
    
    # REDUCE BATCH SIZE for free tier
    batch_size = 3  # Changed from 5 to 2
    enriched_contacts = []
    
    for i in range(0, total, batch_size):
        batch = contacts[i:i + batch_size]
        logger.info(f"Processing batch {i//batch_size + 1}, contacts {i+1} to {min(i+batch_size, total)}")
        
        # Process batch sequentially (not in parallel)
        for contact in batch:
            try:
                enriched = await enrich_lead(contact)
                enriched_contacts.append(enriched)
                # Add delay between individual requests
                await asyncio.sleep(1)  # 1 second delay
            except Exception as e:
                logger.error(f"Error enriching contact: {str(e)}")
                enriched_contacts.append(contact)  # Return original on error
        
        # Longer delay between batches
        if i + batch_size < total:
            logger.info("Waiting 1 seconds before next batch...")
            await asyncio.sleep(1)
    
    logger.info(f"Completed enrichment for {total} contacts")
    return enriched_contacts