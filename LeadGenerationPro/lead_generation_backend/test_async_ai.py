# test_async_ai.py
import asyncio
import time
from routers.services.ai_service import generate_email, enrich_contacts

async def test_async_performance():
    # Test email generation
    start = time.time()
    
    tasks = [
        generate_email("Write email for AI product to healthcare companies"),
        #generate_email("Write email for CRM to real estate agents"),
        generate_email("Write email for marketing tool to e-commerce stores"),
    ]
    
    results = await asyncio.gather(*tasks)
    
    duration = time.time() - start
    print(f"Generated {len(results)} emails in {duration:.2f} seconds")
    print("Generated emails:")
    for email in results:
        print(email)
    
    # Test enrichment with multiple contacts
    contacts = [
        {"name": "John Doe", "company": "TechCorp", "email": "john@techcorp.com"},
        {"name": "Jane Smith", "company": "HealthPlus", "email": "jane@healthplus.com"},
      #  {"name": "Bob Johnson", "company": "EcomStore", "email": "bob@ecomstore.com"},
    ]
    
    start = time.time()
    enriched = await enrich_contacts(contacts)
    duration = time.time() - start
    
    print(f"Enriched {len(enriched)} contacts in {duration:.2f} seconds")
    print("Enriched contacts:")
    for contact in enriched:
        print(contact)

if __name__ == "__main__":
    asyncio.run(test_async_performance())