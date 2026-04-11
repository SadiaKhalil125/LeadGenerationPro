# -*- coding: utf-8 -*-
"""
seed_test_apollo.py
-------------------------------------------------------------------
Temporary script - creates table `test_contacts_apollo` and seeds it
with rows in the exact format the Apollo /v1/people/match API needs.

Fields sent to Apollo:
  first_name, last_name, organization_name, domain,
  linkedin_url, title, email (optional - boosts match confidence)

Data used: publicly known executives whose names & company domains are
broadly published in press / Wikipedia. No private data.

Run:
    cd lead_generation_backend
    python scripts/seed_test_apollo.py
-------------------------------------------------------------------
"""

import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from routers.get_db_connection import get_db_cursor

TABLE = "test_contacts_apollo"

# Test rows - well-known figures, data widely indexed in public press/Wikipedia
ROWS = [
    {
        "first_name":         "Patrick",
        "last_name":          "Collison",
        "organization_name":  "Stripe",
        "domain":             "stripe.com",
        "title":              "CEO",
        "linkedin_url":       "https://www.linkedin.com/in/patrickcollison",
        "email":              "",
    },
    {
        "first_name":         "Marc",
        "last_name":          "Benioff",
        "organization_name":  "Salesforce",
        "domain":             "salesforce.com",
        "title":              "CEO",
        "linkedin_url":       "https://www.linkedin.com/in/marcbenioff",
        "email":              "",
    },
    {
        "first_name":         "Dharmesh",
        "last_name":          "Shah",
        "organization_name":  "HubSpot",
        "domain":             "hubspot.com",
        "title":              "CTO",
        "linkedin_url":       "https://www.linkedin.com/in/dharmesh",
        "email":              "",
    },
    {
        "first_name":         "Stewart",
        "last_name":          "Butterfield",
        "organization_name":  "Slack",
        "domain":             "slack.com",
        "title":              "CEO",
        "linkedin_url":       "https://www.linkedin.com/in/stewartbutterfield",
        "email":              "",
    },
    {
        "first_name":         "Melanie",
        "last_name":          "Perkins",
        "organization_name":  "Canva",
        "domain":             "canva.com",
        "title":              "CEO",
        "linkedin_url":       "https://www.linkedin.com/in/melanieperkins",
        "email":              "",
    },
    {
        "first_name":         "Tobi",
        "last_name":          "Lutke",
        "organization_name":  "Shopify",
        "domain":             "shopify.com",
        "title":              "CEO",
        "linkedin_url":       "https://www.linkedin.com/in/tobiaslutke",
        "email":              "",
    },
]


def main():
    conn, cur = get_db_cursor()

    # 1. Drop + recreate for clean state
    cur.execute("DROP TABLE IF EXISTS " + TABLE + ";")
    cur.execute("""
        CREATE TABLE """ + TABLE + """ (
            id                SERIAL PRIMARY KEY,
            first_name        TEXT,
            last_name         TEXT,
            organization_name TEXT,
            domain            TEXT,
            title             TEXT,
            linkedin_url      TEXT,
            modified_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            source            TEXT NULL
        );
    """)
    conn.commit()
    print("[OK]  Created table '" + TABLE + "'")

    # 2. Insert rows
    insert_sql = (
        "INSERT INTO " + TABLE +
        " (first_name, last_name, organization_name, domain, title, linkedin_url)"
        " VALUES (%s, %s, %s, %s, %s, %s)"
    )
    for row in ROWS:
        cur.execute(insert_sql, (
            row["first_name"], row["last_name"], row["organization_name"],
            row["domain"], row["title"], row["linkedin_url"]
        ))
    conn.commit()
    print("[OK]  Inserted " + str(len(ROWS)) + " rows into '" + TABLE + "'")

    # 3. Preview
    cur.execute("SELECT id, first_name, last_name, organization_name, domain FROM " + TABLE + ";")
    rows = cur.fetchall()
    print("\n[Preview]")
    print("%-4s %-12s %-14s %-20s %s" % ("ID", "First", "Last", "Organization", "Domain"))
    print("-" * 70)
    for r in rows:
        print("%-4s %-12s %-14s %-20s %s" % (r[0], r[1], r[2], r[3], r[4]))

    cur.close()
    conn.close()
    print("\n[Done] Use entity '" + TABLE + "' in the Enrichment Dashboard with provider Apollo.")
    print("       Apollo matches on: first_name + last_name + domain + organization_name")


if __name__ == "__main__":
    main()
