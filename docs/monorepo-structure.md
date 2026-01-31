# ApplyLess Monorepo Structure

## Package Overview

| Package | Status | Technology | Responsibility |
|---------|--------|------------|----------------|
| `api` | ✅ Production | Express/TS | REST API: auth, jobs, matching, profile, favorites |
| `ingestion` | ✅ Production | Node.js/TS | CLI: scraping, ATS detection, job fetching, location normalization |
| `ml-service` | ✅ Production | FastAPI/Python | ML: embeddings, skill extraction, CV generation |
| `web` | ✅ Working | React/Vite | Frontend UI: jobs, profile, auth, landing |

---

## Directory Tree

```
apply-less/
├── packages/
│   ├── api/
│   ├── ingestion/
│   ├── ml-service/
│   └── web/
├── db/
│   └── migrations/
├── docs/
├── scripts/
├── .env.example
├── docker-compose.yml
├── package.json
└── tsconfig.base.json
```

---

## packages/api

Express REST API server.

```
api/
├── src/
│   ├── index.ts                 # Server entry point
│   ├── config/
│   │   └── db.ts                # PostgreSQL connection pool
│   ├── middleware/
│   │   └── auth-middleware.ts   # JWT verification
│   ├── routes/
│   │   ├── auth-router.ts       # /api/auth/* (register, login, etc.)
│   │   ├── jobs-router.ts       # /api/jobs (list, regions, cities, companies)
│   │   ├── match-router.ts      # /api/match
│   │   ├── profile-router.ts    # /api/profile (incl. file parsing)
│   │   └── favorites-router.ts  # /api/favorites
│   ├── services/
│   │   ├── auth-service.ts      # Auth orchestration
│   │   ├── token-service.ts     # Token generation/validation
│   │   ├── user-service.ts      # User CRUD
│   │   ├── email-service.ts     # Resend email client
│   │   ├── rate-limit-service.ts
│   │   ├── job-service.ts       # Job queries + filters
│   │   ├── match-service.ts     # Profile matching
│   │   ├── profile-service.ts   # Profile CRUD
│   │   └── favorites-service.ts # Favorites CRUD
│   ├── types/
│   │   └── index.ts             # TypeScript interfaces
│   └── utils/
│       └── password-validation.ts
├── package.json
└── tsconfig.json
```

### Jobs API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/jobs` | List jobs with filters (region, company, title, postedAfter) |
| `GET /api/jobs/:id` | Get single job details |
| `GET /api/jobs/regions` | Get regions with job counts |
| `GET /api/jobs/cities` | Get cities with job counts |
| `GET /api/jobs/companies` | Get companies for autocomplete |

### Profile API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/profile` | Get user profile text |
| `POST /api/profile` | Save/update profile |
| `POST /api/profile/parse` | Parse uploaded file (PDF/DOC/DOCX) |
| `DELETE /api/profile` | Delete profile |

---

## packages/ingestion

CLI tool for job data pipeline with location normalization.

```
ingestion/
├── src/
│   ├── cli.ts                   # Commander CLI entry
│   ├── clients/
│   │   ├── snc-client-playwright.ts   # SNC scraper
│   │   ├── greenhouse-client.ts       # Greenhouse API
│   │   ├── comeet-client.ts           # Comeet API (with details=true)
│   │   ├── embedding-client.ts        # ML service client
│   │   └── playwright-client.ts       # Browser automation
│   ├── config/
│   │   └── db.ts
│   ├── data/
│   │   └── israeli-cities.json        # 90+ cities with regions/aliases
│   ├── detectors/
│   │   ├── ats-detector.ts            # HTML/URL pattern detection
│   │   ├── ats-patterns.ts            # Vendor-specific patterns
│   │   ├── greenhouse-probe.ts        # API probing
│   │   ├── deep-crawler.ts            # Recursive link crawling
│   │   ├── keyword-detector.ts        # Keyword fallback
│   │   └── detection-pipeline.ts      # Orchestrates detectors
│   ├── parsers/
│   │   └── company-detail-parser.ts
│   ├── services/
│   │   ├── company-service.ts
│   │   ├── job-service.ts
│   │   └── job-source-service.ts
│   ├── stages/
│   │   ├── stage-a-snc.ts             # SNC company scraping
│   │   ├── stage-b-detect-ats.ts      # ATS detection
│   │   ├── stage-d-greenhouse.ts      # Greenhouse jobs (keeps HTML)
│   │   ├── stage-e-comeet.ts          # Comeet jobs (details=true)
│   │   └── stage-g-embeddings.ts      # Embedding generation
│   ├── types/
│   │   └── index.ts
│   └── utils/
│       ├── location-normalizer.ts     # Israeli location classification
│       ├── prepare-job-text.ts
│       ├── stage-b-query-builder.ts
│       ├── text-normalizer.ts
│       └── url-normalizer.ts
├── package.json
└── tsconfig.json
```

