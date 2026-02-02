# ApplyLess Monorepo Structure

## Package Overview

| Package | Status | Technology | Responsibility |
|---------|--------|------------|----------------|
| `api` | ✅ Production | Express/TS | REST API: auth, jobs, matching, profile, favorites, CV |
| `ingestion` | ✅ Production | Node.js/TS | CLI: scraping, ATS detection, job fetching, embeddings |
| `ml-service` | ✅ Production | FastAPI/Python | ML: embeddings, chunking, skill extraction, CV generation |
| `web` | ✅ Complete | React/Vite | Frontend UI: jobs (3 views), profile, auth, CV modal |

---

## packages/api

Express REST API server.

```
api/
├── src/
│   ├── index.ts                 # Server entry point
│   ├── config/
│   │   └── db.ts                # PostgreSQL connection pool
│   ├── clients/
│   │   ├── ml-service-client.ts # ML service HTTP client (embeddings, CV)
│   │   └── index.ts
│   ├── constants/
│   │   └── index.ts             # MATCHING_QUERY (weighted SQL)
│   ├── middleware/
│   │   └── auth-middleware.ts   # JWT verification
│   ├── routes/
│   │   ├── auth-router.ts       # /api/auth/*
│   │   ├── jobs-router.ts       # /api/jobs
│   │   ├── match-router.ts      # /api/match (authenticated)
│   │   ├── profile-router.ts    # /api/profile
│   │   ├── favorites-router.ts  # /api/favorites
│   │   ├── cv-router.ts         # /api/cv (generate, compare)
│   │   └── index.ts
│   ├── services/
│   │   ├── auth-service.ts
│   │   ├── token-service.ts
│   │   ├── user-service.ts
│   │   ├── email-service.ts
│   │   ├── rate-limit-service.ts
│   │   ├── job-service.ts
│   │   ├── match-service.ts     # Strategy C weighted matching
│   │   ├── profile-service.ts   # + embedding generation
│   │   └── favorites-service.ts
│   ├── types/
│   │   └── index.ts
│   └── utils/
│       └── password-validation.ts
├── package.json
└── tsconfig.json
```

### Key Files

| File | Purpose |
|------|---------|
| `clients/ml-service-client.ts` | HTTP client for ML service (embedText, chunkProfile, generateCV, compareCV) |
| `constants/index.ts` | MATCHING_QUERY - weighted SQL for Strategy C |
| `routes/cv-router.ts` | CV generation and comparison endpoints |
| `services/match-service.ts` | Reads pre-computed embeddings, executes weighted query |
| `services/profile-service.ts` | Saves profile + generates title/experience embeddings |

---

## packages/ingestion

CLI tool for job data pipeline.

```
ingestion/
├── src/
│   ├── cli.ts                   # Commander CLI entry
│   ├── clients/
│   │   ├── snc-client-playwright.ts
│   │   ├── greenhouse-client.ts
│   │   ├── comeet-client.ts
│   │   ├── embedding-client.ts  # + chunkJob method
│   │   └── playwright-client.ts
│   ├── data/
│   │   └── israeli-cities.json
│   ├── detectors/
│   │   ├── ats-detector.ts
│   │   ├── comeet-extractor.ts  # .com/.co support
│   │   └── ...
│   ├── stages/
│   │   ├── stage-a-snc.ts
│   │   ├── stage-b-detect-ats.ts
│   │   ├── stage-d-greenhouse.ts
│   │   ├── stage-e-comeet.ts
│   │   └── stage-g-embeddings.ts # Full + chunk embeddings
│   ├── types/
│   │   └── index.ts             # Chunk, JobChunkResponse
│   └── utils/
│       ├── location-normalizer.ts
│       └── get-chunk-by-type.ts
├── package.json
└── tsconfig.json
```

### CLI Commands

| Command | Description |
|---------|-------------|
| `snc` | Scrape companies from SNC |
| `detect` | Detect ATS from career pages |
| `greenhouse` | Fetch Greenhouse jobs |
| `comeet` | Fetch Comeet jobs |
| `embeddings` | Generate full + chunk embeddings |

---

## packages/ml-service

Python FastAPI service for ML inference.

