# ApplyLess Architecture

## System Overview (Jan 2026)

```
                                    ┌─────────────────────────────────────┐
                                    │       Python ML Service             │
                                    │       (FastAPI + Railway)           │
                                    │                                     │
                                    │  ┌─────────────┐ ┌───────────────┐  │
                                    │  │ BGE-base-en │ │ hirly-ner-    │  │
                                    │  │ (embeddings)│ │ multi (NER)   │  │
                                    │  │ 768d        │ │ skill extract │  │
                                    │  └─────────────┘ └───────────────┘  │
                                    │                                     │
                                    │  Endpoints:                         │
                                    │  • /health                          │
                                    │  • /api/embed                       │
                                    │  • /api/embed/single                │
                                    │  • /api/chunk/job ✅                │
                                    │  • /api/chunk/profile ✅            │
                                    │  • /api/generate-cv ✅              │
                                    └──────────────▲──────────────────────┘
                                                   │
┌─────────────────┐                 ┌──────────────┴──────────────┐
│   Ingestion     │                 │        Node.js API          │
│   (Node.js)     │                 │        (Express)            │
│                 │                 │        Railway              │
│ CLI commands:   │                 │                             │
│ • snc ✅        │                 │  Endpoints:                 │
│ • detect ✅     │                 │  • /api/auth/* ✅           │
│ • greenhouse ✅ │                 │  • /api/jobs ✅             │
│ • comeet ✅     │                 │  • /api/match ✅            │
│ • embeddings ✅ │                 │  • /api/profile ✅          │
└────────┬────────┘                 │  • /api/favorites ✅        │
         │                          └──────────────┬──────────────┘
         │                                         │
         │      ┌──────────────────────────────────┼───────────────────────┐
         │      │                                  │                       │
         │      ▼                                  ▼                       ▼
         │ ┌─────────────────────────┐    ┌─────────────────┐    ┌─────────────────┐
         │ │  PostgreSQL + pgvector  │    │     Resend      │    │    Frontend     │
         │ │  Railway                │    │   (Email API)   │    │    (React)      │
         │ │                         │    │                 │    │    Vercel       │
         │ │  • companies: 1496      │    │  • Verification │    │                 │
         │ │  • job_sources: 683     │    │  • Password     │    │  🔲 Planned     │
         └▶│  • jobs: 1716           │    │    reset        │    │                 │
           │  • job_embeddings: 682  │    │                 │    │                 │
           │  • users ✅             │    └─────────────────┘    └─────────────────┘
           │  • auth tokens ✅       │
           │  • favorites ✅         │
           └─────────────────────────┘
```

---

## Data Flow

### 1. Job Ingestion Pipeline

```
SNC API → Ingestion CLI → Companies/Jobs → PostgreSQL
                                │
                                ▼
                    ML Service (/api/chunk/job)
                                │
                    ┌───────────┴───────────┐
                    ▼                       ▼
            Section Detection         Skill Extraction
            (about, requirements,     (NER + keywords)
             responsibilities,         │
             benefits, preferred)      ▼
                    │             Skill Level Detection
                    │             (mandatory/preferred)
                    ▼                       │
            Per-section embeddings          │
                    │                       │
                    └───────────┬───────────┘
                                ▼
                    Embeddings + Skills → PostgreSQL
```

### 2. Profile Matching

```
User Profile Text → Node.js API → ML Service (/api/chunk/profile)
                                        │
                        ┌───────────────┴───────────────┐
                        ▼                               ▼
                Profile Chunking                  Skill Extraction
                (full, experience,                      │
                 education)                             ▼
                        │                         Feedback Generation
                        │                         (skills, metrics,
                        │                          action verbs)
                        ▼                               │
                Profile Embeddings              Completeness Score
                        │                               │
                        └───────────────┬───────────────┘
                                        ▼
                        pgvector similarity search
                                        │
                                        ▼
                                Ranked Job Results
```

### 3. CV Generation ✅

```
POST /api/generate-cv
        │
        ▼
┌───────────────────────────────────────────┐
│  1. Validate Profile                      │
│     - Word count ≥ 200 (hard limit)       │
│     - Word count < 300 (warning)          │
│     - Completeness score ≥ 0.4            │
└──────────────────────┬────────────────────┘
                       │
                       ▼
┌──────────────────────┴────────────────────┐
│  2. Chunk Job + Profile                   │
│     - Extract skills from both            │
│     - Detect mandatory/preferred          │
└──────────────────────┬────────────────────┘
                       │
                       ▼
┌──────────────────────┴────────────────────┐
│  3. Skill Gap Analysis                    │
│     - matching_skills                     │
│     - missing_skills                      │
│     - match_rate                          │
└──────────────────────┬────────────────────┘
                       │
                       ▼
┌──────────────────────┴────────────────────┐
│  4. Call Claude 3 Haiku                   │
│     - Build prompt with context           │
│     - Generate tailored CV                │
└──────────────────────┬────────────────────┘
                       │
                       ▼
               CV Markdown + Match Summary
```

---

## ATS Detection Pipeline

