-- Migration 014: Add skills and title embedding for improved matching
--
-- This migration adds:
-- 1. skills column to jobs table (extracted from job description)
-- 2. title_embedding column to job_embeddings_simple (for title-aware matching)
-- 3. skills column to users table (extracted from profile)

-- Add skills to jobs (stored as JSONB array of skill objects)
-- Format: [{"skill": "Python", "level": "mandatory"}, ...]
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS skills JSONB DEFAULT '[]';

-- Add title embedding for title-aware matching
ALTER TABLE job_embeddings_simple ADD COLUMN IF NOT EXISTS title_embedding vector(768);

-- Add skills to users (extracted from profile)
-- Format: [{"skill": "React", "source": "throughout"}, ...]
ALTER TABLE users ADD COLUMN IF NOT EXISTS skills JSONB DEFAULT '[]';

-- Index for faster skill-based queries
CREATE INDEX IF NOT EXISTS idx_jobs_skills ON jobs USING GIN (skills);
CREATE INDEX IF NOT EXISTS idx_users_skills ON users USING GIN (skills);

-- Vector index for title embeddings
CREATE INDEX IF NOT EXISTS idx_job_embeddings_title_vector
    ON job_embeddings_simple USING ivfflat (title_embedding vector_cosine_ops)
    WITH (lists = 100);