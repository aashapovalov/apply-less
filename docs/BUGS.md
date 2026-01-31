# ApplyLess - Bugs & Improvements Tracker

## Status Legend
- 🔴 Critical - Blocks core functionality
- 🟡 Medium - Affects user experience
- 🟢 Low - Nice to have
- ✅ Fixed

---

## Open Issues

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

### ✅ BUG-008: Job filters UI implementation
**Status:** ✅ Fixed (Jan 31, 2026)  
**Component:** Frontend + Backend

**Solution implemented:**

**Backend:**
1. Added `/api/jobs/companies` endpoint for company autocomplete
2. Added `title` and `postedAfter` query params to `/api/jobs`
3. Company filter uses exact match for dropdown selection

**Frontend:**
1. Created `RoleInput` - text input with localStorage search history
2. Created `CompanySearch` - autocomplete dropdown with debounced search
3. Created `RegionFilter` - custom dropdown (consistent styling)
4. Created `DateFilter` - dropdown for Today/This week/This month
5. All dropdowns have consistent styling (custom components, not native select)
6. Active filter pills with individual clear buttons
7. "Clear all" button to reset filters

**Filter layout:**
```
Row 1: [Role Input] [Company Search]
Row 2: [Region Filter] [Date Filter]
```

---

### ✅ BUG-001: Search/filter functionality
**Status:** ✅ Fixed (Jan 31, 2026)  
**Component:** Frontend + Backend

**Previous issue:** Search input was basic, no proper filtering.

**Solution:** Replaced generic search with dedicated filters:
- **Role search:** `title` param with ILIKE matching
- **Company filter:** Exact match dropdown with autocomplete
- **Region filter:** Dropdown with job counts
- **Date filter:** Posted within Today/Week/Month

---

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
2. Added `decodeHtmlEntities()` to fix encoded HTML from Greenhouse API
3. Updated Comeet to combine HTML sections with `<h3>` headers
4. Created `SafeHtml` component with DOMPurify sanitization
5. Added CSS styles for `.job-description` (lists, headings, paragraphs)
6. Created fix script to decode HTML entities in existing jobs

---

## Notes

### API Endpoints

```
GET /api/jobs?limit=20&offset=0&region=&company=&title=&postedAfter=
GET /api/jobs/:id
GET /api/jobs/regions
GET /api/jobs/cities
GET /api/jobs/companies?search=&limit=20
POST /api/match
```

### Database Schema

```sql
jobs (relevant columns):
  - id, title, description (HTML), location
  - country VARCHAR(50)  -- 'Israel' or NULL
  - region VARCHAR(50)   -- 'central', 'north', 'south', 'jerusalem', 'remote'
  - city VARCHAR(100)    -- Normalized city name
  - company_id, posted_date, status

companies:
  - id, company_name, tags

job_embeddings_simple:
  - job_id, embedding (768d vector)
```

### Frontend Filter Components

| Component | File | Description |
|-----------|------|-------------|
| RoleInput | `role-input.tsx` | Text input with localStorage history |
| CompanySearch | `company-search.tsx` | Autocomplete dropdown with debounced API search |
| RegionFilter | `region-filter.tsx` | Custom dropdown with job counts |
| DateFilter | `date-filter.tsx` | Dropdown for date buckets |