Stage B uses a multi-step detection pipeline to identify ATS vendors from company career pages:

### Detection Order (first match wins)

| Step | Method | Confidence | Description |
|------|--------|------------|-------------|
| 1 | Page Detection | 85-95% | URL patterns, DOM selectors, HTML/script patterns |
| 2 | Greenhouse API Probe | 75% | Try company name variations as Greenhouse slug |
| 3 | Deep Crawl | varies | Follow job-like links to find hidden ATS (optional) |
| 4 | Keyword Match | 65% | Detect "comeet" keyword for manual review |

### Supported ATS Vendors

| Vendor | Detection Methods | Slug Extraction |
|--------|-------------------|-----------------|
| Greenhouse | URL, DOM, script patterns | Board slug from URL/embed code |
| Comeet | URL, DOM, script patterns | Company UID + token |
| Lever | URL patterns | Company slug |
| Workable | URL patterns | Company slug |

### CLI Flags

| Flag | Description |
|------|-------------|
| (none) | Process new companies only (`ats_checked_at IS NULL`) |
| `--recheck` | Re-check companies that were checked but have no job_source |
| `--force` | Process new + failed companies |
| `--recheck --force` | Full re-run on all companies |
| `--deep-crawl` | Enable deep crawling for hidden ATS (slower) |
| `-c, --company <name>` | Test single company by name |

### Deep Crawl

Some companies hide their ATS behind navigation (e.g., `/careers/` → `/careers/location/israel/` → `/careers/position/123/`).

Deep crawl:
- Follows job-like links up to 2 levels deep
- Excludes header/footer/nav links
- Excludes social media domains
- Also follows links to known ATS domains (greenhouse.io, lever.co, etc.)

---

## API Endpoints

### Auth Endpoints (`/api/auth`)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/register` | POST | No | Create account, send verification email |
| `/login` | POST | No | Login → access + refresh tokens |
| `/refresh` | POST | No | Exchange refresh → new tokens |
| `/logout` | POST | Yes | Revoke refresh token |
| `/verify-email` | GET | No | Verify email via token |
| `/forgot-password` | POST | No | Send password reset email |
| `/reset-password` | POST | No | Reset password with token |
| `/resend-verification` | POST | No | Resend verification email |
| `/me` | GET | Yes | Get current user info |

### Jobs Endpoints (`/api/jobs`)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/` | GET | No | List jobs (paginated, filterable) |
| `/:id` | GET | No | Get job details |

### Match Endpoints (`/api/match`)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/` | POST | Yes | Match profile text → ranked jobs |

### Profile Endpoints (`/api/profile`)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/` | GET | Yes | Get user profile text |
| `/` | POST | Yes | Save/update profile text |
| `/` | DELETE | Yes | Delete profile text |

### Favorites Endpoints (`/api/favorites`)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/` | GET | Yes | Get all favorites with job details |
| `/:jobId` | GET | Yes | Check if job is favorited |
| `/:jobId` | POST | Yes | Add job to favorites |
| `/:jobId` | DELETE | Yes | Remove job from favorites |

---

## Python ML Service Endpoints (port 8000)

### Embedding Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check + model info |
| `/api/embed` | POST | Embed multiple texts (batch) |
| `/api/embed/single` | POST | Embed single text |

### Chunking Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chunk/job` | POST | Job chunking + skills + embeddings |
| `/api/chunk/profile` | POST | Profile chunking + feedback + score |

### Job Chunk Request

```json
{
  "text": "We are looking for a Python developer...",
  "title": "Senior Python Developer",
  "company": "TechCorp",
  "location": "Tel Aviv"
}
```

### Job Chunk Response

```json
{
  "chunks": [
    {
      "type": "header",
      "text": "Senior Python Developer - TechCorp - Tel Aviv",
      "embedding": [0.012, -0.034, ...],
      "token_count": 8
    },
    {
      "type": "requirements",
      "text": "5+ years Python experience...",
      "embedding": [...],
      "token_count": 45
    }
  ],
  "skills": [
    {"skill": "Python", "level": "mandatory"},
    {"skill": "Docker", "level": "preferred"}
  ],
  "model": "BAAI/bge-base-en-v1.5",
  "dimension": 768,
  "time_ms": 234
}
```

### Profile Chunk Request

```json
{
  "text": "Senior Software Engineer with 5 years experience..."
}
```

### Profile Chunk Response

```json
{
  "chunks": [
    {
      "type": "full",
      "text": "Senior Software Engineer...",
      "embedding": [...],
      "token_count": 150
    },
    {
      "type": "experience",
      "text": "Software Engineer at Google...",
      "embedding": [...],
      "token_count": 80
    }
  ],
  "skills": [
    {"skill": "Python", "source": "throughout"},
    {"skill": "AWS", "source": "throughout"}
  ],
  "feedback": [
    "✅ Work experience well documented",
    "✅ Uses strong action verbs",
    "❌ Few skills detected - add technical skills"
  ],
  "completeness_score": 0.75,
  "model": "BAAI/bge-base-en-v1.5",
  "dimension": 768,
  "time_ms": 1351
}
```

