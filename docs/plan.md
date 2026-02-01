# ApplyLess Implementation Plan v4

## Timeline

**Demo Day:** February 3, 2026  
**Today:** February 1, 2026  
**Working days:** 2 (including demo prep)

---

## Vision

Job matching platform that:
1. Scales to thousands of Israeli jobs via automated daily ingestion
2. Uses local ML models (Python + HuggingFace transformers)
3. Generates tailored CVs for favorite jobs
4. Simple but functional UI

---

## Current Status (Feb 1 - Evening)

### ✅ Completed

| Component | Details |
|-----------|---------|
| **Database** | Railway PostgreSQL + pgvector |
| **Companies** | 1496 from SNC |
| **Job Sources** | 683 detected (Greenhouse + Comeet) |
| **Jobs** | ~770 Israeli positions (non-Israeli filtered) |
| **Location Normalization** | 90+ Israeli cities with regions |
| **Embeddings** | Full + chunk embeddings for jobs and profiles |
| **Matching** | Strategy C: Section-based weighted matching |
| **Auth API** | Full JWT system with email verification |
| **Jobs API** | List, search, filters, details with HTML descriptions |
| **Match API** | Authenticated, uses pre-computed embeddings |
| **Profile API** | CRUD + file parsing + embedding generation |
| **Favorites API** | CRUD |
| **ML Service** | Python FastAPI with local models |
| **Chunking** | Job/profile section + skill extraction |
| **CV Generation** | Claude 3 Haiku integration |
| **Frontend - Landing** | Redesigned with features |
| **Frontend - Jobs** | List, filters, details, sort toggle, favorites |
| **Frontend - Auth** | Login, register, forgot/reset password, verification |
| **Frontend - Profile** | Page with file upload, drag & drop |
| **HTML Descriptions** | DOMPurify rendering with CSS formatting |
| **Job Filters** | Region, date, company (autocomplete), role (with history) |
| **Relevance Sort** | Sort by date or match score (Strategy C) |
| **Favorites UI** | Heart button on job cards |

### 🎯 Demo Goals

| Goal | Target | Status |
|------|--------|--------|
| Jobs | 500+ Israeli | ✅ ~770 |
| Auth | JWT + refresh | ✅ |
| Profile & Favorites | CRUD | ✅ |
| ML Service | Local models | ✅ |
| Chunking | Sections + skills | ✅ |
| CV Generation | Working | ✅ |
| Location Filter | Israel only | ✅ |
| UI - Jobs | List + filters + details | ✅ |
| UI - Auth | Login/Register | ✅ |
| UI - Profile | Page with file upload | ✅ |
| UI - Match | Relevance sort (Strategy C) | ✅ |
| UI - Favorites | Heart button + save | ✅ |
| Production | Deployed | 🔲 |

---

## Remaining Work

### Day 17 (Feb 2): Deployment + Polish

- [ ] **Favorites page:** List saved jobs with remove button
- [ ] **CV generation UI:** Button on favorites to generate CV
- [ ] **BUG-010:** Error boundary
- [ ] **BUG-011:** 404 page
- [ ] Deploy Node.js API to Railway
- [ ] Deploy Python ML to Railway
- [ ] Deploy Frontend to Vercel
- [ ] Environment variables
- [ ] Test end-to-end

### Day 18 (Feb 3): Demo Day 🎉

- [ ] Bug fixes
- [ ] Demo walkthrough prep
- [ ] Slides / recording

---

## Completed Phases

### ✅ Phase 1: Backend (Days 7-9)

#### ✅ Day 7: JWT Authentication
- [x] Auth tables
- [x] Register/login/refresh/logout endpoints
- [x] Email verification flow
- [x] Password reset flow
- [x] Rate limiting

#### ✅ Day 8: Profile & Favorites
- [x] Profile CRUD endpoints
- [x] Favorites CRUD endpoints

#### ✅ Day 9: Python ML Service
- [x] FastAPI setup
- [x] BGE model loading
- [x] Embed endpoints
- [x] Railway deployment config

---

### ✅ Phase 2: ML Features (Days 10-12)

