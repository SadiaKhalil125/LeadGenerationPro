# import asyncio
# from helperutil import extract_website
# from models import ScrapeRequest, FieldMapping, FollowLink


# async def run_test():
#     """
#     TEST CASE:
#     - Scrape Clutch AWS partners listing
#     - Extract company name
#     - Extract profile URL (href)
#     - Follow profile page
#     - Extract extra fields from profile page
#     """

#     request = ScrapeRequest(
#         entity_name="Company",
#         url="https://clutch.co/it-services/cloud/aws-partners",
#         container_selector="li.provider-list-item",

#         # -------- PRIMARY PAGE FIELDS --------
#         field_mappings={
#             "companyname": FieldMapping(
#                 selector="h3.provider__title",
#                 extract="text"
#             ),
#             "profile_url": FieldMapping(
#                 selector="a.directory_profile",
#                 extract="href"      
#             )
#         },

#         # -------- FOLLOW PAGE CONFIG --------
#         follow_links=[
#             FollowLink(
#                 name="profile",              # prefix for merged fields
#                 selector="profile_url",      # FIELD NAME (not CSS!)
#                 field_mappings={
#                     "year_found": FieldMapping(
#                         selector="span.profile-summary__detail-title",
#                         extract="text"
#                     ),
#                     "instagram": FieldMapping(
#                         selector="a.profile-social-media__link--instagram",
#                         extract="href"
#                     )
#                 }
#             )
#         ],

#         timeout=50,
#         pagination_config=None
#     )

#     print("\n🚀 Running Crawl Test...\n")

#     response = await extract_website(request)

#     print("=== TEST RESULTS ===")
#     print("Success:", response.success)
#     print("Total Items:", response.total_items)
#     print("-" * 50)

#     for idx, row in enumerate(response.data, start=1):
#         print(f"[{idx}]")
#         for k, v in row.items():
#             print(f"  {k}: {v}")
#         print("-" * 50)


# if __name__ == "__main__":
#     asyncio.run(run_test())
import asyncio
from helperutil import extract_website
from models import ScrapeRequest, FieldMapping, FollowLink


async def run_test():
    """
    TEST CASE:
    - Scrape Clutch AWS partners listing
    - Extract company name
    - Extract profile URL (href)
    - Follow profile page
    - Extract extra fields from profile page
    """

    request = ScrapeRequest(
        entity_name="Company",
        url="https://www.hotfrog.com/search/us/marketing-%26-sales",
        container_selector="div.hf-box-wrap",

        # -------- PRIMARY PAGE FIELDS --------
        field_mappings={
            "companyname": FieldMapping(
                selector="h3 a strong",
                extract="text"
            ),
            "profile_url": FieldMapping(
                selector="h3 a",
                extract="href"      
            )
        },

        # -------- FOLLOW PAGE CONFIG --------
        follow_links=[
            FollowLink(
                name="profile",              # prefix for merged fields
                selector="profile_url",      # FIELD NAME (not CSS!)
                field_mappings={
                    "description": FieldMapping(
                        selector="div#description p",
                        extract="text"
                    )
                }
            )
        ],

        timeout=50,
        pagination_config=None
    )

    print("\n🚀 Running Crawl Test...\n")

    response = await extract_website(request)

    print("=== TEST RESULTS ===")
    print("Success:", response.success)
    print("Total Items:", response.total_items)
    print("-" * 50)

    for idx, row in enumerate(response.data, start=1):
        print(f"[{idx}]")
        for k, v in row.items():
            print(f"  {k}: {v}")
        print("-" * 50)


if __name__ == "__main__":
    asyncio.run(run_test())
