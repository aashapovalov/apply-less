# ApplyLess - Bugs & Improvements Tracker

## Status Legend
- 🔴 Critical - Blocks core functionality
- 🟡 Medium - Affects user experience
- 🟢 Low - Nice to have
- ✅ Fixed

---

## Jobs Browse Page

### BUG-001: Search doesn't work properly
**Status:** 🟡 Medium  
**Component:** Frontend + Backend  
**Page:** `/jobs`

**Current behavior:**  
Search input sends `location` and `company` params to API, but:
- API uses `ILIKE %value%` which requires exact substring match
- No title search supported
- Searching "tel aviv" returns 0 results even though jobs exist with "Tel Aviv-Yafo, IL"

**Expected behavior:**  
Search should find jobs by title, company, or location with fuzzy matching.

**Root cause:**  
Backend `/api/jobs` endpoint only supports:
- `location` - ILIKE filter on `jobs.location`
- `company` - ILIKE filter on `companies.company_name`
- `tags` - Array overlap filter

No `search` param for general text search across multiple fields.

**Files involved:**
- `packages/api/src/routes/jobs-router.ts`
- `packages/api/src/services/job-service.ts`
- `packages/web/src/pages/jobs.tsx`
- `packages/web/src/services/jobs.ts`

**Proposed fix:**
1. Add `search` param to backend that searches across title, company_name, location
2. Use PostgreSQL full-text search or multiple ILIKE conditions
3. Update frontend to send single `search` param

---

### BUG-002: Job cards missing description preview
**Status:** 🟡 Medium  
**Component:** Backend  
**Page:** `/jobs`

**Current behavior:**  
Job cards in list view show only: title, company, location, date, tags.
No description preview available.

**Expected behavior:**  
Show first 150-200 characters of description as preview.

**Root cause:**  
`/api/jobs` endpoint doesn't include `description` field in response.
Only `/api/jobs/:id` returns full description.

**Files involved:**
- `packages/api/src/services/job-service.ts` - `getJobs()` method

**Proposed fix:**
Add `LEFT(j.description, 200) as description_preview` to the jobs list query.

---

### BUG-003: Generic/invalid job entries in database
**Status:** 🟡 Medium  
**Component:** Data/Ingestion  
**Page:** `/jobs`

**Current behavior:**  
Some entries are not actual job postings:
- "Hailo has amazing openings!" - generic company career page link
- Company landing pages instead of specific positions

**Expected behavior:**  
Only actual job postings with specific titles should appear.

**Root cause:**  
Ingestion pipeline scrapes company career pages and sometimes captures:
- Generic "Join us" / "We're hiring" pages
- Career landing pages without specific job info

**Files involved:**
- `packages/ingestion/` - scraping logic

**Proposed fix:**
1. Add validation during ingestion to filter out generic titles
2. Require minimum description length
3. Add manual review or flagging system
4. Consider cleanup script for existing bad data

---

### BUG-004: Most jobs missing skills/tags
**Status:** 🟡 Medium  
**Component:** Data/Backend  
**Page:** `/jobs`, `/jobs/:id`

**Current behavior:**  
Many job cards show no skill tags. Tags that do appear are company-level, not job-specific.

**Expected behavior:**  
Each job should have relevant skills extracted from description.

**Root cause:**  
- `tags` field comes from `companies.tags`, not job-specific data
- ML service extracts skills but they may not be stored/linked to jobs
- Skill extraction may not have run on all jobs

**Files involved:**
- `packages/api/src/services/job-service.ts` - query uses `c.tags`
- `packages/ml-service/` - skill extraction
- Database schema - need job-level skills table?

**Proposed fix:**
1. Check if job-specific skills exist in database
2. If not, run skill extraction on job descriptions
3. Store skills per job, not just per company
4. Update API to return job-specific skills

---

