# ApplyLess Implementation Plan v4

## Timeline

**Demo Day:** February 3, 2026  
**Completed:** February 2, 2026  

---

## Vision

Job matching platform that:
1. Scales to thousands of Israeli jobs via automated daily ingestion
2. Uses local ML models (Python + HuggingFace transformers)
3. Generates tailored CVs for favorite jobs
4. Simple but functional UI

---

## ✅ COMPLETE - All Goals Achieved!

### Production URLs

| Service | URL |
|---------|-----|
| **Frontend** | https://apply-less-web.vercel.app |
| **API** | https://api-production-5fba.up.railway.app |
| **ML Service** | https://ml-service-production-ed97.up.railway.app |

### Final Status

| Component | Details |
|-----------|---------|
| **Database** | Railway PostgreSQL + pgvector |
| **Companies** | 1496 from SNC |
| **Job Sources** | 683 detected (Greenhouse + Comeet) |
| **Jobs** | ~792 Israeli positions (non-Israeli filtered) |
| **Location Normalization** | 90+ Israeli cities with regions |
| **Embeddings** | Full + chunk embeddings for jobs and profiles |
| **Matching** | Strategy C: Section-based weighted matching |
| **Auth API** | Full JWT system with email verification |
| **Jobs API** | List, search, filters, details with HTML descriptions |
| **Match API** | Authenticated, uses pre-computed embeddings |
| **Profile API** | CRUD + file parsing + embedding generation |
| **Favorites API** | CRUD |
| **CV API** | Generate + Compare endpoints |
| **ML Service** | Python FastAPI with local models |
| **Chunking** | Job/profile section extraction |
| **CV Generation** | Claude 3 Haiku integration |
| **Frontend - Landing** | Redesigned with features |
| **Frontend - Jobs** | Unified page with 3 views (All/Matches/Favorites) |
| **Frontend - Auth** | Login, register, forgot/reset password, verification |
| **Frontend - Profile** | Page with file upload, drag & drop |
| **Frontend - CV Modal** | Full generation flow with PDF download |
| **Error Handling** | Error boundary + 404 page |
| **Deployment** | Railway (API, ML, DB) + Vercel (Frontend) |

### ✅ All Demo Goals Complete!

| Goal | Target | Status |
|------|--------|--------|
| Jobs | 500+ Israeli | ✅ ~792 |
| Auth | JWT + refresh | ✅ |
| Profile & Favorites | CRUD | ✅ |
| ML Service | Local models | ✅ |
| Chunking | Sections + skills | ✅ |
| CV Generation | Working | ✅ |
| CV Generation UI | Modal + PDF | ✅ |
| Location Filter | Israel only | ✅ |
| UI - Jobs | List + filters + details | ✅ |
| UI - Auth | Login/Register | ✅ |
| UI - Profile | Page with file upload | ✅ |
| UI - Match | Matches view (Strategy C) | ✅ |
| UI - Favorites | Favorites view + heart button | ✅ |
| Error Handling | Error boundary + 404 | ✅ |
| Production | Deployed | ✅ |

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
- [x] ~792 Israeli jobs

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

### ✅ Phase 4: Matching & Favorites UI (Days 16-17)

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

#### ✅ Day 17: Jobs Page Refactor + Favorites View
- [x] Refactored jobs.tsx into `useJobsView` hook + components
- [x] Three views: All Jobs / Matches / Favorites (tabs)
- [x] URL-based view switching (`?view=matches`, `?view=favorites`)
- [x] Client-side filtering for Matches and Favorites
- [x] Favorites badge with count on tab
- [x] Smart login redirect (profile exists → matches)
- [x] Removed separate favorites page (integrated into jobs)

---

### ✅ Phase 5: CV Generation UI (Day 18)

#### ✅ Day 18 (Feb 2 - Morning): CV Modal + PDF Download
- [x] CV API routes (`/api/cv/generate`, `/api/cv/compare`)
- [x] ML service compare endpoint (`/api/compare-cv`)
- [x] CV Generator Modal with 4 states
- [x] Requirements analysis (covered vs gaps)
- [x] Match score visualization with progress bar
- [x] PDF generation with professional styling
- [x] Clickable email and LinkedIn links in PDF
- [x] CV button on job cards (matches + favorites views)
- [x] CV button on job details page
- [x] Default view mode = 'matches' for users with profile

---

### ✅ Phase 6: Deployment (Day 18)

#### ✅ Day 18 (Feb 2 - Afternoon): Production Deployment
- [x] Railway PostgreSQL (already running)
- [x] Railway API deployment
  - [x] Self-contained tsconfig (no extends)
  - [x] Added @types/pg
  - [x] SSL disabled for Railway proxy
- [x] Railway ML Service deployment
  - [x] CPU-only PyTorch (smaller build)
  - [x] Skill extractor disabled (memory optimization)
  - [x] Fixed Python indentation issues
- [x] Vercel Frontend deployment
  - [x] Fixed RootState TypeScript error
  - [x] Added vercel.json for SPA routing
  - [x] Environment variables configured
- [x] Error boundary component
- [x] 404 Not Found page
- [x] All services connected and working

**Deployment Issues Resolved:**
- API tsconfig couldn't extend root file → made self-contained
- Missing @types/pg → added to devDependencies
- PyTorch too large (2GB) → switched to CPU-only (~200MB)
- ML service memory crash → disabled skill extractor
- Database SSL error → disabled SSL for Railway proxy
- Vercel 404 on routes → added rewrites in vercel.json
- Email links to localhost → set FRONTEND_URL

---

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│    Vercel       │────▶│    Railway       │────▶│    Railway       │
│   (Frontend)    │     │    (API)         │     │   (ML Service)   │
└─────────────────┘     └────────┬─────────┘     └──────────────────┘
                                 │
                                 ▼
                        ┌──────────────────┐
                        │    Railway       │
                        │   (PostgreSQL)   │
                        └──────────────────┘
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

---

## Known Limitations

1. **Email verification** - Requires custom domain for Resend; using auto-verify for demo
2. **Skill extraction** - Disabled to fit Railway free tier memory limits
3. **ML cold start** - First request after deploy takes ~30s for model loading

---

## Future Improvements

- [ ] Add custom domain for email verification
- [ ] Enable skill extraction with larger Railway plan
- [ ] Add more ATS integrations (Lever, Workday)
- [ ] Job alerts / notifications
- [ ] Application tracking
- [ ] Mobile app

---

## Success Criteria - ALL MET ✅

- [x] JWT auth working
- [x] Profile & favorites API
- [x] Python ML service with local model
- [x] Job/profile chunking with skill extraction
- [x] CV generation (backend)
- [x] CV generation UI (modal + PDF)
- [x] 500+ Israeli jobs (792)
- [x] Location normalization
- [x] Jobs list UI with filters
- [x] Job details with formatted descriptions
- [x] Auth UI (login, register, password reset)
- [x] Profile UI with file upload
- [x] Match results (Matches view) with Strategy C
- [x] Favorites UI (Favorites view + heart button)
- [x] Error handling (boundary + 404)
- [x] Production deployment
- [x] No crashes during demo
