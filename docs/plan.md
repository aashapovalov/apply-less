# ApplyLess Implementation Plan v3

## Timeline Overview

**Demo Day: February 3, 2026**
**Today: January 22, 2026**
**Days remaining: 12 days**
**Video prep buffer: 2 days (Feb 1-2)**
**Working days for development: 10 days**

---

## Vision

Build a job matching platform that:
1. **Scales to thousands of jobs** via automated daily ingestion
2. **Uses advanced ML** with Python + HuggingFace transformers (local control)
3. **Generates tailored CVs** for favorite jobs
4. **Simple but functional UI** - focus on core features

---

## Current Status (Jan 22)

### ✅ Completed

| Component | Status | Details |
|-----------|--------|---------|
| Database | ✅ | Railway PostgreSQL + pgvector |
| Companies | ✅ | 1007 from SNC |
| Job Sources | ✅ | 176 detected |
| Jobs | ✅ | 111 from Greenhouse |
| Embeddings | ✅ | 111 jobs (single, BGE 768d via API) |
| API - Jobs | ✅ | GET /jobs, GET /jobs/:id |
| API - Match | ✅ | POST /match (protected) |
| **Auth** | ✅ | Full JWT auth system |
| **Profile** | ✅ | GET/POST/DELETE /profile |
| **Favorites** | ✅ | CRUD /favorites |

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

### 🎯 Goals for Demo

| Goal | Target | Status |
|------|--------|--------|
| Jobs in database | 2000+ | 🔲 111 |
| Auth | JWT with refresh tokens | ✅ |
| Profile & Favorites | CRUD APIs | ✅ |
| ML Service | Python + HuggingFace local | 🔲 |
| Matching accuracy | High (chunked embeddings) | 🔲 |
| CV generation | Working for favorites | 🔲 |
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

#### Day 9 (Jan 24): Python ML Service Setup

**Tasks:**
- [ ] Set up FastAPI project structure
- [ ] Implement /health endpoint
- [ ] Load BGE model with sentence-transformers
- [ ] Implement POST /embed endpoint
- [ ] Test embedding generation locally
- [ ] Connect Node.js API to Python ML service

**Definition of Done:**
- Python ML service running locally
- Can generate embeddings via Python

---

### Phase 2: Scaled Ingestion (Days 10-11)

#### Day 10 (Jan 25): More Job Sources

**Tasks:**
- [ ] Run Greenhouse for all detected companies
- [ ] Implement Comeet scraper improvements
- [ ] Generate embeddings for new jobs
- [ ] Target: 500+ jobs

---

#### Day 11 (Jan 26): Mass Ingestion

**Tasks:**
- [ ] Run full ingestion pipeline
- [ ] Chunk all jobs
- [ ] Generate embeddings
- [ ] Target: 2000+ jobs

---

### Phase 3: CV Generation (Day 12)

#### Day 12 (Jan 27): CV Generation

**Tasks:**
- [ ] Implement POST /generate-cv in Python ML service
- [ ] Use OpenAI API for CV generation
- [ ] Implement /api/cv endpoints in Node.js
- [ ] Store generated CVs

---

### Phase 4: Frontend (Days 13-14)

#### Day 13 (Jan 28): Core UI

**Tasks:**
- [ ] Login/Register pages
- [ ] Jobs list (paginated)
- [ ] Match page (paste profile → results)
- [ ] Basic navigation

---

#### Day 14 (Jan 29): Favorites + CV UI

**Tasks:**
- [ ] Favorites page
- [ ] Generate CV button
- [ ] CV preview/download
- [ ] Loading states
- [ ] Basic styling

---

### Phase 5: Deploy & Demo (Days 15-17)

#### Day 15 (Jan 30): Deployment

**Tasks:**
- [ ] Deploy Node.js API to Railway
- [ ] Deploy Python ML to Railway
- [ ] Deploy Frontend to Vercel

---

#### Days 16-17 (Jan 31 - Feb 2): Demo Prep

**Tasks:**
- [ ] Fix bugs
- [ ] Record demo video
- [ ] Prepare slides

---

### Feb 3: Demo Day 🎉

---

## Technical Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │     │   Node.js API   │     │   Python ML     │
│   (React)       │────▶│   (Express)     │────▶│   (FastAPI)     │
│   Vercel        │     │   Railway       │     │   Railway       │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        │                       ▼                       ▼
        │               ┌─────────────────┐     ┌─────────────────┐
        │               │   PostgreSQL    │     │   HuggingFace   │
        │               │   + pgvector    │     │   Transformers  │
        │               │   Railway       │     │   (Local Model) │
        │               └─────────────────┘     └─────────────────┘
        │                       │
        │                       ▼
        │               ┌─────────────────┐
        │               │     Resend      │
        │               │   (Email API)   │
        └──────────────▶└─────────────────┘
```

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
- [ ] 2000+ jobs in database
- [ ] Python ML service with local model
- [ ] CV generation for favorites
- [ ] Simple functional UI
- [ ] Deployed to production
- [ ] No crashes during demo