### BUG-005: Location normalization & Israel-only filter
**Status:** 🔴 Critical  
**Component:** Backend + Data + Frontend  
**Page:** `/jobs`

**Current behavior:**  
- Locations are raw strings with inconsistent formats: "Tel Aviv-Yafo, IL", "Tel Aviv, Israel", "Ramat Gan", "New York, US", etc.
- Non-Israeli jobs are displayed (US, EU positions mixed in)
- No way to filter by Israeli region

**Expected behavior:**  
1. Only Israeli positions should be displayed (this is Israel hi-tech focused product)
2. Locations should be normalized to consistent format
3. User should be able to filter by region: Central, North, South, Jerusalem, Remote

**Israeli regions mapping:**
```
Central (מרכז):
- Tel Aviv, Tel Aviv-Yafo, Ramat Gan, Givatayim, Bnei Brak
- Herzliya, Ra'anana, Kfar Saba, Petah Tikva, Netanya
- Rishon LeZion, Holon, Bat Yam, Rehovot, Ashdod, Lod, Ramla

North (צפון):
- Haifa, Acre (Akko), Nahariya, Karmiel, Nazareth
- Tiberias, Safed (Tzfat), Kiryat Shmona, Yokneam, Caesarea

South (דרום):
- Beer Sheva, Eilat, Ashkelon, Kiryat Gat, Dimona, Arad, Sderot

Jerusalem area (ירושלים והסביבה):
- Jerusalem, Beit Shemesh, Modi'in, Ma'ale Adumim

Remote (עבודה מרחוק):
- Remote, Work from home, Hybrid (when location contains "remote" or "hybrid")
```

**Root cause:**  
- Ingestion captures raw location strings from job postings
- No normalization or country detection during ingestion
- No region classification in database
- No filter to exclude non-Israeli jobs

**Files involved:**
- `packages/api/src/services/job-service.ts` - add country/region filter
- `packages/ingestion/` - normalize locations during scraping
- Database schema - need `country` and `region` columns in jobs table
- `packages/web/src/pages/jobs.tsx` - add region filter dropdown

**Proposed fix:**

**Phase 1: Database migration**
```sql
ALTER TABLE jobs ADD COLUMN country VARCHAR(2);
ALTER TABLE jobs ADD COLUMN region VARCHAR(20);
CREATE INDEX idx_jobs_country ON jobs(country);
CREATE INDEX idx_jobs_region ON jobs(region);
```

