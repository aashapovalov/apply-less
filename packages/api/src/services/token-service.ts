import crypto from "crypto";
import jwt from "jsonwebtoken";
import path from "node:path";
import pg from "pg";
import dotenv from "dotenv";

import { fileURLToPath } from "node:url";

import {TokenPair} from "../types/index.js";

// Load .env from project root (two levels up from this file)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../../../');
const envPath = path.join(rootDir, '.env');
dotenv.config({ path: envPath });


const { Pool } = pg;
type PoolType = InstanceType<typeof Pool>;

//Token configuration
const ACCESS_TOKEN_EXPIRY = "1h";
const REFRESH_TOKEN_EXPIRY_DAYS = 30;
const VERIFICATION_TOKEN_EXPIRY_HOURS = 24;
const RESET_TOKEN_EXPIRY_HOURS = 1;

export class TokenService {
    constructor(private db: PoolType) {}

    /**
     * Generate access + refresh token pair
     */
    async generateTokenPair(userId: number): Promise<TokenPair> {
        const accessToken = this.generateAccessToken(userId);
        const refreshToken = await this.generateRefreshToken(userId);
        return { accessToken, refreshToken };
    }

    /**
     * Generate JWT access token
     */
    generateAccessToken(userId: number): string {
        const secret = process.env.JWT_SECRET;
        if (!secret) throw new Error("JWT_SECRET is not configured")

        return jwt.sign({ userId, type: "access"}, secret, { expiresIn: ACCESS_TOKEN_EXPIRY });
    }

    /**
     * Create and store refresh token
     */
    async generateRefreshToken(userId: number): Promise<string> {
        const token = crypto.randomBytes(32).toString("hex");
        const hash = this.hashToken(token);
        const expiresAt = this.getExpiry(REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60);

        await this.db.query(
            `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) 
                            VALUES ($1, $2, $3)`,
            [userId, hash, expiresAt],
        );

        return token;
    }

    /**
     * Validate refresh token and return user ID
     */
    async validateRefreshToken(token: string): Promise<{ id: number, userId: number } | null>
    {
        const hash = this.hashToken(token);

        const result = await this.db.query(
            `SELECT id, user_id FROM refresh_tokens
                            WHERE token_hash = $1 
                            AND revoked_at IS NULL 
                            AND expires_at > NOW()`,
            [hash],
        );

        if (result.rows.length === 0) return null;
        return { id: result.rows[0].id, userId: result.rows[0].user_id };
    }

    /**
     * Revoke a refresh token
     */
    async revokeRefreshToken(token: string): Promise<void> {
        const hash = this.hashToken(token);
        await this.db.query(`UPDATE refresh_tokens  
                                            SET revoked_at = NOW() 
                                            WHERE token_hash = $1`,
            [hash]);
    }

    /**
     * Revoke refresh token by ID
     */
    async revokeRefreshTokenById(id: number): Promise<void> {
        await this.db.query(`UPDATE refresh_tokens 
                                            SET revoked_at = NOW() 
                                            WHERE user_id = $1`,
            [id]);
    }

    /**
     * Revoke oll refresh tokens for user
     */
    async revokeAllUserTokens(userId: number): Promise<void> {
        await this.db.query(
            `UPDATE refresh_tokens
                            SET revoked_at = NOW()
                            WHERE user_id = $1
                            AND revoked_at IS NULL`,
            [userId],
        );
    }

    /**
     * Create verification token
     */
    async createVerificationToken(userId: number): Promise<string> {
        const token = crypto.randomBytes(32).toString("hex");
        const hash = this.hashToken(token);
        const expiresAt = this.getExpiry(VERIFICATION_TOKEN_EXPIRY_HOURS * 60);

        await this.db.query(
            `INSERT INTO verification_tokens (user_id, token_hash, expires_at)
                            VALUES ($1, $2, $3)`,
            [userId, hash, expiresAt]
        );

        return token;
    }

    /**
     * Validate and consume verification token
     */
    async consumeVerificationToken(token: string): Promise<number | null> {
        const hash = this.hashToken(token);

        const result = await this.db.query(
            `UPDATE verification_tokens
                            SET used_at = NOW()
                            WHERE token_hash = $1
                            AND used_at IS NULL
                            AND expires_at > NOW()
                            RETURNING user_id`,
            [hash]
        );

        if (result.rows.length === 0) return null;
        return result.rows[0].user_id;
    }

    /**
     * Invalidate all verification tokens for user
     */
    async invalidateVerificationTokens(userId: number): Promise<void> {
        await this.db.query(
            `UPDATE verification_tokens
                            SET used_at = NOW()
                            WHERE user_id = $1
                            AND used_at IS NULL`,
            [userId]
        );
    }

    /**
     * Create password reset token
     */
    async createResetToken(userId: number): Promise<string> {
        const token = crypto.randomBytes(32).toString("hex");
        const hash = this.hashToken(token);
        const expiresAt = this.getExpiry(RESET_TOKEN_EXPIRY_HOURS * 60);

        await this.db.query(
            `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) 
                            VALUES ($1, $2, $3)`,
            [userId, hash, expiresAt]
        );

        return token;
    }

    /**
     * Validate and consume reset token
     */
    async consumeResetToken(token: string): Promise<number | null> {
        const hash = this.hashToken(token);

        const result = await this.db.query(
            `UPDATE password_reset_tokens 
                            SET used_at = NOW() 
                            WHERE token_hash = $1 
                            AND used_at IS NULL AND expires_at > NOW()
                            RETURNING user_id`,
            [hash]
        );

        if (result.rows.length === 0) return null;
        return result.rows[0].user_id;
    }

    /**
     * Invalidate all reset tokens for user
     */
    async invalidateResetTokens(userId: number): Promise<void> {
        await this.db.query(
            `UPDATE password_reset_tokens 
                            SET used_at = NOW() 
                            WHERE user_id = $1 
                            AND used_at IS NULL`,
            [userId]
        );
    }

    // --- Helpers ---
    private hashToken(token: string): string {
        return crypto.createHash("sha256").update(token).digest("hex");
    }

    private getExpiry(minutes: number): Date {
        return new Date(Date.now() + minutes * 60 * 1000);
    }
}