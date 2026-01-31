# ApplyLess - Bugs & Improvements Tracker

## Status Legend
- 🔴 Critical - Blocks core functionality
- 🟡 Medium - Affects user experience
- 🟢 Low - Nice to have
- ✅ Fixed

---

## Open Issues

### BUG-001: Search doesn't work properly
**Status:** 🟡 Medium  
**Component:** Frontend + Backend  
**Page:** `/jobs`

**Current behavior:**  
Search input sends `location` and `company` params to API, but:
- API uses `ILIKE %value%` which requires exact substring match
- No title search supported

**Expected behavior:**  
Search should find jobs by title, company, or location with fuzzy matching.

**Proposed fix:**
1. Add `search` param to backend that searches across title, company_name, location
2. Use PostgreSQL full-text search or multiple ILIKE conditions

---

### BUG-002: Job cards missing description preview
**Status:** 🟢 Low  
**Component:** Backend  
**Page:** `/jobs`

**Current behavior:**  
Job cards show only: title, company, location, date, tags.

**Expected behavior:**  
Show first 150-200 characters of description as preview.

**Proposed fix:**
Add `LEFT(j.description, 200) as description_preview` to the jobs list query.

---

### BUG-003: Generic/invalid job entries in database
**Status:** 🟢 Low  
**Component:** Data/Ingestion

**Current behavior:**  
Some entries are not actual job postings (generic career pages).

**Proposed fix:**
1. Add validation during ingestion to filter out generic titles
2. Require minimum description length
3. Add cleanup script for existing bad data

---

### BUG-004: Most jobs missing skills/tags
**Status:** 🟡 Medium  
**Component:** Data/Backend

**Current behavior:**  
`tags` field comes from `companies.tags`, not job-specific skills.

**Proposed fix:**
1. Run skill extraction on job descriptions
2. Store skills per job in new table or JSON column
3. Update API to return job-specific skills

---

## Pages Not Yet Built

### Profile Page
**Status:** 🔲 Not started  
**Page:** `/profile`

Features needed:
- Display current profile text
- Edit/save profile
- Profile completeness score
- Suggested improvements

---

### Match Results Page
**Status:** 🔲 Not started  
**Page:** `/match`

Features needed:
- Input/paste profile text
- Display matched jobs ranked by similarity
- Show match score for each job
- Save to favorites

---

### Favorites Page
**Status:** 🔲 Not started  
**Page:** `/favorites`

Features needed:
- List favorited jobs
- Remove from favorites
- Generate CV for selected job
- Download CV as markdown/PDF

---

## Completed Fixes

### ✅ BUG-005: Location normalization & Israel-only filter
**Status:** ✅ Fixed (Jan 31, 2026)  
**Component:** Backend + Ingestion + Database

**Solution implemented:**
1. Added `country`, `region`, `city` columns to jobs table (migration 013)
2. Created `israeli-cities.json` with 90+ cities and spelling variations
3. Added `location-normalizer.ts` for city → region classification
4. Updated Greenhouse and Comeet ingestion to normalize locations at insert time
5. Non-Israeli jobs (US, UK, EU) are skipped during ingestion
6. Backfilled existing jobs with normalized locations

**Israeli regions:**
- Central: Tel Aviv, Ramat Gan, Herzliya, Ra'anana, Petah Tikva, etc.
- North: Haifa, Yokneam, Caesarea, Nahariya, Karmiel
- South: Beer Sheva, Eilat, Ashkelon, Kiryat Gat
- Jerusalem: Jerusalem, Beit Shemesh, Modi'in
- Remote: Remote, Hybrid, Work from home

---

### ✅ BUG-006: Comeet jobs missing descriptions
**Status:** ✅ Fixed (Jan 31, 2026)  
**Component:** Ingestion

**Problem:** 100% of Comeet jobs had empty descriptions.

**Root cause:** Comeet API list endpoint doesn't include descriptions. Need to:
1. Use `?details=true` parameter when fetching position details
2. Parse the `details` array which contains HTML sections

**Solution:**
1. Updated `ComeetClient.fetchPositionDetail()` to add `details=true` param
2. Added `parseDetailsToDescription()` to combine HTML sections
3. Stale jobs (404 from API) were cleaned up

**Result:** Comeet descriptions went from 100% missing to <4% missing.

---

### ✅ BUG-007: Job descriptions not formatted (HTML as plain text)
**Status:** ✅ Fixed (Jan 31, 2026)  
**Component:** Frontend + Ingestion

**Problem:** Descriptions showed as wall of text without formatting.

**Root cause:** 
1. Greenhouse ingestion stripped HTML to plain text
2. Comeet ingestion converted HTML to text
3. Frontend displayed with `whitespace-pre-wrap`

**Solution:**
1. Updated Greenhouse stage to keep `jobDetail.content` HTML
2. Updated Comeet to combine HTML sections with `<h3>` headers
3. Created `SafeHtml` component with DOMPurify sanitization
4. Added CSS styles for `.job-description` (lists, headings, paragraphs)
5. Need to re-run ingestion to update existing jobs

---

## Notes

### Re-ingestion Required

After fixing HTML descriptions, existing jobs need to be re-ingested:

```bash
# Re-fetch Greenhouse jobs with HTML descriptions
cd packages/ingestion && npm run start -- greenhouse

# Re-fetch Comeet jobs with details=true
cd packages/ingestion && npm run start -- comeet
```

### Database Schema

```sql
jobs (relevant columns):
  - id, title, description (now HTML), location
  - country VARCHAR(50)  -- 'Israel' or NULL
  - region VARCHAR(50)   -- 'central', 'north', 'south', 'jerusalem', 'remote'
  - city VARCHAR(100)    -- Normalized city name
  - company_id, posted_date, status

companies:
  - id, company_name, tags

job_embeddings_simple:
  - job_id, embedding (768d vector)
```

### API Endpoints
- `GET /api/jobs?limit=20&offset=0&location=&company=&region=`
- `GET /api/jobs/:id` — Returns full HTML description
- `POST /api/match` — Profile embedding similarity search
