import pg from 'pg';
import { Profile } from "../types/index.js";

const { Pool } = pg;
type PoolType = InstanceType<typeof Pool>;

export class ProfileService {
    constructor(private db: PoolType) {}

    /**
     * Retrieve the profile information for the specified user.
     *
     * Fetches the user's profile text and last update timestamp from the database.
     * Returns null if no profile record exists for the given user.
     *
     * @param userId - Identifier of the authenticated user.
     * @returns The user's profile data, or null if the profile does not exist.
     */
    async getProfile(userId: number): Promise<Profile | null> {
        const result = await this.db.query(
            `SELECT id, profile_text, updated_at
                            FROM users
                            WHERE id = $1`,
            [userId]
        );

        if (result.rows.length === 0) return null;

        return {
            userId: result.rows[0].id,
            profileText: result.rows[0].profile_text,
            updatedAt: result.rows[0].updated_at,
        };
    }

    /**
     * Create or update the user's profile text.
     *
     * Saves the provided profile text for the specified user and updates the
     * profile modification timestamp. If the user does not exist, an error is thrown.
     *
     * This method can be safely used both for initial profile creation and
     * subsequent profile updates.
     *
     * @param userId - Identifier of the authenticated user.
     * @param profileText - New profile text to save.
     * @returns The updated profile data after persistence.
     *
     * @throws Error if the specified user does not exist.
     */
    async saveProfile(userId: number, profileText: string): Promise<Profile> {
        const result = await this.db.query(
            `UPDATE users
                            SET profile_text = $1,
                            updated_at = NOW()
                            WHERE id = $2
                            RETURNING id as user_id, profile_text, updated_at`,
            [profileText, userId]
        );

        if (result.rows.length === 0) {
            throw new Error("User not found");
        }

        return {
            userId: result.rows[0].user_id,
            profileText: result.rows[0].profile_text,
            updatedAt: result.rows[0].updated_at,
        }
    }

    /**
     * Delete the user's profile text.
     *
     * Clears the profile text for the specified user by setting it to NULL
     * and updates the profile modification timestamp.
     *
     * This operation is idempotent: calling it multiple times has no additional effect
     * and does not throw an error if the profile text is already empty.
     *
     * @param userId - Identifier of the authenticated user.
     * @returns void
     */
    async deleteProfile(userId: number): Promise<void> {
        await this.db.query(
            `UPDATE users
            SET profile_text = NULL, updated_at = NOW()
            WHERE id = $1`,
            [userId]
        );
    }
}