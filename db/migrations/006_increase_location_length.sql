ALTER TABLE jobs
ALTER COLUMN location TYPE VARCHAR(500);

ALTER TABLE jobs
ALTER COLUMN normalized_location TYPE VARCHAR(500);

COMMENT ON COLUMN jobs.location IS 'Job location - increased to 500 chars to handle long location strings';