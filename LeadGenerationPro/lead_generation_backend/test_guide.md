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