# ApplyLess Implementation Plan v3

## Timeline Overview

**Demo Day: February 3, 2026**
**Today: January 26, 2026**
**Days remaining: 8 days**
**Video prep buffer: 2 days (Feb 1-2)**
**Working days for development: 6 days**

---

## Vision

Build a job matching platform that:
1. **Scales to thousands of jobs** via automated daily ingestion
2. **Uses advanced ML** with Python + HuggingFace transformers (local control)
3. **Generates tailored CVs** for favorite jobs
4. **Simple but functional UI** - focus on core features

---

## Current Status (Jan 26)

### ✅ Completed

| Component | Status | Details |
|-----------|--------|---------|
| Database | ✅ | Railway PostgreSQL + pgvector |
| Companies | ✅ | 1245 from SNC |
| Job Sources | ✅ | 485 detected |
| Jobs | ✅ | 682 from Greenhouse |
| Embeddings | ✅ | 682 jobs (single, BGE 768d via API) |
| API - Jobs | ✅ | GET /jobs, GET /jobs/:id |
| API - Match | ✅ | POST /match (protected) |
| **Auth** | ✅ | Full JWT auth system |
| **Profile** | ✅ | GET/POST/DELETE /profile |
| **Favorites** | ✅ | CRUD /favorites |
| **ML Service** | ✅ | Python FastAPI with BGE model |

### Auth Features Completed (Day 7)

| Feature | Status |
|---------|--------|
| POST /auth/register | ✅ |
| POST /auth/login | ✅ |
| POST /auth/refresh | ✅ |
| POST /auth/logout | ✅ |
| GET /auth/verify-email | ✅ |
| POST /auth/forgot-password | ✅ |
| POST /auth/reset-password | ✅ |
| POST /auth/resend-verification | ✅ |
| GET /auth/me | ✅ |
| JWT access tokens (1h) | ✅ |
| Refresh tokens (30d) | ✅ |
| Email verification (Resend) | ✅ |
| Password reset (Resend) | ✅ |
| Rate limiting | ✅ |
| Password validation | ✅ |

### Profile & Favorites Features Completed (Day 8)

| Feature | Status |
|---------|--------|
| GET /profile | ✅ |
| POST /profile | ✅ |
| DELETE /profile | ✅ |
| GET /favorites | ✅ |
| GET /favorites/:jobId | ✅ |
| POST /favorites/:jobId | ✅ |
| DELETE /favorites/:jobId | ✅ |

### ML Service Features Completed (Day 9-12)

| Feature | Status |
|---------|--------|
| GET /health | ✅ |
| POST /api/embed | ✅ |
| POST /api/embed/single | ✅ |
| POST /api/chunk/job | ✅ |
| POST /api/chunk/profile | ✅ |
| POST /api/generate-cv | ✅ |
| BGE-base-en-v1.5 model | ✅ |
| NER skill extraction (hirly-ner-multi) | ✅ |
| Skill keyword fallback | ✅ |
| Skill level detection (mandatory/preferred) | ✅ |
| Skill gap analysis | ✅ |
| Job section detection | ✅ |
| Profile feedback & completeness scoring | ✅ |
| CV generation (Claude 3 Haiku) | ✅ |
| Profile validation (word count, completeness) | ✅ |
| Query prefixes (text_type) | ✅ |
| Dockerfile + Railway config | ✅ |

### 🎯 Goals for Demo

| Goal | Target | Status |
|------|--------|--------|
| Jobs in database | 2000+ | 🔲 682 |
| Auth | JWT with refresh tokens | ✅ |
| Profile & Favorites | CRUD APIs | ✅ |
| ML Service | Python + local model | ✅ |
| Job/Profile Chunking | Section + skill extraction | ✅ |
| CV generation | Working for favorites | ✅ |
| Matching accuracy | High (chunked embeddings) | 🔲 |
| UI | Simple, functional | 🔲 |

---

## Revised Roadmap

### ✅ Phase 1: Backend Foundation (Days 7-9)

#### ✅ Day 7 (Jan 22): JWT Authentication

- [x] Create auth tables (users, refresh_tokens, verification_tokens, etc.)
- [x] Implement POST /api/auth/register
- [x] Implement POST /api/auth/login → access + refresh tokens
- [x] Implement POST /api/auth/refresh
- [x] Implement POST /api/auth/logout
- [x] Implement email verification flow
- [x] Implement password reset flow
- [x] Create auth middleware
- [x] Rate limiting
- [x] Resend email integration

---

#### ✅ Day 8 (Jan 22): Profile & Favorites API

- [x] Implement GET /api/profile
- [x] Implement POST /api/profile (save profile text)
- [x] Implement DELETE /api/profile
- [x] Implement GET /api/favorites
- [x] Implement GET /api/favorites/:jobId
- [x] Implement POST /api/favorites/:jobId
- [x] Implement DELETE /api/favorites/:jobId

---

#### ✅ Day 9 (Jan 23): Python ML Service Setup

