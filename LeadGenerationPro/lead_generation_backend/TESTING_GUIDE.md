# Quick Testing Guide - API Sources Integration

## Prerequisites
- Backend API running (FastAPI on port 8000)
- PostgreSQL running with existing database
- Kafka running (for task queue)
- Worker running (for task execution)

## Test 1: Verify API Sources Schema Created

### Using psql CLI:
```bash
psql -U postgres -d lead_generation -c "\dt api_sources"
```

Expected output: Table exists with columns (id, name, entity_name, api_url, api_key, request_template, response_structure, field_mappings, created_at, updated_at)

### Via Python:
```python
import httpx
# The schema should auto-initialize on app startup
# Check logs for: "API sources schema initialized successfully" or similar
```

## Test 2: Create a Test Entity (if not exists)

### Create "CryptoPrice" entity:
```bash
curl -X POST http://localhost:8000/entity-definitions/ \
  -H "Content-Type: application/json" \
  -d '{
    "name": "CryptoPrice",
    "fields": {
      "name": "string",
      "symbol": "string",
      "price": "float",
      "market_cap": "float"
    },
    "unique_fields": ["symbol"]
  }'
```

Response: Should return entity_id and confirmation

## Test 3: Create an API Source

### Create CoinGecko API source:
```bash
curl -X POST http://localhost:8000/api-sources/ \
  -H "Content-Type: application/json" \
  -d '{
    "name": "CoinGecko Live",
    "api_url": "https://api.coingecko.com/api/v3/coins/markets",
    "api_key": null,
    "entity_name": "CryptoPrice",
    "request_template": {
      "method": "GET",
      "params": {
        "vs_currency": "usd",
        "order": "market_cap_desc",
        "per_page": 10
      },
      "timeout": 30
    },
    "response_structure": {
      "data_path": "$"
    },
    "field_mappings": [
      {"api_field": "name", "db_field": "name"},
      {"api_field": "symbol", "db_field": "symbol", "transform": "uppercase"},
      {"api_field": "current_price", "db_field": "price"},
      {"api_field": "market_cap", "db_field": "market_cap"}
    ]
  }'
```

Expected: 201 Created with api_source_id (e.g., {"success": true, "api_source_id": 1})

### Or use Python:
```python
import httpx
import json

async def test_create_api_source():
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "http://localhost:8000/api-sources/",
            json={
                "name": "CoinGecko Live",
                "api_url": "https://api.coingecko.com/api/v3/coins/markets",
                "api_key": None,
                "entity_name": "CryptoPrice",
                "request_template": {
                    "method": "GET",
                    "params": {
                        "vs_currency": "usd",
                        "order": "market_cap_desc",
                        "per_page": 10
                    }
                },
                "response_structure": {
                    "data_path": "$"
                },
                "field_mappings": [
                    {"api_field": "name", "db_field": "name"},
                    {"api_field": "symbol", "db_field": "symbol", "transform": "uppercase"},
                    {"api_field": "current_price", "db_field": "price"},
                    {"api_field": "market_cap", "db_field": "market_cap"}
                ]
            }
        )
        print(response.json())
```

## Test 4: Test API Connection

### Test the connection and see preview:
```bash
curl -X POST http://localhost:8000/api-sources/1/test
```

Expected: Should return sample extracted data showing:
- Raw API response (first few items)
- Extracted data based on JSONPath
- Preview of mapped fields
- Number of items found

### Example response:
```json
{
  "success": true,
  "items_extracted": 10,
  "sample_raw_response": [
    {
      "id": "bitcoin",
      "symbol": "btc",
      "name": "Bitcoin",
      "current_price": 42500,
      "market_cap": 830000000000
    }
  ],
  "sample_mapped_data": [
    {
      "name": "Bitcoin",
      "symbol": "BTC",
      "price": 42500,
      "market_cap": 830000000000
    }
  ]
}
```

## Test 5: List API Sources

```bash
curl http://localhost:8000/api-sources/
```

Expected: Array of API sources created (should show CoinGecko Live)

## Test 6: Create a Scheduled Task from API Source