```
ml-service/
├── main.py
├── api/
│   ├── health.py      # GET /health
│   ├── embed.py       # POST /api/embed, /api/embed/single
│   ├── chunk.py       # POST /api/chunk/job, /api/chunk/profile
│   ├── cv.py          # POST /api/generate-cv
│   └── compare.py     # POST /api/compare-cv
├── services/
│   ├── embedding_service.py
│   ├── skill_extractor_service.py
│   ├── job_chunker_service.py
│   ├── profile_chunker_service.py
│   ├── cv_generator_service.py
│   └── cv_gen_prompt_template.py
└── requirements.txt
```

### ML Service Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/embed` | POST | Batch text embeddings |
| `/api/embed/single` | POST | Single text embedding |
| `/api/chunk/job` | POST | Chunk job description + extract skills |
| `/api/chunk/profile` | POST | Chunk profile + extract skills |
| `/api/generate-cv` | POST | Generate tailored CV using Claude |
| `/api/compare-cv` | POST | Compare CV to job (skill coverage + score) |

---

## packages/web

React frontend.

```
web/
├── src/
│   ├── App.tsx
│   ├── index.css                # Theme colors
│   ├── components/
│   │   ├── auth/
│   │   │   └── protected-route.tsx
│   │   ├── cv/
│   │   │   ├── cv-generator-modal.tsx   # Main modal orchestration
│   │   │   ├── cv-modal-initial.tsx     # Ready to generate state
│   │   │   ├── cv-modal-loading.tsx     # 5-step loading animation
│   │   │   ├── cv-modal-success.tsx     # CV preview + analysis
│   │   │   ├── cv-modal-error.tsx       # Error state
│   │   │   ├── cv-modal-profile-required.tsx  # Profile too short
│   │   │   ├── cv-preview.tsx           # CV markdown preview
│   │   │   ├── requirement-analysis.tsx # Covered vs gaps
│   │   │   ├── score-badge.tsx          # Match score visualization
│   │   │   └── index.ts
│   │   ├── jobs/
│   │   │   ├── filters/
│   │   │   │   ├── view-toggle.tsx      # All/Matches/Favorites tabs
│   │   │   │   ├── jobs-header.tsx      # Dynamic title based on view
│   │   │   │   ├── jobs-filters.tsx     # Filter inputs + active pills
│   │   │   │   ├── region-filter.tsx
│   │   │   │   ├── date-filter.tsx
│   │   │   │   └── role-input.tsx
│   │   │   ├── job-list/
│   │   │   │   ├── job-card.tsx         # Card with heart + CV button
│   │   │   │   ├── jobs-list.tsx        # List + empty states
│   │   │   │   ├── jobs-skeleton.tsx
│   │   │   │   └── pagination.tsx
│   │   │   ├── job-page/
│   │   │   │   └── safe-html.tsx
│   │   │   └── company-search.tsx
│   │   └── ui/
│   ├── constants/
│   │   └── index.ts             # JOBS_PER_PAGE, MAX_MATCHES, MIN_PROFILE_WORDS
│   ├── hooks/
│   │   ├── use-auth-status.ts
│   │   ├── use-jobs-view.ts     # All jobs page data logic
│   │   └── index.ts
│   ├── pages/
│   │   ├── auth/
│   │   ├── jobs/
│   │   │   ├── jobs.tsx         # Thin orchestration (uses useJobsView)
│   │   │   └── job-details.tsx  # Job details + CV button
│   │   └── profile/
│   ├── services/
│   │   ├── api.ts               # RTK Query base with tags
│   │   ├── cv.ts                # generateCV, compareCV mutations
│   │   ├── match.ts             # Fetches all matches (MAX_MATCHES)
│   │   └── ...
│   ├── types/
│   │   └── index.ts             # JobFilters, ViewMode, CV types
│   └── utils/
│       ├── generate-cv-pdf.ts   # PDF generation with styling + links
│       └── index.ts
└── package.json
```

### Key Hooks

| Hook | Purpose |
|------|---------|
| `useAuthStatus` | Auth state + profile existence + profileText |
| `useJobsView` | All jobs page logic (view mode, filters, pagination, data) |

### CV Modal Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  CVGeneratorModal                        │
│              (orchestration + state)                     │
└─────────────────────────┬───────────────────────────────┘
                          │ renders based on state
          ┌───────────────┼───────────────┬───────────────┐
          ▼               ▼               ▼               ▼
   ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
   │ ProfileReq  │ │   Initial   │ │   Loading   │ │   Success   │
   │ (< 100 wds) │ │ (ready)     │ │ (5 steps)   │ │ (preview)   │
   └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘
                                                         │
                                                         ▼
                                                  ┌─────────────┐
                                                  │ PDF Download│
                                                  │ (jsPDF)     │
                                                  └─────────────┘
