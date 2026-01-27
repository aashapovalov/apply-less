# ApplyLess Monorepo Structure

```
apply-less/
├── README.md
├── package.json                      # Root workspace config
├── tsconfig.base.json
├── docker-compose.yml                # Local Postgres + pgvector
├── .env                              # Environment variables
├── .env.example
├── .gitignore
│
├── packages/
│   │
│   ├── api/                          # Node.js Express API ✅
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── .env
│   │   └── src/
│   │       ├── index.ts              # Express server entry
│   │       ├── clients/
│   │       │   └── hugging-face-client.ts # HF API for embeddings
│   │       ├── config/
│   │       │   └── db.ts             # PostgreSQL connection pool
│   │       ├── global/
│   │       │   └── index.ts          # Email templates
│   │       ├── middleware/
│   │       │   └── auth-middleware.ts # JWT verification
│   │       ├── routes/
│   │       │   ├── index.ts          # Route exports
│   │       │   ├── auth-router.ts    # /api/auth/* endpoints
│   │       │   ├── jobs-router.ts    # /api/jobs endpoints
│   │       │   ├── match-router.ts   # /api/match endpoint
│   │       │   ├── profile-router.ts # /api/profile endpoints
│   │       │   └── favorites-router.ts # /api/favorites endpoints
│   │       ├── services/
│   │       │   ├── index.ts
│   │       │   ├── auth-service.ts   # Auth orchestration
│   │       │   ├── token-service.ts  # Token CRUD operations
│   │       │   ├── user-service.ts   # User CRUD operations
│   │       │   ├── email-service.ts  # Resend email client
│   │       │   ├── rate-limit-service.ts
│   │       │   ├── job-service.ts    # Job queries
│   │       │   ├── match-service.ts  # Profile matching
│   │       │   ├── profile-service.ts # Profile CRUD
│   │       │   └── favorites-service.ts # Favorites CRUD
│   │       ├── types/
│   │       │   └── index.ts          # TypeScript interfaces
│   │       └── utils/
│   │           └── password-validation.ts
│   │
│   ├── ingestion/                    # Job ingestion CLI ✅
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── .env
│   │   └── src/
│   │       ├── cli.ts                # Commander CLI entry
│   │       ├── clients/
│   │       │   ├── index.ts
│   │       │   ├── snc-client-playwright.ts
│   │       │   ├── greenhouse-client.ts
│   │       │   ├── comeet-client.ts
│   │       │   ├── embedding-client.ts
│   │       │   └── playwright-client.ts
│   │       ├── config/
│   │       │   └── db.ts
│   │       ├── detectors/                    # ATS detection modules ✅ REFACTORED
│   │       │   ├── index.ts                  # Exports all detectors
│   │       │   ├── ats-detector.ts           # HTML/URL pattern detection
│   │       │   ├── ats-patterns.ts           # Vendor-specific patterns
│   │       │   ├── greenhouse-probe.ts       # API probing with slug variations
│   │       │   ├── deep-crawler.ts           # Recursive link crawling
│   │       │   ├── keyword-detector.ts       # Keyword fallback detection
│   │       │   └── detection-pipeline.ts     # Orchestrates all detectors
│   │       ├── parsers/
│   │       │   └── company-detail-parser.ts
│   │       ├── services/
│   │       │   ├── index.ts
│   │       │   ├── company-service.ts
│   │       │   ├── job-service.ts
│   │       │   └── job-source-service.ts
│   │       ├── stages/
│   │       │   ├── index.ts
│   │       │   ├── stage-a-snc.ts            # SNC company scraping
│   │       │   ├── stage-b-detect-ats.ts     # ATS detection (uses pipeline)
│   │       │   ├── stage-d-greenhouse.ts     # Greenhouse jobs
│   │       │   ├── stage-e-comeet.ts         # Comeet jobs
│   │       │   └── stage-g-embeddings.ts     # Embedding generation
│   │       ├── types/
│   │       │   └── index.ts
│   │       └── utils/
│   │           ├── index.ts
│   │           ├── prepare-job-text.ts
│   │           ├── stage-b-query-builder.ts  # Query builder for Stage B flags
│   │           ├── text-normalizer.ts
│   │           └── url-normalizer.ts
│   │
│   ├── ml-service/                   # Python FastAPI ✅
│   │   ├── main.py                   # FastAPI entry point
│   │   ├── requirements.txt          # Python dependencies
│   │   ├── Dockerfile                # Production container
│   │   ├── railway.json              # Railway deployment config
│   │   ├── .dockerignore
│   │   ├── .env.example
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── health.py             # GET /health
│   │   │   ├── embed.py              # POST /api/embed, /api/embed/single
│   │   │   └── chunk.py              # POST /api/chunk/job, /api/chunk/profile
│   │   ├── config/
│   │   │   ├── __init__.py
│   │   │   └── settings.py           # Pydantic settings (both models)
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── embedding_service.py         # BGE model loading & inference
│   │   │   ├── skill_extractor_service.py   # NER skill extraction
│   │   │   ├── skill_patterns.py            # Keyword fallback patterns
│   │   │   ├── job_chunker_service.py       # Job section detection
│   │   │   ├── profile_chunker_service.py   # Profile chunking
│   │   │   └── profile_pattern_regex.py     # Profile parsing patterns
│   │   ├── models/                   # Pydantic models (if any)
│   │   ├── embed_model_cache/        # BGE model cache (local)
│   │   ├── model_cache/              # NER model cache (local)
│   │   └── venv/                     # Virtual environment (local)
│   │
│   ├── web/                          # React frontend 🔲 scaffolded
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vite.config.ts
│   │   ├── index.html
│   │   ├── .env
│   │   └── src/
│   │       ├── main.tsx
│   │       ├── App.tsx               # Default Vite template
│   │       ├── App.css
│   │       ├── index.css
│   │       ├── assets/
│   │       ├── components/           # empty
│   │       ├── config/               # empty
│   │       ├── hooks/                # empty
│   │       ├── pages/                # empty
│   │       ├── services/             # empty
│   │       ├── types/                # empty
│   │       └── utils/                # empty
│   │
│   └── shared/                       # Shared types 🔲 empty
│       ├── tsconfig.json
│       └── src/
│
├── scripts/
│   ├── migrate.js                    # Run SQL migrations
│   ├── migrate-helpers.js
│   └── setup-db.sh
│
├── db/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_add_embeddings.sql
│   │   ├── 003_add_user_tables.sql
│   │   ├── 004_add_indexes.sql
│   │   ├── 005_add_company_details.sql
│   │   ├── 006_increase_location_length.sql
│   │   ├── 007_auth_tables.sql
│   │   ├── 008_fix_email_verified_typo.sql
│   │   └── 009_make_firebase_uid_nullable.sql
│   └── seed/
│
└── docs/
    ├── architecture.md               # System architecture
    ├── monorepo-structure.md         # This file
    ├── plan.md                       # Implementation plan
    └── task-*.md                     # Task specifications
```

