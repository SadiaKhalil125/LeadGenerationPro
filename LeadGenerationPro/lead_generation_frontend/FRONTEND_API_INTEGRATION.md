# Frontend Integration - API Sources & Tasks

## Overview
The frontend has been fully integrated with the API sources backend. Three new React components have been created to manage API data sources and execute API-based tasks.

## New Components Created

### 1. **ApiSourceManager.jsx** (`/api-sources` route)
**Purpose**: Main interface for managing all API sources
**Features**:
- ✅ List all API sources with expandable details
- ✅ View complete API configuration (request template, response structure, field mappings)
- ✅ Test API connection with live preview of data
- ✅ Edit existing API sources
- ✅ Delete API sources with confirmation
- ✅ View response sample data from API test

**Key Endpoints Used**:
- `GET /api-sources/` - Fetch all API sources
- `DELETE /api-sources/{id}` - Delete an API source
- `POST /api-sources/{id}/test` - Test API connection

**UI Elements**:
- Collapsible source cards showing basic info
- Expandable sections for detailed configuration
- Test button with real-time results display
- Edit/Delete action buttons

### 2. **ApiSourceCreator.jsx** (`/api-source-creator` route)
**Purpose**: Step-by-step form to create new API sources
**Features**:
- ✅ Guided form with 4 main sections
- ✅ Basic info: Name, Entity, Base URL
- ✅ Request configuration: HTTP method, timeout, authentication
- ✅ Response structure: JSONPath data path configuration
- ✅ Field mappings: Interactive UI to add API-to-DB field mappings
- ✅ Input validation with error messages
- ✅ Success feedback and redirect to manager

**Key Endpoints Used**:
- `POST /api-sources/` - Create new API source

**Form Sections**:
1. **Basic Information** - Name, Entity name, Base URL
2. **Request Configuration** - HTTP method, timeout, API key/auth
3. **Response Structure** - JSONPath expression to extract data array
4. **Field Mappings** - Map API response fields to database columns

### 3. **ApiTaskExecutor.jsx** (`/api-task-executor` route)
**Purpose**: Execute API-based tasks and monitor execution
**Features**:
- ✅ Display all API tasks (auto-filters by source_type = 'api')
- ✅ Execute tasks with confirmation dialog
- ✅ Show execution results (extracted, upserted, failed counts)
- ✅ View task execution logs
- ✅ Display API source name for each task
- ✅ Show scheduled time and last execution time

**Key Endpoints Used**:
- `GET /task/tasks` - Fetch all tasks (filtered for API tasks)
- `GET /api-sources/` - Get API source names
- `POST /task/execute-task/{id}` - Execute a task
- Links to `/task-logs/{id}` for viewing logs

**Task Information Displayed**:
- Task name and description
- Target entity
- Associated API source
- Scheduled time (if scheduled)
- Last execution time (if previously run)

## Navigation Integration

### Updated NavigationPage.jsx
A new "API Sources" menu section has been added to the sidebar with three items:

```
API Sources (Menu)
  ├── API Source Manager → /api-sources
  ├── Create API Source → /api-source-creator
  └── Execute API Tasks → /api-task-executor
```

### Routes Added to App.jsx

```javascript
<Route path="/api-sources" element={<ApiSourceManager />} />
<Route path="/api-source-creator" element={<ApiSourceCreator />} />
<Route path="/api-task-executor" element={<ApiTaskExecutor />} />
```

## Workflow

### Creating and Using an API Source

1. **Navigate to API Sources**
   - Click "API Sources" in the sidebar → "Create API Source"
   - Or go directly to `/api-source-creator`

2. **Fill in Basic Information**
   - API Source Name: e.g., "CoinGecko Crypto API"
   - Entity Name: e.g., "CryptoPrice" (database table)
   - Base URL: e.g., "https://api.coingecko.com/api/v3"

3. **Configure Request**
   - HTTP Method (GET, POST, PUT, DELETE)
   - Timeout duration (5-120 seconds)
   - Authentication type and API key

4. **Define Response Structure**
   - JSONPath to data array: e.g., "$.data" or "$." for root array
   - Examples provided in UI

5. **Add Field Mappings**
   - Click "Add Mapping" for each field
   - API Field: Field name in API response (e.g., "id", "market_data.current_price.usd")
   - DB Field: Column name in database table
   - Transform: Optional transformation (e.g., "upper", "float")

6. **Create the Source**
   - Click "Create API Source"
   - Redirects to `/api-sources` manager

7. **Test the Connection**
   - In API Source Manager, expand a source
   - Click "Test Connection" button
   - See live API response preview

8. **Create Tasks Using the Source**
   - Go to Tasks Management → Create Task
   - Select source_type = "api"
   - Select the API source you created
   - Tasks created this way will appear in API Task Executor

9. **Execute the Task**
   - Go to API Task Executor
   - Click "Execute Now" on a task
   - View results: extracted count, upserted count, failed count
   - Results refresh for 5 seconds then auto-clear

## Endpoint Integration Details

### API Endpoints Called from Frontend

