# ApplyLess Architecture

## Current System (Jan 2026)
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Ingestion     │     │   API Service   │     │   Frontend      │
│   (Node.js)     │     │   (Express)     │     │   (React)       │
│                 │     │                 │     │                 │
│ CLI commands:   │     │ Endpoints:      │     │ Status:         │
│ • snc ✅        │     │ • GET /jobs ✅  │     │ 🔲 Scaffolded   │
│ • greenhouse ✅ │     │ • POST /match ✅│     │                 │
│ • comeet ✅     │     │                 │     │                 │
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
         │  • embeddings: 111      │
         └─────────────────────────┘
                     │
                     ▼
         ┌─────────────────────────┐
         │  HuggingFace API        │
         │  BGE-base-en-v1.5       │
         │  768 dimensions         │
         └─────────────────────────┘
```

## Database Schema

### Core Tables
- `companies` - 1007 from SNC
- `job_sources` - 176 detected career pages
- `jobs` - 111 from Greenhouse
- `job_chunks` - For chunked embeddings
- `job_embeddings` / `job_embeddings_simple` - 768d vectors

### User Tables (schema ready, not used yet)
- `users` - Firebase UID
- `profile_chunks` - Profile sections
- `profile_embeddings` - Profile vectors
- `favorites` - Saved jobs
- `generated_resumes` - Tailored CVs

## API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/health` | GET | No | Health check |
| `/api/jobs` | GET | No | List jobs (paginated) |
| `/api/jobs/:id` | GET | No | Job details |
| `/api/match` | POST | No | Match profile → jobs |

## Ingestion Pipeline

| Stage | Command | Status | Output |
|-------|---------|--------|--------|
| A | `snc` | ✅ | 1007 companies |
| D | `greenhouse` | ✅ | 111 jobs |
| E | `comeet` | ✅ | Working |
| G | `embeddings` | ✅ | 111 embedded |

## Tech Stack

| Layer | Technology |
|-------|------------|
| API | Express 5, TypeScript |
| Database | PostgreSQL 17, pgvector |
| Embeddings | HuggingFace API (BGE-base) |
| Scraping | Playwright |
| Frontend | React 19, Vite, react-router |
| Hosting | Railway (DB + API) |