---

## Package Status

| Package | Status | Description |
|---------|--------|-------------|
| `api` | ✅ Working | Express API with auth, jobs, match, profile, favorites |
| `ingestion` | ✅ Working | CLI for SNC, ATS detection, Greenhouse, Comeet, embeddings |
| `ml-service` | ✅ Working | FastAPI with embeddings + chunking + skill extraction |
| `web` | 🔲 Scaffolded | React + Vite template |
| `shared` | 🔲 Empty | Shared TypeScript types |

---

## Database Counts (Jan 27, 2026)

| Table | Count |
|-------|-------|
| companies | 1,496 |
| job_sources | 683 |
| jobs | 1,716 |
| job_embeddings | 682 |

---

## API Package Details

### Services

| Service | Lines | Responsibility |
|---------|-------|----------------|
| `auth-service.ts` | ~280 | Auth flow orchestration |
| `token-service.ts` | ~200 | Token generation, validation, revocation |
| `user-service.ts` | ~110 | User CRUD, credential verification |
| `email-service.ts` | ~70 | Email sending via Resend |
| `rate-limit-service.ts` | ~100 | Rate limiting logic |
| `job-service.ts` | ~150 | Job queries, vector search |
| `match-service.ts` | ~60 | Profile embedding + matching |
| `profile-service.ts` | ~60 | Profile text CRUD |
| `favorites-service.ts` | ~100 | Favorites CRUD with job details |

