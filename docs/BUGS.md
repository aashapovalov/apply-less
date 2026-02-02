# ApplyLess - Bugs & Improvements Tracker

## Status Legend
- 🔴 Critical - Blocks core functionality
- 🟡 Medium - Affects user experience
- 🟢 Low - Nice to have
- ✅ Fixed

---

## Open Issues

### BUG-015: Email verification requires custom domain
**Status:** 🟡 Medium  
**Component:** Backend / Resend  

**Current behavior:**  
Using `onboarding@resend.dev` only sends emails to the Resend account owner's email.

**Workaround:**  
Auto-verify users on registration (set `email_verified = TRUE` in createUser).

**Proper fix:**  
1. Purchase a domain
2. Verify it in Resend
3. Update `FROM_EMAIL` to use verified domain

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

## Deployment Fixes (Feb 2, 2026)

### ✅ API tsconfig extends root file
**Status:** ✅ Fixed  
**Component:** API Build

**Problem:** Railway builds only `packages/api`, can't access `../../tsconfig.base.json`.

**Fix:** Made `packages/api/tsconfig.json` self-contained by inlining all settings from base.

---

### ✅ Missing @types/pg
**Status:** ✅ Fixed  
**Component:** API Build

**Problem:** TypeScript errors for `pg` module.

**Fix:** `npm install --save-dev @types/pg` in packages/api.

---

### ✅ PyTorch too large for Railway build
**Status:** ✅ Fixed  
**Component:** ML Service Build

**Problem:** Build timed out - full PyTorch is ~2GB.

**Fix:** Use CPU-only PyTorch in requirements.txt:
```
--extra-index-url https://download.pytorch.org/whl/cpu
torch
```

---

### ✅ ML Service memory crash
**Status:** ✅ Fixed  
**Component:** ML Service Runtime

**Problem:** Two models (embedding + skill extraction) exceeded Railway memory limits.

**Fix:** Disabled skill extraction model, replaced with `DummySkillExtractor` class.

---

### ✅ Database SSL connection error
**Status:** ✅ Fixed  
**Component:** API → Database

**Problem:** `The server does not support SSL connections`

**Fix:** 
1. Set `ssl: false` in db.ts Pool config
2. Add `?sslmode=disable` to DATABASE_URL

---

### ✅ Vercel 404 on client routes
**Status:** ✅ Fixed  
**Component:** Frontend Deployment

**Problem:** Direct links to `/reset-password`, `/jobs/:id` showed Vercel 404.

**Fix:** Added `packages/web/vercel.json`:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/" }
  ]
}
```

---

### ✅ Email links point to localhost
**Status:** ✅ Fixed  
**Component:** API Email Service

**Problem:** Verification/reset emails had `http://localhost:5173` links.

**Fix:** Set `FRONTEND_URL=https://apply-less-web.vercel.app` in Railway API variables.

---

### ✅ Missing ML_SERVICE_URL protocol
**Status:** ✅ Fixed  
**Component:** API → ML Service

**Problem:** ML service URL missing `https://` prefix.

**Fix:** Updated variable to `https://ml-service-production-ed97.up.railway.app`.

---

### ✅ Python indentation error in main.py
**Status:** ✅ Fixed  
**Component:** ML Service

**Problem:** Incorrect indentation when adding DummySkillExtractor class.

**Fix:** Moved class definition outside of lifespan function, fixed indentation.

---

### ✅ DummySkillExtractor missing is_loaded
**Status:** ✅ Fixed  
**Component:** ML Service

**Problem:** `AttributeError: 'DummySkillExtractor' object has no attribute 'is_loaded'`

**Fix:** Added `is_loaded = False` to DummySkillExtractor class.

---

### ✅ Unused babel import
**Status:** ✅ Fixed  
**Component:** ML Service

**Problem:** `from babel.util import missing` caused ModuleNotFoundError.

**Fix:** Removed unused import from `skill_gap_service.py`.

---

