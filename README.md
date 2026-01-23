# ApplyLess

**AI-powered job search assistant for Israel hi-tech candidates.**

ApplyLess automatically ingests job postings from company career pages and ATS systems, and uses semantic matching to recommend relevant jobs based on your profile.

---

## 🎯 Current Status

**Phase: Backend Complete → Moving to Ingestion & Frontend**

| Component | Status | Details |
|-----------|--------|---------|
| Database | ✅ Deployed | Railway PostgreSQL + pgvector |
| Companies | ✅ 1007 | Scraped from SNC |
| Job Sources | ✅ 176 | Career pages detected |
| Jobs | ✅ 111 | From Greenhouse API |
| Embeddings | ✅ 111 | BGE-base-en via HuggingFace API |
| Auth API | ✅ Working | JWT + email verification |
| Jobs API | ✅ Working | List, search, details |
| Match API | ✅ Working | Vector similarity search |
| Profile API | ✅ Working | Save/retrieve profile text |
| Favorites API | ✅ Working | Add/remove saved jobs |
| ML Service | ✅ Working | Python FastAPI + BGE model |
| Frontend | ⏳ Planned | Job browser + recommendations |

---

## 🏗️ Architecture

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   Ingestion      │     │   API Service    │     │   Python ML      │
│   (Node.js)      │     │   (Express)      │     │   (FastAPI)      │
│                  │     │                  │     │                  │
│ • SNC Scraping   │     │ • /auth/* ✅     │     │ • /health ✅     │
│ • Greenhouse ✅  │     │ • /jobs ✅       │     │ • /api/embed ✅  │
│ • Comeet ✅      │     │ • /match ✅      │     │                  │
│ • Embeddings ✅  │     │ • /profile ✅    │     │ BGE-base-en-v1.5 │
│                  │     │ • /favorites ✅  │     │ 768 dimensions   │
└────────┬─────────┘     └────────┬─────────┘     └────────┬─────────┘
         │                        │                        │
         └────────────────────────┼────────────────────────┘
                                  ▼
                  ┌───────────────────────────────┐
                  │  PostgreSQL + pgvector        │
                  │  Railway                      │
                  └───────────────────────────────┘
```

---

## 📦 Project Structure

```
apply-less/
├── packages/
│   ├── ingestion/          # Job scraping & ingestion
│   ├── api/                # Express API ✅
│   ├── ml-service/         # Python ML service ✅
│   └── web/                # React frontend (scaffolded)
│
├── db/migrations/          # SQL migrations (001-009)
├── docs/                   # Documentation
└── scripts/                # Utility scripts
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Python 3.11+
- npm

### Setup

```bash
# Clone repository
git clone https://github.com/aashapovalov/apply-less.git
cd apply-less

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Edit .env with your DATABASE_URL and other secrets

# Run migrations
npm run db:migrate

# Start API server
npm run dev:api

# Start ML service (separate terminal)
cd packages/ml-service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py
```

### Test the APIs

```bash
# Node.js API
curl http://localhost:3001/health
curl http://localhost:3001/api/jobs

# Python ML Service
curl http://localhost:8000/health
curl -X POST http://localhost:8000/api/embed/single \
  -H "Content-Type: application/json" \
  -d '{"text": "Python developer", "text_type": "query"}'
```

---

## 🔧 CLI Commands

```bash
# Development
npm run dev:api           # Start API server (port 3001)
npm run dev:web           # Start frontend (port 5173)

# Database
npm run db:migrate        # Run SQL migrations

# Ingestion
npm run start --workspace=packages/ingestion -- snc        # SNC companies
npm run start --workspace=packages/ingestion -- greenhouse # Greenhouse jobs
npm run start --workspace=packages/ingestion -- comeet     # Comeet jobs
npm run start --workspace=packages/ingestion -- embeddings # Generate embeddings
```

---

## 📈 Progress

### ✅ Completed

- [x] Project setup & monorepo structure
- [x] Database schema with pgvector
- [x] Railway deployment (PostgreSQL + pgvector)
- [x] SNC company scraping (1007 companies)
- [x] Career page detection (176 sources)
- [x] Greenhouse API integration (111 jobs)
- [x] Comeet API integration
- [x] Embeddings generation (BGE-base-en-v1.5)
- [x] JWT authentication with email verification
- [x] Jobs API (list, search, details)
- [x] Match API (vector similarity)
- [x] Profile API (save/retrieve)
- [x] Favorites API (CRUD)
- [x] Python ML service (local embeddings)

### ⏳ Planned

- [ ] More job ingestion (2000+ target)
- [ ] CV generation
- [ ] React frontend
- [ ] Production deployment

---

## 📚 Documentation

- [Architecture](docs/architecture.md) - System design & API endpoints
- [Monorepo Structure](docs/monorepo-structure.md) - Package layout
- [Implementation Plan](docs/plan.md) - Development roadmap

---

## 🛠️ Tech Stack

**Backend:**
- Node.js + TypeScript + Express
- PostgreSQL + pgvector
- JWT + bcrypt (auth)
- Resend (email)

**ML Service:**
- Python + FastAPI
- sentence-transformers
- BGE-base-en-v1.5 (768d embeddings)

**Frontend (planned):**
- React + Vite
- TailwindCSS

**Infrastructure:**
- Railway (hosting)
- GitHub