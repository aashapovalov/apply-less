import pg from 'pg';
import { FavoriteJob } from "../types/index.js";

const { Pool } = pg;
type PoolType = InstanceType<typeof Pool>;

export class FavoritesService {
    constructor(private db: PoolType) {}

    /**
     * Retrieve all favorite jobs saved by a specific user.
     *
     * Returns the user's favorites enriched with full job and company details,
     * including title, company name, location, tags, original job URL,
     * posting date, and the timestamp when the job was saved.
     *
     * Results are ordered by save time in descending order (most recent first).
     *
     * @param userId - Identifier of the authenticated user.
     * @returns An array of favorite jobs with full metadata.
     */
    async getFavorites(userId: number): Promise<FavoriteJob[]> {
        const result = await this.db.query(
            `SELECT
                f.id as favorite_id,
                j.id as job_id,
                j.title,
                c.company_name,
                j.location,
                COALESCE(c.tags, ARRAY[]::text[]) as tags,
                f.canonical_url as url,
                j.posted_date,
                f.created_at as saved_at
            FROM favorites f
            JOIN jobs j ON f.job_id = j.id
            JOIN companies c ON j.company_id = c.id
            WHERE f.user_id = $1
            ORDER BY f.created_at DESC`,
            [userId]
        );

        return result.rows.map(row => ({
            favoriteId: row.favorite_id,
            jobId: row.job_id,
            title: row.title,
            companyName: row.company_name,
            location: row.location,
            tags: row.tags,
            url: row.url,
            postedDate: row.posted_date,
            savedAt: row.saved_at,
        }));
    }

    /**
     * Check whether a specific job is saved as a favorite by the given user.
     *
     * Performs an existence check in the favorites table to determine if
     * the user has already favorited the specified job.
     *
     * @param userId - Identifier of the authenticated user.
     * @param jobId - Identifier of the job to check.
     * @returns True if the job is favorited by the user, false otherwise.
     */
    async isFavorite(userId: number, jobId: number): Promise<boolean> {
        const result = await this.db.query(
            `SELECT 1 FROM favorites
                                WHERE user_id = $1 
                                AND job_id = $2`,
            [userId, jobId]
        );

        return result.rows.length > 0;
    }

    /**
     * Add a job to the user's favorites list.
     *
     * Verifies that the job exists, checks whether the job is already favorited by the user,
     * and if not, creates a new favorite record. If the job is already favorited, returns
     * the existing favorite identifier without creating a duplicate entry.
     *
     * @param userId - Identifier of the authenticated user.
     * @param jobId - Identifier of the job to add to favorites.
     * @returns An object containing the favorite record identifier.
     *
     * @throws FavoritesError 404 if the specified job does not exist.
     */
    async addFavorite(userId: number, jobId: number): Promise<{ favoriteId: number }> {
        // Check if job exists
        const jobCheck = await this.db.query(
            `SELECT id FROM jobs WHERE id = $1`,
            [jobId]
        );

        if (jobCheck.rows.length === 0) {
            throw new FavoritesError("Job not found", 404);
        }

        // Check if already favorited
        const existing = await this.db.query(
            `SELECT id FROM favorites WHERE user_id = $1 AND job_id = $2`,
            [userId, jobId]
        );

        if (existing.rows.length > 0) {
            return { favoriteId: existing.rows[0].id };
        }

        // Add favorite
        const result = await this.db.query(
            `INSERT INTO favorites (user_id, job_id, created_at)
                            VALUES ($1, $2, NOW())
                            RETURNING id`,
            [userId, jobId]
        );

        return { favoriteId: result.rows[0].id };
    }

    /**
     * Remove a job from the user's favorites list.
     *
     * Deletes the favorite record associated with the given user and job.
     * If the job was not previously favorited, no error is thrown and the method
     * simply returns false.
     *
     * @param userId - Identifier of the authenticated user.
     * @param jobId - Identifier of the job to remove from favorites.
     * @returns True if a favorite record was removed, false if no matching record existed.
     */
    async removeFavorite(userId: number, jobId: number): Promise<boolean> {
        const result = await this.db.query(
            `DELETE FROM favorites 
                           WHERE user_id = $1 AND job_id = $2
                           RETURNING id`,
            [userId, jobId]
        );

        return result.rows.length > 0;
    }

    /**
     * Retrieve the total number of jobs favorited by the given user.
     *
     * Performs an aggregate count query to determine how many favorite records
     * are associated with the specified user.
     *
     * @param userId - Identifier of the authenticated user.
     * @returns The total number of favorite jobs saved by the user.
     */
    async getFavoriteCount(userId: number): Promise<number> {
        const result = await this.db.query(
            `SELECT COUNT(*) FROM favorites WHERE user_id = $1`,
            [userId]
        );

        return parseInt(result.rows[0].count);
    }
}

/**
 * Custom error class for favorites-related operations.
 *
 * Represents domain-specific errors that occur within the favorites feature
 * (e.g., duplicate favorites, unauthorized access, invalid job/user references).
 * Carries an HTTP status code to be used directly in API responses.
 */
export class FavoritesError extends Error {

    /**
     * Create a new FavoritesError instance.
     *
     * @param message - Human-readable error message.
     * @param statusCode - HTTP status code associated with this error (default: 400).
     */
    constructor(message: string, public statusCode: number = 400) {
        super(message);
        this.name = 'FavoritesError';
    }
}