### ✅ RootState unused TypeScript error
**Status:** ✅ Fixed  
**Component:** Frontend Build

**Problem:** `'RootState' is declared but never used` in Vercel build.

**Fix:** Changed `useAppSelector` to use `RootState` instead of `AppDispatch`:
```typescript
export const useAppSelector = useSelector.withTypes<RootState>();
```

---

## Earlier Fixes

### ✅ BUG-013: Missing `/` in CV Route Mount
**Status:** ✅ Fixed (Feb 2, 2026)  
**Component:** Backend API

**Problem:** CV endpoints returned 404.

**Fix:** Changed `app.use("api/cv", ...)` to `app.use("/api/cv", ...)`.

---

### ✅ CV Generation UI Implementation
**Status:** ✅ Completed (Feb 2, 2026)  
**Component:** Full Stack

**Implementation:**
- CV API routes (`/api/cv/generate`, `/api/cv/compare`)
- ML service compare endpoint
- CV Generator Modal (4 states)
- PDF generation with styling and clickable links

---

### ✅ Default View Mode = Matches
**Status:** ✅ Completed (Feb 2, 2026)  
**Component:** Frontend

**Change:** Users with a profile now default to "Matches" view instead of "All Jobs".

---

### ✅ Favorites Page → Integrated into Jobs Page
**Status:** ✅ Completed (Feb 1, 2026)  
**Page:** `/jobs?view=favorites`

Integrated as third tab in Jobs page instead of separate route.

---

### ✅ Login redirect bug
**Status:** ✅ Fixed (Feb 1, 2026)  
**Component:** Frontend

**Problem:** After login, always redirected to `/profile` even if user already has a profile.

**Fix:** Single conditional navigate based on profile existence.

---

### ✅ BUG-012: Job matching not title-aware (Strategy C)
**Status:** ✅ Fixed (Feb 1, 2026)  
**Component:** ML/Backend/Frontend

**Solution:** Section-based weighted matching (40% title + 35% exp→req + 25% full).

---

### ✅ Jobs Page - Relevance Sort & Favorites
**Status:** ✅ Completed (Jan 31, 2026)

Features: Sort toggle, match percentage badges, heart button for favorites.

---

### ✅ Profile Page
**Status:** ✅ Completed (Jan 31, 2026)

Features: File upload, drag & drop, word count, smart redirect.

---

### ✅ Job filters UI
**Status:** ✅ Fixed (Jan 31, 2026)

Added: Region, date, company autocomplete, role search filters.

---

### ✅ Location normalization & Israel-only filter
**Status:** ✅ Fixed (Jan 31, 2026)

90+ Israeli cities mapped to regions, non-Israeli jobs filtered during ingestion.

---

### ✅ Comeet jobs missing descriptions
**Status:** ✅ Fixed (Jan 31, 2026)

Added `?details=true` parameter and description parsing.

---

### ✅ Job descriptions not formatted
**Status:** ✅ Fixed (Jan 31, 2026)

Keep HTML from Greenhouse/Comeet, render with DOMPurify.

---

## Notes

### Production URLs

| Service | URL |
|---------|-----|
| Frontend | https://apply-less-web.vercel.app |
| API | https://api-production-5fba.up.railway.app |
| ML Service | https://ml-service-production-ed97.up.railway.app |

### Environment Variables (Railway API)

```
DATABASE_URL=postgresql://...?sslmode=disable
JWT_SECRET=<64-char-hex>
JWT_REFRESH_SECRET=<64-char-hex>
ML_SERVICE_URL=https://ml-service-production-ed97.up.railway.app
FRONTEND_URL=https://apply-less-web.vercel.app
RESEND_API_KEY=re_xxxxx
FROM_EMAIL=onboarding@resend.dev
```

### Environment Variables (Railway ML Service)

```
ANTHROPIC_API_KEY=sk-ant-...
```

### Environment Variables (Vercel)

```
VITE_API_URL=https://api-production-5fba.up.railway.app/api
```
