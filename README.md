# 🚀 Scout - Lead Generation Pro

**Build Your Own AI-Powered Client Hunter!**

Scout is a powerful, two-in-one web application that automatically finds high-quality leads for software development and consultancy firms. This Final Year Project (FYP) aims to build a real-world tool that businesses actually need and use.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Deployment Summary](#deployment-summary)
- [Architecture](#architecture)
- [Project Status](#project-status)
- [Installation](#installation)
- [Usage](#usage)
- [API Documentation](#api-documentation)
- [Future Roadmap](#future-roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## 🎯 Overview

Lead Generation Pro solves a critical problem faced by every tech business: finding and reaching out to potential clients efficiently. Instead of manual research and cold outreach, this platform automates the entire lead generation pipeline.

### What Makes This Special?

- **Real-World Application**: This isn't just another academic project—it's a tool that solves actual business problems
- **Industry-Ready Tech**: Built with modern, scalable technologies used in production environments
- **AI-Powered**: Leverages AI to adapt to changing websites and optimize lead scoring
- **Multi-Channel Outreach**: Supports emails, SMS, DMs, and auto-dialers
- **Compliant & Ethical**: Designed with legal and ethical scraping practices in mind

---

## ✨ Features

### 🔍 Data Extraction Module

- **Multi-Source Scraping**: Extract business data from various sources including:
  - Crunchbase
  - Apollo.io
  - Hunter.io
  - Google Maps
  - Custom websites (configurable)
  
- **Extracted Data Types**:
  - Company information (name, industry, size, location)
  - Contact details (emails, phone numbers)
  - Team roles and key personnel
  - Technology stacks
  - Live job postings
  - Funding information
  - Social media profiles

- **Intelligent Scraping**:
  - Real-time web scraping with AI adaptation
  - Dynamic selector configuration
  - Pagination support (query params, offset, path, button click, scroll, AJAX)
  - Container-based entity extraction
  - Custom field mapping

### 📣 Outreach Automation Module

- **Multi-Channel Messaging**:
  - Cold email campaigns
  - SMS outreach
  - Social media DMs
  - Auto-dialer integration

- **Smart Campaign Management**:
  - Message templates with personalization
  - Timing rules and scheduling
  - Lead magnet offers
  - A/B testing capabilities

### 🧠 Intelligence Features

- **Lead Scoring**: AI-powered lead quality assessment
- **Contact History Tracking**: Complete interaction history per lead
- **Duplicate Detection**: Smart deduplication of extracted leads
- **Data Validation**: Automatic validation of extracted contact information

### 🛠️ Management Features

- **Entity Management**: Define and manage custom entity types (companies, jobs, people, etc.)
- **Source Management**: Configure and manage data sources
- **Task Scheduling**: Automated scraping tasks with APScheduler
- **Task Execution**: Manual and scheduled task execution
- **Mapping Configuration**: Visual field mapping interface

---

## 🛠️ Tech Stack

### Backend

- **Framework**: FastAPI (Python)
- **Database**: PostgreSQL
- **Web Scraping**:
  - `crawl4ai` - AI-powered web crawling
  - `playwright` - Browser automation
  - `beautifulsoup4` - HTML parsing
  - `lxml` - XML/HTML processing
- **Task Scheduling**: APScheduler
- **Message Queue**: Kafka (for distributed task processing)
- **HTTP Client**: `httpx`, `aiohttp`
- **Other Libraries**:
  - `pydantic` - Data validation
  - `python-dotenv` - Environment management
  - `psycopg2-binary` - PostgreSQL adapter

### Frontend

- **Framework**: React 19
- **Build Tool**: Vite
- **Styling**: TailwindCSS 4
- **Routing**: React Router DOM
- **HTTP Client**: Axios
- **UI Components**: 
  - Lucide React (icons)
  - React Icons
  - React Syntax Highlighter

### DevOps

- **Containerization**: Docker
- **Orchestration**: Kubernetes
- **API Server**: Uvicorn (ASGI server)

---

## 🚀 Deployment Summary

Scout - Lead Generation Pro is deployed as a distributed hybrid-cloud system to ensure maximum availability and scalability.

### **Live Platform Links**
*   **Frontend Dashboard (Vercel):** [https://lead-generation-frontend-taupe.vercel.app/](https://lead-generation-frontend-taupe.vercel.app/)
*   **Backend API (Render):** [https://lead-generation-backend-service.onrender.com](https://lead-generation-backend-ob2q.onrender.com)
*   **Background Worker (Hugging Face):** [https://huggingface.co/spaces/Sadia712/leadgenworker](https://huggingface.co/spaces/Sadia712/leadgenworker)
*   **Database (AWS RDS):** Managed PostgreSQL Instance

### **Architecture & Infrastructure**
*   **Frontend**: React 19 / Vite hosted on **Vercel** with automated CD.
*   **Backend API**: FastAPI hosted on **Render** (Dockerized) with automated CD.
*   **Worker Service**: Python/Playwright hosted on **Hugging Face Spaces** (Always-on Docker instance).
*   **Message Broker**: **Aiven Kafka** (Managed SASL_SSL) for inter-service communication.
*   **Database**: **AWS RDS** for persistent lead and task storage.

### **CI/CD Status**
*   **Vercel:** Fully automated Continuous Deployment linked to the GitHub repository.
*   **Render:** Automated rebuilds and redeployments upon every push to the main branch.
*   **Hugging Face:** Automated container builds via Git-based workflow.

---

## 🏗️ Architecture

### Project Structure

```
LeadGenerationPro/
├── lead_generation_backend/          # FastAPI backend
│   ├── routers/                      # API route handlers
│   │   ├── entity_crud.py           # Entity management endpoints
│   │   ├── source_crud.py           # Source management endpoints
│   │   ├── entity_mappings_crud.py  # Mapping configuration endpoints
│   │   ├── task_crud.py             # Task management endpoints
│   │   ├── run_scrape.py            # Scraping execution logic
│   │   └── scheduler_config.py      # Task scheduling configuration
│   ├── models.py                     # Pydantic models
│   ├── endpoints.py                  # Main FastAPI app
│   ├── utils.py                      # Utility functions
│   ├── crawl4Util.py                 # Crawl4AI integration
│   ├── google_maps_scraper.py        # Google Maps scraper
│   ├── worker.py                     # Background worker
│   ├── status_updater.py             # Status update service
│   ├── requirements.txt              # Python dependencies
│   ├── Dockerfile.api                # API container
│   ├── Dockerfile.worker             # Worker container
│   ├── Dockerfile.status             # Status service container
│   └── k8s/                          # Kubernetes configurations
│
├── lead_generation_frontend/          # React frontend
│   ├── src/
│   │   ├── components/               # React components
│   │   │   ├── EntityForm.jsx
│   │   │   ├── EntityList.jsx
│   │   │   ├── SourceCreator.jsx
│   │   │   ├── SourceManager.jsx
│   │   │   ├── WebScraperForm.jsx
│   │   │   ├── TaskScheduler.jsx
│   │   │   └── ...
│   │   ├── services/                 # API service layer
│   │   ├── models/                   # Data models
│   │   └── App.jsx                   # Main app component
│   ├── package.json
│   └── vite.config.js
│
└── README.md                          # This file
```

### System Architecture

```
┌─────────────────┐
│   React Frontend │
│   (Vite + React) │
└────────┬─────────┘
         │
         │ HTTP/REST
         │
┌────────▼─────────┐
│   FastAPI Backend│
│   (Uvicorn)      │
└────────┬─────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐ ┌──▼────┐
│PostgreSQL│ │ Kafka │
│ Database │ │ Queue │
└─────────┘ └───────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐ ┌──▼────┐
│Worker │ │Status │
│Service│ │Service│
└───────┘ └───────┘
```

### Key Components

1. **API Server**: Handles all HTTP requests, manages entities, sources, mappings, and tasks
2. **Worker Service**: Executes scraping tasks asynchronously
3. **Status Service**: Updates task status and progress
4. **Scheduler**: Manages scheduled scraping tasks
5. **Database**: Stores entities, sources, mappings, tasks, and extracted data

---

## 📊 Project Status

### ✅ Completed Features

- [x] Backend API structure with FastAPI
- [x] Entity management (CRUD operations)
- [x] Source management (CRUD operations)
- [x] Entity mapping configuration
- [x] Task management and scheduling
- [x] Web scraping with crawl4ai
- [x] Google Maps scraper integration
- [x] React frontend with routing
- [x] Entity and source management UI
- [x] Task scheduling interface
- [x] Docker containerization
- [x] Kubernetes deployment configurations
- [x] Database models and schemas

### 🚧 In Progress

- [ ] Outreach automation module
- [ ] Lead scoring algorithm
- [ ] Contact history tracking
- [ ] Email/SMS integration
- [ ] AI-powered message generation
- [ ] Advanced analytics dashboard

### 📝 Planned Features

- [ ] Integration with Crunchbase API
- [ ] Integration with Apollo.io API
- [ ] Integration with Hunter.io API
- [ ] Auto-dialer integration
- [ ] Social media DM automation
- [ ] A/B testing for outreach campaigns
- [ ] Advanced lead filtering and search
- [ ] Export functionality (CSV, Excel)
- [ ] Webhook support for integrations
- [ ] User authentication and authorization
- [ ] Multi-tenant support
- [ ] Rate limiting and compliance features

---

## 🚀 Installation

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 12+
- Docker (optional, for containerized deployment)
- Kubernetes (optional, for orchestration)

### Backend Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/SadiaKhalil125/LeadGenerationPro.git
   cd LeadGenerationPro/lead_generation_backend
   ```

2. **Create a virtual environment**:
   ```bash
   python -m venv venv
   # On Windows
   venv\Scripts\activate
   # On Linux/Mac
   source venv/bin/activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Install Playwright browsers** (required for crawl4ai):
   ```bash
   playwright install
   ```

5. **Set up environment variables**:
   Create a `.env` file in the backend directory:
   ```env
   KAFKA_BOOTSTRAP=localhost:9092
   GOOGLE_API_KEY=your_google_api_key
   GOOGLE_CSE_ID=your_google_cse_id
   SERPAPI_KEY=your_serpapi_key
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=LeadGenerationPro
   DB_USER=postgres
   DB_PASSWORD=your_db_password
   ```

6. **Set up the database**:
   ```bash
   # Create database
   createdb leadgen_db
   
   # Run migrations (if available)
   # alembic upgrade head
   ```

7. **Run the backend server**:
   ```bash
   python startup.py
   ```

   The API will be available at `http://localhost:8000`

### Frontend Setup

1. **Navigate to frontend directory**:
   ```bash
   cd ../lead_generation_frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   Create a `.env` file:
   ```env
   VITE_API_BASE_URL=http://localhost:8000
   ```

4. **Run the development server**:
   ```bash
   npm run dev
   ```

   The frontend will be available at `http://localhost:5173`

### Docker Setup

1. **Build backend images from the repository root**:
   ```powershell
   docker build -f lead_generation_backend/Dockerfile.api -t leadgen-api ./lead_generation_backend
   docker build -f lead_generation_backend/Dockerfile.worker -t leadgen-worker ./lead_generation_backend
   docker build -f lead_generation_backend/Dockerfile.status -t leadgen-status ./lead_generation_backend
   ```

2. **Run with Docker Compose**:
   ```powershell
   docker compose -f docker-compose.backend.yml build
   docker compose -f docker-compose.backend.yml up --build -d
   ```

3. **Or run the images manually with a separate Kafka container**:
   ```powershell
   docker run -d --name broker -p 9092:9092 -p 9093:9093 `
     -e KAFKA_NODE_ID=1 `
     -e KAFKA_PROCESS_ROLES=broker,controller `
     -e KAFKA_LISTENERS=PLAINTEXT_LOCAL://0.0.0.0:9092,PLAINTEXT_DOCKER://0.0.0.0:9093,CONTROLLER://:9094 `
     -e KAFKA_ADVERTISED_LISTENERS=PLAINTEXT_LOCAL://localhost:9092,PLAINTEXT_DOCKER://host.docker.internal:9093 `
     -e KAFKA_CONTROLLER_LISTENER_NAMES=CONTROLLER `
     -e KAFKA_LISTENER_SECURITY_PROTOCOL_MAP=CONTROLLER:PLAINTEXT,PLAINTEXT_LOCAL:PLAINTEXT,PLAINTEXT_DOCKER:PLAINTEXT `
     -e KAFKA_INTER_BROKER_LISTENER_NAME=PLAINTEXT_LOCAL `
     -e KAFKA_CONTROLLER_QUORUM_VOTERS=1@localhost:9094 `
     -e KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR=1 `
     -e KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR=1 `
     -e KAFKA_TRANSACTION_STATE_LOG_MIN_ISR=1 `
     -e KAFKA_GROUP_INITIAL_REBALANCE_DELAY_MS=0 `
     -e KAFKA_NUM_PARTITIONS=2 `
     apache/kafka:latest
   ```

   Then run the backend containers:

   ```powershell
   docker run -d --name leadgen-api -p 8000:8000 `
     --add-host host.docker.internal:host-gateway `
     -e KAFKA_BOOTSTRAP=host.docker.internal:9093 `
     --env-file .\lead_generation_backend\.env `
     leadgen-api

   docker run -d --name leadgen-worker `
     --add-host host.docker.internal:host-gateway `
     -e KAFKA_BOOTSTRAP=host.docker.internal:9093 `
     --env-file .\lead_generation_backend\.env `
     leadgen-worker

   docker run -d --name leadgen-status `
     --add-host host.docker.internal:host-gateway `
     -e KAFKA_BOOTSTRAP=host.docker.internal:9093 `
     --env-file .\lead_generation_backend\.env `
     leadgen-status
   ```

4. **Check container logs**:
   ```powershell
   docker logs leadgen-api --tail 100
   docker logs leadgen-worker --tail 100
   docker logs leadgen-status --tail 100
   ```

### Kubernetes Setup

1. **Apply Kubernetes configurations**:
   ```bash
   cd lead_generation_backend/k8s
   kubectl apply -f namespace.yaml
   kubectl apply -f api-service.yaml
   kubectl apply -f worker-service.yaml
   kubectl apply -f status-service.yaml
   ```

---

## 📖 Usage

### Creating an Entity

1. Navigate to the Entity Management page
2. Click "Create New Entity"
3. Define entity fields (e.g., company_name, email, phone)
4. Save the entity configuration

### Configuring a Source

1. Go to Source Management
2. Add a new source (e.g., "Crunchbase", "Apollo.io")
3. Configure the base URL and authentication (if needed)

### Setting Up Field Mappings

1. Navigate to Mapping Manager
2. Select a source and URL
3. Configure entity mappings:
   - Define container selector (e.g., `.company-card`)
   - Map fields to CSS selectors
   - Specify extraction type (text, href, attribute)
4. Test the mapping with a preview
5. Save the configuration

### Running a Scrape Task

1. Go to Task Executor
2. Select an entity and source
3. Configure scraping parameters:
   - URL to scrape
   - Maximum items
   - Timeout
   - Pagination settings
4. Execute the task (manual or scheduled)
5. Monitor progress in the Tasks Management page

### Scheduling Tasks

1. Navigate to Task Scheduler
2. Create a new scheduled task
3. Configure:
   - Task type (scraping, outreach, etc.)
   - Schedule (cron expression)
   - Target entity and source
4. Enable the schedule
5. Tasks will run automatically according to the schedule

---

## 📚 API Documentation

Once the backend server is running, you can access:

- **Interactive API Docs**: `http://localhost:8000/docs` (Swagger UI)
- **ReDoc**: `http://localhost:8000/redoc`

### Key Endpoints

#### Entity Management
- `GET /entity` - List all entities
- `POST /entity` - Create new entity
- `GET /entity/{id}` - Get entity details
- `PUT /entity/{id}` - Update entity
- `DELETE /entity/{id}` - Delete entity

#### Source Management
- `GET /source` - List all sources
- `POST /source` - Create new source
- `GET /source/{id}` - Get source details
- `PUT /source/{id}` - Update source
- `DELETE /source/{id}` - Delete source

#### Mapping Management
- `GET /mapping` - List all mappings
- `POST /mapping` - Create new mapping
- `GET /mapping/{id}` - Get mapping details
- `PUT /mapping/{id}` - Update mapping
- `DELETE /mapping/{id}` - Delete mapping

#### Task Management
- `GET /task` - List all tasks
- `POST /task` - Create new task
- `GET /task/{id}` - Get task details
- `PUT /task/{id}` - Update task
- `DELETE /task/{id}` - Delete task
- `POST /task/{id}/execute` - Execute task manually

---

## 🗺️ Future Roadmap

### Phase 1: Core Scraping (Current)
- ✅ Basic web scraping infrastructure
- ✅ Entity and source management
- ✅ Task scheduling
- 🚧 Advanced pagination support
- 🚧 Error handling and retry logic

### Phase 2: Data Intelligence
- [ ] Lead scoring algorithm
- [ ] Duplicate detection
- [ ] Data validation and enrichment
- [ ] Contact information verification
- [ ] Technology stack detection

### Phase 3: Outreach Automation
- [ ] Email integration (SMTP, SendGrid, etc.)
- [ ] SMS integration (Twilio, etc.)
- [ ] Social media API integrations
- [ ] Auto-dialer integration
- [ ] Message template engine
- [ ] Personalization variables

### Phase 4: AI Integration
- [ ] ChatGPT integration for auto-replies
- [ ] AI-powered lead scoring
- [ ] Smart message generation
- [ ] Website adaptation using AI
- [ ] Sentiment analysis for responses

### Phase 5: Enterprise Features
- [ ] User authentication and authorization
- [ ] Multi-tenant support
- [ ] Advanced analytics dashboard
- [ ] Export and reporting
- [ ] Webhook integrations
- [ ] API rate limiting
- [ ] Compliance features (GDPR, CAN-SPAM, etc.)

### Phase 6: Commercialization
- [ ] Payment integration
- [ ] Subscription management
- [ ] Usage analytics
- [ ] Customer support portal
- [ ] Documentation and tutorials

---

## 🤝 Contributing

This is a Final Year Project, but contributions and suggestions are welcome!

### How to Contribute

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow PEP 8 for Python code
- Use ESLint for JavaScript/React code
- Write meaningful commit messages
- Add comments for complex logic
- Update documentation for new features

---

## ⚠️ Legal & Ethical Considerations

**Important**: This project is designed for educational and legitimate business purposes. When using web scraping:

1. **Respect robots.txt**: Always check and respect website robots.txt files
2. **Rate Limiting**: Implement appropriate delays between requests
3. **Terms of Service**: Review and comply with each website's Terms of Service
4. **Data Privacy**: Handle personal data in compliance with GDPR, CCPA, and other regulations
5. **Email Compliance**: Follow CAN-SPAM Act and similar regulations for email outreach
6. **API Usage**: Prefer official APIs when available over scraping

**Disclaimer**: Users are responsible for ensuring their use of this software complies with all applicable laws and regulations.

---

## 📝 License

This project is part of a Final Year Project. All rights reserved.

---

## 👥 Team

This project is being developed as part of a Final Year Project (FYP).

---

## 🙏 Acknowledgments

- **crawl4ai** - For AI-powered web crawling capabilities
- **FastAPI** - For the excellent Python web framework
- **React** - For the powerful frontend framework
- **Playwright** - For browser automation
- All other open-source contributors whose libraries make this project possible

---

## 📧 Contact

For questions, suggestions, or collaboration opportunities, please open an issue in the repository.

---

## 🎯 Project Goals

This project aims to:

1. **Solve Real Problems**: Build a tool that businesses actually need
2. **Learn Industry Tools**: Work with production-grade technologies
3. **Build a Portfolio**: Create something impressive for recruiters
4. **Potential Startup**: Explore commercialization opportunities

---

**Note**: This project is currently in active development. Some features may be incomplete or subject to change.

---

*Project Status: 🚧 In Development*

