# import os
# import sys
# import asyncio
# import logging
# from typing import Dict, Any

# # Ensure the backend root is on sys.path so `routers.services.*` can be imported.
# current_dir = os.path.dirname(os.path.abspath(__file__))
# if current_dir not in sys.path:
#     sys.path.insert(0, current_dir)

# # Import the core scraping and AI fallback logic
# try:
#     from routers.services.website_scraper import scrape_site
#     from routers.services.ai_enrichment_service import find_contact_info_via_search
# except ImportError as _err:
#     print(f"Error: Could not import enrichment services: {_err}")
#     print("Ensure you are running this from the backend directory.")
#     sys.exit(1)

# # Setup logging - set to INFO to see the pipeline's progress
# logging.basicConfig(
#     level=logging.INFO,
#     format="%(asctime)s [%(levelname)s] %(message)s",
#     datefmt="%H:%M:%S"
# )
# logger = logging.getLogger(__name__)

# async def run_test_enrichment(lead: Dict[str, str]):
#     """
#     Runs the full enrichment pipeline for a single lead.
#     1. Heuristics
#     2. Home page link scanning
#     3. AI Google Search fallback (if data is missing)
#     """
#     print(f"\n{'='*80}")
#     print(f"ENRICHING: {lead['name']} @ {lead['company']} ({lead['website']})")
#     print(f"{'='*80}")
    
#     try:
#         # We run scrape_site in a thread because it uses asyncio.run() internally for the AI fallback
#         # and we don't want to block the current event loop.
#         result = await asyncio.to_thread(
#             scrape_site,
#             raw_url=lead["website"],
#             delay=0.1,
#             name=lead["name"],
#             company=lead["company"]
#         )
        
#         print(f"\n[RESULTS]")
#         print(f"  Contact Page: {result.get('contact_page', 'Not found')}")
#         print(f"  Email(s):     {', '.join(result.get('emails', [])) or 'None found'}")
#         print(f"  Phone(s):     {', '.join(result.get('phones', [])) or 'None found'}")
        
#         if result.get("error"):
#             print(f"  Error Log:    {result['error']}")
            
#     except Exception as e:
#         logger.error(f"Test failed for {lead['website']}: {e}")

# async def main():
#     # Test cases:
#     # 1. A site where heuristics should work (common contact path)
#     # 2. A site where AI fallback will likely be needed for specific person data
#     test_leads = [
#         {
#             "name": "Support Team", 
#             "company": "HubSpot", 
#             "website": "https://www.hubspot.com"
#         },
#         # {
#         #     "name": "Satya Nadella", 
#         #     "company": "Microsoft", 
#         #     "website": "microsoft.com"
#         # }
#     ]
    
#     print("Starting Lead Generation Pro Enrichment Test Pipeline...")
    
#     for lead in test_leads:
#         await run_test_enrichment(lead)
    
#     print("\nTest completed.")

# if __name__ == "__main__":
#     try:
#         asyncio.run(main())
#     except KeyboardInterrupt:
#         pass


# test_hunter_api.py
import httpx
from routers.services.outreach_config import settings

def test_hunter(first, last, domain):
    params = {
        "first_name": first,
        "last_name": last,
        "domain": domain,
        "api_key": settings.HUNTER_API_KEY
    }
    print(f"Testing Hunter for {first} {last} @ {domain}...")
    resp = httpx.get("https://api.hunter.io/v2/email-finder", params=params)
    if resp.status_code == 200:
        print("Success!", resp.json())
    else:
        print(f"Failed ({resp.status_code}):", resp.text)

if __name__ == "__main__":
    test_hunter("Patrick", "Collison", "stripe.com")
