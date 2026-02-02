# ApplyLess - Bugs & Improvements Tracker

## Status Legend
- 🔴 Critical - Blocks core functionality
- 🟡 Medium - Affects user experience
- 🟢 Low - Nice to have
- ✅ Fixed

---

## Open Issues

### BUG-013: Missing `/` in CV Route Mount
**Status:** 🔴 Critical  
**Component:** Backend API  
**File:** `packages/api/src/index.ts`

**Current behavior:**  
CV endpoints return 404 - route not found.

**Root cause:**  
```js
app.use("api/cv", cvRouter);  // ❌ Missing leading "/"
```

**Fix:**
```js
app.use("/api/cv", cvRouter);  // ✅ Correct
```

---

### BUG-014: Duplicate Absolute Positioning in JobCard
**Status:** 🟡 Medium  
**Component:** Frontend  
**File:** `packages/web/src/components/jobs/job-list/job-card.tsx`

**Current behavior:**  
Favorite button has `absolute top-4 right-4` but it's already inside an absolute-positioned container.

**Expected behavior:**  
Both CV and favorite buttons should be positioned within the same flex container.

**Fix:**
Remove `absolute top-4 right-4` from favorite button className.

---

### BUG-010: Missing Error Boundary
**Status:** 🟡 Medium  
**Component:** Frontend  

**Current behavior:**  
When a React component crashes, the entire app goes blank with no feedback.

**Expected behavior:**  
Show a friendly error message with option to reload or go home.

**Proposed fix:**
1. Create `ErrorBoundary` component using React error boundary pattern
2. Wrap app routes in error boundary
3. Show user-friendly error page with "Go Home" / "Reload" buttons

---

### BUG-011: Missing 404 Page
**Status:** 🟡 Medium  
**Component:** Frontend  

**Current behavior:**  
Unmatched routes show blank screen with console error.

**Expected behavior:**  
Show a proper 404 page with navigation back to home.

**Proposed fix:**
1. Create `NotFound` page component
2. Add catch-all route `<Route path="*" element={<NotFound />} />`

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

## Completed Fixes

### ✅ CV Generation UI Implementation
**Status:** ✅ Completed (Feb 2, 2026)  
**Component:** Full Stack (API, ML Service, Frontend)

**Implementation:**

**Backend API (`packages/api`):**
- Created `cv-router.ts` with `/api/cv/generate` and `/api/cv/compare` endpoints
- Added `generateCV()` and `compareCV()` methods to `ml-service-client.ts`
- Profile validation: minimum 100 words required

**ML Service (`packages/ml-service`):**
- Created `compare.py` with `/api/compare-cv` endpoint
- Skill extraction from CV and job description
- Coverage analysis (mandatory vs preferred requirements)
- Semantic similarity score using cosine similarity

**Frontend (`packages/web`):**
- Created CV modal component suite:
  - `cv-generator-modal.tsx` - Main orchestration
  - `cv-modal-initial.tsx` - Ready state with job preview
  - `cv-modal-loading.tsx` - 5-step loading animation
  - `cv-modal-success.tsx` - Split view (CV + analysis)
  - `cv-modal-error.tsx` - Error with retry
  - `cv-modal-profile-required.tsx` - Profile too short warning
- Created `generate-cv-pdf.ts` utility for PDF generation
- PDF features:
  - Professional styling (14pt name, 12pt title, 10pt body)
  - Section headers with underlines (UPPERCASE)
  - Clickable email (`mailto:`) links
  - Clickable LinkedIn profile links
- CV button on job cards (matches + favorites views)
- CV button on job details page

**CV Flow:**
```
Click "Generate CV" → Validate Profile (100+ words)
  → Generate CV (Claude) → Compare to Job → Show Preview
  → Requirements Analysis (Covered vs Gaps) → Download PDF
```

---

### ✅ Default View Mode = Matches
**Status:** ✅ Completed (Feb 2, 2026)  
**Component:** Frontend  
**File:** `packages/web/src/hooks/use-jobs-view.ts`

**Change:** Users with a profile now default to "Matches" view instead of "All Jobs".

**Implementation:**
```ts
const getDefaultView = (): ViewMode => {
  if (hasProfile) return 'matches';
  return 'all';
};
```

---

### ✅ Favorites Page → Integrated into Jobs Page
**Status:** ✅ Completed (Feb 1, 2026)  
**Page:** `/jobs?view=favorites`

**Original plan:** Create separate `/favorites` page

**Actual implementation:** Integrated as third tab in Jobs page
- Three views: All Jobs / Matches / Favorites
- URL param: `?view=favorites`
- Client-side filtering (all favorites loaded at once)
- Heart button toggles add/remove
- Badge shows favorites count on tab
- Empty state with "Browse Jobs" button