### Create task to run daily at 10 AM:
```bash
curl -X POST http://localhost:8000/tasks/create-task \
  -H "Content-Type: application/json" \
  -d '{
    "source_type": "api",
    "api_source_id": 1,
    "scheduled_time": "2024-12-20T10:00:00Z",
    "repeat": "daily",
    "max_items": 50
  }'
```

Expected: 201 Created
```json
{
  "success": true,
  "task_id": 101,
  "task_name": "CoinGecko Live_20241220_100000",
  "message": "Task 'CoinGecko Live_20241220_100000' created successfully"
}
```

### Or Python:
```python
async def test_create_api_task():
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "http://localhost:8000/tasks/create-task",
            json={
                "source_type": "api",
                "api_source_id": 1,
                "scheduled_time": "2024-12-20T10:00:00Z",
                "repeat": "daily",
                "max_items": 50
            }
        )
        print(response.json())
```

## Test 7: Verify Task in Task List

```bash
curl http://localhost:8000/tasks/
```

Expected: Task list includes new API task with:
- source_type: "api"
- api_source_id: 1
- source_name: "CoinGecko Live"
- entity_name: "CryptoPrice"

## Test 8: Manually Trigger Task Execution

### Option A: Send to Kafka directly
```python
from kafka import KafkaProducer
import json

producer = KafkaProducer(
    bootstrap_servers=['localhost:9092'],
    value_serializer=lambda v: json.dumps(v).encode('utf-8')
)

# Send task to Kafka
producer.send('scraping_tasks', {
    'task_id': 101,  # The task_id from Test 6
    'payload': {}
})
```

### Option B: Wait for APScheduler to trigger
- Task will execute at scheduled_time automatically
- Check worker logs for execution messages

## Test 9: Verify Data in Entity Table

### Check CryptoPrice table:
```bash
psql -U postgres -d lead_generation -c "SELECT * FROM cryptoprice LIMIT 5;"
```

Expected: Should show inserted records with:
- name (e.g., "Bitcoin")
- symbol (e.g., "BTC")
- price (e.g., 42500)
- market_cap (e.g., 830000000000)

### Or count records:
```bash
psql -U postgres -d lead_generation -c "SELECT COUNT(*) FROM cryptoprice;"
```

## Test 10: Check Execution Logs

```bash
psql -U postgres -d lead_generation -c "SELECT * FROM task_execution_logs ORDER BY started_at DESC LIMIT 5;"
```

Expected: Should show completed execution with:
- task_id: 101
- execution_id: (UUID)
- status: "completed"
- items_processed: 10
- items_stored: 10 (or less if upserts on existing data)
- completed_at: (timestamp)

## Test 11: Verify Existing Web Tasks Still Work

### Create a web task (should work unchanged):
```bash
curl -X POST http://localhost:8000/tasks/create-task \
  -H "Content-Type: application/json" \
  -d '{
    "source_type": "web",
    "source_id": 1,
    "mapping_id": 1,
    "scheduled_time": "2024-12-20T12:00:00Z",
    "repeat": "daily"
  }'
```

Expected: Web tasks should still work exactly as before

### Verify in task list:
```bash
curl http://localhost:8000/tasks/
```

Expected: Both API and web tasks shown, properly distinguished by source_type

## Test 12: Test API Error Handling

### Try to create source with non-existent entity:
```bash
curl -X POST http://localhost:8000/api-sources/ \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Bad Source",
    "api_url": "https://...",
    "entity_name": "NonExistentEntity",
    ...
  }'
```

Expected: 404 error - "Entity definition 'NonExistentEntity' not found"

### Try to create task with non-existent API source:
```bash
curl -X POST http://localhost:8000/tasks/create-task \
  -H "Content-Type: application/json" \
  -d '{
    "source_type": "api",
    "api_source_id": 999,
    ...
  }'
```

Expected: 404 error - "API source not found"

## Troubleshooting

### Schema not initialized
- Check backend logs for initialization errors
- Manually run: `python db_migrations.py` (if script exists)
- Verify PostgreSQL connection