### CLI Commands

| Command | Stage | Description |
|---------|-------|-------------|
| `snc` | A | Scrape companies from StartupNationCentral |
| `detect` | B | Detect ATS from career pages |
| `greenhouse` | D | Fetch jobs from Greenhouse API |
| `comeet` | E | Fetch jobs from Comeet API |
| `embeddings` | G | Generate job embeddings |
| `debug` | — | Debug detection for single company |

---

## packages/ml-service

Python FastAPI service for ML inference.

```
ml-service/
├── main.py                      # FastAPI entry point
├── api/
│   ├── health.py                # GET /health
│   ├── embed.py                 # POST /api/embed, /api/embed/single
│   ├── chunk.py                 # POST /api/chunk/job, /api/chunk/profile
│   └── cv.py                    # POST /api/generate-cv
├── config/
│   └── settings.py              # Pydantic settings
├── services/
│   ├── embedding_service.py           # BGE model inference
│   ├── skill_extractor_service.py     # NER skill extraction
│   ├── skill_patterns.py              # Keyword fallback patterns
│   ├── skill_gap_service.py           # Job vs profile comparison
│   ├── job_chunker_service.py         # Job section detection
│   ├── profile_chunker_service.py     # Profile chunking + feedback
│   ├── profile_pattern_regex.py       # Profile parsing patterns
│   ├── cv_generator_service.py        # Claude API for CV
│   └── cv_gen_prompt_template.py      # CV prompt template
├── requirements.txt
├── Dockerfile
└── railway.json
```

### Models

| Model | Purpose | Dimensions |
|-------|---------|------------|
| BAAI/bge-base-en-v1.5 | Text embeddings | 768 |
| feliponi/hirly-ner-multi | Skill extraction (NER) | — |

---

## packages/web

React frontend with TailwindCSS.

```
web/
├── src/
│   ├── main.tsx                 # App entry point
│   ├── App.tsx                  # Router setup
│   ├── index.css                # Global styles + theme colors
│   ├── components/
│   │   ├── auth/
│   │   │   ├── password-strength.tsx
│   │   │   ├── protected-route.tsx    # Auth guard
│   │   │   └── index.ts
│   │   ├── jobs/
│   │   │   ├── company-search.tsx     # Company autocomplete dropdown
│   │   │   ├── date-filter.tsx        # Date bucket dropdown
│   │   │   ├── job-card.tsx           # Card with heart + score badge
│   │   │   ├── job-fetch-error.tsx
│   │   │   ├── job-skeleton.tsx
│   │   │   ├── jobs-skeleton.tsx
│   │   │   ├── pagination.tsx
│   │   │   ├── region-filter.tsx      # Region dropdown
│   │   │   ├── role-input.tsx         # Role search with history
│   │   │   ├── safe-html.tsx          # DOMPurify HTML renderer
│   │   │   ├── search-input.tsx
│   │   │   └── index.ts
│   │   └── ui/
│   │       ├── alert.tsx
│   │       ├── animated-grid.tsx
│   │       ├── button.tsx
│   │       ├── feature-card.tsx
│   │       ├── grid-background.tsx
│   │       ├── input.tsx
│   │       └── index.ts
│   ├── config/
│   │   └── api.ts               # API URL configuration
│   ├── constants/
│   │   └── index.ts             # JOBS_PER_PAGE, REGION_LABELS
│   ├── hooks/
│   │   ├── use-auth-status.ts   # Auth + profile state
│   │   └── index.ts
│   ├── layout/
│   │   ├── auth-layout.tsx
│   │   └── main-layout.tsx      # Header with auth-aware nav
│   ├── pages/
│   │   ├── auth/
│   │   │   ├── login.tsx
│   │   │   ├── register.tsx
│   │   │   ├── forgot-password.tsx
│   │   │   ├── reset-password.tsx
│   │   │   ├── verify-email.tsx
│   │   │   └── index.ts
│   │   ├── jobs/
│   │   │   ├── jobs.tsx          # List with filters + sort toggle
│   │   │   ├── job-details.tsx   # Single job view
│   │   │   └── index.ts
│   │   ├── profile/
│   │   │   ├── profile.tsx       # Profile with file upload
│   │   │   └── index.ts
│   │   ├── landing.tsx           # Home page
│   │   └── index.ts
│   ├── services/
│   │   ├── api.ts               # RTK Query base
│   │   ├── auth.ts              # Auth API
│   │   ├── jobs.ts              # Jobs API
│   │   ├── profile.ts           # Profile API
│   │   ├── favorites.ts         # Favorites API
│   │   └── match.ts             # Match API
│   ├── store/
│   │   ├── index.ts             # Redux store
│   │   └── authSlice.ts         # Auth state
│   ├── types/
│   │   └── index.ts             # TypeScript types
│   └── utils/
│       └── index.ts             # Utility functions
├── index.html
├── vite.config.ts
├── tailwind.config.js
├── package.json
└── tsconfig.json
```

