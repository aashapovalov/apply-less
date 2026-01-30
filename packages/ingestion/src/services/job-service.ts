import { Pool } from "pg";
import { Job } from "../types/index.js";

export class JobService {
  constructor(private db: Pool) {}

  /**
   * Normalize text for comparison (lowercase, trim, remove special chars)
   */
  private normalize(text: string) {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, " ");
  }

  /**
   * Upsert a job (create or update)
   * First checks by external_id (most reliable), then falls back to title+location+url
   */
  async upsertJob(
    job: Omit<Job, "id" | "created_at" | "updated_at">,
  ): Promise<{ id: number; isNew: boolean }> {
    const now = new Date();

    const normalizedTitle = this.normalize(job.title);
    const normalizedLocation = job.location
      ? this.normalize(job.location)
      : null;

    try {
      let existing = null;
      if (job.external_id) {
        existing = await this.db.query(
          `SELECT id FROM jobs WHERE external_id = $1 LIMIT 1`,
          [job.external_id],
        );
      }

      if (!existing || existing.rows.length === 0) {
        existing = await this.db.query(
          `SELECT id FROM jobs
           WHERE company_id = $1
             AND normalized_title = $2
             AND normalized_location IS NOT DISTINCT FROM $3
             LIMIT 1`,
          [job.company_id, normalizedTitle, normalizedLocation],
        );
      }

      if (existing.rows.length > 0) {
        const id = existing.rows[0].id;

        await this.db.query(
          `UPDATE jobs
           SET last_seen_at = $1,
               updated_at = $1,
               status = $2,
               canonical_url = COALESCE($3, canonical_url),
               description = COALESCE($4, description),
               requirements = COALESCE($5, requirements),
               benefits = COALESCE($6, benefits),
               employment_type = COALESCE($7, employment_type),
               department = COALESCE($8, department),
               country = COALESCE($9, country),
               region = COALESCE($10, region),
               city = COALESCE($11, city)
           WHERE id = $12`,
          [
            now,
            job.status || "active",
            job.canonical_url,
            job.description,
            job.requirements,
            job.benefits,
            job.employment_type,
            job.department,
            job.country,
            job.region,
            job.city,
            id,
          ],
        );

        return { id, isNew: false };
      } else {
        const result = await this.db.query(
          `INSERT INTO jobs (
            company_id,
            title,
            normalized_title,
            location,
            normalized_location,
            country,
            region,
            city,
            department,
            employment_type,
            description,
            requirements,
            benefits,
            canonical_url,
            external_id,
            posted_date,
            status,
            first_seen_at,
            last_seen_at,
            updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $18, $18)
             RETURNING id`,
          [
            job.company_id,
            job.title,
            normalizedTitle,
            job.location || null,
            normalizedLocation,
            job.country || null,
            job.region || null,
            job.city || null,
            job.department || null,
            job.employment_type || null,
            job.description,
            job.requirements || null,
            job.benefits || null,
            job.canonical_url,
            job.external_id || null,
            job.posted_date || null,
            job.status || "active",
            now,
          ],
        );

        return { id: result.rows[0].id, isNew: true };
      }
    } catch (error: any) {
      console.error("❌ Database Error (Job):", error.message);
      throw error;
    }
  }

  /**
   * Get jobs by company
   */
  async getJobsByCompany(companyId: number): Promise<Job[]> {
    const result = await this.db.query(
      `SELECT * FROM jobs
                            WHERE company_id = $1
                            ORDER BY posted_date DESC, created_at DESC`,
      [companyId],
    );
    return result.rows;
  }

  /**
   * Get active jobs
   */
  async getActiveJobs(limit?: number): Promise<Job[]> {
    const query = limit
      ? `SELECT * FROM jobs WHERE status = "active" ORDER BY posted_date DESC LIMIT $1`
      : `SELECT * FROM jobs WHERE status = "active" ORDER BY posted_date DESC`;

    const result = limit
      ? await this.db.query(query, [limit])
      : await this.db.query(query);

    return result.rows;
  }

  /**
   * Mark old jobs as expired
   */
  async markExpiredJobs(daysOld: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.db.query(
      `UPDATE jobs
            SET status = "expired", updated_at = NOW()
            WHERE last_seen_at < $1
            AND status = "active"
            RETURNING id`,
      [cutoffDate],
    );
    return result.rowCount || 0;
  }

  /**
   * Get job statistics
   */
  async getJobsStats(): Promise<{
    total: number;
    active: number;
    byCompany: Record<string, number>;
  }> {
    const totalResult = await this.db.query(
      `SELECT COUNT(*) as count FROM jobs`,
    );
    const total = parseInt(totalResult.rows[0].count);

    const activeResult = await this.db.query(
      `SELECT COUNT(*) as count FROM jobs WHERE status = "active"`,
    );
    const active = parseInt(activeResult.rows[0].count);

    const byCompanyResult = await this.db.query(
      `SELECT c.company_name, COUNT(*) as count 
                            FROM jobs j
                            JOIN companies ON j.company_id = c.id
                            where j.status = "active"
                            GROUP BY c.company_name
                            ORDER BY count DESC`,
    );

    const byCompany: Record<string, number> = {};
    byCompanyResult.rows.forEach((row) => {
      byCompany[row.company_name] = parseInt(row.count);
    });

    return { total, active, byCompany };
  }

  /**
   * Get job count
   */
  async getJobCount(): Promise<number> {
    const result = await this.db.query(`SELECT COUNT(*) as count FROM jobs`);
    return parseInt(result.rows[0].count);
  }
}
