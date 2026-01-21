# ApplyLess Implementation Plan v2

## Timeline Overview

**Demo Day: February 3, 2026**
**Today: January 21, 2026**
**Days remaining: 13 days**
**Video prep buffer: 2 days (Feb 1-2)**
**Working days for development: 11 days**

---

## Vision

Build a job matching platform that:
1. **Scales to thousands of jobs** via automated daily ingestion
2. **Uses advanced ML** with Python + HuggingFace transformers (local control)
3. **Generates tailored CVs** for favorite jobs
4. **Simple but functional UI** - focus on core features

---

## Current Status (Jan 21)

### ✅ Completed

| Component | Status | Details |
|-----------|--------|---------|
| Database | ✅ | Railway PostgreSQL + pgvector |
| Companies | ✅ | 1007 from SNC |
| Job Sources | ✅ | 176 detected |
| Jobs | ✅ | 111 from Greenhouse |
| Embeddings | ✅ | 111 jobs (single, BGE 768d via API) |
| API | ✅ | GET /jobs, POST /match |

### 🎯 Goals for Demo

| Goal | Target |
|------|--------|
| Jobs in database | 2000+ |
| ML Service | Python + HuggingFace local |
| Matching accuracy | High (chunked embeddings) |
| CV generation | Working for favorites |
| Auth | JWT with refresh tokens |
| UI | Simple, functional |

---

## Technical Architecture (Final)

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │     │   Node.js API   │     │   Python ML     │
│   (React)       │────▶│   (Express)     │────▶│   (FastAPI)     │
│   Vercel        │     │   Railway       │     │   Railway/Modal │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        │                       │                       │
        │                       ▼                       ▼
        │               ┌─────────────────┐     ┌─────────────────┐
        │               │   PostgreSQL    │     │   HuggingFace   │
        │               │   + pgvector    │     │   Transformers  │
        │               │   Railway       │     │   (Local Model) │
        │               └─────────────────┘     └─────────────────┘
        │
        └──────────────────────┐
                               ▼
                        ┌─────────────────┐
                        │   Ingestion     │
                        │   (Node.js)     │
                        │   Scheduler     │
                        └─────────────────┘
```

### Python ML Service Responsibilities

```
packages/ml-service/
├── main.py                 # FastAPI app
├── api/
│   ├── embed.py           # POST /embed - generate embeddings
│   ├── chunk.py           # POST /chunk - chunk text into sections
│   └── generate.py        # POST /generate-cv - generate CV
├── services/
│   ├── embedding_service.py    # HuggingFace sentence-transformers
│   ├── chunking_service.py     # Text chunking logic
│   └── cv_generator.py         # LLM-based CV generation
├── models/
│   └── e5_model.py        # Load & cache E5/BGE model
└── requirements.txt
```

### ML Service Endpoints

```
POST /embed
  Body: { texts: ["text1", "text2"], prefix: "passage" }
  Returns: { embeddings: [[0.1, ...], [0.2, ...]] }

POST /chunk
  Body: { text: "Full job description...", type: "job" }
  Returns: { chunks: [{ type: "requirements", content: "..." }, ...] }

POST /generate-cv
  Body: { profile: "...", job: "...", style: "professional" }
  Returns: { cv: "Generated CV content..." }

GET /health
  Returns: { status: "ok", model_loaded: true }