**Benefits:**
- No code duplication (reuses JobCard, filters, pagination)
- Consistent UX across all views
- Filters work on favorites too

**Files created/modified:**
- `hooks/use-jobs-view.ts` - Centralized data logic
- `components/jobs/filters/view-toggle.tsx` - Tab buttons
- `components/jobs/filters/jobs-header.tsx` - Dynamic header
- `components/jobs/filters/jobs-filters.tsx` - Filter inputs
- `components/jobs/job-list/jobs-list.tsx` - List with empty states
- `pages/jobs/jobs.tsx` - Thin orchestration layer

---

### ✅ Login redirect bug
**Status:** ✅ Fixed (Feb 1, 2026)  
**Component:** Frontend  
**Page:** `/login`

**Problem:** After login, always redirected to `/profile` even if user already has a profile.

**Root cause:** Two `navigate()` calls in sequence - second one overwrote first:
```ts
navigate('/jobs?sort=relevance', { replace: true });
navigate('/profile', { replace: true });  // This always wins!
```

**Fix:** Single conditional navigate:
```ts
if (profileData.profile?.profileText) {
  navigate('/jobs?view=matches', { replace: true });
} else {
  navigate('/profile', { replace: true });
}
```

Also updated URL from `?sort=relevance` to `?view=matches`.

---

### ✅ BUG-012: Job matching not title-aware (Strategy C Implementation)
**Status:** ✅ Fixed (Feb 1, 2026)  
**Component:** ML/Backend/Frontend  
**Page:** `/jobs?sort=relevance`

**Problem:**  
Full-document embeddings average everything together. A "Senior Product Manager" profile matches "Software Engineer" at 70% because of shared technical keywords (AI, ML, data), while "AI Product Manager" only scores 69%.

**Solution: Strategy C - Section-Based Weighted Matching**

Tested 4 strategies on 50 random jobs with a PM profile:
- Strategy A (Full Doc): 5 PM jobs in top 10 (baseline)
- Strategy B1 (Title-Heavy): 6 PM jobs in top 10
- Strategy B2 (Req-Heavy): 5 PM jobs in top 10
- **Strategy C (Section-Based): 7 PM jobs in top 10** ✅ Winner

**Implementation:**

1. **Database migration (014):**
   ```sql
   ALTER TABLE jobs ADD COLUMN header_embedding vector(768);
   ALTER TABLE jobs ADD COLUMN requirements_embedding vector(768);
   ALTER TABLE users ADD COLUMN title_embedding vector(768);
   ALTER TABLE users ADD COLUMN experience_embedding vector(768);
   ```

