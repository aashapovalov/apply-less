# ApplyLess

**AI-powered job search assistant for Israel hi-tech candidates.**

ApplyLess automatically ingests job postings from company career pages and ATS systems, and uses semantic matching to recommend relevant jobs based on your profile.

---

## 🎯 Current Status

**Phase: API Complete → Moving to Python ML & Frontend**

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
| Frontend | ⏳ Planned | Job browser + recommendations |

---

## 🏗️ Architecture

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   Ingestion      │     │   API Service    │     │   Frontend       │
│   (Node.js)      │     │   (Express)      │     │   (React)        │
│                  │     │                  │     │                  │
│ • SNC Scraping   │     │ • /auth/* ✅     │     │ 🔲 Scaffolded    │
│ • Greenhouse ✅  │     │ • /jobs ✅       │     │                  │
│ • Comeet ✅      │     │ • /match ✅      │     │                  │
│ • Embeddings ✅  │     │ • /profile ✅    │     │                  │
│                  │     │ • /favorites ✅  │     │                  │
└────────┬─────────┘     └────────┬─────────┘     └──────────────────┘
         │                        │
         │         ┌──────────────┴──────────────┐
         │         │                             │
         ▼         ▼                             ▼
┌─────────────────────────────────────────────────────────────┐
│  PostgreSQL + pgvector (Railway)                            │
│                                                             │
│  Tables: companies, job_sources, jobs, job_embeddings,      │
│          users, favorites, auth tokens, rate_limits         │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 Project Structure

```
apply-less/
├── packages/
│   ├── ingestion/          # Job scraping & ingestion
│   │   └── src/
│   │       ├── cli.ts      # CLI entry point
│   │       ├── stages/     # Ingestion stages
│   │       ├── clients/    # API clients
│   │       └── services/   # Database services
│   │
│   ├── api/                # Express API ✅
│   │   └── src/
│   │       ├── routes/     # auth, jobs, match, profile, favorites
│   │       ├── services/   # Business logic
│   │       ├── middleware/ # JWT auth
│   │       └── index.ts    # Server entry
│   │
│   ├── web/                # React frontend (scaffolded)
│   └── ml-service/         # Python ML service (scaffolded)
│
├── db/
│   └── migrations/         # SQL migrations (001-009)
│
├── docs/                   # Documentation
├── scripts/                # Utility scripts
└── docker-compose.yml      # Local development (optional)
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
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
```

### Test the API

```bash
# Health check
curl http://localhost:3001/health

# Get jobs
curl http://localhost:3001/api/jobs

# Register
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "SecurePass1!"}'

# Login (after email verification)
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "SecurePass1!"}'
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

### ⏳ Planned

- [ ] Python ML service (local embeddings)
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

**Frontend (planned):**
- React + Vite
- TailwindCSS

**ML (planned):**
- Python + FastAPI
- Sentence Transformers

**Infrastructure:**
- Railway (hosting)
- GitHub
