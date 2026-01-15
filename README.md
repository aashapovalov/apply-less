# ApplyLess — Personal Job Search Assistant for Israel Hi-Tech (B2C)

ApplyLess is a **personal, AI-assisted job-search system** designed for candidates in the **Israeli hi-tech ecosystem**.  
It is **not a job board** and **not an ATS** — it is a **single-user, quality-focused assistant** that:

- builds and maintains its own database of Israeli hi-tech companies and jobs,
- continuously ingests jobs directly from company career pages and ATS (starting with Greenhouse),
- helps the user discover, evaluate, and prioritize **any role** (not PM-only),
- uses **embeddings + LLMs (mandatory)** to:
    - recommend jobs with grounded explanations,
    - generate tailored resume versions per job,
- tracks favorites and generated applications over time.

The project is built **ingestion-first**: data pipeline and database come before API and UI.

---

## Goals & Non-Goals

### Goals
- High-quality, explainable job recommendations
- Direct sourcing from companies (no aggregators)
- AI grounded in *user profile + job evidence*
- Local development, deployable later
- Clear separation of ingestion, API, and ML services

### Non-Goals (MVP)
- Multi-user marketplace
- Public job board
- Employer-side features
- On-device model inference

---

## MVP Scope

### User
- Single user (me)
- Israel only

### Roles
- Any role (engineering, product, data, design, etc.)
- Searchable by title, keywords, filters

### UI (after ingestion works)
- Job list with filters + search
- Job detail page
- Favorites
- Resume generation
- Sections:
    - All Jobs
    - Favorites
    - Resume Generated

---

## Tech Stack

### Backend
- Node.js 20+
- TypeScript
- REST API
- Firebase Auth (ID token verification)

### Ingestion
- Node.js (TypeScript)
- CLI + local scheduler (cron-like)

### Database
- PostgreSQL (local, Docker)
- `pgvector` for embeddings

### ML / AI
- Python service (thin orchestrator)
- External APIs for:
    - embeddings
    - LLM completions
- No local model inference
- Caching layer for cost + speed

### Auth
- Firebase Authentication
- User-scoped data keyed by `user_id`

---

## Ingestion Pipeline (Core of MVP)

### Stage A — Company Registry (Startup Nation Central)
- Authenticated access (refresh-token capable)
- Primary source of Israeli hi-tech companies
- Stored fields:
    - company_name
    - snc_company_page_url
    - company_website_url
    - tags / industry
    - last_seen_at
- Deduplication:
    - canonical website
    - normalized name

> Fallback: manual export or alternative registry if SNC automation is unstable  
> (SNC remains the intended primary source)

---

### Stage B — Career Page Discovery
For each company website:
- Heuristics:
    - common paths (`/careers`, `/jobs`, `/work-with-us`)
    - internal link scanning (limited depth)
    - sitemap inspection (if available)
- Persist `job_sources`:
    - source_type: `careers_html | greenhouse`
    - base_url
    - detection_method
    - confidence
    - last_checked_at

---

### Stage C — Job Ingestion
- Parse jobs from:
    - native HTML career pages
    - Greenhouse ATS (only ATS in MVP)
- Normalize to a unified job schema
- Deduplicate by:
    - canonical_job_url
    - company_id
    - normalized_title
    - location
- Track:
    - first_seen_at
    - last_seen_at
    - status (`active | expired`)

---

### Stage D — Scheduling
- Manual CLI execution
- Local scheduled runs (daily)

---

## AI Features (Mandatory)

### Recommendations
- Store user profile (resume / LinkedIn) as chunks
- Store job description chunks
- Generate embeddings (via Python ML service)
- Vector similarity search (pgvector)
- LLM generates:
    - “Why this job matches you” explanation
    - Evidence-grounded reasoning
    - Optional structured tags
- Persist scores, explanations, evidence

---

### Resume Generation
For a selected job:
- Retrieve top relevant profile chunks
- Generate:
    - Tailored summary (3–5 lines)
    - 5–8 tailored bullet points
    - Keyword coverage (covered / missing)
- Versioned, timestamped
- Stored per `job_id + user_id`


