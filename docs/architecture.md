# ApplyLess Architecture

## System Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   React Web     │     │   Node.js API    │     │  Python ML       │
│   (Vercel)      │────▶│   (Express)      │────▶│  (FastAPI)       │
│                 │     │                  │     │                  │
│   • Landing     │     │   • /auth/*      │     │   • /api/embed   │
│   • Jobs list   │     │   • /jobs        │     │   • /api/chunk/* │
│   • Job details │     │   • /match       │     │   • /api/cv      │
│   • Auth pages  │     │   • /profile     │     │                  │
│                 │     │   • /favorites   │     │   Models:        │
│   ✅ WORKING    │     │                  │     │   • BGE-base-en  │
└─────────────────┘     └────────┬─────────┘     │   • hirly-ner    │
                                 │               └────────┬─────────┘
         ┌───────────────────────┼────────────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  PostgreSQL     │     │     Resend       │     │   Ingestion      │
│  + pgvector     │     │   (Email API)    │     │   (CLI)          │
│                 │     │                  │     │                  │
│  • companies    │     │   • Verification │     │   • snc          │
│  • jobs         │     │   • Password     │     │   • detect       │
│  • embeddings   │     │     reset        │     │   • greenhouse   │
│  • users        │     │                  │     │   • comeet       │
│  • favorites    │     │                  │     │   • embeddings   │
└─────────────────┘     └──────────────────┘     └──────────────────┘
```

**Current Stats:** 1496 companies, 683 job sources, ~770 Israeli jobs, ~750 embeddings

---

## Data Flows

### 1. Job Ingestion

```
SNC API → Companies → ATS Detection → Job Fetching → Location Filter → DB
                                            ↓
                                    (Non-Israeli jobs skipped)
```

1. **SNC Scraping:** Fetch Israeli startups from StartupNationCentral
2. **ATS Detection:** Identify career page type (Greenhouse, Comeet, etc.)
3. **Job Fetching:** Pull jobs from detected ATS APIs
4. **Location Normalization:** Classify Israeli cities into regions
5. **Non-Israeli Filter:** Skip jobs outside Israel during ingestion
6. **Embedding:** Generate vectors for similarity search

### 2. Location Normalization

Jobs are automatically filtered and classified during ingestion:

| Region | Cities |
|--------|--------|
| **Central** | Tel Aviv, Ramat Gan, Herzliya, Ra'anana, Petah Tikva, Netanya, Holon, Rehovot, Rishon LeZion, Bnei Brak, Hod Hasharon, Kfar Saba, Rosh HaAyin, Givatayim, etc. |
| **North** | Haifa, Yokneam, Caesarea, Nahariya, Karmiel, Nazareth, Acre |
| **South** | Beer Sheva, Eilat, Ashkelon, Kiryat Gat, Sderot |
| **Jerusalem** | Jerusalem, Beit Shemesh, Modi'in |
| **Remote** | Remote, Hybrid, Work from home |

Non-Israeli locations (US, UK, EU, etc.) are detected and **skipped during ingestion**.

### 3. Profile Matching

```
Profile Text → ML Service → Chunk + Embed → pgvector Search → Ranked Jobs
```

### 4. CV Generation

```
Job + Profile → Skill Gap Analysis → Claude API → Tailored CV Markdown
```

---

## API Endpoints

### Auth (`/api/auth`)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/register` | POST | No | Create account, send verification email |
| `/login` | POST | No | Returns access + refresh tokens |
| `/refresh` | POST | No | Exchange refresh token for new pair |
| `/logout` | POST | Yes | Revoke refresh token |
| `/verify-email` | GET | No | Verify email via token link |
| `/forgot-password` | POST | No | Send password reset email |
| `/reset-password` | POST | No | Reset password with token |
| `/resend-verification` | POST | No | Resend verification email |
| `/me` | GET | Yes | Get current user info |

### Jobs (`/api/jobs`)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/` | GET | No | List jobs (paginated, filterable) |
| `/:id` | GET | No | Get job details with HTML description |
| `/regions` | GET | No | Get regions with job counts |
| `/cities` | GET | No | Get cities with job counts |
| `/companies` | GET | No | Get companies for autocomplete |

**Query params for `/`:** `limit`, `offset`, `region`, `company`, `title`, `postedAfter`, `sort`

**Note:** All jobs are Israeli only (filtered during ingestion).

### Match (`/api/match`)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/` | POST | No | Match profile text to jobs |

**Body:** `{ profile, limit?, offset?, threshold? }`

### Profile (`/api/profile`)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/` | GET | Yes | Get user profile text |
| `/` | POST | Yes | Save/update profile (max 50K chars) |
| `/` | DELETE | Yes | Delete profile text |

### Favorites (`/api/favorites`)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/` | GET | Yes | Get all favorites with job details |
| `/:jobId` | GET | Yes | Check if job is favorited |
| `/:jobId` | POST | Yes | Add to favorites |
| `/:jobId` | DELETE | Yes | Remove from favorites |

---

## ML Service Endpoints (Port 8000)

### Health & Embeddings

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check + model status |
| `/api/embed` | POST | Batch embedding (max 100 texts) |
| `/api/embed/single` | POST | Single text embedding |

### Chunking

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chunk/job` | POST | Job → sections + skills + embeddings |
| `/api/chunk/profile` | POST | Profile → chunks + feedback + score |

### CV Generation

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/generate-cv` | POST | Generate tailored CV via Claude |

**Validation:** Profile must have 200+ words and completeness score ≥ 0.4

---

## ATS Detection Pipeline

Detection runs in order (first match wins):

| Step | Method | Confidence |
|------|--------|------------|
| 1 | Page patterns (URL, DOM, scripts) | 85-95% |
| 2 | Greenhouse API probe | 75% |
| 3 | Deep crawl (optional) | varies |
| 4 | Keyword fallback | 65% |

**Supported ATS:** Greenhouse, Comeet, Lever, Workable

**CLI flags:**
- `--recheck` — Re-check companies with no job_source
- `--force` — Process all companies
- `--deep-crawl` — Follow job links recursively
- `-c, --company <n>` — Single company

---

## Ingestion: Description Handling

### Greenhouse
- Fetches `jobDetail.content` (HTML) from API
- Stores HTML directly for proper formatting
- Frontend renders with DOMPurify sanitization

### Comeet
- Uses `?details=true` parameter to fetch full description
- API returns array of sections: `[{name, value (HTML), order}, ...]`
- Combined into HTML with `<h3>` section headers
- Frontend renders with DOMPurify sanitization

---

## Database Schema

### Core Tables

```sql
companies        -- 1496 records: company info, careers URL
job_sources      -- 683 records: detected ATS with slugs/tokens
jobs             -- ~770 records: Israeli job postings only
                 -- Columns: country, region, city for location classification
job_chunks       -- Section-level job content
job_embeddings   -- ~750 records: 768d vectors (BGE)
```

### Location Columns in Jobs Table

```sql
country VARCHAR(50)   -- 'Israel' or NULL (non-Israeli skipped)
region VARCHAR(50)    -- 'central', 'north', 'south', 'jerusalem', 'remote', 'other'
city VARCHAR(100)     -- Normalized city name
```

### Auth Tables

```sql
users                  -- User accounts
refresh_tokens         -- JWT refresh tokens (30d expiry)
verification_tokens    -- Email verification (24h expiry)
password_reset_tokens  -- Password reset (1h expiry)
rate_limits            -- Rate limiting state
favorites              -- User saved jobs
```

---

## Security

### Password Requirements

- Minimum 8 characters
- At least 1 uppercase, 1 digit, 1 special character

### Rate Limiting

| Action | Limit |
|--------|-------|
| Login | 5 / 15 min / IP |
| Register | 3 / 60 min / IP |
| Forgot Password | 3 / 60 min / email |

### Token Expiry

| Token | Expiry |
|-------|--------|
| Access (JWT) | 1 hour |
| Refresh | 30 days |
| Email verification | 24 hours |
| Password reset | 1 hour |

### HTML Sanitization

Job descriptions may contain HTML. Frontend uses DOMPurify with whitelist:
- Allowed tags: `p, br, b, i, em, strong, u, s, h1-h6, ul, ol, li, a, span, div, table, thead, tbody, tr, th, td, blockquote, pre, code`
- Allowed attributes: `href, target, rel, class`

---

## Environment Variables

### Node.js API

```env
DATABASE_URL=postgresql://...
JWT_SECRET=<32+ chars>
JWT_REFRESH_SECRET=<32+ chars>
RESEND_API_KEY=re_xxxxx
FROM_EMAIL=onboarding@resend.dev
FRONTEND_URL=http://localhost:5173
ML_SERVICE_URL=http://localhost:8000
```

### Python ML Service

```env
EMBED_MODEL_NAME=BAAI/bge-base-en-v1.5
EMBED_MODEL_CACHE_DIR=./embed_model_cache
SKILLS_EXTRACTION_MODEL_NAME=feliponi/hirly-ner-multi
SKILLS_EXTRACTION_MODEL_CACHE_DIR=./model_cache
ANTHROPIC_API_KEY=sk-ant-...
CV_MODEL_NAME=claude-3-haiku-20240307
HOST=0.0.0.0
PORT=8000
```

### Ingestion

```env
DATABASE_URL=postgresql://...
SNC_BASE_URL=https://finder.startupnationcentral.org
SNC_AUTH_TOKEN=...
SNC_REFRESH_TOKEN=...
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| API | Express 5, TypeScript, JWT, bcrypt |
| ML Service | FastAPI, sentence-transformers, BGE-base-en-v1.5 |
| Skill Extraction | transformers, feliponi/hirly-ner-multi |
| CV Generation | Anthropic Claude 3 Haiku |
| Database | PostgreSQL 17, pgvector |
| Email | Resend API |
| Scraping | Playwright |
| Frontend | React 19, Vite, TailwindCSS 4, Redux Toolkit |
| Hosting | Railway (API, ML, DB), Vercel (web) |
