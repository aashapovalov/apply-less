-- === COMPANIES ===
CREATE TABLE companies (
                           id SERIAL PRIMARY KEY,
                           company_name VARCHAR(255) NOT NULL,
                           normalized_name VARCHAR(255) NOT NULL, -- lowercase, no spaces
                           company_website_url VARCHAR(500) NOT NULL,
                           snc_company_page_url VARCHAR(500),
                           tags TEXT[], -- e.g., ['AI', 'B2B', 'Cybersecurity']
                           founded_year INTEGER,
                           source_type VARCHAR(50) DEFAULT 'snc', -- snc | manual
                           first_seen_at TIMESTAMP NOT NULL DEFAULT NOW(),
                           last_seen_at TIMESTAMP NOT NULL DEFAULT NOW(),
                           created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                           updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
                           UNIQUE(normalized_name, company_website_url)
);

CREATE INDEX idx_companies_normalized_name ON companies(normalized_name);
CREATE INDEX idx_companies_last_seen ON companies(last_seen_at);

-- === JOB SOURCES ===
CREATE TABLE job_sources (
                             id SERIAL PRIMARY KEY,
                             company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
                             source_type VARCHAR(50) NOT NULL, -- careers_html | greenhouse
                             base_url VARCHAR(500) NOT NULL,
                             detection_method VARCHAR(50), -- common_path | homepage_link | sitemap | ats_detection
                             confidence DECIMAL(3, 2), -- 0.00 to 1.00
                             last_checked_at TIMESTAMP NOT NULL DEFAULT NOW(),
                             status VARCHAR(20) DEFAULT 'active', -- active | failed | deprecated
                             created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                             UNIQUE(company_id, source_type, base_url)
);

CREATE INDEX idx_job_sources_company ON job_sources(company_id);
CREATE INDEX idx_job_sources_status ON job_sources(status);

-- === JOBS ===
CREATE TABLE jobs (
                      id SERIAL PRIMARY KEY,
                      company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
                      title VARCHAR(255) NOT NULL,
                      normalized_title VARCHAR(255) NOT NULL,
                      location VARCHAR(100),
                      normalized_location VARCHAR(100),
                      department VARCHAR(100),
                      employment_type VARCHAR(50), -- full-time | part-time | contract | intern
                      description TEXT NOT NULL,
                      requirements TEXT,
                      benefits TEXT,
                      canonical_url VARCHAR(500) NOT NULL,
                      external_id VARCHAR(255), -- e.g., greenhouse_12345
                      posted_date TIMESTAMP,
                      first_seen_at TIMESTAMP NOT NULL DEFAULT NOW(),
                      last_seen_at TIMESTAMP NOT NULL DEFAULT NOW(),
                      status VARCHAR(20) DEFAULT 'active', -- active | expired
                      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
                      UNIQUE(company_id, normalized_title, normalized_location, canonical_url)
);

CREATE INDEX idx_jobs_company ON jobs(company_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_location ON jobs(normalized_location);
CREATE INDEX idx_jobs_title ON jobs(normalized_title);
CREATE INDEX idx_jobs_last_seen ON jobs(last_seen_at);

-- === JOB CHUNKS (for embeddings) ===
CREATE TABLE job_chunks (
                            id SERIAL PRIMARY KEY,
                            job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
                            chunk_index INTEGER NOT NULL, -- Order within job
                            section_type VARCHAR(50), -- description | requirements | benefits | title
                            content TEXT NOT NULL,
                            token_count INTEGER,
                            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                            UNIQUE(job_id, chunk_index)
);

CREATE INDEX idx_job_chunks_job ON job_chunks(job_id);
CREATE INDEX idx_job_chunks_section ON job_chunks(section_type);
