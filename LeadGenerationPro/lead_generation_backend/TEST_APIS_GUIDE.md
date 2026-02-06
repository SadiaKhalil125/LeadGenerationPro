# Test APIs for Lead Generation System - Complete Guide

## Available Test APIs (No Authentication Required)

### 1. **CoinGecko Cryptocurrency API** ✅ (Already Tested)
```
Name:           CoinGecko Prices
Base URL:       https://api.coingecko.com/api/v3/coins/markets
HTTP Method:    GET
Data Path:      $.
Entity:         CryptoPrice

Query Parameters:
  - order=market_cap_desc
  - per_page=10
  - vs_currency=usd

Sample Response Structure:
{
  "id": "bitcoin",
  "symbol": "btc",
  "name": "Bitcoin",
  "current_price": 45000,
  "market_cap": 900000000000
}

Field Mappings:
  - id → crypto_id
  - name → name
  - symbol → symbol
  - current_price → price
  - market_cap → market_cap
  - market_cap_rank → rank
```

---

### 2. **Open-Meteo Weather API** 🌤️ (Recommended - Easy to Test)
```
Name:           Global Weather Data
Base URL:       https://api.open-meteo.com/v1/forecast
HTTP Method:    GET
Data Path:      $.daily  (for daily forecast)
Entity:         WeatherData
No Auth:        YES ✓

Query Parameters:
  - latitude=51.5074          (London)
  - longitude=-0.1278
  - daily=temperature_2m,precipitation_sum
  - timezone=auto
  - limit=7                   (7 days forecast)

Sample Response:
{
  "latitude": 51.5074,
  "longitude": -0.1278,
  "timezone": "Europe/London",
  "daily": {
    "time": ["2026-02-06", "2026-02-07"],
    "temperature_2m": [12.5, 14.2],
    "precipitation_sum": [0.0, 2.3]
  }
}

Field Mappings:
  - daily.time[0] → date
  - daily.temperature_2m[0] → temperature
  - daily.precipitation_sum[0] → precipitation
  - timezone → location
```

---

### 3. **JSONPlaceholder API** 📝 (Great for Testing)
```
Name:           Fake Social Media Data
Base URL:       https://jsonplaceholder.typicode.com/posts
HTTP Method:    GET
Data Path:      $.
Entity:         SocialPost
No Auth:        YES ✓

Query Parameters:
  - _limit=10  (Get first 10 posts)

Sample Response:
{
  "userId": 1,
  "id": 1,
  "title": "Post Title",
  "body": "Post content here...",
  "reactions": 42
}

Field Mappings:
  - userId → author_id
  - id → post_id
  - title → title
  - body → content
```

---

### 4. **REST Countries API** 🌍 (Country Information)
```
Name:           World Countries Data
Base URL:       https://restcountries.com/v3.1/all
HTTP Method:    GET
Data Path:      $.
Entity:         Country
No Auth:        YES ✓

No Query Params Needed

Sample Response:
{
  "name": {
    "common": "Afghanistan",
    "official": "Islamic Republic of Afghanistan"
  },
  "independent": true,
  "unMember": true,
  "population": 40218000,
  "area": 652230,
  "region": "Asia",
  "capital": ["Kabul"],
  "languages": {
    "prs": "Dari"
  }
}

Field Mappings:
  - name.common → country_name
  - independent → is_independent
  - population → population
  - area → area_km2
  - region → region
  - capital[0] → capital_city
```

---

### 5. **DummyJSON API** 🎯 (Multiple Data Types - Best for Complex Testing)
```
Name:           Dummy Products Database
Base URL:       https://dummyjson.com/products
HTTP Method:    GET
Data Path:      $.products
Entity:         Product
No Auth:        YES ✓

Query Parameters:
  - limit=10
  - skip=0

Sample Response:
{
  "id": 1,
  "title": "iPhone 9",
  "description": "An apple mobile which is very use...",
  "price": 549,
  "discountPercentage": 12.96,
  "rating": 4.69,
  "stock": 94,
  "brand": "Apple",
  "category": "smartphones",
  "images": ["..."],
  "thumbnail": "..."
}

Field Mappings:
  - id → product_id
  - title → product_name
  - price → price
  - rating → rating
  - stock → stock_quantity
  - brand → brand_name
  - category → category

Sub-Resources Available:
  - https://dummyjson.com/users (for user data)
  - https://dummyjson.com/posts (for posts)
  - https://dummyjson.com/quotes (for quotes)
```

