-- Migration 014: Add chunk embeddings for improved matching
--
-- Strategy C: Section-based matching using:
-- - Profile title ↔ Job header (40% weight)
-- - Profile experience ↔ Job requirements (35% weight)
-- - Profile full ↔ Job full (25% weight)

-- Job chunk embeddings (populated during ingestion)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS header_embedding vector(768);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS requirements_embedding vector(768);

-- User chunk embeddings (populated on profile save)
ALTER TABLE users ADD COLUMN IF NOT EXISTS title_embedding vector(768);
ALTER TABLE users ADD COLUMN IF NOT EXISTS experience_embedding vector(768);

-- Indexes for vector similarity search
CREATE INDEX IF NOT EXISTS idx_jobs_header_embedding
    ON jobs USING ivfflat (header_embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_jobs_requirements_embedding
    ON jobs USING ivfflat (requirements_embedding vector_cosine_ops) WITH (lists = 100);