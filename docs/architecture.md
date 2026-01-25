# ApplyLess Architecture

## System Overview (Jan 2026)

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Ingestion     │     │   API Service   │     │   Python ML     │
│   (Node.js)     │     │   (Express)     │     │   (FastAPI)     │
│                 │     │                 │     │                 │
│ CLI commands:   │     │ Endpoints:      │     │ Endpoints:      │
│ • snc ✅        │     │ • /auth/* ✅    │     │ • /health ✅    │
│ • greenhouse ✅ │     │ • /jobs ✅      │     │ • /api/embed ✅ │
│ • comeet ✅     │     │ • /match ✅     │     │                 │
│ • embeddings ✅ │     │ • /profile ✅   │     │ Model:          │
│                 │     │ • /favorites ✅ │     │ BGE-base-en-v1.5│
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │                       │    ┌──────────────────┘
         │                       │    │
         │                       ▼    ▼
         │              ┌─────────────────┐
         │              │  ML Service     │
         │              │  (embeddings)   │
         │              └────────┬────────┘
         │                       │
         └───────────┬───────────┘
                     ▼
         ┌─────────────────────────┐
         │  PostgreSQL + pgvector  │
         │  Railway                │
         │                         │
         │  • companies: 1007      │
         │  • job_sources: 176     │
         │  • jobs: 111            │
         │  • job_embeddings: 111  │
         │  • users ✅             │
         │  • auth tokens ✅       │
         │  • favorites ✅         │
         └─────────────────────────┘
                     │
                     ▼
         ┌─────────────────────────┐
         │        Resend           │
         │      (Email API)        │
         └─────────────────────────┘
```

---

## Data Flow

### Embedding Generation (Ingestion → ML Service → DB)
```
Ingestion CLI → embedding-client.ts → POST /api/embed → ML Service
                                                            │
                                                            ▼
                                                     BGE-base-en-v1.5
                                                            │
                                                            ▼
                                                     768d vectors
                                                            │
                     ┌──────────────────────────────────────┘
                     ▼
              job_embeddings_simple table
```

### Profile Matching (API → ML Service → DB)
```
User profile text → POST /api/match → match-service.ts → ML Service
                                                             │
                                                             ▼
                                                      768d query vector
                                                             │
                     ┌───────────────────────────────────────┘
                     ▼
              pgvector cosine similarity search
                     │
                     ▼
              Ranked job results
```

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

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check + model info |
| `/api/embed` | POST | Embed multiple texts (batch) |
| `/api/embed/single` | POST | Embed single text |

### Embed Request

```json
{
  "texts": ["Python developer...", "Java engineer..."],
  "text_type": "passage",
  "normalize": true
}
```

### Text Types (Important for BGE)

| text_type | Use for | Prefix added |
|-----------|---------|--------------|
| `passage` | Job descriptions, stored in DB | None |
| `query` | User profile at search time | "Represent this sentence..." |

---

## Database Schema

### Core Tables

```sql
companies (id, company_name, normalized_name, company_website_url, tags[], ...)
job_sources (id, company_id, source_type, base_url, status, ...)
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
MODEL_NAME=BAAI/bge-base-en-v1.5
MODEL_CACHE_DIR=./model_cache
HOST=0.0.0.0
PORT=8000
```