---

### 6. **NASA API** 🚀 (Astronomy Picture of the Day)
```
Name:           NASA Astronomy Photos
Base URL:       https://api.nasa.gov/planetary/apod
HTTP Method:    GET
Data Path:      $.
Entity:         AstronomyPhoto
Free Tier:      YES (uses DEMO_KEY)

Query Parameters:
  - api_key=DEMO_KEY
  - count=10

Sample Response:
{
  "copyright": "John Smith",
  "date": "2026-02-06",
  "explanation": "Description of the image...",
  "hdurl": "https://...",
  "media_type": "image",
  "service_version": "v1",
  "title": "Title of Photo",
  "url": "https://..."
}

Field Mappings:
  - date → photo_date
  - title → title
  - copyright → photographer
  - explanation → description
  - media_type → type
```

---

### 7. **OpenWeatherMap API** 🌡️ (Current Weather)
```
Name:           Real-time Weather
Base URL:       https://api.openweathermap.org/data/2.5/weather
HTTP Method:    GET
Data Path:      $.
Entity:         CurrentWeather
Requires Auth:  FREE API KEY (register at openweathermap.org)

Query Parameters:
  - q=London
  - appid=YOUR_API_KEY
  - units=metric

Sample Response:
{
  "coord": {"lon": -0.1257, "lat": 51.5085},
  "weather": [
    {
      "id": 801,
      "main": "Clouds",
      "description": "few clouds",
      "icon": "02d"
    }
  ],
  "main": {
    "temp": 12.5,
    "feels_like": 11.8,
    "humidity": 65,
    "pressure": 1013
  },
  "name": "London"
}

Field Mappings:
  - main.temp → temperature
  - main.humidity → humidity
  - main.pressure → pressure
  - weather[0].main → weather_condition
  - name → city_name
```

---

### 8. **Spoonacular Food API** 🍕 (Food/Recipe Data)
```
Name:           Recipe and Food Data
Base URL:       https://api.spoonacular.com/recipes/complexSearch
HTTP Method:    GET
Data Path:      $.results
Entity:         Recipe
Requires Auth:  FREE API KEY (register at spoonacular.com)

Query Parameters:
  - number=10
  - apiKey=YOUR_API_KEY
  - addRecipeInformation=true

Sample Response:
{
  "results": [
    {
      "id": 715495,
      "title": "Lemon Chicken",
      "image": "...",
      "imageType": "jpg",
      "usedIngredients": [],
      "missedIngredients": [],
      "likes": 120
    }
  ]
}

Field Mappings:
  - id → recipe_id
  - title → recipe_name
  - image → image_url
  - likes → popularity_score
```

---

### 9. **GitHub Users API** 👨‍💻 (Developer Data)
```
Name:           GitHub User Information
Base URL:       https://api.github.com/search/users
HTTP Method:    GET
Data Path:      $.items
Entity:         GitHubUser
No Auth:        YES (Rate limited) ✓

Query Parameters:
  - q=language:python
  - per_page=10
  - sort=repositories

Sample Response:
{
  "items": [
    {
      "login": "torvalds",
      "id": 1024454,
      "avatar_url": "...",
      "repos_url": "...",
      "followers": 150000,
      "public_repos": 5,
      "type": "User"
    }
  ]
}

Field Mappings:
  - login → username
  - id → user_id
  - followers → follower_count
  - public_repos → repository_count
  - type → account_type
```

---

### 10. **Random User Generator API** 👥 (Test Data)
```
Name:           Random Users Dataset
Base URL:       https://randomuser.me/api/
HTTP Method:    GET
Data Path:      $.results
Entity:         RandomUser
No Auth:        YES ✓

Query Parameters:
  - results=10
  - nat=us,gb,ca (US, UK, Canada nationalities)

Sample Response:
{
  "results": [
    {
      "gender": "male",
      "name": {"first": "John", "last": "Doe"},
      "email": "john.doe@example.com",
      "phone": "555-1234",
      "location": {"city": "London", "country": "United Kingdom"},
      "picture": {"large": "..."}
    }
  ]
}

Field Mappings:
  - gender → gender
  - name.first → first_name
  - name.last → last_name
  - email → email
  - phone → phone_number
  - location.city → city
  - location.country → country
```

