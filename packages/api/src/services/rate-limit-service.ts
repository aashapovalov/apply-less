import pg from 'pg';

import { RateLimitConfig } from "../types/index.js";

const { Pool } = pg;
type PoolType = InstanceType<typeof Pool>;

const RATE_LIMITS: Record<string, RateLimitConfig> = {
    login: { maxAttempts: 5, windowMinutes: 15 },
    register: { maxAttempts: 3, windowMinutes: 60 },
    forgot_password: { maxAttempts: 3, windowMinutes: 60 },
}

export class RateLimitService {
    constructor(private db: PoolType) {}

    /**
     * Check if actions is rate limited
     * @returns true if allowed, false if rate limited
     */
    async checkLimit(action: string, identifier: string): Promise<{ allowed: boolean, retryAfter?: number } > {
        const config = RATE_LIMITS[action];
        if (!config) {
            return { allowed: true }
        }

        const key = `${action}:${identifier}`;
        const windowStart = new Date(Date.now() - config.windowMinutes * 60 * 1000);

        // Get current rate limit record
        const result = await this.db.query(
            `SELECT attempts, window_start FROM rate_limits WHERE key = $1`,
            [key]
        );

        if (result.rows.length === 0) {
            return { allowed: true }
        }

        const record = result.rows[0];
        const recordWindowStart = new Date(record.window_start);

        // If window has expired, allow
        if (recordWindowStart < windowStart) {
            return { allowed: true }
        }

        // Check if attempts exceeded
        if (record.attempts >= config.maxAttempts) {
            const retryAfter = Math.ceil(
                (recordWindowStart.getTime() + config.windowMinutes * 60 * 1000 - Date.now()) / 1000
            );
            return { allowed: false, retryAfter };
        }

        return { allowed: true };
    }

    /**
     * Record an attempt for rate limiting
     */
    async recordAttempt(action: string, identifier: string): Promise<void> {
        const config = RATE_LIMITS[action];
        if (!config) return;

        const key = `${action}:${identifier}`;
        const windowStart = new Date(Date.now() - config.windowMinutes * 60 * 1000);

        // Upsert: increment if within the window, reset if window expired
        await this.db.query(
            `INSERT INTO rate_limits rl (key, attempts, window_start)
                            VALUES ($1, 1, NOW())
                            ON CONFLICT (key) DO UPDATE SET 
                            attempts = CASE
                                WHEN rl.window_start < $2 THEN 1
                                ELSE rl.attempts + 1
                            END
                            window_start CASE
                                WHEN rl.window_start < $2 THEN NOW()
                                ELSE rl.window_start
                            END`,
            [key, windowStart]
        );
    }

    /**
     * Reset rate limit (e.g. after successful login)
     */
    async resetLimit(action: string, identifier: string): Promise<void> {
        const key = `${action}:${identifier}`;
        await this.db.query(`DELETE FROM rate_limits WHERE key = $1`, [key]);
    }

    /**
     * Clean up expired rate limit records (call periodically)
     */
    async cleanUp(): Promise<number> {
        // Delete records older than the longest window (60 minutes)
        const result = await this.db.query(
            `DELETE FROM rate_limits WHERE window_start < INTERVAL '60 minutes'`
        );
        return result.rowCount || 0;
    }
}