### Routes

| Router | Endpoints |
|--------|-----------|
| `auth-router.ts` | register, login, refresh, logout, verify-email, forgot-password, reset-password, resend-verification, me |
| `jobs-router.ts` | GET /, GET /:id |
| `match-router.ts` | POST / (protected) |
| `profile-router.ts` | GET /, POST /, DELETE / (protected) |
| `favorites-router.ts` | GET /, GET /:jobId, POST /:jobId, DELETE /:jobId (protected) |

### Middleware

| Middleware | Description |
|------------|-------------|
| `auth-middleware.ts` | JWT verification, extracts userId |

---

## Ingestion Package Details

### CLI Commands

| Command | Description |
|---------|-------------|
| `snc` | Scrape companies from StartupNationCentral |
| `detect` | Detect ATS systems from career URLs |
| `greenhouse` | Fetch jobs from Greenhouse ATS |
| `comeet` | Fetch jobs from Comeet ATS |
| `embeddings` | Generate embeddings for jobs |

### ATS Detection Pipeline

Stage B (`detect` command) uses a modular detection pipeline:

| Module | Responsibility |
|--------|----------------|
| `ats-detector.ts` | HTML/URL pattern matching from page content |
| `ats-patterns.ts` | Vendor-specific patterns (Greenhouse, Comeet, Lever, Workable) |
| `greenhouse-probe.ts` | API probing with company name slug variations |
| `deep-crawler.ts` | Recursive crawling for hidden ATS (follows job links) |
| `keyword-detector.ts` | Last-resort keyword matching (e.g., "comeet" in HTML) |
| `detection-pipeline.ts` | Orchestrates detectors in order |

### Detection Priority

| Step | Method | Confidence |
|------|--------|------------|
| 1 | Page Detection (URL/DOM/HTML patterns) | 85-95% |
| 2 | Greenhouse API Probe | 75% |
| 3 | Deep Crawl (optional) | varies |
| 4 | Keyword Match | 65% |

### Detection Flags

| Flag | Companies Processed |
|------|---------------------|
| (none) | `ats_checked_at IS NULL` (new companies) |
| `--recheck` | Checked but no job_source found |
| `--force` | New OR no job_source |
| `--recheck --force` | All companies (full re-run) |
| `--deep-crawl` | Enable recursive link crawling |
| `-c, --company <n>` | Single company by name |

### ATS Vendor Support

| Vendor | Detection | Slug Extraction |
|--------|-----------|-----------------|
| Greenhouse | URL, DOM, script, API probe | ✅ Board slug |
| Comeet | URL, DOM, script, keyword | ✅ UID + token |
| Lever | URL patterns | ✅ Company slug |
| Workable | URL patterns | ✅ Company slug |

### Deep Crawl Feature

Finds ATS hidden behind navigation layers:
- Follows job-like links up to 2 levels deep
- Excludes header/footer/nav elements
- Excludes social media domains
- Follows links to known ATS domains (greenhouse.io, lever.co, comeet.co)

---

## ML Service Package Details

### Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check + model info |
| `/api/embed` | POST | Embed batch of texts (max 100) |
| `/api/embed/single` | POST | Embed single text |
| `/api/chunk/job` | POST | Job chunking + skills + embeddings |
| `/api/chunk/profile` | POST | Profile chunking + feedback + score |

### Services

| Service | Responsibility |
|---------|----------------|
| `embedding_service.py` | BGE model loading, inference, query prefixes |
| `skill_extractor_service.py` | NER model loading, skill extraction with levels |
| `skill_patterns.py` | Keyword fallback patterns for common skills |
| `job_chunker_service.py` | Job section detection (about, requirements, etc.) |
| `profile_chunker_service.py` | Profile chunking with feedback |
| `profile_pattern_regex.py` | Date/title/action verb patterns |

