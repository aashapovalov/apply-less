-- Migration: Add ats_checked_at to companies table
-- Tracks when ATS detection was last run for each company

ALTER TABLE companies ADD COLUMN ats_checked_at TIMESTAMP;

-- Index for efficient querying of unchecked companies
CREATE INDEX idx_companies_ats_checked_at ON companies(ats_checked_at) WHERE ats_checked_at IS NULL;

-- Optional: Backfill existing companies that have job_sources as "checked"
-- UPDATE companies c SET ats_checked_at = NOW()
-- WHERE EXISTS (SELECT 1 FROM job_sources js WHERE js.company_id = c.id);