### Task not executing
- Check worker logs: `docker logs <worker-container>`
- Verify Kafka running: `kafka-topics.sh --list --bootstrap-server localhost:9092`
- Check task in database: `SELECT * FROM tasks WHERE id=101;`
- Verify source_type column exists: `\d tasks` in psql

### API extraction fails
- Test endpoint shows what data is extracted
- Verify JSONPath is correct: `$.` means root, `$.data[*]` means array
- Check API URL is accessible: `curl https://api.coingecko.com/api/v3/coins/markets?per_page=1`
- Verify field names match API response

### Data not appearing in entity table
- Check table exists: `\dt cryptoprice` (lowercase entity name)
- Verify unique constraints: `\d cryptoprice`
- Check execution logs for upsert errors
- Verify field mappings are correct

## Success Criteria

✅ All tests pass = Implementation successful!

- [x] Schema initialized
- [x] API source created
- [x] Test connection works
- [x] Task created successfully
- [x] Task appears in list
- [x] Task executes (manual or scheduled)
- [x] Data appears in entity table
- [x] Execution logged
- [x] Web tasks still work
- [x] Error handling works

## Next: Integration with Frontend

Once backend tests pass:
1. Create ApiSourceForm component (React)
2. Create FieldMappingEditor component (React)
3. Update TaskExecutor to support API tasks
4. Add API source selection to task creation UI
5. Display API vs web tasks differently in task list














Here are 4 public APIs across different categories. I have formatted the information specifically so you can copy and paste it into your Entity Creator and API Source Creator.

1. Random User Generator (Testing Profiles/Leads)

Excellent for testing personal data fields.

A. Entity Details (Add this first)

Entity Name: PersonLead

Attributes:

first_name (text)

last_name (text)

email (text) [Check for Unique]

city (text)

country (text)

B. API Source Info

Name: Random User API

API URL: https://randomuser.me/api/?results=20

Entity: PersonLead

Data Path (JSONPath): $.results

C. Field Mappings

name.first → first_name

name.last → last_name

email → email

location.city → city

location.country → country

2. Rest Countries (Global Statistics)

Excellent for testing root-level arrays (where the response IS the list).

A. Entity Details (Add this first)

Entity Name: CountryStats

Attributes:

common_name (text) [Check for Unique]

region (text)

population (int)

area (int)

flag_emoji (text)

B. API Source Info

Name: Global Countries API

API URL: https://restcountries.com/v3.1/all

Entity: CountryStats

Data Path (JSONPath): $ (Because the response starts with [ )

C. Field Mappings

name.common → common_name

region → region

population → population

area → area

flag → flag_emoji

3. Rick and Morty (Character Database)

Excellent for testing standard "Results" wrappers.

A. Entity Details (Add this first)

Entity Name: FictionCharacter

Attributes:

char_name (text)

status (text)

species (text)

gender (text)

origin_name (text)

B. API Source Info

Name: Rick and Morty Characters

API URL: https://rickandmortyapi.com/api/character

Entity: FictionCharacter

Data Path (JSONPath): $.results

C. Field Mappings

name → char_name

status → status

species → species

gender → gender

origin.name → origin_name

4. Universities List (Institutional Data)

Excellent for testing specific country filtering via URL parameters.

A. Entity Details (Add this first)

Entity Name: University

Attributes:

uni_name (text) [Check for Unique]

website (text)

country_code (text)

state_province (text)

B. API Source Info

Name: US Universities

API URL: http://universities.hipolabs.com/search?country=United+States

Entity: University

Data Path (JSONPath): $ (Root is the array)

C. Field Mappings

name → uni_name

web_pages[0] → website (Note: the API returns an array for websites, [0] picks the first one)

alpha_two_code → country_code

state-province → state_province

💡 Pro-Tip for your System:

When testing REST Countries or Universities, remember that the response is a direct list like [ {...}, {...} ].

In your API Source Creator, make sure the Data Path is strictly $.

If you use $. (with a dot), the jsonpath-ng library will throw the "Parse error near end of string" you saw earlier.
