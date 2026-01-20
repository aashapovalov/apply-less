# ApplyLess

**AI-powered job search assistant for Israel hi-tech candidates.**

ApplyLess automatically ingests job postings from company career pages and ATS systems, and uses semantic matching to recommend relevant jobs based on your profile.

---

## 🎯 Current Status

**Phase: Data Collection Complete → Moving to Embeddings**

| Component | Status | Details |
|-----------|--------|---------|
| Database | ✅ Deployed | Railway PostgreSQL + pgvector |
| Companies | ✅ 1007 | Scraped from SNC |
| Job Sources | ✅ 176 | Career pages detected |
| Jobs | ✅ 111 | From Greenhouse API |
| Embeddings | 🔄 Next | Generate vectors for matching |
| Matching API | ⏳ Planned | Vector similarity search |
| Frontend | ⏳ Planned | Job browser + recommendations |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         APPLY-LESS                          │
└─────────────────────────────────────────────────────────────┘

┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   Ingestion      │     │   API Service    │     │   Frontend       │
│   (Node.js)      │     │   (Node.js)      │     │   (React)        │
│                  │     │                  │     │                  │
│ • SNC Scraping   │     │ • Job search     │     │ • Job browser    │
│ • Greenhouse API │     │ • Matching       │     │ • Recommendations│
│ • Comeet API     │     │ • Favorites      │     │ • Favorites      │
└────────┬─────────┘     └────────┬─────────┘     └──────────────────┘
         │                        │
         │         ┌──────────────┴──────────────┐
         │         │                             │
         ▼         ▼                             ▼
┌─────────────────────────────────────────────────────────────┐
│  PostgreSQL + pgvector (Railway)                            │
│                                                             │
│  Tables: companies, job_sources, jobs, job_embeddings,      │
│          users, user_profiles, favorites, generated_resumes │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 Project Structure

```
apply-less/
├── packages/
│   ├── ingestion/          # Job scraping & ingestion
│   │   ├── src/
│   │   │   ├── cli.ts      # CLI entry point
│   │   │   ├── stages/     # Ingestion stages
│   │   │   │   ├── stage-a-snc.ts        # SNC company scraping
│   │   │   │   ├── stage-d-greenhouse.ts # Greenhouse jobs
│   │   │   │   ├── stage-e-comeet.ts     # Comeet API jobs
│   │   │   │   └── stage-comeet-unified.ts # Comeet widget scraping
│   │   │   ├── clients/    # API clients
│   │   │   ├── services/   # Database services
│   │   │   └── parsers/    # HTML parsers
│   │   └── package.json
│   │
│   ├── api/                # Backend API (planned)
│   ├── web/                # React frontend (planned)
│   └── ml-service/         # Python ML service (planned)
│
├── db/
│   └── migrations/         # SQL migrations
│       ├── 001_initial_schema.sql
│       ├── 002_add_embeddings.sql
│       ├── 003_add_user_tables.sql
│       ├── 004_add_indexes.sql
│       ├── 005_add_company_details.sql
│       └── 006_increase_location_length.sql
│
├── docs/                   # Documentation
├── scripts/                # Utility scripts
└── docker-compose.yml      # Local development (optional)
```

---

## 🚀 Deployment

The project is deployed on **Railway**:

- **Database**: PostgreSQL 17 with pgvector extension
- **Ingestion**: Node.js service (on-demand)
- **API**: (planned)
- **Frontend**: (planned)

### Environment Variables

```env
DATABASE_URL=postgresql://user:pass@host:port/database
NODE_ENV=production
```

---

## 💻 Local Development

### Prerequisites

- Node.js 20+
- npm
- Railway CLI (`npm install -g @railway/cli`)

### Setup

```bash
# Clone repository
git clone https://github.com/aashapovalov/apply-less.git
cd apply-less

# Install dependencies
npm install

# Login to Railway (connects to production database)
railway login
railway link

# Run commands using Railway's environment
railway run npm run start --workspace=packages/ingestion -- greenhouse
```

### Using Local Database (Optional)

If you prefer local development with Docker:

```bash
# Start PostgreSQL with pgvector
docker compose up -d postgres

# Set local DATABASE_URL in .env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/applyless

# Run migrations
npm run db:migrate
```

---

## 📊 Data Sources

### Currently Working

| Source | Type | Companies | Jobs |
|--------|------|-----------|------|
| Greenhouse API | Public API | 4 | ~111 |
| Comeet API | Token-based | 2 | ~20-50 |

### Partially Working

| Source | Issue | Fix |
|--------|-------|-----|
| SNC Scraping | 429 Rate Limit | Wait or use VPN |
| Comeet Widget | Needs Playwright | Stage F implementation |

### ATS Detection

Companies are categorized by their career page type:
- `greenhouse` - Greenhouse boards API
- `comeet` - Comeet careers API
- `careers_html` - Custom HTML career pages
- `linkedin` - LinkedIn jobs (not scrapeable)

---

## 🔧 CLI Commands

```bash
# SNC company scraping (Stage A)
railway run npm run start --workspace=packages/ingestion -- snc --delay 15000

# Greenhouse job ingestion (Stage D)
railway run npm run start --workspace=packages/ingestion -- greenhouse

# Comeet job ingestion (Stage E)
railway run npm run start --workspace=packages/ingestion -- comeet

# Dry run (preview without writing to DB)
railway run npm run start --workspace=packages/ingestion -- greenhouse --dry-run
```

---

## 📈 Progress

### ✅ Completed

- [x] Project setup & monorepo structure
- [x] Database schema with pgvector
- [x] Railway deployment (PostgreSQL + pgvector)
- [x] SNC company scraping (1007 companies)
- [x] Career page detection (176 sources)
- [x] Greenhouse API integration (111 jobs)
- [x] Comeet API integration (partial)
- [x] Data migration to Railway

### 🔄 In Progress

- [ ] **Embeddings generation** ← Current focus
- [ ] Vector similarity matching

### ⏳ Planned

- [ ] Matching API endpoints
- [ ] User profile & preferences
- [ ] React frontend
- [ ] Resume generation

---

## 📚 Documentation

- [Architecture](docs/architecture.md) - System design
- [Monorepo Structure](docs/monorepo-structure.md) - Package layout
- [Implementation Plan](docs/plan.md) - Original 14-day plan

---

## 🛠️ Tech Stack

**Backend:**
- Node.js + TypeScript
- PostgreSQL + pgvector
- Playwright (for scraping)

**Frontend (planned):**
- React + Vite
- TailwindCSS

**ML (planned):**
- Python + FastAPI
- Sentence Transformers
- OpenAI API (for explanations)

**Infrastructure:**
- Railway (hosting)
- GitHub (CI/CD)

---

## 📝 License

MIT