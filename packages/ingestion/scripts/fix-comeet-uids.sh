#!/bin/bash
#
# Manually update job_sources with Comeet UIDs extracted from position links
# These companies were detected as Comeet but the auto-extractor couldn't find the UID
#
# The UID format is extracted from position URLs: /co/dept/UID/title/
# or from comeet.com links: comeet.com/jobs/COMPANY/UID/title/
#

SSH_CMD="ssh -i ~/.ssh/hetzner_applyles root@89.167.50.54"
PSQL="docker exec applyless-postgres psql -U postgres -d applyless -c"

echo "🔧 Updating Comeet UIDs for companies missing slugs..."
echo ""

# Helper function
update_uid() {
    local company="$1"
    local uid="$2"
    local token="$3"
    
    if [ -z "$token" ]; then
        $SSH_CMD "$PSQL \"
            UPDATE job_sources 
            SET ats_identifier = '$uid', status = 'active'
            WHERE company_id = (SELECT id FROM companies WHERE company_name = '$company' LIMIT 1)
            AND source_type = 'comeet'
            AND (ats_identifier IS NULL OR ats_identifier = '');
        \""
    else
        $SSH_CMD "$PSQL \"
            UPDATE job_sources 
            SET ats_identifier = '$uid', api_token = '$token', status = 'active'
            WHERE company_id = (SELECT id FROM companies WHERE company_name = '$company' LIMIT 1)
            AND source_type = 'comeet'
            AND (ats_identifier IS NULL OR ats_identifier = '');
        \""
    fi
    
    echo "  ✅ $company → UID: $uid"
}

# Companies with UIDs extracted from position links in the screenshot
# Format: /co/dept/UID/ → the UID is the alphanumeric code like D3.36D

# Agora - /co/sales/D3.36D/account-executive-los-angeles/all/
# UID needs to be extracted from their Comeet integration, not position IDs

echo "⚠️  For most companies, we need to visit a position page to find the company UID."
echo "   The position IDs (D3.36D etc.) are per-position, not per-company."
echo ""
echo "   Run the detector with --force --deep-crawl on these companies to retry extraction."
echo "   Or visit each company's position page manually to find the COMEET.init script."

echo ""
echo "Done."