| Endpoint | Method | Component | Purpose |
|----------|--------|-----------|---------|
| `/api-sources/` | GET | ApiSourceManager | List all API sources |
| `/api-sources/` | POST | ApiSourceCreator | Create new API source |
| `/api-sources/{id}` | GET | ApiSourceManager | Get specific source details |
| `/api-sources/{id}` | DELETE | ApiSourceManager | Delete API source |
| `/api-sources/{id}/test` | POST | ApiSourceManager | Test API connection |
| `/task/tasks` | GET | ApiTaskExecutor | Fetch tasks (filters API tasks) |
| `/task/execute-task/{id}` | POST | ApiTaskExecutor | Execute an API task |
| `/api-sources/` | GET | ApiTaskExecutor | Get source names for display |

### Exact Endpoint Names (✓ Verified)
- ✅ `/api-sources/` (with trailing slash)
- ✅ `/api-sources/{id}`
- ✅ `/api-sources/{id}/test`
- ✅ `/task/tasks`
- ✅ `/task/execute-task/{id}`

## Frontend Features Implemented

### API Source Manager
- **Expand/Collapse**: Click a source card to expand and see full configuration
- **Test Connection**: Verify API works and preview response data
- **Edit Source**: Modify source configuration (inline form shown)
- **Delete Source**: Remove source with confirmation dialog
- **Visual Hierarchy**: Color-coded badges, icons for quick identification
- **Error Handling**: User-friendly error messages with retry capability
- **Loading States**: Spinner shown during async operations

### API Source Creator
- **Multi-Section Form**: Organized into 4 logical sections
- **Field Mapping UI**: Interactive add/remove mappings
- **Validation**: Requires minimum fields and at least one mapping
- **Help Text**: Examples and descriptions for each field
- **Placeholders**: Helpful placeholder values to guide users
- **Responsive Design**: Works on different screen sizes
- **Success Feedback**: Confirmation message then redirect

### API Task Executor
- **Task Filtering**: Auto-filters tasks to show only API-based tasks
- **Execution Status**: Shows current execution with spinner
- **Results Display**: Shows extracted, upserted, failed counts
- **Quick Actions**: Execute Now button, View Logs link
- **Source Name Lookup**: Displays actual API source name (not just ID)
- **Scheduled Info**: Shows when task is scheduled and last execution
- **Empty State**: Helpful message when no API tasks exist

## Styling & UX

### Design System
- **Color Scheme**:
  - Blue (`#3b82f6`, `#1e40af`) - Primary actions, info
  - Green (`#22c55e`) - Success, test connection
  - Red (`#ef4444`) - Delete, errors
  - Gray (`#6b7280`, `#f3f4f6`) - Secondary, backgrounds
  
- **Typography**:
  - Headings: Bold, 24px-32px
  - Body: Regular, 14px-16px
  - Monospace: For technical values (JSONPath, field names)

- **Components**:
  - Cards: White background, subtle shadow, hover effects
  - Buttons: Consistent styling with icons, hover states
  - Inputs: Clear labels, focus rings, validation feedback
  - Icons: Lucide React icons for consistency

### Responsive Behavior
- Mobile-friendly layouts
- Collapsible sections on small screens
- Stacked form fields on mobile
- Full-width buttons and inputs

## Testing the Integration

### Quick Test Walkthrough

1. **Start Frontend**
   ```
   npm run dev
   ```

2. **Navigate to API Sources**
   - Dashboard → API Sources menu
   - Or direct URL: `http://localhost:5173/api-sources`

3. **Create a Test API Source**
   - Click "Create API Source" or go to `/api-source-creator`
   - Fill in test data (e.g., CoinGecko API example below)

4. **Test with CoinGecko API** (Free, no auth required)
   ```
   Name: CoinGecko Prices
   Base URL: https://api.coingecko.com/api/v3/coins/markets
   Entity: CryptoPrice
   HTTP Method: GET
   Data Path: .
   
   Field Mappings:
   - id → crypto_id
   - name → name
   - symbol → symbol
   - current_price → price
   - market_cap → market_cap
   
   Query Params (in URL):
   order=market_cap_desc&per_page=10&vs_currency=usd
   ```

5. **Test Connection**
   - Go to API Source Manager
   - Expand the source you created
   - Click "Test Connection"
   - Should see live data preview

6. **Create an API Task**
   - Go to Tasks Management
   - Create task with source_type="api"
   - Select the API source

7. **Execute Task**
   - Go to API Task Executor
   - Click "Execute Now"
   - See results with item counts

## Error Handling

### User-Friendly Error Messages
- Missing required fields → Clear validation message
- API connection failure → Specific error from API
- Task execution failure → Error details with retry option
- Network errors → Graceful handling with retry

### Loading States
- Spinner shown during fetches
- Buttons disabled during execution
- Visual feedback for all async operations

## Browser Compatibility
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Responsive on mobile/tablet

## Future Enhancements (Optional)
- Bulk task execution
- Scheduled API task automation
- Response data caching
- Advanced JSONPath builder UI
- Field mapping templates/presets
- API response validation/schema builder
- Rate limiting configuration
- Webhook triggers for tasks