### Text Types (Important for BGE)

| text_type | Use for | Prefix added |
|-----------|---------|--------------|
| `passage` | Job descriptions, stored in DB | None |
| `query` | User profile at search time | "Represent this sentence..." |

---

## Skill Extraction

### NER Model

**Model:** `feliponi/hirly-ner-multi`

| Entity Type | Description |
|-------------|-------------|
| SKILL | Technical skills (Python, AWS, React) |
| SOFT_SKILL | Soft skills (leadership, communication) |
| LANG | Languages (English, Hebrew) |
| CERT | Certifications (AWS Certified) |
| EXPERIENCE_DURATION | Years of experience (5+ years) |

### Keyword Fallback

Supplements NER for commonly missed skills:

```
Programming: Python, Java, JavaScript, TypeScript, Go, Rust, C++...
Cloud/DevOps: AWS, GCP, Azure, Docker, Kubernetes, Terraform...
Frontend: React, Angular, Vue, Next.js, Tailwind...
Backend: Node.js, Django, FastAPI, Spring, Rails...
Databases: PostgreSQL, MongoDB, Redis, Elasticsearch...
Data/ML: TensorFlow, PyTorch, Pandas, Spark...
Tools: Git, GraphQL, Kafka, Microservices...
```

### Level Detection

Analyzes sentence context to classify skill requirements:

| Level | Patterns |
|-------|----------|
| `mandatory` | "requirements", "must have", "required", "essential", "qualifications" |
| `preferred` | "nice to have", "preferred", "bonus", "ideally", "plus", "advantage" |
| `unknown` | No pattern match found |

---

## Database Schema

### Core Tables

```sql
companies (id, company_name, normalized_name, company_website_url, careers_page_url, ats_checked_at, tags[], ...)
job_sources (id, company_id, source_type, base_url, ats_identifier, api_token, detection_method, confidence, status, ...)
jobs (id, company_id, title, location, description, requirements, canonical_url, ...)
job_chunks (id, job_id, chunk_index, section_type, content, ...)
job_embeddings (id, job_chunk_id, embedding vector(768), model_name, ...)
job_embeddings_simple (id, job_id, embedding vector(768), ...)
```

### Auth Tables

```sql
users (id, firebase_uid, email, display_name, profile_text, password_hash, email_verified, ...)
refresh_tokens (id, user_id, token_hash, expires_at, revoked_at, ...)
verification_tokens (id, user_id, token_hash, expires_at, used_at, ...)
password_reset_tokens (id, user_id, token_hash, expires_at, used_at, ...)
rate_limits (id, key, attempts, window_start)
favorites (id, user_id, job_id, created_at)
```

### Future Tables (schema exists)

```sql
profile_chunks (id, user_id, chunk_index, section_type, content, ...)
profile_embeddings (id, profile_chunk_id, embedding vector(768), ...)
generated_resumes (id, user_id, job_id, content, ...)
```

---

## Auth Flow

### Registration
```
User → POST /register → Create user → Generate verification token 
     → Send email via Resend → User clicks link → GET /verify-email 
     → Mark email_verified = true
```

### Login
```
User → POST /login → Verify password → Check email_verified 
     → Generate access token (JWT, 1h) + refresh token (30d) 
     → Store refresh token hash in DB → Return tokens
```

### Token Refresh
```
User → POST /refresh → Validate refresh token → Revoke old token 
     → Generate new token pair → Return new tokens
```

### Protected Request
```
User → Request + Authorization: Bearer <access_token> 
     → authMiddleware validates JWT → Extract userId → Process request
```

---

## Security

### Password Requirements
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 digit
- At least 1 special character

### Rate Limiting

| Action | Limit |
|--------|-------|
| Login | 5 attempts / 15 min / IP |
| Register | 3 attempts / 60 min / IP |
| Forgot Password | 3 attempts / 60 min / email |

### Token Expiry

| Token | Expiry |
|-------|--------|
| Access Token (JWT) | 1 hour |
| Refresh Token | 30 days |
| Verification Link | 24 hours |
| Password Reset Link | 1 hour |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| API | Express 5, TypeScript |
| ML Service | FastAPI, Python 3.11 |
| Auth | JWT (jsonwebtoken), bcrypt |
| Embeddings | sentence-transformers, BGE-base-en-v1.5 |
| Skill Extraction | transformers, feliponi/hirly-ner-multi |
| CV Generation | Anthropic Claude 3 Haiku |
| Database | PostgreSQL 17, pgvector |
| Email | Resend API |
| Scraping | Playwright |
| Frontend | React 19, Vite (scaffolded) |
| Hosting | Railway (DB + API + ML) |

---

## Environment Variables

### Node.js API
```env
DATABASE_URL=postgresql://...
JWT_SECRET=<32+ char secret>
JWT_REFRESH_SECRET=<32+ char secret>
RESEND_API_KEY=re_xxxxx
FROM_EMAIL=onboarding@resend.dev
FRONTEND_URL=http://localhost:5173
HF_TOKEN=hf_xxxxx
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
