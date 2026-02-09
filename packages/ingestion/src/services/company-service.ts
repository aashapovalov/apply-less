import { Pool } from "pg";
import {Company, CompanyDetails, SNCCompanyRaw} from "../types/index.js";
import {normalizeName} from "../utils/index.js";

/**
 * Service responsible for transforming, persisting, and querying company records.
 * Primarily used for handling companies sourced from Startup Nation Central (SNC),
 * including upserts and detail-page freshness tracking.
 */
export class CompanyService {
    constructor(private db: Pool) {}

    /**
     * Transform a Startup Nation Central raw company record into the DB `Company` shape.
     *
     * Notes:
     * - `company_name` is taken from `raw.name`.
     * - `normalized_name` is generated using {@link normalizeName} for stable matching/upserts.
     * - If `raw.website` is missing, falls back to `raw.sncUrl` as a best-effort website URL.
     * - `source_type` is set to `"snc"`.
     *
     * @param raw - Raw company object from SNC ingestion.
     * @returns A partial `Company` object suitable for insert/upsert.
     */
    transformSNCCompany(raw: SNCCompanyRaw): Partial<Company> {
        return {
            company_name: raw.name,
            normalized_name: normalizeName(raw.name),
            company_website_url: raw.website || raw.sncUrl,  // Use SNC URL as fallback
            snc_company_page_url: raw.sncUrl,
            tags: raw.tags || [],
            founded_year: raw.foundedYear,
            source_type: "snc"
        }
    }

    /**
     * Insert a company if it does not exist; otherwise update the existing record.
     *
     * Matching strategy:
     * - First tries to find an existing record by `normalized_name`
     * - Or by `snc_company_page_url` (useful if the name changes but SNC URL stays stable)
     *
     * Update behavior (if exists):
     * - Updates `last_seen_at` and `updated_at` to "now"
     * - Updates `tags` and `founded_year` only when provided (via `COALESCE`)
     *
     * Insert behavior (if new):
     * - Inserts baseline company fields
     * - Sets `first_seen_at`, `last_seen_at`, and `updated_at` to "now"
     * - Returns the newly created `id`
     *
     * @param company - Company fields to upsert (typically from `transformSNCCompany`).
     * @returns An object containing:
     *  - `id`: the DB company id
     *  - `isNew`: `true` if inserted, `false` if updated
     * @throws Rethrows database errors after logging.
     */
    async upsertCompany(company: Partial<Company>): Promise<{ id: number, isNew: boolean }> {
        const normalizedName = company.normalized_name || "";
        const now = new Date();

        try {
            // Check if company exists by normalized name or SNC URL
            const existing = await this.db.query(
                `SELECT id FROM companies
                                WHERE normalized_name = $1
                                OR snc_company_page_url = $2
                                LIMIT 1`,
                                [normalizedName, company.snc_company_page_url]
            );

            if (existing.rows.length > 0) {
                // Update existing company
                const id = existing.rows[0].id;

                await this.db.query(
                    `UPDATE companies
                    SET last_seen_at = $1,
                        updated_at = $1,
                        tags = COALESCE($2, tags),
                        founded_year = COALESCE($3, founded_year)
                        WHERE id = $4`,
                        [now, company.tags, company.founded_year, id]
                )
                return { id, isNew: false };
            } else {
                const result = await this.db.query(
                    `INSERT INTO companies (
                                        company_name,
                                        normalized_name,
                                        company_website_url,
                                        snc_company_page_url,
                                        tags,
                                        founded_year,
                                        source_type,
                                        first_seen_at,
                                        last_seen_at,
                                        updated_at
                                     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8, $8)
                                     RETURNING id`,
                    [company.company_name,
                    normalizedName,
                    company.company_website_url || null,
                    company.snc_company_page_url,
                    company.tags || [],
                    company.founded_year || null,
                    'snc',
                    now
                    ]
                );

                return { id: result.rows[0].id, isNew: true };
            }
        } catch (error: any) {
            console.error("❌ Database Error:", error.message);
            throw error;
        }
    }

