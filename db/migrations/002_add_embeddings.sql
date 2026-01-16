-- === JOB EMBEDDINGS ===
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE job_embeddings (
                                id SERIAL PRIMARY KEY,
                                job_chunk_id INTEGER NOT NULL REFERENCES job_chunks(id) ON DELETE CASCADE,
                                embedding vector(768), -- Dimension depends on model (768 for intfloat/e5-base-v2)
                                model_name VARCHAR(100) NOT NULL,
                                created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                                UNIQUE(job_chunk_id, model_name)
);

CREATE INDEX idx_job_embeddings_chunk ON job_embeddings(job_chunk_id);
-- Vector similarity index (cosine distance)
CREATE INDEX idx_job_embeddings_vector ON job_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

