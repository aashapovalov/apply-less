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
│   │       │   └── hugging-face-client.ts   # HF API for embeddings
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
│   │       │   ├── hugging-face-client.ts
│   │       │   └── playwright-client.ts
│   │       ├── config/
│   │       │   └── db.ts
│   │       ├── detectors/
│   │       ├── parsers/
│   │       ├── services/
│   │       │   ├── index.ts
│   │       │   ├── company-service.ts
│   │       │   ├── job-service.ts
│   │       │   └── job-source-service.ts
│   │       ├── stages/
│   │       │   ├── index.ts
│   │       │   ├── stage-a-snc.ts         # SNC company scraping
│   │       │   ├── stage-d-greenhouse.ts  # Greenhouse jobs
│   │       │   ├── stage-e-comeet.ts      # Comeet jobs
│   │       │   └── stage-g-embeddings.ts  # Embedding generation
│   │       ├── types/
│   │       │   └── index.ts
│   │       └── utils/
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
│   │   │   └── embed.py              # POST /api/embed
│   │   ├── config/
│   │   │   ├── __init__.py
│   │   │   └── settings.py           # Pydantic settings
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   └── embedding_service.py  # Model loading & inference
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
    ├── architecture.md
    ├── monorepo-structure.md
    └── plan.md
```

---

## Package Status

| Package | Status | Description |
|---------|--------|-------------|
| `api` | ✅ Working | Express API with auth, jobs, match, profile, favorites |
| `ingestion` | ✅ Working | CLI for SNC, Greenhouse, Comeet, embeddings |
| `ml-service` | ✅ Working | Python FastAPI with BGE embeddings |
| `web` | 🔲 Scaffolded | React + Vite template |
| `shared` | 🔲 Empty | Shared TypeScript types |

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

## ML Service Package Details

### Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check + model info |
| `/api/embed` | POST | Embed batch of texts (max 100) |
| `/api/embed/single` | POST | Embed single text |

### Services

| Service | Responsibility |
|---------|----------------|
| `embedding_service.py` | Model loading, inference, query prefixes |

### Model

- **Name:** BAAI/bge-base-en-v1.5
- **Dimensions:** 768
- **Size:** ~400MB
- **Inference:** ~50-200ms per text (CPU)

---

## NPM Scripts (root)

```bash
# Development
npm run dev:api      # Start API server (port 3001)
npm run dev:web      # Start Vite dev server (port 5173)
npm run dev          # Start all (concurrent)

# Ingestion
npm run ingest:snc        # Run SNC scraping
npm run ingest:snc:dry    # Dry run (3 pages)

# Database
npm run db:migrate   # Run SQL migrations
```

## Python ML Service

```bash
cd packages/ml-service
source venv/bin/activate
python main.py       # Start ML service (port 8000)
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
MODEL_NAME=BAAI/bge-base-en-v1.5
MODEL_CACHE_DIR=./model_cache
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