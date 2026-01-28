# ApplyLess Implementation Plan v3

## Timeline

**Demo Day:** February 3, 2026  
**Today:** January 26, 2026  
**Working days:** 6 (+ 2 days video prep buffer)

---

## Vision

Job matching platform that:
1. Scales to thousands of jobs via automated daily ingestion
2. Uses local ML models (Python + HuggingFace transformers)
3. Generates tailored CVs for favorite jobs
4. Simple but functional UI

---

## Current Status (Jan 26)

### ✅ Completed

| Component | Details |
|-----------|---------|
| Database | Railway PostgreSQL + pgvector |
| Companies | 1496 from SNC |
| Job Sources | 683 detected |
| Jobs | 1716 (Greenhouse + Comeet) |
| Embeddings | 682 jobs (BGE 768d) |
| Auth API | Full JWT system with email verification |
| Jobs API | List, search, details |
| Match API | Vector similarity search |
| Profile API | CRUD |
| Favorites API | CRUD |
| ML Service | Python FastAPI with local models |
| Chunking | Job/profile section + skill extraction |
| CV Generation | Claude 3 Haiku integration |

### 🎯 Demo Goals

| Goal | Target | Status |
|------|--------|--------|
| Jobs | 2000+ | 🔲 1716 |
| Auth | JWT + refresh | ✅ |
| Profile & Favorites | CRUD | ✅ |
| ML Service | Local models | ✅ |
| Chunking | Sections + skills | ✅ |
| CV Generation | Working | ✅ |
| UI | Simple, functional | 🔲 |

---

## Roadmap

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

#### Day 11: Scaled Ingestion
- [ ] Run Greenhouse for all companies
- [ ] Comeet scraper improvements
- [ ] Full ingestion pipeline
- [ ] Chunk all jobs
- [ ] Target: 2000+ jobs

#### ✅ Day 12: CV Generation
- [x] Skill gap analysis
- [x] Claude API integration
- [x] CV prompt template
- [x] Profile validation

---

### Phase 3: Frontend (Days 13-14)

#### Day 13: Core UI
- [ ] Login/Register pages
- [ ] Jobs list (paginated)
- [ ] Match page
- [ ] Navigation

#### Day 14: Favorites + CV
- [ ] Favorites page
- [ ] Generate CV button
- [ ] CV preview/download
- [ ] Loading states

---

### Phase 4: Deploy (Days 15-17)

#### Day 15: Deployment
- [ ] Deploy Node.js API to Railway
- [ ] Deploy Python ML to Railway
- [ ] Deploy Frontend to Vercel

#### Days 16-17: Demo Prep
- [ ] Bug fixes
- [ ] Record demo video
- [ ] Prepare slides

---

### Feb 3: Demo Day 🎉

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
- [ ] 2000+ jobs
- [ ] Functional UI
- [ ] Production deployment
- [ ] No crashes during demo
