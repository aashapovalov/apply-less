# ApplyLess

AI-powered job matching platform for Israel hi-tech candidates. Automatically ingests jobs from company career pages and ATS systems, uses semantic matching to recommend relevant positions, and generates tailored CVs.

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
# API & Frontend
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

## Project Structure

```
apply-less/
├── packages/
│   ├── api/           # Express REST API (auth, jobs, matching, favorites)
│   ├── ingestion/     # Job scraping CLI (SNC, Greenhouse, Comeet)
│   ├── ml-service/    # Python ML service (embeddings, skills, CV generation)
│   └── web/           # React frontend (in progress)
├── db/migrations/     # PostgreSQL schema
└── docs/              # Documentation
```

## Documentation

- **[Architecture](docs/architecture.md)** — System design, API endpoints, data flows
- **[Monorepo Structure](docs/monorepo-structure.md)** — Package layout and file descriptions
- **[Implementation Plan](docs/plan.md)** — Development roadmap

## Tech Stack

**Backend:** Node.js, Express, PostgreSQL + pgvector, JWT  
**ML Service:** Python, FastAPI, sentence-transformers (BGE), Anthropic Claude  
**Frontend:** React, Vite, TailwindCSS  
**Infrastructure:** Railway, Vercel
