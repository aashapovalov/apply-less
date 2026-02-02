# ApplyLess

AI-powered job matching platform for Israeli tech candidates. Automatically ingests jobs from company career pages and ATS systems, uses semantic matching to recommend relevant positions, and generates tailored CVs.

## 🚀 Current Status

| Component | Status | Details |
|-----------|--------|---------|
| **Database** | ✅ Production | Railway PostgreSQL + pgvector |
| **Companies** | ✅ 1496 | Scraped from StartupNationCentral |
| **Jobs** | ✅ ~770 | Israeli positions only (Greenhouse + Comeet) |
| **Embeddings** | ✅ Working | BGE 768d vectors + chunk embeddings |
| **Matching** | ✅ Strategy C | Section-based weighted matching |
| **API** | ✅ Complete | Auth, Jobs, Match, Profile, Favorites, CV |
| **ML Service** | ✅ Production | Embeddings, Chunking, Skills, CV Generation |
| **Frontend** | ✅ Complete | Jobs (3 views), Profile, Auth, CV Modal |
| **Location Filter** | ✅ Complete | Israel-only with region classification |

## ✨ Features

### Implemented

- **Job Ingestion** — Automated scraping from Greenhouse and Comeet ATS
- **Location Normalization** — Israeli cities mapped to regions (Central, North, South, Jerusalem, Remote)
- **Non-Israeli Filtering** — Automatically filters out US/EU jobs during ingestion
- **JWT Authentication** — Register, login, email verification, password reset
- **Unified Jobs Page** — Three views in one page:
  - **All Jobs** — Browse with server-side pagination
  - **Matches** — Jobs ranked by relevance (default for logged-in users)
  - **Favorites** — Saved jobs (client-side filtering)
- **Smart Job Matching** — Section-based semantic matching (Strategy C)
  - 40% profile title ↔ job header
  - 35% profile experience ↔ job requirements  
  - 25% full profile ↔ full description
- **Job Filters** — Region, company, role, date (works on all views)
- **Profile Management** — Upload PDF/DOC/DOCX or paste text
- **Favorites** — Save/remove jobs with heart button
- **CV Generation UI** — Modal with:
  - Profile validation (minimum word count)
  - 5-step loading animation
  - Generated CV preview
  - Requirements analysis (covered vs gaps)
  - Match score visualization
  - PDF download with styled formatting and clickable links
- **HTML Descriptions** — Properly formatted job descriptions
- **Smart Login Redirect** — Goes to Matches if profile exists, Profile page if not

### Coming Soon

- Production deployment

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

# Start API server (port 8080)
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
curl http://localhost:8080/health
curl http://localhost:8000/health
```

## CLI Commands

```bash
# Development
npm run dev:api              # Express API (port 8080)
npm run dev:web              # React frontend (port 5173)

# Database
npm run db:migrate           # Run SQL migrations

# Ingestion Pipeline
npm run start --workspace=packages/ingestion -- snc         # Scrape companies from SNC
npm run start --workspace=packages/ingestion -- detect      # Detect ATS systems
npm run start --workspace=packages/ingestion -- greenhouse  # Fetch Greenhouse jobs
npm run start --workspace=packages/ingestion -- comeet      # Fetch Comeet jobs
npm run start --workspace=packages/ingestion -- embeddings  # Generate full + chunk embeddings
```

## Jobs Page Views

The jobs page (`/jobs`) supports three views via URL parameter:

| URL | View | Description |
|-----|------|-------------|
| `/jobs` or `/jobs?view=all` | All Jobs | Browse all jobs with server-side pagination |
| `/jobs?view=matches` | Matches | Jobs ranked by profile match (default for users with profile) |
| `/jobs?view=favorites` | Favorites | Saved jobs only (requires login) |

**Filters** work on all views:
- **All Jobs**: Server-side filtering via API
- **Matches/Favorites**: Client-side filtering (all data loaded upfront)

## CV Generation

Generate tailored CVs from job cards (matches/favorites) or job details page:

```
┌─────────────────────────────────────────────────────────────────┐
│  CV Generation Flow                                             │
├─────────────────────────────────────────────────────────────────┤
│  1. Click "Generate CV" on job card or details page             │
│  2. Modal validates profile (min 100 words)                     │
│  3. ML service generates CV using Claude + job requirements     │
│  4. ML service compares generated CV to job (skill coverage)    │
│  5. Modal shows CV preview + requirements analysis + score      │
│  6. Download as styled PDF with clickable email/LinkedIn links  │
└─────────────────────────────────────────────────────────────────┘
```

**PDF Features:**
- Professional styling (14pt name, 12pt title, 10pt body)
- Section headers with underlines
- Bullet points with proper indentation
- Clickable email (`mailto:`) and LinkedIn links

## Matching System (Strategy C)

The matching system uses section-based semantic similarity with weighted scoring:

```
┌─────────────────────┐         ┌─────────────────────┐
│   USER PROFILE      │         │   JOB POSTING       │
├─────────────────────┤         ├─────────────────────┤
│ Title Embedding     │◄──40%──►│ Header Embedding    │
│ Experience Embedding│◄──35%──►│ Requirements Embed. │
│ Full Embedding      │◄──25%──►│ Full Embedding      │
└─────────────────────┘         └─────────────────────┘
```

**Why Strategy C?**
- Full document embeddings average everything together
- A PM profile would match "Software Engineer" higher than "AI Product Manager" due to shared keywords
- Section-based matching compares like-with-like

**Embedding Flow:**
1. **Profile Save** → ML service chunks profile → embeddings stored in `users` table
2. **Job Ingestion** → ML service chunks job → embeddings stored in `jobs` table
3. **Matching** → Weighted SQL query using pre-computed embeddings (fast, no ML calls)

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

## API Endpoints

### Public

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/jobs` | GET | List jobs with filters |
| `/api/jobs/:id` | GET | Job details |
| `/api/jobs/regions` | GET | Regions with counts |
| `/api/jobs/companies` | GET | Company autocomplete |

### Authenticated

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/match` | POST | Match profile to jobs |
| `/api/profile` | GET/POST/DELETE | Profile CRUD |
| `/api/profile/parse` | POST | Parse uploaded file |
| `/api/favorites` | GET | List favorites |
| `/api/favorites/:jobId` | GET/POST/DELETE | Manage favorites |
| `/api/cv/generate` | POST | Generate tailored CV |
| `/api/cv/compare` | POST | Compare CV to job |

### Auth

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | Create account |
| `/api/auth/login` | POST | Login |
| `/api/auth/refresh` | POST | Refresh tokens |
| `/api/auth/me` | GET | Current user |

## Documentation

- **[Architecture](docs/architecture.md)** — System design, matching algorithm, data flows
- **[Monorepo Structure](docs/monorepo-structure.md)** — Package layout and file descriptions
- **[Implementation Plan](docs/plan.md)** — Development roadmap
- **[Bugs & Issues](docs/BUGS.md)** — Known issues and fixes

## Tech Stack

| Layer | Technology |
|-------|------------|
| **API** | Node.js, Express 5, TypeScript, JWT |
| **ML Service** | Python, FastAPI, sentence-transformers, Claude API |
| **Database** | PostgreSQL 17, pgvector |
| **Frontend** | React 19, Vite, TailwindCSS 4, Redux Toolkit, jsPDF |
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
