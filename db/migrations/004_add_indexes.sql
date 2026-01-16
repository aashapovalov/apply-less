-- Additional performance indexes
CREATE INDEX idx_jobs_created_at ON jobs(created_at DESC);
CREATE INDEX idx_jobs_company_status ON jobs(company_id, status);
CREATE INDEX idx_job_chunks_job_section ON job_chunks(job_id, section_type);