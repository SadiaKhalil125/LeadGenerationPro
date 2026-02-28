from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from .base import BaseProvider
from ..outreach_config import settings

class SendGridProvider(BaseProvider):

    def __init__(self, config=None):
        # If config is not provided or empty, use environment variables
        #print(f"Initializing SendGridProvider with config: {config}")
        if not config or not config.get("api_key"):
            self.api_key = settings.SENDGRID_API_KEY
            self.from_email = settings.SENDGRID_FROM_EMAIL
            self.from_name = settings.SENDGRID_FROM_NAME
        else:
            self.api_key = config.get("api_key")
            self.from_email = config.get("from_email")
            self.from_name = config.get("from_name", "")
        
        self.is_eu_region = config.get("is_eu_region", False) if config else False
        
        # Validate required fields
        if not self.api_key:
            raise ValueError("SENDGRID_API_KEY is required")
        if not self.from_email:
            raise ValueError("SENDGRID_FROM_EMAIL is required")

    async def send(self, subject, message, contact, html_content=None):
        try:
            sg = SendGridAPIClient(self.api_key)
            email = Mail(
                from_email=self.from_email,
                to_emails=contact["email"],
                subject=subject,
            )
            if html_content:
                email.add_content(self._personalize_content(html_content, contact), "text/html")
                email.add_content(message, "text/plain")
            else:
                email.add_content(message, "text/plain")
            
            response = sg.send(email)
    
            # Simple print to check acceptance
            print(f"SendGrid status for {contact['email']}: {response.status_code}")
    
            if response.status_code == 202:
                return {"email": contact["email"], "status": "sent", "provider": "sendgrid"}
            else:
                return {"email": contact["email"], "status": "failed", "provider": "sendgrid", "error": f"Status {response.status_code}"}
            
        except Exception as e:
            print(f"Send failed for {contact['email']}: {e}")
            return {"email": contact["email"], "status": "failed", "provider": "sendgrid", "error": str(e)}