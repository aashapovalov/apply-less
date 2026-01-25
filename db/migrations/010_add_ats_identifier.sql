-- Add ATS identifier columns to job_sources
-- This stores the extracted slug/UID (e.g., "E6.001" for Comeet, "appsflyer" for Greenhouse)
-- and optional API token for Comeet widget pattern

ALTER TABLE job_sources ADD COLUMN IF NOT EXISTS ats_identifier VARCHAR(255);
ALTER TABLE job_sources ADD COLUMN IF NOT EXISTS api_token VARCHAR(255);

-- Index for lookups by ATS type and identifier
CREATE INDEX IF NOT EXISTS idx_job_sources_ats_identifier ON job_sources(source_type, ats_identifier);
