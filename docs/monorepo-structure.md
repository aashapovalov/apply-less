# ApplyLess Monorepo Structure

## Package Overview

| Package | Status | Technology | Responsibility |
|---------|--------|------------|----------------|
| `api` | ✅ Production | Express/TS | REST API: auth, jobs, matching, profile, favorites |
| `ingestion` | ✅ Production | Node.js/TS | CLI: scraping, ATS detection, job fetching, embeddings |
| `ml-service` | ✅ Production | FastAPI/Python | ML: embeddings, chunking, skill extraction, CV generation |
| `web` | ✅ Working | React/Vite | Frontend UI: jobs, profile, auth, landing |

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
│   │   └── ml-service-client.ts # ML service HTTP client (Strategy C)
│   ├── constants/
│   │   └── index.ts             # MATCHING_QUERY (weighted SQL)
│   ├── middleware/
│   │   └── auth-middleware.ts   # JWT verification
│   ├── routes/
│   │   ├── auth-router.ts       # /api/auth/*
│   │   ├── jobs-router.ts       # /api/jobs
│   │   ├── match-router.ts      # /api/match (authenticated)
│   │   ├── profile-router.ts    # /api/profile
│   │   └── favorites-router.ts  # /api/favorites
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
| `clients/ml-service-client.ts` | HTTP client for ML service (embedText, chunkProfile) |
| `constants/index.ts` | MATCHING_QUERY - weighted SQL for Strategy C |
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
│   └── cv.py          # POST /api/generate-cv
├── services/
│   ├── embedding_service.py
│   ├── skill_extractor_service.py
│   ├── job_chunker_service.py
│   ├── profile_chunker_service.py
│   └── cv_generator_service.py
└── requirements.txt
```

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
│   │   ├── jobs/
│   │   │   ├── job-card.tsx     # Heart + score badge
│   │   │   ├── company-search.tsx
│   │   │   ├── region-filter.tsx
│   │   │   ├── date-filter.tsx
│   │   │   ├── role-input.tsx
│   │   │   └── safe-html.tsx
│   │   └── ui/
│   ├── hooks/
│   │   └── use-auth-status.ts   # + isLoading for auth state
│   ├── pages/
│   │   ├── auth/
│   │   ├── jobs/
│   │   │   └── jobs.tsx         # Sort toggle, cache invalidation
│   │   └── profile/
│   ├── services/
│   │   ├── api.ts               # RTK Query base with tags
│   │   ├── match.ts             # providesTags: ['Match']
│   │   └── profile.ts           # invalidatesTags: ['Match']
│   └── types/
│       └── index.ts             # MatchRequest (no profile text)
└── package.json
```

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
