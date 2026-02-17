import { Pool } from "pg";
import { JobSource } from "../types/index.js";

export class JobSourceService {
    constructor(private db: Pool) {}

    /**
     *  Create or update a job source
     */
    async upsertJobSource(jobSource: Omit<JobSource, "id" | "created_at">): Promise<{ id: number, isNew: boolean }> {
        const now = new Date();

        try {
            // Use ON CONFLICT to handle upsert properly
            const result = await this.db.query(
                `INSERT INTO job_sources (
                     company_id,
                     source_type,
                     base_url,
                     ats_identifier,
                     api_token,
                     detection_method,
                     confidence,
                     status,
                     last_checked_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                ON CONFLICT (company_id, source_type, base_url) 
                DO UPDATE SET
                    ats_identifier = CASE
                        -- Never overwrite a working identifier with null/empty
                        WHEN EXCLUDED.ats_identifier IS NULL OR EXCLUDED.ats_identifier = '' THEN job_sources.ats_identifier
                        -- Keep existing if it has associated active jobs (proven to work)
                        WHEN job_sources.ats_identifier IS NOT NULL 
                             AND job_sources.ats_identifier != ''
                             AND EXISTS (
                                 SELECT 1 FROM jobs j 
                                 WHERE j.source_id = job_sources.id 
                                 AND j.status = 'active'
                             )
                        THEN job_sources.ats_identifier
                        -- Otherwise use the new value
                        ELSE COALESCE(EXCLUDED.ats_identifier, job_sources.ats_identifier)
                    END,
                    api_token = COALESCE(EXCLUDED.api_token, job_sources.api_token),
                    detection_method = COALESCE(EXCLUDED.detection_method, job_sources.detection_method),
                    confidence = COALESCE(EXCLUDED.confidence, job_sources.confidence),
                    status = COALESCE(EXCLUDED.status, job_sources.status),
                    last_checked_at = $9
                RETURNING id, (xmax = 0) as is_new`,
                [
                    jobSource.company_id,
                    jobSource.source_type,
                    jobSource.base_url,
                    jobSource.ats_identifier || null,
                    jobSource.api_token || null,
                    jobSource.detection_method || null,
                    jobSource.confidence || null,
                    jobSource.status || "active",
                    now
                ]
            );

            return { 
                id: result.rows[0].id, 
                isNew: result.rows[0].is_new 
            };
        } catch (error: any) {
            console.error("❌ Database Error (JobSource):", error.message);
            throw error;
        }
    }

    /**
     * Get job sources for a company
     */
    async getJobSourcesByCompany( companyId: number ): Promise<JobSource[]> {
        const result = await this.db.query(
            `SELECT * FROM job_sources
                            WHERE company_id = $1
                            ORDER BY confidence DESC, created_at DESC`,
                            [companyId]);
        return result.rows;
    }

    /**
     * Get all active job sources
     */
    async getActiveJobSources(limit?: number): Promise<JobSource[]> {
        const query = limit
            ? `SELECT * FROM job_sources WHERE status = "active" ORDER BY last_checked_at ASC LIMIT $1`
            : `SELECT * FROM job_sources WHERE status = "active" ORDER BY last_checked_at ASC`;

        const result = limit
            ? await this.db.query(query, [limit])
            : await this.db.query(query);

        return result.rows;
    }

    /**
     * Get job sources by type
     */
    async getJobSourcesByType(sourceType: string, status: string = 'active'): Promise<JobSource[]> {
        const result = await this.db.query(
            `SELECT js.*, c.company_name, c.normalized_name
            FROM job_sources js
            JOIN companies ON js.company_id = c.id
            WHERE js.source_type = $1
            AND js.status = $2
            ORDER BY js.confidence DESC, js.last_checked_at ASC`,
            [sourceType, status]
        );
        return result.rows;
    }

    /**
     * Mark a job source as failed
     */
    async morkJobSourcesAsFailed(id: number): Promise<void> {
        await this.db.query(
            `UPDATE job_sources
            SET status = "failed",
            last_checked_at = NOW()
            WHERE id = $1`,
            [id]
        );
    }

    /**
     * Mark a job source as active
     */
    async markJobSourceAsActive(id: number): Promise<void> {
        await this.db.query(
            `UPDATE job_sources
            SET status = 'active',
            last_checked_at = NOW()
            WHERE id = $1`,
            [id]
        );
    }

    /**
     * Get statistics about job sources
     */
    async getJobSourcesStats(): Promise<{
        total: number;
        byType: Record<string, number>;
        byStatus: Record<string, number>;
    }> {
        const totalResult = await this.db.query(`SELECT COUNT(*) as count FROM job_sources`);
        const total = parseInt(totalResult.rows[0].count);

        // get stats by type
        const byTypeResult = await this.db.query(
            `SELECT source_type, COUNT(*) as count
            FROM job_sources
            GROUP BY source_type`
        );
        const byType: Record<string, number> = {};
        byTypeResult.rows.forEach(row => {
            byType[row.source_type] = parseInt(row.count);
        });

        // get stats by status
        const byStatusResult = await this.db.query(
            `SELECT status, COUNT(*) as count 
            FROM job_sources 
            GROUP BY status`
        );
        const byStatus: Record<string, number> = {};
        byStatusResult.rows.forEach(row => {
            byStatus[row.status] = parseInt(row.count);
        });

        return { total, byType, byStatus };
    }

    /**
     * Delete a job source
     */
    async deleteJobSource(id: number): Promise<void> {
        await this.db.query(`DELETE FROM job_sources WHERE id = $1`, [id]);
    }

    /**
     * Get count of job sources
     */
    async getJobSourceCount() {
        const result = await this.db.query(`SELECT COUNT(*) as count FROM job_sources`);
        return parseInt(result.rows[0].count);
    }
}
