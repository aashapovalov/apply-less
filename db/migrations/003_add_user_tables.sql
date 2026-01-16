-- === USER PROFILE ===
CREATE TABLE users (
                       id SERIAL PRIMARY KEY,
                       firebase_uid VARCHAR(255) NOT NULL UNIQUE,
                       email VARCHAR(255),
                       display_name VARCHAR(255),
                       profile_text TEXT, -- Full resume/LinkedIn content
                       created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                       updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_firebase_uid ON users(firebase_uid);

-- === PROFILE CHUNKS ===
CREATE TABLE profile_chunks (
                                id SERIAL PRIMARY KEY,
                                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                                chunk_index INTEGER NOT NULL,
                                section_type VARCHAR(50), -- summary | experience | education | skills
                                content TEXT NOT NULL,
                                token_count INTEGER,
                                created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                                UNIQUE(user_id, chunk_index)
);

CREATE INDEX idx_profile_chunks_user ON profile_chunks(user_id);

-- === PROFILE EMBEDDINGS ===
CREATE TABLE profile_embeddings (
                                    id SERIAL PRIMARY KEY,
                                    profile_chunk_id INTEGER NOT NULL REFERENCES profile_chunks(id) ON DELETE CASCADE,
                                    embedding vector(384),
                                    model_name VARCHAR(100) NOT NULL,
                                    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                                    UNIQUE(profile_chunk_id, model_name)
);

CREATE INDEX idx_profile_embeddings_chunk ON profile_embeddings(profile_chunk_id);
CREATE INDEX idx_profile_embeddings_vector ON profile_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 10);

-- === FAVORITES ===
CREATE TABLE favorites (
                           id SERIAL PRIMARY KEY,
                           user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                           job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
                           created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                           UNIQUE(user_id, job_id)
);

CREATE INDEX idx_favorites_user ON favorites(user_id);
CREATE INDEX idx_favorites_job ON favorites(job_id);

-- === GENERATED RESUMES ===
CREATE TABLE generated_resumes (
                                   id SERIAL PRIMARY KEY,
                                   user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                                   job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
                                   version INTEGER NOT NULL DEFAULT 1,
                                   tailored_summary TEXT NOT NULL,
                                   tailored_bullets TEXT[] NOT NULL, -- Array of bullet points
                                   keyword_coverage JSONB, -- { covered: [...], missing: [...] }
                                   evidence_chunks INTEGER[], -- Array of profile_chunk_id that were used
                                   model_name VARCHAR(100),
                                   created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_generated_resumes_user ON generated_resumes(user_id);
CREATE INDEX idx_generated_resumes_job ON generated_resumes(job_id);
CREATE INDEX idx_generated_resumes_created ON generated_resumes(created_at DESC);
