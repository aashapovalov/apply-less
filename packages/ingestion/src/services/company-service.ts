import { Pool } from "pg";
import {Company, CompanyDetails, SNCCompanyRaw} from "../types/index.js";
import {normalizeName} from "../utils/urlNormalizer.js";

export class CompanyService {
    constructor(private db: Pool) {}

    /**
     *  Transform SNC raw data to database Company scheme
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
     *  Insert a company if it is new, update a company if it exists
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
     * update company with details form SNC company page (website, careers URL, social links)
     */
    async updateCompanyDetails(companyId: number, details: CompanyDetails): Promise<void> {
        const now = new Date();

        await this.db.query(
            `UPDATE companies
            SET company_website_url = COALESCE($1, company_website_url),
                careers_page_url = COALESCE($2, careers_page_url),
                linkedin_url = COALESCE($3, linkedin_url),
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
     *  Get total number of companies in DB
     */
    async getCompanyCount(): Promise<number> {
        const result = await this.db.query(`SELECT COUNT(*) AS count FROM companies`);
        return parseInt(result.rows[0].count);
    }

    /**
     *  Get recent companies
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
     *  Get companies by source
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