### Models

| Model | Purpose | Size |
|-------|---------|------|
| BAAI/bge-base-en-v1.5 | Text embeddings (768d) | ~400MB |
| feliponi/hirly-ner-multi | NER skill extraction | ~1.1GB |

### Skill Extraction Features

| Feature | Description |
|---------|-------------|
| NER Model | Extracts SKILL, SOFT_SKILL, LANG, CERT, EXPERIENCE_DURATION |
| Keyword Fallback | 100+ patterns for commonly missed skills |
| Level Detection | Classifies mandatory/preferred based on sentence context |
| Sentence Parsing | Finds skill's containing sentence for context |

### Job Chunking Features

| Feature | Description |
|---------|-------------|
| Section Detection | about, responsibilities, requirements, benefits, preferred |
| Header Generation | Synthetic header from title/company/location |
| Per-section Embeddings | Each section gets its own embedding vector |
| Skill Extraction | Skills with mandatory/preferred levels |

### Profile Chunking Features

| Feature | Description |
|---------|-------------|
| Aspect Detection | full, experience, education sections |
| Multi-signal Parsing | Dates, job titles, action verbs, narrative |
| Feedback Generation | Skills, experience, metrics, length checks |
| Completeness Score | 0-1 score based on profile quality |

---

## NPM Scripts (root)

```bash
# Development
npm run dev:api      # Start API server (port 3001)
npm run dev:web      # Start Vite dev server (port 5173)
npm run dev          # Start all (concurrent)

# Ingestion
npm run ingest:snc        # Run SNC scraping

# Database
npm run db:migrate   # Run SQL migrations
```

## Python ML Service

```bash
cd packages/ml-service
source venv/bin/activate
python main.py       # Start ML service (port 8000)

# Or with uvicorn directly
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Test Endpoints

```bash
# Health check
curl http://localhost:8000/health | jq

# Embed text
curl -X POST http://localhost:8000/api/embed/single \
  -H "Content-Type: application/json" \
  -d '{"text": "Python developer"}' | jq

# Chunk job
curl -X POST http://localhost:8000/api/chunk/job \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Requirements: Python, AWS required. Nice to have: Docker",
    "title": "Backend Developer",
    "company": "TechCorp",
    "location": "Tel Aviv"
  }' | jq '.skills'

# Chunk profile
curl -X POST http://localhost:8000/api/chunk/profile \
  -H "Content-Type: application/json" \
  -d '{"text": "Senior Software Engineer with 5 years Python experience..."}' | jq
```

---

## Environment Variables

### Node.js API
```env
DATABASE_URL=postgresql://...
JWT_SECRET=<32+ char secret>
JWT_REFRESH_SECRET=<32+ char secret>
RESEND_API_KEY=re_xxxxx
FROM_EMAIL=onboarding@resend.dev
FRONTEND_URL=http://localhost:5173
HF_TOKEN=hf_xxxxx
```

### Python ML Service
```env
EMBED_MODEL_NAME=BAAI/bge-base-en-v1.5
EMBED_MODEL_CACHE_DIR=./embed_model_cache
SKILLS_EXTRACTION_MODEL_NAME=feliponi/hirly-ner-multi
SKILLS_EXTRACTION_MODEL_CACHE_DIR=./model_cache
HOST=0.0.0.0
PORT=8000
```

### Ingestion
```env
DATABASE_URL=postgresql://...
HF_TOKEN=hf_xxxxx
SNC_BASE_URL=https://finder.startupnationcentral.org
SNC_AUTH_TOKEN=...
SNC_REFRESH_TOKEN=...
```

---

## Package Dependencies

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    web      │────►│    api      │────►│  ml-service │
│   (React)   │     │  (Express)  │     │  (FastAPI)  │
└─────────────┘     └──────┬──────┘     └─────────────┘
                           │
                    ┌──────▼──────┐
                    │   shared    │
                    │   (types)   │
                    └──────▲──────┘
                           │
                    ┌──────┴──────┐
                    │  ingestion  │
                    │   (CLI)     │
                    └─────────────┘
```
