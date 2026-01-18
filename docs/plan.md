PHASE 3: 14-DAY IMPLEMENTATION PLAN
Day 1: Project Setup & Infrastructure
Tasks:

Create monorepo structure
Set up Docker Compose for Postgres + pgvector
Initialize all package.json files (api, ingestion, ml-service, web)
Set up TypeScript configs
Create database migrations (001, 002, 003, 004)
Run migrations to create schema
Set up Python virtual environment
Install all dependencies
Create .env files from .env.example

Definition of Done:

docker-compose up starts Postgres with pgvector
All packages install without errors
Database schema is created
Can connect to DB from Node

If Behind: Skip web package setup (do Day 8)

Day 2: SNC Integration (Stage A)
Tasks:

Implement SNCClient with OAuth refresh token flow
Implement companyService for DB operations
Implement Stage A ingestion (fetch companies from SNC)
Add deduplication logic for companies
Add logging and retry logic
Create CLI command: npm run ingest:snc

Definition of Done:

Can fetch companies from SNC API
Companies are stored in companies table
Deduplication works (no duplicate companies)
Logs show progress and errors

If Behind: Use manual CSV import as fallback

Day 3: Career Page Discovery (Stage B)
Tasks:

Implement career page discovery heuristics
Implement ATS detector (Greenhouse only)
Implement jobSourceService for DB operations
Test on 10 real companies from DB
Store job_sources in DB

Definition of Done:

Can discover career pages for at least 70% of companies
Greenhouse detection works
job_sources table is populated
False positives < 10%

If Behind: Simplify heuristics (only try common paths)

Day 4: Job Parsing (Stage C)
Tasks:

Implement careerPageParser (HTML parsing)
Implement jobNormalizer (extract structured data)
Implement semantic chunking (extractSections)
Implement jobService with deduplication
Test on 5 real career pages

Definition of Done:

Can parse jobs from career pages
Jobs are stored in jobs table
job_chunks table is populated with semantic sections
Deduplication works

If Behind: Skip semantic chunking (use full description as one chunk)

Day 5: Greenhouse Integration (Stage D)
Tasks:

Implement Greenhouse API client
Implement greenhouseParser
Integrate with existing ingestion pipeline
Test on 3 companies using Greenhouse
Run full ingestion pipeline end-to-end

Definition of Done:

Can fetch jobs from Greenhouse
Jobs are normalized and stored
Full pipeline works: SNC → Discovery → Jobs → Greenhouse
At least 100 jobs in DB

If Behind: Skip Greenhouse (only parse career pages)

Day 6: Python ML Service Setup
Tasks:

Set up FastAPI app structure
Implement /health endpoint
Implement /embed endpoint with Hugging Face API
Implement EmbeddingService with caching
Test embedding generation for sample texts

Definition of Done:

ML service runs on port 5001
/embed endpoint works
Can generate embeddings for text
Caching reduces API calls

If Behind: Skip caching

Day 7: Job Embeddings Generation
Tasks:

Implement mlClient in ingestion worker
Call ML service to generate embeddings for job chunks
Store embeddings in job_embeddings table
Run embeddings for all jobs in DB
Add vector similarity index

Definition of Done:

All job chunks have embeddings
Can query similar jobs using vector similarity
Embedding generation is part of ingestion pipeline

If Behind: Generate embeddings for titles only (skip description chunks)

Day 8: Firebase Auth Setup & User Profile
Tasks:

Create Firebase project
Set up Firebase Admin SDK in Node API
Implement authentication middleware
Create script to seed user profile (your resume)
Implement profile chunking
Generate embeddings for profile chunks

Definition of Done:

Firebase project is live
API verifies Firebase tokens
Your profile is in users table
Profile chunks and embeddings are generated

If Behind: Use hardcoded test user (skip Firebase)

Day 9: Recommendation Service
Tasks:

Implement recommendationService
Implement vector similarity calculation
Implement LLM explanation generation in ML service
Create /api/recommendations endpoint
Test recommendations on your profile

Definition of Done:

Can generate job recommendations
Recommendations are ranked by similarity
Top 20 jobs have AI-generated explanations
Results are stored in recommendation_results

If Behind: Skip explanations (only return similarity scores)

Day 10: Resume Generation Service
Tasks:

Implement /generate-resume endpoint in ML service
Implement LLM prompts for resume generation
Implement resumeService in API
Create /api/resumes endpoint
Test resume generation for 3 jobs

Definition of Done:

Can generate tailored resumes for jobs
Resume includes summary, bullets, keyword coverage
Resumes are stored in generated_resumes table

If Behind: Generate simple bullet points (skip keyword coverage)

Day 11: API Routes & Services
Tasks:

Implement /api/jobs routes (list, get)
Implement /api/favorites routes (create, delete, list)
Implement /api/resumes routes (list, get)
Add pagination to jobs endpoint
Test all endpoints with Postman

Definition of Done:

All API endpoints work
Can favorite jobs
Can list favorites
Can list generated resumes
Pagination works

If Behind: Skip pagination (return all results)

Day 12: Frontend Setup & Auth
Tasks:

Set up Vite + React + TypeScript
Set up Firebase client SDK
Implement Login page with Google Sign-In
Implement useAuth hook
Implement API client (Axios with auth headers)
Set up React Router

Definition of Done:

Can log in with Google
Firebase token is stored
API calls include auth token
Routing works

If Behind: Use mock auth (skip Firebase on frontend)

Day 13: Job List & Detail Pages
Tasks:

Implement JobsPage with filters
Implement JobList component
Implement JobCard component
Implement JobDetailPage
Implement Favorite button
Implement MatchExplanation component

Definition of Done:

Can browse jobs
Can view job details
Can favorite jobs
Can see match explanations

If Behind: Skip filters (show all jobs)

Day 14: Resume Generation UI & Polish
Tasks:

Implement ResumesPage
Implement ResumeViewer component
Implement Generate Resume button in JobDetailPage
Add loading states and error handling
Add toast notifications
Final testing and bug fixes

Definition of Done:

Can generate resumes from UI
Can view generated resumes
App works end-to-end
No critical bugs

If Behind: Skip ResumesPage (show resume in modal)

Scheduler Setup (Post-MVP)
Tasks:

Implement cron scheduler in ingestion worker
Set up daily ingestion at 2 AM
Add monitoring and error alerts

Run manually during MVP:
bashnpm run ingest:once