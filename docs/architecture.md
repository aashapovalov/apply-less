# ApplyLess Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           APPLY-LESS SYSTEM                             │
└─────────────────────────────────────────────────────────────────────────┘

                              ┌─────────────────┐
                              │   Web Browser   │
                              │   (React SPA)   │
                              └────────┬────────┘
                                       │ HTTPS
                                       ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                            RAILWAY PLATFORM                              │
│                                                                          │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐      │
│  │   Ingestion     │    │   API Service   │    │   ML Service    │      │
│  │   (Node.js)     │    │   (Node.js)     │    │   (Python)      │      │
│  │                 │    │                 │    │                 │      │
│  │ CLI Commands:   │    │ Endpoints:      │    │ Endpoints:      │      │
│  │ • snc           │    │ • /jobs         │    │ • /embed        │      │
│  │ • greenhouse    │    │ • /match        │    │ • /generate     │      │
│  │ • comeet        │    │ • /favorites    │    │                 │      │
│  └────────┬────────┘    └────────┬────────┘    └────────┬────────┘      │
│           │                      │                      │               │
│           │         ┌────────────┴──────────────────────┘               │
│           │         │                                                   │
│           ▼         ▼                                                   │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │           PostgreSQL 17 + pgvector                                │   │
│  │                                                                   │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐               │   │
│  │  │  companies  │  │    jobs     │  │ embeddings  │               │   │
│  │  │  (1007)     │  │   (111)     │  │  (planned)  │               │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘               │   │
│  │                                                                   │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐               │   │
│  │  │ job_sources │  │   users     │  │  favorites  │               │   │
│  │  │   (176)     │  │ (planned)   │  │  (planned)  │               │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘               │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘

                    EXTERNAL DATA SOURCES
                    ─────────────────────
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  SNC Finder     │  │  Greenhouse     │  │  Comeet         │
│  (Companies)    │  │  (Jobs API)     │  │  (Jobs API)     │
│                 │  │                 │  │                 │
│ Rate limited    │  │ Public API      │  │ Token required  │
│ 429 errors      │  │ No auth needed  │  │ Widget scraping │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

---

## Database Schema

### Core Tables

```sql
-- Companies from SNC
companies (
    id, company_name, normalized_name, company_website_url,
    careers_page_url, linkedin_url, description, employee_count,
    founded_year, tags[], source_type, first_seen_at, last_seen_at
)

-- Detected career page sources
job_sources (
    id, company_id, source_type, base_url,
    detection_method, confidence, status, last_checked_at
)

-- Job postings
jobs (
    id, company_id, title, normalized_title, location,
    department, employment_type, description, requirements,
    canonical_url, external_id, posted_date, status
)
```

### Embeddings Tables (for matching)

```sql
-- Job embeddings for similarity search
job_embeddings (
    id, job_id, chunk_index, section_type,
    embedding vector(768), created_at
)

-- User profile embeddings
profile_embeddings (
    id, user_id, chunk_index, section_type,
    embedding vector(768), created_at
)
```

### User Tables

```sql
users (id, firebase_uid, email, display_name, ...)
user_profiles (id, user_id, full_text, summary, skills[], ...)
favorites (id, user_id, job_id, notes, created_at)
generated_resumes (id, user_id, job_id, content, ...)
```

---

## Ingestion Pipeline

### Stage A: SNC Company Scraping

```
SNC Finder → Playwright (cookies) → Parse HTML → companies table
```

- **Input**: SNC Finder website (authenticated)
- **Output**: Company name, website, description, tags
- **Status**: ✅ Working (1007 companies)
- **Issue**: 429 rate limiting

### Stage D: Greenhouse Jobs

```
Greenhouse API → JSON response → jobs table
```

- **Input**: `https://boards-api.greenhouse.io/v1/boards/{company}/jobs`
- **Output**: Job title, location, description, URL
- **Status**: ✅ Working (111 jobs)
- **No authentication required**

### Stage E: Comeet Jobs (API)

```
Comeet API + Token → JSON response → jobs table
```

- **Input**: `https://www.comeet.com/careers-api/2.0/company/{uid}/positions?token={token}`
- **Output**: Job title, location, description
- **Status**: ⚠️ Partial (2 companies with tokens)

### Stage F: Comeet Jobs (Widget Scraping)

```
Career page → Playwright → Parse .comeet-position → jobs table
```

- **Input**: Company career pages with Comeet widget
- **Output**: Job title, location, URL
- **Status**: 🔄 In development

---

## Embedding & Matching Flow (Planned)

```
                    ┌──────────────────┐
                    │   User Profile   │
                    │  (Resume/Skills) │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │  Chunk & Embed   │
                    │  (768 dims)      │
                    └────────┬─────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  Job Embedding  │ │  Job Embedding  │ │  Job Embedding  │
│     Job #1      │ │     Job #2      │ │     Job #N      │
└────────┬────────┘ └────────┬────────┘ └────────┬────────┘
         │                   │                   │
         └───────────────────┼───────────────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │ Vector Similarity│
                    │ (cosine/dot)     │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │ Top N Matches    │
                    │ with scores      │
                    └──────────────────┘
```

---

## Technology Stack

### Backend

| Component | Technology | Notes |
|-----------|------------|-------|
| Language | TypeScript (Node.js) | All services |
| Database | PostgreSQL 17 | Railway managed |
| Vector DB | pgvector extension | 768-dim embeddings |
| Scraping | Playwright | Headless Chrome |
| HTTP Client | Axios | API calls |

### Frontend (Planned)

| Component | Technology |
|-----------|------------|
| Framework | React + Vite |
| Styling | TailwindCSS |
| State | React Query |
| Auth | Firebase |

### ML Service (Planned)

| Component | Technology |
|-----------|------------|
| Framework | Python FastAPI |
| Embeddings | Sentence Transformers |
| LLM | OpenAI API |

### Infrastructure

| Component | Service |
|-----------|---------|
| Hosting | Railway |
| Database | Railway PostgreSQL |
| CI/CD | GitHub → Railway |
| Monitoring | Railway Logs |

---

## Data Flow

### Job Ingestion

```
1. CLI Command
   └── railway run npm run start -- greenhouse

2. Fetch Companies
   └── SELECT * FROM companies WHERE has_greenhouse_source

3. For Each Company:
   └── GET https://boards-api.greenhouse.io/v1/boards/{slug}/jobs
   └── For each job: GET .../jobs/{id} (full description)
   └── Normalize & deduplicate
   └── INSERT/UPDATE jobs table

4. Summary
   └── Log: X new, Y updated, Z failed
```

### Job Matching (Planned)

```
1. User submits profile
   └── Chunk into sections (summary, experience, skills)
   └── Generate embeddings (768 dims)
   └── Store in profile_embeddings

2. Find matches
   └── SELECT jobs + embeddings
   └── Calculate cosine similarity with profile
   └── Rank by score

3. Return results
   └── Top N jobs with match scores
   └── Optional: LLM-generated explanations
```