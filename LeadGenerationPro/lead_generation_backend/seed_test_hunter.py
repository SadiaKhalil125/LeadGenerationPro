# -*- coding: utf-8 -*-
"""
seed_test_hunter.py
-------------------------------------------------------------------
Temporary script - creates table `test_contacts_hunter` and seeds it
with rows in the exact format Hunter /v2/email-finder requires.

REQUIRED by Hunter API:
  first_name, last_name, domain

Optional (improve results):
  company_name, title, linkedin_url

Data: publicly known people at companies with well-indexed domains.
Hunter returns best results for corporate domains it has crawled
(Stripe, HubSpot, Salesforce etc. have high hit-rates).

Run:
    cd lead_generation_backend
    python scripts/seed_test_hunter.py
-------------------------------------------------------------------
"""

import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from routers.get_db_connection import get_db_cursor

TABLE = "test_contacts_hunter"

# Hunter MUST have: first_name + last_name + domain
# It constructs email pattern automatically from the domain's MX records.
ROWS = [
    {
        "first_name":   "Patrick",
        "last_name":    "Collison",
        "domain":       "stripe.com",       # Hunter has 92%+ confidence for stripe.com
        "company_name": "Stripe",
        "title":        "CEO",
        "linkedin_url": "https://www.linkedin.com/in/patrickcollison",
    },
    {
        "first_name":   "Brian",
        "last_name":    "Halligan",
        "domain":       "hubspot.com",
        "company_name": "HubSpot",
        "title":        "Executive Chairman",
        "linkedin_url": "https://www.linkedin.com/in/brianhalligan",
    },
    {
        "first_name":   "Des",
        "last_name":    "Traynor",
        "domain":       "intercom.com",
        "company_name": "Intercom",
        "title":        "Co-founder & Chief Strategy Officer",
        "linkedin_url": "https://www.linkedin.com/in/destraynor",
    },
    {
        "first_name":   "Sam",
        "last_name":    "Altman",
        "domain":       "openai.com",
        "company_name": "OpenAI",
        "title":        "CEO",
        "linkedin_url": "https://www.linkedin.com/in/samaltman",
    },
    {
        "first_name":   "Aaron",
        "last_name":    "Levie",
        "domain":       "box.com",
        "company_name": "Box",
        "title":        "CEO",
        "linkedin_url": "https://www.linkedin.com/in/aaronlevie",
    },
    {
        "first_name":   "Scott",
        "last_name":    "Farquhar",
        "domain":       "atlassian.com",
        "company_name": "Atlassian",
        "title":        "CEO",
        "linkedin_url": "https://www.linkedin.com/in/scottfarquhar",
    },
]


def main():
    conn, cur = get_db_cursor()

    # 1. Drop + recreate
    cur.execute("DROP TABLE IF EXISTS " + TABLE + ";")
    cur.execute("""
        CREATE TABLE """ + TABLE + """ (
            id           SERIAL PRIMARY KEY,
            first_name   TEXT NOT NULL,
            last_name    TEXT NOT NULL,
            domain       TEXT NOT NULL,
            company_name TEXT,
            title        TEXT,
            linkedin_url TEXT,
            modified_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            source       TEXT NULL
        );
    """)
    conn.commit()
    print("[OK]  Created table '" + TABLE + "'")

    # 2. Insert rows
    insert_sql = (
        "INSERT INTO " + TABLE +
        " (first_name, last_name, domain, company_name, title, linkedin_url)"
        " VALUES (%s, %s, %s, %s, %s, %s)"
    )
    for row in ROWS:
        cur.execute(insert_sql, (
            row["first_name"], row["last_name"], row["domain"],
            row["company_name"], row["title"], row["linkedin_url"],
        ))
    conn.commit()
    print("[OK]  Inserted " + str(len(ROWS)) + " rows into '" + TABLE + "'")

    # 3. Preview
    cur.execute("SELECT id, first_name, last_name, domain, company_name FROM " + TABLE + ";")
    rows = cur.fetchall()
    print("\n[Preview]")
    print("%-4s %-10s %-14s %-22s %s" % ("ID", "First", "Last", "Domain", "Company"))
    print("-" * 70)
    for r in rows:
        print("%-4s %-10s %-14s %-22s %s" % (r[0], r[1], r[2], r[3], r[4]))

    cur.close()
    conn.close()
    print("\n[Done] Use entity '" + TABLE + "' in the Enrichment Dashboard with provider Hunter.")
    print("       Hunter requires: first_name + last_name + domain -- all present [OK]")


if __name__ == "__main__":
    main()
