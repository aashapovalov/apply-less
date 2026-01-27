import {StageBOptions} from "../stages/stage-b-detect-ats.js";

/**
 * Build a parametrized SQL query for selecting companies to run ATS detection on,
 * based on Stage B pipeline flags and filters.
 *
 * Selection logic (priority order):
 *
 * 1. companyName provided
 *    - Filters strictly by company_name (ILIKE %name%)
 *    - Overrides all other flags (recheck / force ignored)
 *
 * 2. --recheck --force
 *    - Selects ALL companies with a non-null careers page
 *    - Ignores ats_checked_at and job_sources state
 *
 * 3. --recheck
 *    - Selects companies that:
 *        - have already been checked (ats_checked_at IS NOT NULL)
 *        - but still have NO job_sources recorded
 *
 * 4. --force
 *    - Selects companies that:
 *        - have never been checked
 *          OR
 *        - have no job_sources recorded yet
 *
 * 5. Default (no flags)
 *    - Selects only new companies:
 *        - ats_checked_at IS NULL
 *
 * Global constraints:
 *  - careers_page_url must be present
 *  - LinkedIn pages are always excluded
 *  - Results are ordered by company name
 *  - Optional LIMIT is applied if provided
 *
 * The function returns:
 *  - a SQL query string with positional parameters ($1, $2, …)
 *  - a params array suitable for pg / node-postgres execution
 *
 * @param options - Stage B detection options controlling filtering strategy
 *
 * @returns Object containing:
 *  - query  - Final SQL query string
 *  - params - Positional parameter values for the query
 */
export function buildQuery(options: StageBOptions): { query: string; params: any[] } {
    const { companyName, recheck = false, force = false } = options;

    let query = `
        SELECT c.id, c.company_name, c.normalized_name, c.careers_page_url
        FROM companies c
        WHERE c.careers_page_url IS NOT NULL
          AND c.careers_page_url NOT LIKE '%linkedin.com%'
    `;
    const params: any = [];

    if (companyName) {
        // Filter by company name (overrides other flags)
        params.push(`%${companyName}%`);
        query += ` AND c.company_name ILIKE $${params.length}`;
    } else if (recheck && force) {
        // --recheck --force: ALL companies
        // No additional filter
    } else if (recheck) {
        // --recheck: checked but no job_source
        query += `
            AND c.ats_checked_at IS NOT NULL
            AND NOT EXISTS (SELECT 1 FROM job_sources WHERE js.company_id = c.id)
            `;
    }
    else if (force) {
        // --force: new OR no job_source
        query += `
              AND (
                c.ats_checked_at IS NULL
                OR NOT EXISTS (SELECT 1 FROM job_sources js WHERE js.company_id = c.id)
              )
            `;
    } else {
        // Default: new companies only
        query += ` AND c.ats_checked_at IS NULL`;
    }

    query += ` ORDER BY c.company_name`;
    if (options.limit) {
        query += ` LIMIT ${options.limit}`;
    }

    return { query, params };
}