- [x] Set up FastAPI project structure
- [x] Implement /health endpoint
- [x] Load BGE model with sentence-transformers
- [x] Implement POST /api/embed endpoint
- [x] Implement POST /api/embed/single endpoint
- [x] Query prefixes (text_type: query/passage)
- [x] Dockerfile + Railway deployment config
- [x] Connect Node.js API to Python ML service

---

#### ✅ Day 10 (Jan 26): Job/Profile Chunking & Skill Extraction

- [x] Add POST /api/chunk/job endpoint
- [x] Add POST /api/chunk/profile endpoint
- [x] Implement NER skill extraction (feliponi/hirly-ner-multi model)
- [x] Add keyword fallback for skills NER misses
- [x] Skill level detection (mandatory/preferred) based on sentence context
- [x] Job section detection (about, responsibilities, requirements, benefits, preferred)
- [x] Profile feedback generation
- [x] Profile completeness scoring (0-1)
- [x] Register skill extractor and chunk router in main app

---

### Phase 2: Scaled Ingestion (Day 11)

#### Day 11 (Jan 27): More Job Sources & Mass Ingestion

**Tasks:**
- [ ] Run Greenhouse for all detected companies
- [ ] Implement Comeet scraper improvements
- [ ] Run full ingestion pipeline
- [ ] Chunk all jobs using new /chunk/job endpoint
- [ ] Generate embeddings for chunked jobs
- [ ] Target: 2000+ jobs

---

### ✅ Phase 3: CV Generation (Day 12)

#### ✅ Day 12 (Jan 27): CV Generation

- [x] Add `ANTHROPIC_API_KEY` to config
- [x] Create skill gap analysis service
- [x] Create CV generator service with Claude API
- [x] Create prompt template with CV structure
- [x] Implement POST /api/generate-cv endpoint
- [x] Add profile validation (200 word min, completeness ≥ 0.4)
- [x] Test with real job + profile
- [x] CV generation working with Claude 3 Haiku

---

### Phase 4: Frontend (Days 13-14)

#### Day 13 (Jan 29): Core UI

**Tasks:**
- [ ] Login/Register pages
- [ ] Jobs list (paginated)
- [ ] Match page (paste profile → results)
- [ ] Basic navigation

---

#### Day 14 (Jan 30): Favorites + CV UI

**Tasks:**
- [ ] Favorites page
- [ ] Generate CV button
- [ ] CV preview/download
- [ ] Loading states
- [ ] Basic styling

---

### Phase 5: Deploy & Demo (Days 15-17)

#### Day 15 (Jan 31): Deployment

**Tasks:**
- [ ] Deploy Node.js API to Railway
- [ ] Deploy Python ML to Railway
- [ ] Deploy Frontend to Vercel

---

#### Days 16-17 (Feb 1-2): Demo Prep

**Tasks:**
- [ ] Fix bugs
- [ ] Record demo video
- [ ] Prepare slides

---

### Feb 3: Demo Day 🎉

---

## Technical Architecture

```
                                    ┌─────────────────────────────────────┐
                                    │           Python ML Service         │
                                    │           (FastAPI + Railway)       │
                                    │                                     │
                                    │  ┌─────────────┐ ┌───────────────┐  │
                                    │  │ BGE-base-en │ │ hirly-ner-    │  │
                                    │  │ (embeddings)│ │ multi (NER)   │  │
                                    │  └─────────────┘ └───────────────┘  │
                                    │                                     │
                                    │  Endpoints:                         │
                                    │  • /api/embed                       │
                                    │  • /api/chunk/job                   │
                                    │  • /api/chunk/profile               │
                                    └──────────────▲──────────────────────┘
                                                   │
┌─────────────────┐                 ┌──────────────┴──────────────┐
│    Frontend     │    REST API    │        Node.js API          │
│    (React)      │◄──────────────►│        (Express)            │
│    Vercel       │                │        Railway              │
└─────────────────┘                │                             │
                                    │  Endpoints:                 │
                                    │  • /api/auth/*              │
                                    │  • /api/profile             │
                                    │  • /api/favorites           │
                                    │  • /api/jobs                │
                                    │  • /api/match               │
                                    └──────────────┬──────────────┘
                                                   │
                    ┌──────────────────────────────┼──────────────────────────────┐
                    │                              │                              │
                    ▼                              ▼                              ▼
          ┌─────────────────┐           ┌─────────────────┐           ┌─────────────────┐
          │   PostgreSQL    │           │     Resend      │           │   Ingestion     │
          │   + pgvector    │           │   (Email API)   │           │   (CLI/Cron)    │
          │   Railway       │           │                 │           │                 │
          │                 │           │  • Verification │           │  • SNC scraper  │
          │  • users        │           │  • Password     │           │  • Greenhouse   │
          │  • jobs         │           │    reset        │           │  • Comeet       │
          │  • companies    │           │                 │           │  • ATS detect   │
          │  • embeddings   │           └─────────────────┘           └─────────────────┘
          │  • favorites    │
          └─────────────────┘
```

### Data Flow

