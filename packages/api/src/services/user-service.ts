import pg from "pg";

import { hashPassword, verifyPassword } from "../utils/password-validation.js";
import {User, UserWithPassword} from "../types/index.js";

const { Pool } = pg;
type PoolType = InstanceType<typeof Pool>;

export class UserService {
    constructor(private db: PoolType) {}

    /**
     * Find user by emoil
     */
    async findByEmail(email: string): Promise<UserWithPassword | null> {
        const result = await this.db.query(
            `SELECT id, email, display_name, password_hash, email_verified
                            FROM users
                            WHERE email = $1`,
            [email.toLowerCase()]
        );

        return result.rows[0] || null;
    }

    /**
     * Find user by ID
     */
    async findById(userId: number): Promise<User | null> {
        const result = await this.db.query(
            `SELECT id, email, display_name, password_hash, email_verified
                            FROM users
                            WHERE id = $1`,
            [userId]
        );
        return result.rows[0] || null;
    }

    /**
     * Check if email exists
     */
    async emailExists(email: string): Promise<boolean> {
        const result = await this.db.query(
            `SELECT * FROM users 
                            WHERE email = $1`,
            [email.toLowerCase()]
        );
        return result.rows.length > 0;
    }

    /**
     * Create new user
     */
    async createUser(email: string, password: string): Promise<number> {
        const passwordHashed = await hashPassword(password);

        const result = await this.db.query(
            `INSERT into users (email, password_hash, email_verified, created_at, updated_at)
                            VALUES ($1, $2, FALSE, NOW(), NOW())`,
            [email.toLowerCase(), passwordHashed]
        );

        return result.rows[0].id
    }

    /**
     * Verify user password
     */
    async verifyCredentials(email: string, password: string): Promise<User | null> {
        const user = await this.findByEmail(email);

        if (!user || !user.password_hash) return null;

        const valid = await verifyPassword(password, user.password_hash);

        if (!valid) return null;

        return {
            id: user.id,
            email: user.email,
            display_name: user.display_name,
            email_verified: user.email_verified,
        };
    }

    /**
     * Mark as verified
     */
    async verifyEmail(userId: number): Promise<void> {
        await this.db.query(
            `UPDATE users
                            SET email_verified = TRUE
                            WHERE id = $1`,
            [userId]
        );
    }

    /**
     * Update password
     */
    async updatePassword(userId: number, newPassword: string): Promise<void> {
        await this.db.query(
            `UPDATE users
                            SET password_hash = $1,
                            updated_at = NOW()
                            WHERE id = $2`,
            [newPassword, userId]
        );
    }

    /**
     * Convert to public user (without sensitive fields)
     */
    toPublicUser(user: User): User {
        return {
            id: user.id,
            email: user.email,
            display_name: user.display_name,
            email_verified: user.email_verified,
        };
    }
}