```

### Jobs Page Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      jobs.tsx                           │
│                (thin orchestration)                     │
└─────────────────────────┬───────────────────────────────┘
                          │ uses
                          ▼
┌─────────────────────────────────────────────────────────┐
│                   useJobsView()                         │
│  • URL params (view, page, filters)                     │
│  • Data queries (jobs, matches, favorites)              │
│  • Client-side filtering for matches/favorites          │
│  • Actions (setViewMode, setFilter, setPage)            │
│  • Default view: 'matches' if hasProfile                │
└─────────────────────────────────────────────────────────┘
                          │ renders
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
   ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
   │ ViewToggle  │ │ JobsFilters │ │  JobsList   │
   │ (3 tabs)    │ │ (inputs)    │ │ (cards)     │
   └─────────────┘ └─────────────┘ └─────────────┘
```

### View Modes

| View | URL | Data Source | Filtering | Default For |
|------|-----|-------------|-----------|-------------|
| All Jobs | `/jobs?view=all` | `useGetJobsQuery` | Server-side | Users without profile |
| Matches | `/jobs?view=matches` | `useMatchJobsQuery` | Client-side | **Users with profile** |
| Favorites | `/jobs?view=favorites` | `useGetFavoritesQuery` | Client-side | — |

### RTK Query Tags

| Tag | Provided by | Invalidated by |
|-----|-------------|----------------|
| `Match` | `matchJobs` | `saveProfile` |
| `Profile` | `getProfile` | `saveProfile`, `deleteProfile` |
| `Favorites` | `getFavorites` | `addFavorite`, `removeFavorite` |

---

## db/migrations

| Migration | Description |
|-----------|-------------|
| 001-013 | Initial schema through location normalization |
| **014** | **Chunk embeddings for Strategy C** |

### Migration 014

```sql
ALTER TABLE jobs ADD COLUMN header_embedding vector(768);
ALTER TABLE jobs ADD COLUMN requirements_embedding vector(768);
ALTER TABLE users ADD COLUMN title_embedding vector(768);
ALTER TABLE users ADD COLUMN experience_embedding vector(768);
```

---

## Matching Architecture (Strategy C)

```
Profile Save:
┌──────────┐    ┌─────────────┐    ┌─────────────┐    ┌──────────┐
│ Frontend │───▶│ Profile API │───▶│ ML Service  │───▶│ Database │
└──────────┘    └─────────────┘    └─────────────┘    └──────────┘
                                                       title_embedding
                                                       experience_embedding

Match Request:
┌──────────┐    ┌─────────────┐    ┌──────────────────────────────┐
│ Frontend │───▶│ Match API   │───▶│ Database (weighted SQL)      │
└──────────┘    └─────────────┘    │ No ML calls - instant!       │
                                   └──────────────────────────────┘

Weighted Score:
  0.40 × (title ↔ header)
+ 0.35 × (experience ↔ requirements)
+ 0.25 × (full ↔ full)
```

---

## CV Generation Architecture

```
┌──────────┐    ┌─────────────┐    ┌─────────────┐
│ Frontend │───▶│ CV API      │───▶│ ML Service  │
│ (Modal)  │    │ /cv/generate│    │ Claude API  │
└──────────┘    └─────────────┘    └─────────────┘
     │                                    │
     │                                    ▼
     │                              ┌─────────────┐
     │                              │ Generated   │
     │                              │ CV Markdown │
     │                              └─────────────┘
     │
     │          ┌─────────────┐    ┌─────────────┐
     └─────────▶│ CV API      │───▶│ ML Service  │
                │ /cv/compare │    │ Skill Match │
                └─────────────┘    └─────────────┘
                                         │
                                         ▼
                                   ┌─────────────┐
                                   │ Score +     │
                                   │ Coverage    │
                                   └─────────────┘
```

**CV Generation Flow:**
1. User clicks "Generate CV" on job card or details page
2. Modal validates profile (min 100 words)
3. Backend fetches profile from DB, calls ML service
4. ML service generates CV using Claude + job requirements
5. Backend calls ML service to compare CV to job
6. Modal displays CV preview + requirements analysis + score
7. User downloads PDF with styled formatting + clickable links