```

---

## Revised Roadmap

### Phase 1: Backend Foundation (Days 7-9)

#### Day 7 (Jan 22): JWT Authentication + Python ML Setup

**Morning: JWT Auth**
- [ ] Create auth tables (users, refresh_tokens)
- [ ] Implement POST /api/auth/register
- [ ] Implement POST /api/auth/login → access + refresh tokens
- [ ] Implement POST /api/auth/refresh
- [ ] Create auth middleware

**Afternoon: Python ML Service**
- [ ] Set up FastAPI project structure
- [ ] Implement /health endpoint
- [ ] Load BGE/E5 model with sentence-transformers
- [ ] Implement POST /embed endpoint
- [ ] Test embedding generation locally

**Definition of Done:**
- JWT auth working
- Python ML service running locally
- Can generate embeddings via Python

---

#### Day 8 (Jan 23): Profile API + Text Chunking

**Morning: Profile & Favorites API**
- [ ] Implement POST /api/profile
- [ ] Implement GET /api/profile
- [ ] Implement favorites CRUD

**Afternoon: Text Chunking Service**
- [ ] Implement POST /chunk in Python ML service
- [ ] Job chunking: title, requirements, responsibilities, benefits
- [ ] Profile chunking: summary, experience, skills, education
- [ ] Use regex + heuristics (or small LLM)

**Definition of Done:**
- Profile API working
- Text chunking working for jobs and profiles

---

#### Day 9 (Jan 24): Chunked Embeddings Pipeline

**Goal:** Better matching using chunked embeddings

**Tasks:**
- [ ] Create job_chunks table
- [ ] Create profile_chunks table  
- [ ] Batch process existing 111 jobs → chunks → embeddings
- [ ] Update Node.js API to call Python ML service
- [ ] Implement improved matching algorithm
- [ ] Test matching quality

**Improved Matching:**
```python
def match_profile_to_job(profile_chunks, job_chunks):
    scores = []
    for p_chunk in profile_chunks:
        for j_chunk in job_chunks:
            similarity = cosine_similarity(p_chunk.embedding, j_chunk.embedding)
            weight = get_weight(p_chunk.type, j_chunk.type)
            scores.append(similarity * weight)
    return aggregate_score(scores)