```
1. JOB INGESTION:
   SNC API → Ingestion CLI → Companies/Jobs → PostgreSQL
                                    ↓
                           ML Service (/chunk/job)
                                    ↓
                           Embeddings + Skills → PostgreSQL

2. USER MATCHING:
   User Profile → Node.js API → ML Service (/chunk/profile)
                                    ↓
                           Profile Embeddings + Feedback
                                    ↓
                           pgvector similarity search → Matched Jobs

3. CV GENERATION (planned):
   Favorite Job + Profile → ML Service → OpenAI → Tailored CV
```

---

## Monorepo Structure

```
apply-less/
├── packages/
│   ├── api/                      # Node.js Express API
│   │   ├── src/
│   │   │   ├── routes/           # API endpoints
│   │   │   │   ├── auth.ts       # JWT auth routes
│   │   │   │   ├── jobs.ts       # Job listings
│   │   │   │   ├── profile.ts    # User profiles
│   │   │   │   ├── favorites.ts  # Saved jobs
│   │   │   │   └── match.ts      # Job matching
│   │   │   ├── middleware/       # Auth, rate limiting
│   │   │   ├── services/         # Business logic
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── ml-service/               # Python FastAPI ML Service
│   │   ├── api/
│   │   │   ├── embed.py          # Embedding endpoints
│   │   │   ├── chunk.py          # Chunking endpoints
│   │   │   └── health.py         # Health check
│   │   ├── services/
│   │   │   ├── embedding_service.py
│   │   │   ├── skill_extractor_service.py
│   │   │   ├── skill_patterns.py           # Keyword fallback
│   │   │   ├── job_chunker_service.py
│   │   │   ├── profile_chunker_service.py
│   │   │   └── profile_pattern_regex.py
│   │   ├── config/
│   │   │   └── settings.py       # Model configs
│   │   ├── main.py               # FastAPI app
│   │   ├── requirements.txt
│   │   └── Dockerfile
│   │
│   ├── ingestion/                # Data ingestion pipelines
│   │   ├── src/
│   │   │   ├── scrapers/         # ATS scrapers
│   │   │   │   ├── greenhouse.ts
│   │   │   │   └── comeet.ts
│   │   │   ├── snc/              # StartupNationCentral
│   │   │   └── ats-detector.ts   # ATS detection
│   │   └── package.json
│   │
│   ├── web/                      # React Frontend (planned)
│   │   ├── src/
│   │   └── package.json
│   │
│   └── shared/                   # Shared TypeScript types
│       ├── src/
│       │   └── types/
│       └── package.json
│
├── db/                           # Database migrations
│   └── migrations/
│
├── docs/                         # Documentation
│   ├── plan.md                   # This file
│   └── task-*.md                 # Task specs
│
├── scripts/                      # Utility scripts
│
├── docker-compose.yml            # Local dev setup
├── package.json                  # Root workspace
└── tsconfig.base.json            # Shared TS config
```

### Package Dependencies

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    web      │────►│    api      │────►│  ml-service │
└─────────────┘     └──────┬──────┘     └─────────────┘
                           │
                    ┌──────▼──────┐
                    │   shared    │
                    └──────▲──────┘
                           │
                    ┌──────┴──────┐
                    │  ingestion  │
                    └─────────────┘
```

### ML Service Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| /health | GET | Health check with model status |
| /api/embed | POST | Batch text embedding |
| /api/embed/single | POST | Single text embedding |
| /api/chunk/job | POST | Job chunking + skills + embeddings |
| /api/chunk/profile | POST | Profile chunking + feedback + score |

### Skill Extraction Details

**Model:** `feliponi/hirly-ner-multi`
- Extracts: SKILL, SOFT_SKILL, LANG, CERT, EXPERIENCE_DURATION
- Supplemented with keyword fallback for common skills

**Level Detection:**
- Analyzes sentence context around each skill
- Classifies as: `mandatory`, `preferred`, or `unknown`
- Patterns: "requirements", "must have", "required" → mandatory
- Patterns: "nice to have", "preferred", "bonus" → preferred

---

## Database Tables

### Existing
- `companies` - 1007 records
- `job_sources` - 176 records
- `jobs` - 111 records
- `job_embeddings_simple` - 111 records
- `users` - auth users
- `refresh_tokens` - JWT refresh tokens
- `verification_tokens` - email verification
- `password_reset_tokens` - password reset
- `rate_limits` - rate limiting
- `favorites` - user saved jobs

### To Create
- `generated_cvs` - tailored CVs

---

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://...

# Auth
JWT_SECRET=<32+ chars>
JWT_REFRESH_SECRET=<32+ chars>

# Email
RESEND_API_KEY=re_xxxxx
FROM_EMAIL=onboarding@resend.dev
FRONTEND_URL=http://localhost:5173

# Embeddings
HF_TOKEN=hf_xxxxx

# SNC (ingestion)
SNC_BASE_URL=...
SNC_AUTH_TOKEN=...
```

---

## Success Criteria for Demo

- [x] Custom JWT auth working
- [x] Profile & favorites API
- [x] Python ML service with local model
- [x] Job/profile chunking with skill extraction
- [x] CV generation for favorites
- [ ] 2000+ jobs in database
- [ ] Simple functional UI
- [ ] Deployed to production
- [ ] No crashes during demo