---

### 11. **Quotes API** 💭 (Inspirational Quotes)
```
Name:           Random Quotes
Base URL:       https://api.quotable.io/quotes
HTTP Method:    GET
Data Path:      $.results
Entity:         Quote
No Auth:        YES ✓

Query Parameters:
  - limit=10
  - minLength=100
  - maxLength=300

Sample Response:
{
  "results": [
    {
      "_id": "ygfEv",
      "content": "The only way to do great work is to love what you do.",
      "author": "Steve Jobs",
      "authorId": "aBcDeF",
      "tags": ["inspiration", "work"],
      "source": "personal",
      "dateAdded": "2023-01-01"
    }
  ]
}

Field Mappings:
  - content → quote_text
  - author → author_name
  - tags[0] → category
  - source → source_type
```

---

### 12. **PokeAPI** 🐛 (Pokemon Data)
```
Name:           Pokemon Database
Base URL:       https://pokeapi.co/api/v2/pokemon/
HTTP Method:    GET
Data Path:      $.results (for list) or $. (for single)
Entity:         Pokemon
No Auth:        YES ✓

Query Parameters:
  - limit=20
  - offset=0

Sample Response:
{
  "count": 1025,
  "next": "...",
  "results": [
    {
      "name": "bulbasaur",
      "url": "https://pokeapi.co/api/v2/pokemon/1/"
    }
  ]
}

Field Mappings:
  - name → pokemon_name
  - url → api_url
```

## Entity Schemas (CREATE TABLE examples)

Below are example PostgreSQL `CREATE TABLE` statements and field lists for entities used by the test APIs. Adjust types as needed for your application.

```sql
CREATE TABLE weather_data (
  id SERIAL PRIMARY KEY,
  location TEXT,
  date DATE,
  temp_c NUMERIC,
  temp_f NUMERIC,
  humidity INTEGER,
  wind_speed_kph NUMERIC,
  wind_direction TEXT,
  precipitation_mm NUMERIC,
  conditions TEXT,
  source TEXT,
  retrieved_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE social_post (
  id SERIAL PRIMARY KEY,
  post_id INTEGER,
  author_id INTEGER,
  author_name TEXT,
  content TEXT,
  media_urls JSONB,
  likes INTEGER,
  shares INTEGER,
  comments_count INTEGER,
  created_at TIMESTAMPTZ,
  source TEXT
);

CREATE TABLE country (
  id SERIAL PRIMARY KEY,
  name TEXT,
  official_name TEXT,
  alpha2 CHAR(2),
  alpha3 CHAR(3),
  region TEXT,
  subregion TEXT,
  capital TEXT,
  population BIGINT,
  area_km2 NUMERIC,
  currencies JSONB,
  languages JSONB,
  timezones JSONB
);

CREATE TABLE product (
  id SERIAL PRIMARY KEY,
  product_id INTEGER,
  name TEXT,
  description TEXT,
  category TEXT,
  brand TEXT,
  price NUMERIC,
  currency TEXT,
  discount_percent NUMERIC,
  rating NUMERIC,
  review_count INTEGER,
  stock_quantity INTEGER,
  images JSONB,
  metadata JSONB
);

CREATE TABLE astronomy_photo (
  id SERIAL PRIMARY KEY,
  photo_date DATE,
  title TEXT,
  explanation TEXT,
  url TEXT,
  hdurl TEXT,
  media_type TEXT,
  service_version TEXT,
  photographer TEXT,
  retrieved_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE current_weather (
  id SERIAL PRIMARY KEY,
  location TEXT,
  timestamp TIMESTAMPTZ,
  temp_c NUMERIC,
  temp_f NUMERIC,
  feels_like_c NUMERIC,
  humidity INTEGER,
  pressure_hpa INTEGER,
  visibility_km NUMERIC,
  wind_speed_kph NUMERIC,
  wind_deg INTEGER,
  weather_code INTEGER,
  raw JSONB
);

CREATE TABLE recipe (
  id SERIAL PRIMARY KEY,
  recipe_id INTEGER,
  title TEXT,
  summary TEXT,
  instructions TEXT,
  ingredients JSONB,
  prep_time_min INTEGER,
  cook_time_min INTEGER,
  servings INTEGER,
  image_url TEXT,
  source_url TEXT,
  calories NUMERIC
);

CREATE TABLE github_user (
  id SERIAL PRIMARY KEY,
  github_id INTEGER,
  login TEXT,
  name TEXT,
  company TEXT,
  blog TEXT,
  location TEXT,
  email TEXT,
  bio TEXT,
  public_repos INTEGER,
  public_gists INTEGER,
  followers INTEGER,
  following INTEGER,
  avatar_url TEXT,
  html_url TEXT,
  created_at TIMESTAMPTZ
);

CREATE TABLE random_user (
  id SERIAL PRIMARY KEY,
  uuid UUID,
  gender TEXT,
  title TEXT,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  cell TEXT,
  nat TEXT,
  location JSONB,
  dob DATE,
  age INTEGER,
  picture JSONB
);

CREATE TABLE quote (
  id SERIAL PRIMARY KEY,
  quote_id TEXT,
  text TEXT,
  author TEXT,
  tags JSONB,
  source TEXT,
  language TEXT,
  retrieved_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE pokemon (
  id SERIAL PRIMARY KEY,
  poke_id INTEGER,
  name TEXT,
  base_experience INTEGER,
  height INTEGER,
  weight INTEGER,
  types JSONB,
  abilities JSONB,
  sprites JSONB,
  stats JSONB,
  species_url TEXT
);
```

