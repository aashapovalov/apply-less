# ApplyLess

ApplyLess is a personal job-search assistant for Israel hi-tech candidates.

The system ingests job postings directly from company career pages and ATS systems, stores them in a structured PostgreSQL database, and uses embeddings + LLMs to:
- recommend relevant jobs
- explain why a role matches your profile
- generate tailored resume versions per job

This repository is structured as a **monorepo** with separate services for ingestion, API, web UI, and ML orchestration.

---

## Prerequisites

Make sure the following tools are installed before starting:

### Required

- **Node.js 20+**
```bash
  node --version
```

- **npm**
```bash
  npm --version
```

- **Docker Desktop** (must be running)
```bash
  docker --version
  docker compose version
```

- **Git**
```bash
  git --version
```

### Optional (recommended)

- PostgreSQL client (e.g. DBeaver, TablePlus, pgAdmin) for database inspection
- Python 3.11+ (required later for the ML service)

---

## Installation

Clone the repository and install dependencies:
```bash
git clone 
cd apply-less
npm install
```

This installs dependencies for:
- `packages/api` — Node.js API
- `packages/ingestion` — ingestion worker
- `packages/web` — React frontend
- root tooling and scripts

---

## Environment Variables

Create a root `.env` file:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/applyless
```

> **Note**: This URL must match the credentials and port used by Docker Postgres.

---

## Database (Postgres + pgvector)

PostgreSQL runs locally via Docker and includes the `pgvector` extension.

### Start Postgres
```bash
docker compose up -d postgres
```

Check container status:
```bash
docker compose ps
```

### Running Database Migrations

Database schema is managed via a Node-based migration runner.

Run migrations:
```bash
npm run db:migrate
```

**Expected behavior:**
- All migrations in `db/migrations` are executed in order
- Applied migrations are tracked in the `schema_migrations` table
- Re-running the command is safe (already-applied migrations are skipped)

### Verifying the Database (Optional)

**List all tables:**
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

**Count tables:**
```sql
SELECT COUNT(*)
FROM information_schema.tables
WHERE table_schema = 'public';
```

**Verify pgvector extension:**
```sql
SELECT extname, extversion
FROM pg_extension
WHERE extname = 'vector';
```

---

## Development Workflow (Local)

Typical local development flow:
```bash
# Start database
docker compose up -d postgres

# Apply schema
npm run db:migrate

# Run all services (API + Web + ML service)
npm run dev
```

You can also run services individually:
```bash
npm run dev:api
npm run dev:web
npm run dev:ml
```

---

## Project Structure
```
packages/
  api/           # Node.js Express API
  ingestion/     # Job ingestion worker
  web/           # React frontend (Vite)
  ml-service/    # Python FastAPI ML service
  shared/        # Shared TypeScript types
scripts/
  migrate.ts     # Database migration runner
db/
  migrations/    # SQL migrations
docs/            # Documentation
```

---

## Notes

- **Docker** is used only to run Postgres, not to manage schema changes.
- All schema evolution happens via migrations in `db/migrations`.
- Do not rely on Docker init scripts (`/docker-entrypoint-initdb.d`) for ongoing schema updates.

---

## Status

🚧 **Active development**

**Current focus:**
- ingestion pipeline
- database schema
- migration stability

User-facing features will be built after ingestion and storage are complete.

---

## Next Steps

After completing Day 1 setup:
1. **Day 2**: SNC API integration for company ingestion
2. **Day 3**: Career page discovery
3. **Day 4**: Job parsing and storage
4. **Day 5**: Greenhouse ATS integration

See `docs/` for detailed implementation plans.