**Phase 2: Create normalization script**
```javascript
const israeliCities = {
  // Central
  'tel aviv': { region: 'central', normalized: 'Tel Aviv' },
  'tel aviv-yafo': { region: 'central', normalized: 'Tel Aviv' },
  'ramat gan': { region: 'central', normalized: 'Ramat Gan' },
  'herzliya': { region: 'central', normalized: 'Herzliya' },
  'ra\'anana': { region: 'central', normalized: "Ra'anana" },
  'petah tikva': { region: 'central', normalized: 'Petah Tikva' },
  'netanya': { region: 'central', normalized: 'Netanya' },
  'rishon lezion': { region: 'central', normalized: 'Rishon LeZion' },
  'rehovot': { region: 'central', normalized: 'Rehovot' },
  'holon': { region: 'central', normalized: 'Holon' },
  'ashdod': { region: 'central', normalized: 'Ashdod' },
  'lod': { region: 'central', normalized: 'Lod' },
  'kfar saba': { region: 'central', normalized: 'Kfar Saba' },
  
  // North
  'haifa': { region: 'north', normalized: 'Haifa' },
  'yokneam': { region: 'north', normalized: 'Yokneam' },
  'caesarea': { region: 'north', normalized: 'Caesarea' },
  'nahariya': { region: 'north', normalized: 'Nahariya' },
  'karmiel': { region: 'north', normalized: 'Karmiel' },
  'nazareth': { region: 'north', normalized: 'Nazareth' },
  'acre': { region: 'north', normalized: 'Acre' },
  'akko': { region: 'north', normalized: 'Acre' },
  
  // South
  'beer sheva': { region: 'south', normalized: 'Beer Sheva' },
  'be\'er sheva': { region: 'south', normalized: 'Beer Sheva' },
  'eilat': { region: 'south', normalized: 'Eilat' },
  'ashkelon': { region: 'south', normalized: 'Ashkelon' },
  'kiryat gat': { region: 'south', normalized: 'Kiryat Gat' },
  
  // Jerusalem
  'jerusalem': { region: 'jerusalem', normalized: 'Jerusalem' },
  'beit shemesh': { region: 'jerusalem', normalized: 'Beit Shemesh' },
  'modi\'in': { region: 'jerusalem', normalized: "Modi'in" },
};

function normalizeLocation(raw) {
  if (!raw) return { country: null, region: null };
  
  const lower = raw.toLowerCase();
  
  // Check for remote/hybrid
  if (lower.includes('remote') || lower.includes('hybrid') || lower.includes('work from home')) {
    return { country: 'IL', region: 'remote', normalized: 'Remote' };
  }
  
  // Check Israeli cities
  for (const [city, data] of Object.entries(israeliCities)) {
    if (lower.includes(city)) {
      return { country: 'IL', region: data.region, normalized: data.normalized };
    }
  }
  
  // Check country indicators
  if (lower.includes(', il') || lower.includes('israel')) {
    return { country: 'IL', region: 'other', normalized: raw };
  }
  if (lower.includes(', us') || lower.includes('usa') || lower.includes('united states')) {
    return { country: 'US', region: null, normalized: raw };
  }
  if (lower.includes(', uk') || lower.includes(', gb') || lower.includes('united kingdom')) {
    return { country: 'GB', region: null, normalized: raw };
  }
  
  return { country: 'unknown', region: null, normalized: raw };
}
```

**Phase 3: Run normalization on existing data**
```sql
-- After running script to populate country/region columns
-- Verify counts
SELECT country, COUNT(*) FROM jobs GROUP BY country;
SELECT region, COUNT(*) FROM jobs WHERE country = 'IL' GROUP BY region;
```

**Phase 4: Update API**
- Default filter: `WHERE country = 'IL'`
- Add `region` query param to filter by region
- Update response to include normalized location

**Phase 5: Update Frontend**
- Add region filter dropdown: All, Central, North, South, Jerusalem, Remote
- Display normalized location in job cards
- Show region badge

---

## Auth Pages

### BUG-006: (placeholder for future auth bugs)
**Status:** 🟢 Low  
**Component:** -  
**Page:** -

---

## Profile Page

### BUG-007: (placeholder - page not built yet)
**Status:** 🟢 Low  
**Component:** -  
**Page:** `/profile`

---

## Match Results Page

### BUG-008: (placeholder - page not built yet)
**Status:** 🟢 Low  
**Component:** -  
**Page:** `/match`

---

## General UI

### BUG-009: (placeholder for future UI bugs)
**Status:** 🟢 Low  
**Component:** -  
**Page:** -

---

## Completed Fixes

(Move items here when fixed)

---

## Notes

### Database Schema (relevant tables)
```
jobs: id, title, description, requirements, location, company_id, canonical_url, posted_date
       (proposed: + country VARCHAR(2), + region VARCHAR(20))
companies: id, company_name, tags
job_embeddings_simple: job_id, embedding
```

### API Endpoints
- `GET /api/jobs?limit=20&offset=0&location=&company=&tags=`
- `GET /api/jobs/:id`
- `POST /api/match` - requires auth, sends profile embedding

### Key Files
- Backend jobs: `packages/api/src/services/job-service.ts`
- Frontend jobs page: `packages/web/src/pages/jobs.tsx`
- Frontend job service: `packages/web/src/services/jobs.ts`
- Frontend types: `packages/web/src/types/jobs.ts`
