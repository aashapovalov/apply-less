-- Migration: Add location normalization columns to jobs table
-- Adds country, region, and city for Israeli job filtering and location categorization

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS country VARCHAR(10);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS region VARCHAR(20);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS city VARCHAR(100);

-- Create indexes for filtering
CREATE INDEX IF NOT EXISTS idx_jobs_country ON jobs(country);
CREATE INDEX IF NOT EXISTS idx_jobs_region ON jobs(region);
CREATE INDEX IF NOT EXISTS idx_jobs_city ON jobs(city);

-- Comments
COMMENT ON COLUMN jobs.country IS 'ISO country code: IL, US, GB, etc.';
COMMENT ON COLUMN jobs.region IS 'Israeli region: central, north, south, jerusalem, remote';
COMMENT ON COLUMN jobs.city IS 'Normalized city name';
