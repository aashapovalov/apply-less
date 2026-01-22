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
│   │       │   └── match-router.ts   # /api/match endpoint
│   │       ├── services/
│   │       │   ├── index.ts
│   │       │   ├── auth-service.ts   # Auth orchestration
│   │       │   ├── token-service.ts  # Token CRUD operations
│   │       │   ├── user-service.ts   # User CRUD operations
│   │       │   ├── email-service.ts  # Resend email client
│   │       │   ├── rate-limit-service.ts
│   │       │   ├── job-service.ts    # Job queries
│   │       │   └── match-service.ts  # Profile matching
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
│   ├── ml-service/                   # Python FastAPI 🔲 scaffolded
│   │   ├── requirements.txt
│   │   ├── .env
│   │   ├── api/
│   │   ├── config/
│   │   ├── models/
│   │   ├── services/
│   │   ├── utils/
│   │   └── venv/
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
| `api` | ✅ Working | Express API with auth, jobs, match |
| `ingestion` | ✅ Working | CLI for SNC, Greenhouse, Comeet, embeddings |
| `ml-service` | 🔲 Scaffolded | Python FastAPI (empty) |
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

### Routes

| Router | Endpoints |
|--------|-----------|
| `auth-router.ts` | register, login, refresh, logout, verify-email, forgot-password, reset-password, resend-verification, me |
| `jobs-router.ts` | GET /, GET /:id |
| `match-router.ts` | POST / (protected) |

### Middleware

| Middleware | Description |
|------------|-------------|
| `auth-middleware.ts` | JWT verification, extracts userId |

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

---

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://...

# Auth
JWT_SECRET=<32+ char secret>
JWT_REFRESH_SECRET=<32+ char secret>

# Email
RESEND_API_KEY=re_xxxxx
FROM_EMAIL=onboarding@resend.dev
FRONTEND_URL=http://localhost:5173

# Embeddings
HF_TOKEN=hf_xxxxx

# SNC (ingestion)
SNC_BASE_URL=https://finder.startupnationcentral.org
SNC_AUTH_TOKEN=...
SNC_REFRESH_TOKEN=...
```