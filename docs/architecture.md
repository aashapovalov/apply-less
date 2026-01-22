# ApplyLess Architecture

## System Overview (Jan 2026)

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Ingestion     │     │   API Service   │     │   Frontend      │
│   (Node.js)     │     │   (Express)     │     │   (React)       │
│                 │     │                 │     │                 │
│ CLI commands:   │     │ Endpoints:      │     │ Status:         │
│ • snc ✅        │     │ • /auth/* ✅    │     │ 🔲 Scaffolded   │
│ • greenhouse ✅ │     │ • /jobs ✅      │     │                 │
│ • comeet ✅     │     │ • /match ✅     │     │                 │
│ • embeddings ✅ │     │                 │     │                 │
└────────┬────────┘     └────────┬────────┘     └─────────────────┘
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
         └─────────────────────────┘
                     │
         ┌───────────┴───────────┐
         ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│  HuggingFace    │     │     Resend      │
│  BGE-base-en    │     │  (Email API)    │
│  768 dimensions │     │                 │
└─────────────────┘     └─────────────────┘
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
users (id, firebase_uid, email, display_name, password_hash, email_verified, ...)
refresh_tokens (id, user_id, token_hash, expires_at, revoked_at, ...)
verification_tokens (id, user_id, token_hash, expires_at, used_at, ...)
password_reset_tokens (id, user_id, token_hash, expires_at, used_at, ...)
rate_limits (id, key, attempts, window_start)
```

### Future Tables (schema exists)

```sql
profile_chunks (id, user_id, chunk_index, section_type, content, ...)
profile_embeddings (id, profile_chunk_id, embedding vector(768), ...)
favorites (id, user_id, job_id, ...)
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
| Auth | JWT (jsonwebtoken), bcrypt |
| Database | PostgreSQL 17, pgvector |
| Email | Resend API |
| Embeddings | HuggingFace API (BGE-base-en-v1.5) |
| Scraping | Playwright |
| Frontend | React 19, Vite (scaffolded) |
| Hosting | Railway (DB + API) |

---

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://...

# Auth
JWT_SECRET=<32+ char secret>
JWT_REFRESH_SECRET=<32+ char secret>

# Email
RESEND_API_KEY=re_xxxxx
FROM_EMAIL=onboarding@resend.dev
FRONTEND_URL=http://localhost:5173

# Embeddings
HF_TOKEN=hf_xxxxx
```