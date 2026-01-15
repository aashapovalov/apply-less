apply-less/
├── README.md
├── package.json (root workspace)
├── .gitignore
├── .env.example
├── docker-compose.yml (Postgres + pgvector)
│
├── packages/
│   ├── api/                          # Node.js Express API
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts              # Server entry
│   │   │   ├── config/
│   │   │   │   ├── firebase.ts       # Firebase Admin SDK
│   │   │   │   └── db.ts             # Postgres connection pool
│   │   │   ├── middleware/
│   │   │   │   └── auth.ts           # Firebase token verification
│   │   │   ├── routes/
│   │   │   │   ├── jobs.ts
│   │   │   │   ├── favorites.ts
│   │   │   │   ├── resumes.ts
│   │   │   │   └── recommendations.ts
│   │   │   ├── services/
│   │   │   │   ├── mlService.ts      # HTTP client for Python ML
│   │   │   │   ├── jobService.ts
│   │   │   │   ├── favoriteService.ts
│   │   │   │   └── resumeService.ts
│   │   │   └── types/
│   │   │       └── index.ts
│   │   └── .env
│   │
│   ├── ingestion/                    # Node.js ingestion worker
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── cli.ts                # CLI entry point
│   │   │   ├── scheduler.ts          # Cron scheduler
│   │   │   ├── stages/
│   │   │   │   ├── stageA-snc.ts     # SNC company ingestion
│   │   │   │   ├── stageB-careers.ts # Career page discovery
│   │   │   │   ├── stageC-jobs.ts    # Job parsing from careers
│   │   │   │   └── stageD-greenhouse.ts # Greenhouse ATS
│   │   │   ├── parsers/
│   │   │   │   ├── careerPageParser.ts
│   │   │   │   ├── greenhouseParser.ts
│   │   │   │   └── jobNormalizer.ts
│   │   │   ├── detectors/
│   │   │   │   └── atsDetector.ts
│   │   │   ├── clients/
│   │   │   │   ├── sncClient.ts      # SNC API with refresh tokens
│   │   │   │   ├── httpClient.ts     # Generic HTTP with retries
│   │   │   │   └── mlClient.ts       # Call Python ML service
│   │   │   ├── services/
│   │   │   │   ├── companyService.ts
│   │   │   │   ├── jobService.ts
│   │   │   │   └── deduplicationService.ts
│   │   │   ├── utils/
│   │   │   │   ├── logger.ts
│   │   │   │   ├── retry.ts
│   │   │   │   └── urlNormalizer.ts
│   │   │   └── types/
│   │   │       └── index.ts
│   │   └── .env
│   │
│   ├── ml-service/                   # Python FastAPI service
│   │   ├── requirements.txt
│   │   ├── pyproject.toml (optional)
│   │   ├── .env
│   │   ├── main.py                   # FastAPI app entry
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── embed.py              # POST /embed
│   │   │   ├── generate.py           # POST /generate-explanation, /generate-resume
│   │   │   └── health.py             # GET /health
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── embedding_service.py  # External API client
│   │   │   ├── llm_service.py        # External LLM API client
│   │   │   └── cache_service.py      # Simple in-memory cache
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── requests.py           # Pydantic request models
│   │   │   └── responses.py          # Pydantic response models
│   │   ├── config/
│   │   │   ├── __init__.py
│   │   │   └── settings.py           # Load env vars
│   │   └── utils/
│   │       ├── __init__.py
│   │       └── logger.py
│   │
│   ├── web/                          # React frontend
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vite.config.ts
│   │   ├── index.html
│   │   ├── .env
│   │   ├── src/
│   │   │   ├── main.tsx
│   │   │   ├── App.tsx
│   │   │   ├── config/
│   │   │   │   └── firebase.ts       # Firebase client SDK
│   │   │   ├── hooks/
│   │   │   │   ├── useAuth.ts
│   │   │   │   ├── useJobs.ts
│   │   │   │   └── useFavorites.ts
│   │   │   ├── services/
│   │   │   │   └── api.ts            # Axios client for Node API
│   │   │   ├── components/
│   │   │   │   ├── Layout/
│   │   │   │   ├── JobCard/
│   │   │   │   ├── JobList/
│   │   │   │   ├── JobFilters/
│   │   │   │   └── ResumeViewer/
│   │   │   ├── pages/
│   │   │   │   ├── Login.tsx
│   │   │   │   ├── JobsPage.tsx
│   │   │   │   ├── JobDetailPage.tsx
│   │   │   │   ├── FavoritesPage.tsx
│   │   │   │   └── ResumesPage.tsx
│   │   │   ├── types/
│   │   │   │   └── index.ts
│   │   │   └── utils/
│   │   │       └── formatters.ts
│   │   └── public/
│   │
│   └── shared/                       # Shared TypeScript types (optional)
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           └── types.ts              # Shared types between api/ingestion/web
│
├── scripts/
│   ├── setup-db.sh                   # Initialize Postgres + pgvector
│   ├── seed-profile.ts               # Seed user profile (your resume/LinkedIn)
│   └── run-ingestion.sh              # Helper to run ingestion worker
│
├── db/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_add_embeddings.sql
│   │   ├── 003_add_user_tables.sql
│   │   └── 004_add_indexes.sql
│   └── seed/
│       └── profile.json              # Your profile data for seeding
│
└── docs/
├── architecture.md
├── ingestion-flow.md
├── api-contracts.md
└── deployment.md