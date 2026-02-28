import os
from dotenv import load_dotenv

# This is the crucial line you might be missing!
load_dotenv()

class Settings:
    SMTP_HOST = os.getenv("SMTP_HOST")
    SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
    SMTP_USER = os.getenv("SMTP_USERNAME")
    SMTP_PASS = os.getenv("SMTP_PASSWORD")
    SMTP_EMAIL_FROM = os.getenv("SMTP_FROM_EMAIL")
    SMTP_NAME_FROM = os.getenv("SMTP_FROM_NAME")
    #SMTP_SECURE = os.getenv("SMTP_SECURE", "true").lower() == "true"
    #OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")
    SENDGRID_FROM_EMAIL = os.getenv("SENDGRID_FROM_EMAIL")
    SENDGRID_FROM_NAME = os.getenv("SENDGRID_FROM_NAME")
    

settings = Settings()