-- Migration 015: Add details_fetched_at to track detail page fetches separately from updated_at
-- This lets us distinguish "seen in list" from "detail page scraped"

ALTER TABLE companies
    ADD COLUMN IF NOT EXISTS details_fetched_at TIMESTAMP;

-- Backfill: companies that already have a careers_page_url or linkedin_url were fetched before
UPDATE companies
SET details_fetched_at = updated_at
WHERE careers_page_url IS NOT NULL OR linkedin_url IS NOT NULL;

-- Index for finding companies that need detail fetching
CREATE INDEX IF NOT EXISTS idx_companies_details_fetched_at
    ON companies(details_fetched_at NULLS FIRST);

COMMENT ON COLUMN companies.details_fetched_at IS 'When the SNC detail page was last scraped (NULL = never fetched)';