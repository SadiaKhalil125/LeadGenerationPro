import smtplib
from email.mime.text import MIMEText
from .base import BaseProvider
from ..outreach_config import settings

class SMTPProvider(BaseProvider):

    def __init__(self, config):
        self.server = settings.SMTP_HOST
        self.port = settings.SMTP_PORT
        self.username = settings.SMTP_USER
        self.password = settings.SMTP_PASS
        self.from_email = settings.SMTP_EMAIL_FROM
        self.from_name = settings.SMTP_NAME_FROM

    # signature matches sendgrid and execute_campaign
    async def send(self, subject, message, contact):
        try:
           
            # 1. Fallback: If from_email wasn't provided in config, use the username
            sender_address = self.from_email if self.from_email else self.username

            server = smtplib.SMTP(self.server, self.port)
            server.starttls()
            print(f"DEBUG: Connecting to {settings.SMTP_HOST} as {settings.SMTP_USER} with pass length: {len(settings.SMTP_PASS) if settings.SMTP_PASS else 0}")
            server.login(self.username, self.password)

            # message body may be HTML - use proper variable name
            msg = MIMEText(message, "html")
            msg["Subject"] = subject
            # Use the validated sender_address here
            msg["From"] = f"{self.from_name} <{sender_address}>" if self.from_name else sender_address
            msg["To"] = contact["email"]
            
            # 2. Match the envelope sender (first arg) to the message header
            server.sendmail(sender_address, contact["email"], msg.as_string())
            server.quit()

            return {"email": contact["email"], "status": "sent"}

        except Exception as e:
            print("SMTP ERROR:", str(e))
            return {"email": contact["email"], "status": "failed", "error": str(e)}