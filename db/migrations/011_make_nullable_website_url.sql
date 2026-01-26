-- Step 1: Drop the unique constraint
ALTER TABLE companies DROP CONSTRAINT companies_normalized_name_company_website_url_key;

-- Step 2: Allow NULL
ALTER TABLE companies ALTER COLUMN company_website_url DROP NOT NULL;

-- Step 3: Clear the bad data
UPDATE companies
SET company_website_url = NULL
WHERE company_website_url LIKE '%startupnationcentral%';

-- Step 4: Add a better unique constraint (use snc_company_page_url instead)
ALTER TABLE companies ADD CONSTRAINT companies_normalized_name_snc_url_key
  UNIQUE(normalized_name, snc_company_page_url);