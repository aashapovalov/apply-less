# ApplyLess

AI-powered job matching platform for Israel hi-tech candidates. Automatically ingests jobs from company career pages and ATS systems, uses semantic matching to recommend relevant positions, and generates tailored CVs.

## 🚀 Current Status

| Component | Status | Details |
|-----------|--------|---------|
| **Database** | ✅ Production | Railway PostgreSQL + pgvector |
| **Companies** | ✅ 1496 | Scraped from StartupNationCentral |
| **Jobs** | ✅ ~770 | Israeli positions only (Greenhouse + Comeet) |
| **Embeddings** | ✅ Working | BGE 768d vectors for semantic search |
| **API** | ✅ Complete | Auth, Jobs, Match, Profile, Favorites |
| **ML Service** | ✅ Production | Embeddings, Skills, CV Generation |
| **Frontend** | ✅ Working | Jobs list, Job details, Auth pages, Landing |
| **Location Filter** | ✅ Complete | Israel-only with region classification |

## Quick Start

### Prerequisites

- Node.js 20+
- Python 3.11+
- PostgreSQL with pgvector

### Setup

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your DATABASE_URL and secrets

# Run database migrations
npm run db:migrate

# Start API server (port 3001)
npm run dev:api

# Start Web frontend (port 5173) - separate terminal
npm run dev:web

# Start ML service (port 8000) - separate terminal
cd packages/ml-service
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python main.py
```

### Verify Installation

```bash
curl http://localhost:3001/health
curl http://localhost:8000/health
```

## CLI Commands

```bash
# Development
npm run dev:api              # Express API (port 3001)
npm run dev:web              # React frontend (port 5173)

# Database
npm run db:migrate           # Run SQL migrations

# Ingestion Pipeline
npm run start --workspace=packages/ingestion -- snc         # Scrape companies from SNC
npm run start --workspace=packages/ingestion -- detect      # Detect ATS systems
npm run start --workspace=packages/ingestion -- greenhouse  # Fetch Greenhouse jobs
npm run start --workspace=packages/ingestion -- comeet      # Fetch Comeet jobs
npm run start --workspace=packages/ingestion -- embeddings  # Generate embeddings
```

## Features

### ✅ Implemented

- **Job Ingestion** - Automated scraping from Greenhouse and Comeet ATS
- **Location Normalization** - Israeli cities mapped to regions (Central, North, South, Jerusalem, Remote)
- **Non-Israeli Filtering** - Automatically filters out US/EU jobs during ingestion
- **JWT Authentication** - Register, login, email verification, password reset
- **Job Matching** - Vector similarity search with pgvector
- **Profile Management** - Save and manage your professional profile
- **Favorites** - Save jobs for later
- **CV Generation** - AI-generated tailored CVs using Claude
- **HTML Descriptions** - Properly formatted job descriptions with lists, headers

### 🔜 Upcoming

- Profile page UI
- Match results page
- Skills extraction per job
- Advanced search filters

## Project Structure

```
apply-less/
├── packages/
│   ├── api/           # Express REST API
│   ├── ingestion/     # Job scraping CLI
│   ├── ml-service/    # Python ML service (FastAPI)
│   └── web/           # React frontend (Vite + TailwindCSS)
├── db/migrations/     # PostgreSQL schema
├── docs/              # Documentation
└── scripts/           # Database utilities
```

## Documentation

- **[Architecture](docs/architecture.md)** — System design, API endpoints, data flows
- **[Monorepo Structure](docs/monorepo-structure.md)** — Package layout and file descriptions
- **[Implementation Plan](docs/plan.md)** — Development roadmap
- **[Bugs & Issues](docs/BUGS.md)** — Known issues and fixes

## Tech Stack

| Layer | Technology |
|-------|------------|
| **API** | Node.js, Express 5, TypeScript, JWT |
| **ML Service** | Python, FastAPI, sentence-transformers, Claude API |
| **Database** | PostgreSQL 17, pgvector |
| **Frontend** | React 19, Vite, TailwindCSS 4, Redux Toolkit |
| **Email** | Resend API |
| **Hosting** | Railway (API, ML, DB), Vercel (web) |

## Environment Variables

See `.env.example` for full list. Key variables:

```env
# Database
DATABASE_URL=postgresql://...

# JWT Auth
JWT_SECRET=<32+ chars>
JWT_REFRESH_SECRET=<32+ chars>

# Email
RESEND_API_KEY=re_xxxxx
FROM_EMAIL=onboarding@resend.dev
FRONTEND_URL=http://localhost:5173

# ML Service
ANTHROPIC_API_KEY=sk-ant-...
ML_SERVICE_URL=http://localhost:8000
```

## License

Private project - Startup Nation Central Demo