    /**
     * Update a company record with detailed fields scraped from the SNC company page.
     *
     * Behavior:
     * - Uses `COALESCE` so that null/undefined values won't overwrite existing DB values
     * - Always updates `details_fetched_at` and `updated_at` to "now"
     *
     * @param companyId - DB id of the company to update.
     * @param details - Details scraped from the company page (website, careers URL, LinkedIn, etc.).
     * @returns Resolves when the update completes.
     */
    async updateCompanyDetails(companyId: number, details: CompanyDetails): Promise<void> {
        const now = new Date();

        await this.db.query(
            `UPDATE companies
            SET company_website_url = COALESCE($1, company_website_url),
                careers_page_url = COALESCE($2, careers_page_url),
                linkedin_url = COALESCE($3, linkedin_url),
                details_fetched_at = $4,
                updated_at = $4
            WHERE id = $5`,
            [
                details.websiteUrl,
                details.careersUrl,
                details.socialLinks?.linkedin,
                now,
                companyId,
            ]
        );
    }

    /**
     * Fetch companies that have never had their detail page fetched.
     * These are the highest priority for detail scraping.
     *
     * Selection criteria:
     * - `details_fetched_at IS NULL`
     * - `snc_company_page_url IS NOT NULL`
     * - `source_type = 'snc'`
     *
     * Ordering:
     * - Oldest created first (`created_at ASC`) to process backlog deterministically
     *
     * @param limit - Maximum number of companies to return.
     * @returns Array of minimal company fields required for scraping (id, name, SNC URL).
     */
    async getCompaniesNeedingDetails(limit: number): Promise<Array<{ id: number, company_name: string, snc_company_page_url: string }>> {
        const result = await this.db.query(
            `SELECT id, company_name, snc_company_page_url
            FROM companies
            WHERE details_fetched_at IS NULL 
            AND snc_company_page_url IS NOT NULL 
            AND source_type = 'snc'
            ORDER BY created_at ASC 
            LIMIT $1`,
            [limit]
        );
        return result.rows;
    }

    /**
     * Fetch companies whose details are considered stale (older than N days).
     * This is the second priority after companies with no details at all.
     *
     * Selection criteria:
     * - `details_fetched_at IS NOT NULL`
     * - `details_fetched_at < NOW() - INTERVAL '1 day' * staleDays`
     * - `snc_company_page_url IS NOT NULL`
     * - `source_type = 'snc'`
     *
     * Ordering:
     * - Oldest `details_fetched_at` first to refresh the stalest records first
     *
     * @param staleDays - Number of days after which details are considered stale.
     * @param limit - Maximum number of companies to return.
     * @returns Array of minimal company fields required for scraping (id, name, SNC URL).
     */
    async getStaleCompanies(
        staleDays: number,
        limit: number
    ): Promise<Array<{ id: number, company_name: string, snc_company_page_url: string }>> {
        const result  = await this.db.query(
            `SELECT id, company_name, snc_company_page_url
            FROM companies
            WHERE details_fetched_at IS NOT NULL
            AND details_fetched_at < NOW() - INTERVAL '1 day' * $1
            AND snc_company_page_url IS NOT NULL
            AND source_type = 'snc'
            ORDER BY details_fetched_at ASC
            LIMIT $2`,
            [staleDays, limit]
        );

        return result.rows;
    }

    /**
     * Get total number of companies in the database.
     *
     * @returns Total count of rows in `companies`.
     */
    async getCompanyCount(): Promise<number> {
        const result = await this.db.query(`SELECT COUNT(*) AS count FROM companies`);
        return parseInt(result.rows[0].count);
    }

    /**
     * Get most recently seen companies.
     *
     * @param limit - Maximum number of companies to return.
     * @returns Companies ordered by `last_seen_at` descending.
     */
    async getRecentCompanies(limit: number): Promise<Company[]> {
        const result = await this.db.query(
            `SELECT * FROM companies
                            ORDER BY last_seen_at DESC 
                            LIMIT $1`,
            [limit]
        );
        return result.rows;
    }

    /**
     * Get up to 100 companies by source type.
     *
     * @param sourceType - Source identifier stored in `companies.source_type` (e.g., `"snc"`).
     * @returns Companies for the given source type ordered by `last_seen_at` descending.
     */
    async getCompaniesBySource(sourceType: string): Promise<Company[]> {
        const result = await this.db.query(
            `SELECT * FROM companies
                            WHERE source_type = $1
                            ORDER BY last_seen_at DESC 
                            LIMIT 100`,
            [sourceType]
        );
        return result.rows;
    }
}