### Key Components

| Component | Purpose |
|-----------|---------|
| `JobCard` | Job list item with heart button and match score badge |
| `SafeHtml` | Renders HTML descriptions with DOMPurify sanitization |
| `CompanySearch` | Autocomplete dropdown with debounced search |
| `DateFilter` | Date bucket dropdown (Today, This week, This month) |
| `RegionFilter` | Region dropdown with job counts |
| `RoleInput` | Role search input with localStorage history |
| `ProtectedRoute` | Auth guard that redirects to login |
| `Pagination` | Page navigation for jobs list |

### Hooks

| Hook | Purpose |
|------|---------|
| `useAuthStatus` | Returns `{ isAuthenticated, hasProfile, profileText, user, isLoading }` |

### Theme Colors (index.css)

| Category | Variables |
|----------|-----------|
| Match High (>70%) | `--color-match-high-bg`, `--color-match-high-text` |
| Match Mid (50-70%) | `--color-match-mid-bg`, `--color-match-mid-text` |
| Match Low (<50%) | `--color-match-low-bg`, `--color-match-low-text` |
| Warning | `--color-warning-bg`, `--color-warning-border`, `--color-warning-text` |
| Favorite | `--color-favorite`, `--color-favorite-hover` |

---

## db/migrations

SQL migrations (PostgreSQL + pgvector).

| Migration | Description |
|-----------|-------------|
| 001 | Initial schema: companies, job_sources, jobs, job_chunks |
| 002 | Add embeddings table |
| 003 | Add user tables: users, profile_chunks, favorites, generated_resumes |
| 004 | Add indexes |
| 005 | Add company details fields |
| 006 | Increase location field length |
| 007 | Auth tables: refresh_tokens, verification_tokens, password_reset_tokens, rate_limits |
| 008 | Fix email_verified typo |
| 009 | Make firebase_uid nullable |
| 010 | Add ats_identifier field |
| 011 | Make website_url nullable |
| 012 | Add ats_checked_at timestamp |
| 013 | Add country, region, city columns for location normalization |

---

## scripts/

| Script | Description |
|--------|-------------|
| `migrate.js` | Run SQL migrations |
| `migrate-helpers.js` | Migration utilities |
| `setup-db.sh` | Database setup |

---

## Package Dependencies

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    web      │────▶│    api      │────▶│  ml-service │
│   (React)   │     │  (Express)  │     │  (FastAPI)  │
└─────────────┘     └──────┬──────┘     └─────────────┘
                           │
                    ┌──────▼──────┐
                    │  PostgreSQL │
                    │  + pgvector │
                    └──────▲──────┘
                           │
                    ┌──────┴──────┐
                    │  ingestion  │
                    │    (CLI)    │
                    └─────────────┘
```