2. **Profile Service:** Generates embeddings on profile save
   - Calls ML service `/api/chunk/profile`
   - Extracts title line from profile
   - Stores title + experience embeddings in users table
   - Best-effort (doesn't fail profile save on ML error)

3. **Match Service:** Uses pre-computed embeddings
   - Reads embeddings from users table (no ML calls at match time)
   - Weighted SQL query: 40% title + 35% exp→req + 25% full
   - Jobs without chunk embeddings fall back to 0.5 similarity

4. **Job Ingestion (Stage G):** Now generates chunk embeddings
   - Full embedding → job_embeddings_simple table
   - Header + requirements embeddings → jobs table columns
   - Calls ML service `/api/chunk/job` for each job

5. **Frontend:** Match request no longer sends profile text
   - Uses authenticated endpoint
   - Server reads embeddings from users table
   - Cache invalidation: saving profile invalidates match cache

**Bugs fixed during implementation:**
- ML service client: wrong JSON format (`JSON.stringify(text)` → `JSON.stringify({ text })`)
- Profile service: field naming mismatch (`profile_text` → `profileText`)
- Match service: column name typo (`userId` → `id`)
- Match service: table name typo (`job_embedding_simple` → `job_embeddings_simple`)
- Match router: missing authMiddleware
- Comeet extractor: regex didn't match `.com` domain
- Embedding client: wrong endpoint (`/api/embed/job` → `/api/chunk/job`)

**Files created/modified:**
- `db/migrations/014_add_chunk_embeddings.sql`
- `packages/api/src/clients/ml-service-client.ts` (new)
- `packages/api/src/services/match-service.ts`
- `packages/api/src/services/profile-service.ts`
- `packages/api/src/routes/match-router.ts`
- `packages/api/src/constants/index.ts` (MATCHING_QUERY)
- `packages/api/src/types/index.ts` (MatchRequest)
- `packages/web/src/types/index.ts`
- `packages/web/src/pages/jobs/jobs.tsx`
- `packages/web/src/services/match.ts`
- `packages/web/src/services/profile.ts`
- `packages/ingestion/src/stages/stage-g-embeddings.ts`
- `packages/ingestion/src/clients/embedding-client.ts`
- `packages/ingestion/src/types/index.ts`

---

### ✅ Jobs Page - Relevance Sort & Favorites
**Status:** ✅ Completed (Jan 31, 2026)  
**Page:** `/jobs`

Features implemented:
- Sort toggle: Date / Relevance
- Relevance sort requires profile (shows prompt if missing)
- Match percentage badge on each job (color-coded: green >70%, amber >50%, gray <50%)
- Heart button to save/remove favorites
- Heart redirects to login if not authenticated
- Profile prompt banner for logged-in users without profile

**Components created:**
- `useAuthStatus` hook - reusable auth + profile state
- `constants/index.ts` - JOBS_PER_PAGE, REGION_LABELS
- `services/favorites.ts` - RTK Query endpoints
- `services/match.ts` - RTK Query endpoint

---

### ✅ Profile Page
**Status:** ✅ Completed (Jan 31, 2026)  
**Page:** `/profile`

Features implemented:
- Display/edit profile text
- Full-page drag & drop file upload (PDF, DOC, DOCX)
- File parsing with unpdf and mammoth
- Word count indicator
- Tooltip with "Why we need your profile" info
- Protected route (requires login)
- Redirect to `/jobs?sort=relevance` after save
- Smart redirect after login (→ /profile if no profile, → /jobs?sort=relevance if exists)

---

### ✅ BUG-009: Reset password route typo
**Status:** ✅ Fixed (Jan 31, 2026)  
**Component:** Frontend  
**Page:** `/reset-password`

**Problem:** Route was defined as `/reset password` (with space) instead of `/reset-password`.

**Symptom:** Clicking password reset link showed blank screen with console error:
```
No routes matched location "/reset-password?token=..."
```

**Fix:** Corrected route path in `App.tsx`.

---

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
GET  /api/jobs?limit=20&offset=0&region=&company=&title=&postedAfter=
GET  /api/jobs/:id
GET  /api/jobs/regions
GET  /api/jobs/cities
GET  /api/jobs/companies?search=&limit=20

GET  /api/profile
POST /api/profile         # Also generates embeddings
POST /api/profile/parse   # File upload
DELETE /api/profile

POST /api/match           # Authenticated, uses pre-computed embeddings

GET  /api/favorites
GET  /api/favorites/:jobId
POST /api/favorites/:jobId
DELETE /api/favorites/:jobId

POST /api/cv/generate     # Generate tailored CV
POST /api/cv/compare      # Compare CV to job
```

### Database Schema

```sql
jobs (relevant columns):
  - id, title, description (HTML), location
  - country VARCHAR(50)                    -- 'Israel' or NULL
  - region VARCHAR(50)                     -- 'central', 'north', etc.
  - city VARCHAR(100)                      -- Normalized city name
  - header_embedding vector(768)           -- Job title chunk embedding
  - requirements_embedding vector(768)     -- Requirements chunk embedding
  - company_id, posted_date, status

companies:
  - id, company_name, tags

job_embeddings_simple:
  - job_id, embedding (768d vector)        -- Full document embedding

users:
  - id, email, password_hash
  - profile_text TEXT
  - title_embedding vector(768)            -- Profile title embedding
  - experience_embedding vector(768)       -- Experience embedding
  - updated_at

favorites:
  - id, user_id, job_id, created_at
```

### Frontend Components

| Component | File | Description |
|-----------|------|-------------|
| JobCard | `job-card.tsx` | Job card with heart button, CV button, match score |
| CVGeneratorModal | `cv-generator-modal.tsx` | CV generation modal with 4 states |
| RoleInput | `role-input.tsx` | Text input with localStorage history |
| CompanySearch | `company-search.tsx` | Autocomplete dropdown with debounced API search |
| RegionFilter | `region-filter.tsx` | Custom dropdown with job counts |
| DateFilter | `date-filter.tsx` | Dropdown for date buckets |
| ProtectedRoute | `protected-route.tsx` | Auth guard for protected pages |

### Hooks

| Hook | File | Description |
|------|------|-------------|
| useAuthStatus | `use-auth-status.ts` | Returns isAuthenticated, hasProfile, profileText, isLoading |
| useJobsView | `use-jobs-view.ts` | All jobs page logic (views, filters, pagination) |

### Theme Colors (index.css)

| Variable | Usage |
|----------|-------|
| `--color-match-high-*` | Green badge for >70% match |
| `--color-match-mid-*` | Amber badge for 50-70% match |
| `--color-match-low-*` | Gray badge for <50% match |
| `--color-warning-*` | Profile prompt banner |
| `--color-favorite` | Heart button color |
| `--color-success-*` | Covered requirements in CV modal |
| `--color-error-*` | Error states |