```

**Definition of Done:**
- All jobs have chunked embeddings
- Matching uses chunk-level similarity
- Better match quality than single embeddings

---

### Phase 2: Scaled Ingestion (Days 10-11)

#### Day 10 (Jan 25): Ingestion Infrastructure

**Tasks:**
- [ ] Create ingestion scheduler (cron or Railway scheduled job)
- [ ] Implement SNC incremental scraper (50 companies/day)
- [ ] Implement ATS detector:
  - Fetch company careers page
  - Detect Greenhouse/Comeet/Lever patterns
  - Update job_sources
- [ ] Integrate with Python ML for embeddings

**Definition of Done:**
- ATS detection working
- New job sources discovered automatically

---

#### Day 11 (Jan 26): Mass Job Ingestion

**Tasks:**
- [ ] Run Greenhouse for all detected companies
- [ ] Implement Comeet scraper (Playwright)
- [ ] Chunk all new jobs
- [ ] Generate embeddings via Python ML service
- [ ] Target: 2000+ jobs

**Definition of Done:**
- 2000+ jobs in database
- All jobs have chunked embeddings

---

### Phase 3: CV Generation (Day 12)

#### Day 12 (Jan 27): CV Generation in Python

**Tasks:**
- [ ] Implement POST /generate-cv in Python ML service
- [ ] Use OpenAI API or local LLM (Mistral/Llama)
- [ ] CV generation prompt engineering
- [ ] Implement /api/cv endpoints in Node.js
- [ ] Store generated CVs

**CV Generation Options:**
```
Option A: OpenAI GPT-4 (~$0.01/CV) - Best quality
Option B: Mistral API (~$0.001/CV) - Good quality, cheaper
Option C: Local Llama 3 (free) - Requires GPU
```

**Definition of Done:**
- Can generate tailored CV for any job
- CV uses profile + job description

---

### Phase 4: Simple Frontend (Days 13-14)

#### Day 13 (Jan 28): Core UI

**Tasks:**
- [ ] Login/Register pages
- [ ] Jobs list (paginated)
- [ ] Match page (paste profile → results)
- [ ] Basic navigation

**Definition of Done:**
- Core pages working
- API integration complete

---

#### Day 14 (Jan 29): Favorites + CV UI

**Tasks:**
- [ ] Favorites page
- [ ] Generate CV button
- [ ] CV preview/download
- [ ] Loading states
- [ ] Basic styling

**Definition of Done:**
- Full flow: Register → Match → Favorite → Generate CV

---

### Phase 5: Deploy & Demo (Days 15-17)

#### Day 15 (Jan 30): Deployment

**Tasks:**
- [ ] Deploy Node.js API to Railway
- [ ] Deploy Python ML to Railway (or Modal for GPU)
- [ ] Deploy Frontend to Vercel
- [ ] Run final ingestion

---

#### Days 16-17 (Jan 31 - Feb 2): Demo Prep

**Tasks:**
- [ ] Fix bugs
- [ ] Record demo video
- [ ] Prepare slides

---

### Feb 3: Demo Day 🎉

---

## Python ML Service Details

### Model Selection

| Model | Dimensions | Quality | Speed |
|-------|-----------|---------|-------|
| BAAI/bge-base-en-v1.5 | 768 | Excellent | Fast |
| intfloat/e5-base-v2 | 768 | Excellent | Fast |
| sentence-transformers/all-mpnet-base-v2 | 768 | Good | Fast |

**Recommendation:** Stick with BGE-base for consistency

### Deployment Options

| Option | GPU | Cost | Latency |
|--------|-----|------|---------|
| Railway (CPU) | No | $5-10/mo | ~500ms |
| Modal (GPU) | Yes | Pay per use | ~100ms |
| Replicate | Yes | Pay per use | ~200ms |
| Local (demo) | MPS/CPU | Free | ~200ms |

**Recommendation:** Start local, deploy to Railway CPU (fast enough for embeddings)

### requirements.txt

```
fastapi==0.109.0
uvicorn==0.27.0
sentence-transformers==2.3.1
torch==2.1.2
numpy==1.26.3
pydantic==2.5.3
python-dotenv==1.0.0
openai==1.10.0  # for CV generation
psycopg2-binary==2.9.9  # if direct DB access needed
```

---

## Database Schema Updates

```sql
-- New tables for chunking
CREATE TABLE job_chunks (
    id SERIAL PRIMARY KEY,
    job_id INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
    chunk_type VARCHAR(50) NOT NULL,  -- 'title', 'requirements', 'responsibilities', 'benefits'
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE job_chunk_embeddings (
    id SERIAL PRIMARY KEY,
    job_chunk_id INTEGER REFERENCES job_chunks(id) ON DELETE CASCADE,
    embedding vector(768) NOT NULL,
    model_name VARCHAR(100) DEFAULT 'bge-base-en-v1.5',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE profile_chunks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    chunk_type VARCHAR(50) NOT NULL,  -- 'summary', 'experience', 'skills', 'education'
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE profile_chunk_embeddings (
    id SERIAL PRIMARY KEY,
    profile_chunk_id INTEGER REFERENCES profile_chunks(id) ON DELETE CASCADE,
    embedding vector(768) NOT NULL,
    model_name VARCHAR(100) DEFAULT 'bge-base-en-v1.5',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE generated_cvs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    job_id INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## API Flow

### Matching Flow (with Python ML)

```
1. User pastes profile
2. Node.js API → Python ML: POST /chunk { text, type: "profile" }
3. Python ML → chunks
4. Node.js API → Python ML: POST /embed { texts: chunks }
5. Python ML → embeddings
6. Node.js API → PostgreSQL: vector similarity search
7. Return ranked jobs
```

### CV Generation Flow

```
1. User clicks "Generate CV" on favorite job
2. Node.js API → Python ML: POST /generate-cv { profile, job }
3. Python ML → OpenAI/LLM → Generated CV
4. Node.js API → PostgreSQL: Store CV
5. Return CV to user
```

---

## Budget Estimate

| Service | Cost |
|---------|------|
| Railway (DB + API + ML) | $5-15/month |
| Vercel (Frontend) | $0 |
| OpenAI (CV Gen, ~100 CVs) | $1-5 |
| **Total** | **$10-20** |

---

## Success Criteria for Demo

- [ ] 2000+ jobs in database
- [ ] Custom JWT auth working
- [ ] Python ML service with local model
- [ ] Chunked embeddings for jobs + profiles
- [ ] Improved matching quality
- [ ] CV generation for favorites
- [ ] Simple functional UI
- [ ] Deployed to production
- [ ] No crashes during demo
