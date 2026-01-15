┌─────────────────────────────────────────────────────────────────┐
│                        APPLY-LESS SYSTEM                        │
└─────────────────────────────────────────────────────────────────┘

LOCAL DEVELOPMENT ARCHITECTURE:

┌──────────────────┐
│   Web Browser    │
│   (React UI)     │
└────────┬─────────┘
│ HTTP
│
┌────▼─────────────────────────────────────────────────────┐
│  Node.js API Server (Port 3001)                          │
│  - Express + TypeScript                                  │
│  - Firebase Auth token verification                      │
│  - REST endpoints for jobs, favorites, resumes           │
│  - Calls Python ML service via HTTP                      │
└───┬──────────────────────────┬─────────────────────────┬─┘
    │                          │                         │
    │ SQL                      │ HTTP                    │
    │                          │                         │
┌───▼───────────┐         ┌────▼───────────────┐         │
│  + pgvector   │         │  (Port 5001)       │         │
│  (Port 5432)  │         │  - FastAPI         │         │
│               │         │  - Embeddings API  │         │
│  Tables:      │         │  - LLM API calls   │         │
│  - companies  │         │  - Caching layer   │         │
│  - jobs       │◄────────┤                    │         │
│  - embeddings │  SQL    └────────────────────┘         │
│  - users      │                                        │
│  - favorites  │                                        │
│  - resumes    │                                        │
└───────────────┘                                        │
     ▲                                                   │
     │ SQL                                               │
     │                                                   │
┌────┴──────────────────────────────────────────┐        │
│  Ingestion Worker (Node.js TypeScript)        │        │
│  - CLI tool + cron scheduler                  │        │
│  - Stage A: SNC company registry ingestion    │        │
│  - Stage B: Career page discovery             │        │
│  - Stage C: Job posting ingestion             │        │
│  - Stage D: Greenhouse ATS integration        │        │
└───────────────────────────────────────────────┘        │
    ▲                                                    │
    │ (also calls Python ML for embeddings)              │
    └────────────────────────────────────────────────────┘

EXTERNAL DEPENDENCIES:
- Firebase Auth (cloud service)
- Startup Nation Central API (authenticated)
- Open-source LLM API (e.g., Hugging Face Inference API, Together AI)
- Open-source Embeddings API (e.g., sentence-transformers via API)