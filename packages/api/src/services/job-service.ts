import pg from "pg";
import { Job, JobDetail, JobListParams, JobMatch, MatchParams } from "../types/index.js";

const { Pool } = pg;
type PoolType = InstanceType<typeof Pool>;

export class JobService {
    constructor(private db: PoolType) {}

    /**
     * Get paginated list of jobs with optional filters
     * Defaults to Israel-only (country = 'IL')
     */
    async getJobs(params: JobListParams): Promise<{ jobs: Job[], total: number }> {
        const {
            limit = 20,
            offset,
            location,
            region,
            city,
            company,
            tags,
            search,
            sort = "posted_date",
            countryFilter = "IL", // Default to Israel-only
        } = params;

        let whereConditions: string[] = ["j.status = 'active'"];
        let queryParams: any[] = [];
        let paramIndex = 1;

        // Country filter (default: Israel only)
        if (countryFilter) {
            whereConditions.push(`j.country = $${paramIndex}`);
            queryParams.push(countryFilter);
            paramIndex++;
        }

        // Region filter
        if (region) {
            whereConditions.push(`j.region = $${paramIndex}`);
            queryParams.push(region);
            paramIndex++;
        }

        // City filter
        if (city) {
            whereConditions.push(`j.city ILIKE $${paramIndex}`);
            queryParams.push(`%${city}%`);
            paramIndex++;
        }

        // Location filter (legacy - searches normalized location)
        if (location) {
            whereConditions.push(`j.location ILIKE $${paramIndex}`);
            queryParams.push(`%${location}%`);
            paramIndex++;
        }

        // Company filter
        if (company) {
            whereConditions.push(`c.company_name ILIKE $${paramIndex}`);
            queryParams.push(`%${company}%`);
            paramIndex++;
        }

        // Tags filter
        if (tags && tags.length > 0) {
            whereConditions.push(`c.tags && $${paramIndex}::text[]`);
            queryParams.push(tags);
            paramIndex++;
        }

        // Search filter (title or company)
        if (search) {
            whereConditions.push(`(j.title ILIKE $${paramIndex} OR c.company_name ILIKE $${paramIndex})`);
            queryParams.push(`%${search}%`);
            paramIndex++;
        }

        const whereClause = whereConditions.length > 0
            ? `WHERE ${whereConditions.join(" AND ")}`
            : "";

        const sortColumn = {
            posted_date: "j.posted_date DESC NULLS LAST, j.id DESC",
            company: "c.company_name ASC, j.title ASC",
            title: "j.title ASC",
        }[sort];

        // Get total count
        const countQuery = `
            SELECT COUNT(*)
            FROM jobs j
            JOIN companies c ON j.company_id = c.id
            ${whereClause}
        `;
        const countResult = await this.db.query(countQuery, queryParams);
        const total = parseInt(countResult.rows[0].count);

        // Get paginated results
        const query = `
            SELECT
                j.id as job_id,
                j.title,
                c.company_name,
                j.location,
                j.region,
                j.city,
                COALESCE(c.tags, ARRAY[]::text[]) as tags,
                j.canonical_url as url,
                j.posted_date
            FROM jobs j
            JOIN companies c ON j.company_id = c.id
            ${whereClause}
            ORDER BY ${sortColumn}
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;

        const result = await this.db.query(query, [...queryParams, limit, offset]);
        return {
            jobs: result.rows,
            total,
        };
    }

    /**
     * Get single job by ID with full details
     */
    async getJobById(jobId: number): Promise<JobDetail | null> {
        const query = `
            SELECT
                j.id as job_id,
                j.title,
                c.company_name,
                j.location,
                j.region,
                j.city,
                j.country,
                COALESCE(c.tags, ARRAY[]::text[]) as tags,
                j.canonical_url as url,
                j.description,
                j.requirements,
                j.department,
                j.posted_date
            FROM jobs j
            JOIN companies c ON j.company_id = c.id
            WHERE j.id = $1
        `;

        const result = await this.db.query(query, [jobId]);

        if (result.rows.length === 0) {
            return null;
        }

        return result.rows[0];
    }

    /**
     * Get available regions with job counts
     */
    async getRegions(): Promise<{ region: string; count: number }[]> {
        const query = `
            SELECT region, COUNT(*) as count
            FROM jobs
            WHERE country = 'IL' AND status = 'active' AND region IS NOT NULL
            GROUP BY region
            ORDER BY count DESC
        `;
        const result = await this.db.query(query);
        return result.rows.map(row => ({
            region: row.region,
            count: parseInt(row.count)
        }));
    }

    /**
     * Get available cities with job counts
     */
    async getCities(region?: string): Promise<{ city: string; count: number }[]> {
        let query = `
            SELECT city, COUNT(*) as count
            FROM jobs
            WHERE country = 'IL' AND status = 'active' AND city IS NOT NULL
        `;
        const params: any[] = [];
        
        if (region) {
            query += ` AND region = $1`;
            params.push(region);
        }
        
        query += ` GROUP BY city ORDER BY count DESC LIMIT 50`;
        
        const result = await this.db.query(query, params);
        return result.rows.map(row => ({
            city: row.city,
            count: parseInt(row.count)
        }));
    }

    /**
     * Find jobs matching a profile embedding using vector similarity
     * Defaults to Israel-only
     */
    async findMatchingJobs(params: MatchParams): Promise<{ matches: JobMatch[]; total: number }> {
        const {
            embedding,
            limit = 20,
            offset = 0,
            threshold = 0.0,
            countryFilter = "IL", // Default to Israel-only
        } = params;

        const embeddingStr = `[${embedding.join(",")}]`;

        // Build WHERE clause
        let whereConditions: string[] = [`1 - (je.embedding <=> $1::vector) >= $2`];
        let queryParams: any[] = [embeddingStr, threshold];
        let paramIndex = 3;

        if (countryFilter) {
            whereConditions.push(`j.country = $${paramIndex}`);
            queryParams.push(countryFilter);
            paramIndex++;
        }

        const whereClause = `WHERE ${whereConditions.join(" AND ")}`;

        // Count total matches above threshold
        const countQuery = `
            SELECT COUNT(*)
            FROM jobs j
            JOIN job_embeddings_simple je ON j.id = je.job_id
            ${whereClause}
        `;

        const countResult = await this.db.query(countQuery, queryParams);
        const total = parseInt(countResult.rows[0].count);

        // Get paginated matches
        const query = `
            SELECT
                j.id as job_id,
                j.title,
                c.company_name,
                j.location,
                j.region,
                j.city,
                COALESCE(c.tags, '{}') as tags,
                j.canonical_url as url,
                j.posted_date,
                1 - (je.embedding <=> $1::vector) as score
            FROM jobs j
            JOIN companies c ON j.company_id = c.id
            JOIN job_embeddings_simple je ON j.id = je.job_id
            ${whereClause}
            ORDER BY je.embedding <=> $1::vector
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;

        const result = await this.db.query(query, [...queryParams, limit, offset]);

        return {
            matches: result.rows.map(row => ({
                ...row,
                score: parseFloat(row.score.toFixed(4))
            })),
            total,
        };
    }
}