Field lists above correspond to the `Entity` names referenced in the API sections. Create the tables that you plan to test before executing API tasks.

---

## Quick Test Scenario

### Scenario: Test Multiple APIs in 1 Hour

**Time: 15 min each**

1. **CoinGecko** (Already done) ✅
   - Test: Create → Execute → Verify 10 records upserted

2. **Open-Meteo Weather** 
   - Test: Simple API with array data path
   - Entity: WeatherData
   - Expected: 7 daily forecasts upserted

3. **DummyJSON Products**
   - Test: Complex nested objects
   - Entity: Product
   - Expected: 10 products upserted

4. **REST Countries**
   - Test: Large dataset with nested fields
   - Entity: Country
   - Expected: 250+ countries (pagination test)

---

## API Selection Tips

| Use Case | Recommended API |
|----------|-----------------|
| Simple testing | JSONPlaceholder, DummyJSON |
| Real-time data | Open-Meteo, OpenWeatherMap |
| Large dataset | REST Countries, PokeAPI |
| Nested structures | DummyJSON, GitHub API |
| Media content | NASA, Spoonacular |
| Social/User data | GitHub, RandomUser |
| Complex JSONPath | Any API with nested objects |

---

## How to Test Each API

### Step 1: Create API Source
```
Name: [API Name]
Entity: [Entity Name from table above]
Base URL: [Copy from table]
HTTP Method: GET
Data Path: [Copy JSONPath from table]
Auth: None (unless specified)
```

### Step 2: Add Field Mappings
```
For each field mapping in the table:
  API Field → DB Field
```

### Step 3: Create Database Entity
```
Before running task, create the entity table first:
Dashboard → Entity → Create Entity
Add columns for each DB Field
```

### Step 4: Test Connection
```
In API Source Manager:
  1. Expand the source
  2. Click "Test Connection"
  3. Should see sample data
```

### Step 5: Create & Execute Task
```
1. Go to Task Management
2. Create task with source_type = "api"
3. Select API source
4. Go to Execute API Tasks
5. Click "Execute Now"
6. Verify results (items extracted, upserted)
```

### Step 6: View Data
```
Dashboard → Entity Data → Select entity
View upserted records
Export as CSV or Excel
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Data array not found" | Check JSONPath expression (use $.results or $.items or $.) |
| 0 items extracted | Verify response structure matches expected format |
| Field mapping errors | Check API field names exactly match response |
| Connection timeout | Verify API is accessible, try in browser first |
| Rate limit error | Add delay between executions or use different API |

---

## Notes

- ✅ All APIs listed are **FREE** and **NO AUTHENTICATION** required (except where noted)
- 📊 APIs return **JSON** format compatible with JSONPath extraction
- 🔄 Most have **pagination** support for large datasets
- 🌐 All **CORS-enabled** for browser access
- ⚡ Response times vary (typically 200-500ms)

Start with **Open-Meteo** or **DummyJSON** for easiest testing, then try others! 🚀
