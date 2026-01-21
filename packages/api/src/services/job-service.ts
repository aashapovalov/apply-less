import pg from "pg";
import { Job, JobDetail, JobListParams, JobMatch, MatchParams } from "../types/index.js";

const { Pool } = pg;
type PoolType = InstanceType<typeof Pool>;

export class JobService {
    constructor(private db: PoolType) {}

    /**
     * Get paginated list of jobs with optional filters
     */
    async getJobs(params: JobListParams): Promise<{ jobs: Job[], total: number }> {
        const {
            limit = 20,
            offset,
            location,
            company,
            tags,
            sort = "posted_date",
        } = params;

        let whereConditions: string[] = [];
        let queryParams: any[] = [];
        let paramIndex = 1;

        if (location) {
            whereConditions.push(`j.location ILIKE $${paramIndex}`);
            queryParams.push(`%${location}%`);
            paramIndex++;
        }

        if (company) {
            whereConditions.push(`c.company_name ILIKE $${paramIndex}`);
            queryParams.push(`%${company}%`);
            paramIndex++;
        }

        if (tags && tags.length > 0) {
            whereConditions.push(`c.tags && $${paramIndex}::text[]`);
            queryParams.push(tags);
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
     * Find jobs matching a profile embedding using vector similarity
     */
    async findMatchingJobs(params: MatchParams): Promise<{ matches: JobMatch[]; total: number }> {
        const {
            embedding,
            limit = 20,
            offset = 0,
            threshold = 0.0
        } = params;

        const embeddingStr = `[${embedding.join(",")}]`;

        // Count total matches above threshold
        const countQuery = `
            SELECT COUNT(*)
            FROM jobs j
            JOIN job_embeddings_simple je ON j.id = je.job_id
            WHERE 1 - (je.embedding <=> $1::vector) >= $2
        `;

        const countResult = await this.db.query(countQuery, [embeddingStr, threshold]);
        const total = parseInt(countResult.rows[0].count);

        //Get paginated matches
        const query = `
            SELECT
                j.id as job_id,
                j.title,
                c.company_name,
                j.location,
                COALESCE(c.tags, '{}') as tags,
                j.canonical_url as url,
                j.posted_date,
                1 - (je.embedding <=> $1::vector) as score
            FROM jobs j
            JOIN companies c ON j.company_id = c.id
            JOIN job_embeddings_simple je ON j.id = je.job_id
            WHERE 1 - (je.embedding <=> $1::vector) >= $2
            ORDER BY je.embedding <=> $1::vector
            LIMIT $3 OFFSET $4
        `;

        const result = await this.db.query(query, [embeddingStr, threshold, limit, offset]);

        return {
            matches: result.rows.map(row => ({
                ...row,
                score: parseFloat(row.score.toFixed(4))
            })),
            total,
        };
    }
}