#### ✅ Day 10: Chunking & Skills
- [x] Job chunking endpoint
- [x] Profile chunking endpoint
- [x] NER skill extraction
- [x] Keyword fallback
- [x] Skill level detection
- [x] Profile feedback & scoring

#### ✅ Day 11: Scaled Ingestion
- [x] Greenhouse ingestion (keeps HTML)
- [x] Comeet ingestion (details=true for descriptions)
- [x] Location normalization at ingestion
- [x] Non-Israeli job filtering
- [x] ~770 Israeli jobs

#### ✅ Day 12: CV Generation
- [x] Skill gap analysis
- [x] Claude API integration
- [x] CV prompt template
- [x] Profile validation

---

### ✅ Phase 3: Frontend (Days 13-15)

#### ✅ Day 13: Core UI
- [x] Landing page (redesigned)
- [x] Login/Register pages
- [x] Jobs list (paginated)
- [x] Job details with HTML description
- [x] Navigation

#### ✅ Day 14: Job Filters & Auth Pages
- [x] Forgot password
- [x] Reset password
- [x] Email verification
- [x] Job filters (region, date, company, role)
- [x] Company autocomplete with job counts
- [x] Role search with history

#### ✅ Day 15: Profile & Match UI
- [x] Profile page with file upload
- [x] Drag & drop (full page)
- [x] File parsing (PDF, DOC, DOCX)
- [x] Sort toggle (Date / Relevance)
- [x] Match scores on job cards
- [x] Favorites heart button
- [x] Auth-aware header (Login vs Profile/Logout)
- [x] Protected routes
- [x] Smart redirect after login

---

### ✅ Phase 4: Matching Improvements (Day 16)

#### ✅ Day 16: Strategy C Implementation
- [x] Tested 4 matching strategies (A, B1, B2, C)
- [x] Strategy C wins: Section-based weighted matching
- [x] Migration 014: chunk embedding columns
- [x] ML Service Client for API
- [x] Profile service: embedding generation on save
- [x] Match service: weighted query with pre-computed embeddings
- [x] Match router: requires authentication
- [x] Frontend: cache invalidation on profile save
- [x] Ingestion: chunk embeddings for jobs
- [x] Bug fixes (8+ bugs discovered and fixed)

**Strategy C Formula:**
```
score = 0.40 × title_sim + 0.35 × exp_req_sim + 0.25 × full_sim
```

**Result:** PM profile now ranks 7 PM jobs in top 10 (up from 5 with baseline)

---

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│    Frontend     │────▶│   Node.js API    │────▶│  Python ML       │
│    (React)      │     │   (Express)      │     │  (FastAPI)       │
└─────────────────┘     └────────┬─────────┘     └──────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         ▼                       ▼                       ▼
┌─────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   PostgreSQL    │     │     Resend       │     │   Ingestion      │
│   + pgvector    │     │   (Email API)    │     │   (CLI)          │
└─────────────────┘     └──────────────────┘     └──────────────────┘
```

---

## Matching System (Strategy C)

```
┌─────────────────────┐         ┌─────────────────────┐
│   USER PROFILE      │         │   JOB POSTING       │
├─────────────────────┤         ├─────────────────────┤
│ Title Embedding     │◄──40%──►│ Header Embedding    │
│ Experience Embedding│◄──35%──►│ Requirements Embed. │
│ Full Embedding      │◄──25%──►│ Full Embedding      │
└─────────────────────┘         └─────────────────────┘
```

**Data Flow:**
1. Profile saved → embeddings generated → stored in users table
2. Jobs ingested → chunk embeddings generated → stored in jobs table
3. Match request → SQL query with pre-computed embeddings → instant results

---

## Success Criteria

- [x] JWT auth working
- [x] Profile & favorites API
- [x] Python ML service with local model
- [x] Job/profile chunking with skill extraction
- [x] CV generation
- [x] 500+ Israeli jobs
- [x] Location normalization
- [x] Jobs list UI with filters
- [x] Job details with formatted descriptions
- [x] Auth UI (login, register, password reset)
- [x] Profile UI with file upload
- [x] Match results (relevance sort) with Strategy C
- [x] Favorites UI (heart button)
- [ ] Favorites page (list)
- [ ] CV generation UI
- [ ] Production deployment
- [ ] No crashes during demo
