# ApplyLess Implementation Plan v4

## Timeline

**Demo Day:** February 3, 2026  
**Today:** January 31, 2026  
**Working days:** 3 (including demo prep)

---

## Vision

Job matching platform that:
1. Scales to thousands of Israeli jobs via automated daily ingestion
2. Uses local ML models (Python + HuggingFace transformers)
3. Generates tailored CVs for favorite jobs
4. Simple but functional UI

---

## Current Status (Jan 31)

### ✅ Completed

| Component | Details |
|-----------|---------|
| **Database** | Railway PostgreSQL + pgvector |
| **Companies** | 1496 from SNC |
| **Job Sources** | 683 detected (Greenhouse + Comeet) |
| **Jobs** | ~770 Israeli positions (non-Israeli filtered) |
| **Location Normalization** | 90+ Israeli cities with regions |
| **Embeddings** | ~750 jobs with BGE 768d vectors |
| **Auth API** | Full JWT system with email verification |
| **Jobs API** | List, search, filters, details with HTML descriptions |
| **Match API** | Vector similarity search |
| **Profile API** | CRUD |
| **Favorites API** | CRUD |
| **ML Service** | Python FastAPI with local models |
| **Chunking** | Job/profile section + skill extraction |
| **CV Generation** | Claude 3 Haiku integration |
| **Frontend** | Landing, Jobs list with filters, Job details, Auth pages |
| **HTML Descriptions** | DOMPurify rendering with CSS formatting |
| **Job Filters** | Region, date, company (autocomplete), role (with history) |

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
| UI - Profile | Page | 🔲 |
| UI - Match | Results page | 🔲 |
| Production | Deployed | 🔲 |

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

### ✅ Phase 3: Frontend (Days 13-14)

#### ✅ Day 13: Core UI
- [x] Landing page (redesigned)
- [x] Login/Register pages
- [x] Jobs list (paginated)
- [x] Job details with HTML description
- [x] Navigation

#### ✅ Day 14: Job Filters & Additional Pages
- [x] Forgot password
- [x] Reset password
- [x] Email verification
- [x] Job filters (region, date, company, role)
- [x] Company autocomplete with job counts
- [x] Role search with history
- [ ] Profile page
- [ ] Match results page
- [ ] Favorites page

---

### Phase 4: Deploy (Days 15-17)

#### Day 15: Final Features
- [ ] Profile page UI
- [ ] Match results page
- [ ] Favorites page with CV generation

#### Day 16: Deployment
- [ ] Deploy Node.js API to Railway
- [ ] Deploy Python ML to Railway
- [ ] Deploy Frontend to Vercel
- [ ] Test end-to-end

#### Day 17: Demo Prep
- [ ] Bug fixes
- [ ] Record demo video
- [ ] Prepare slides

---

### Feb 3: Demo Day 🎉

---

## Recent Fixes (Jan 31)

### Job Filters UI
- ✅ Region dropdown (custom component)
- ✅ Date filter (Today, This week, This month)
- ✅ Company search with autocomplete
- ✅ Role input with search history (localStorage)
- ✅ Active filter pills with clear buttons
- ✅ Backend: /api/jobs/companies endpoint

### Location Normalization
- ✅ Added 90+ Israeli cities to dictionary
- ✅ Added Hebrew spelling variations
- ✅ Classified cities into 5 regions
- ✅ Non-Israeli jobs filtered during ingestion
- ✅ Added country/region/city columns to jobs table

### Comeet Descriptions
- ✅ Fixed missing descriptions (was 100%, now <4%)
- ✅ Discovered `?details=true` API parameter
- ✅ Cleaned up stale jobs (404 from API)

### HTML Descriptions
- ✅ Greenhouse keeps HTML instead of stripping
- ✅ Comeet combines sections as HTML with headers
- ✅ Frontend renders with DOMPurify
- ✅ Added CSS for lists, headings, paragraphs

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
- [ ] Profile UI
- [ ] Match results UI
- [ ] Production deployment
- [ ] No crashes during demo
