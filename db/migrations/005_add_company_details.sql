-- Migration 005: Add company detail fields (careers page, social links)

ALTER TABLE companies
    ADD COLUMN IF NOT EXISTS careers_page_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS linkedin_url VARCHAR(500);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_companies_careers_url ON companies(careers_page_url) WHERE careers_page_url IS NOT NULL;

- Add comment
COMMENT ON COLUMN companies.careers_page_url IS 'URL to company careers/jobs page';
COMMENT ON COLUMN companies.linkedin_url IS 'LinkedIn company profile URL';