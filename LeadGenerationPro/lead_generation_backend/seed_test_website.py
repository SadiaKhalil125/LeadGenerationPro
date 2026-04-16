import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from routers.get_db_connection import get_db_cursor

TABLE = "test_contacts_website"

TABLE2 = "enrichment_jobs"


ROWS = [
    {"website": "https://bookme.pk/", "organization_name": "Bookme"},
    {"website": "https://www.zendesk.com/", "organization_name": "Zendesk"},
    {"website": "https://mailchimp.com/", "organization_name": "Mailchimp"},
    {"website": "https://www.hubspot.com/", "organization_name": "HubSpot"},
    {"website": "https://www.adobe.com/", "organization_name": "Adobe"},
    {"website": "https://www.paypal.com/", "organization_name": "PayPal"},
    {"website": "https://www.atlassian.com/company/", "organization_name": "Atlassian"},
    {"website": "https://www.freshworks.com/company/", "organization_name": "Freshworks"}
]

def main():
    conn, cur = get_db_cursor()

    cur.execute(f"DROP TABLE IF EXISTS {TABLE2};")
    cur.execute(f"DROP TABLE IF EXISTS {TABLE};")
    cur.execute(f"""
        CREATE TABLE {TABLE} (
            id SERIAL PRIMARY KEY,
            organization_name TEXT,
            website TEXT,
            modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            source TEXT NULL
        );
    """)
    conn.commit()
    print(f"[OK] Created table '{TABLE}'")

    insert_sql = f"INSERT INTO {TABLE} (organization_name, website) VALUES (%s, %s)"
    for row in ROWS:
        cur.execute(insert_sql, (row["organization_name"], row["website"]))
    conn.commit()
    print(f"[OK] Inserted {len(ROWS)} rows into '{TABLE}'")

    cur.execute(f"SELECT id, organization_name, website FROM {TABLE};")
    rows = cur.fetchall()
    print("\n[Preview]")
    print(f"{'ID':<4} {'Organization':<15} {'Website'}")
    print("-" * 60)
    for r in rows:
        print(f"{r[0]:<4} {r[1]:<15} {r[2]}")

    cur.close()
    conn.close()
    print(f"\n[Done] Use entity '{TABLE}' in the Enrichment Dashboard with provider Website Parse.")

if __name__ == "__main__":
    main()
