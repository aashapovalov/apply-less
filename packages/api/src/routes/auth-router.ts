import dotenv from "dotenv";
import path from "node:path";
import pg from "pg";
import { fileURLToPath } from "node:url";
import { Router, Request, Response } from "express";

import { AuthService, AuthError} from "../services/index.js";
import { getDb } from "../config/db.js"
import {authMiddleware} from "../middleware/auth-middleware.js";

// Load .env from project root (two levels up from this file)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../../../');
const envPath = path.join(rootDir, '.env');
dotenv.config({ path: envPath });

export const authRouter = Router();

/**
 * Extract the client's IP address from the request.
 *
 * Prefers the `X-Forwarded-For` header (set by proxies / load balancers)
 * to determine the original client IP. Falls back to Express-calculated
 * IP or the underlying socket address if the header is not present.
 *
 * Useful for rate limiting, logging, auditing, and security checks.
 *
 * @param req - Express request object.
 * @returns The detected client IP address, or "unknown" if it cannot be determined.
 */
const getClientIp = (req: Request): string => {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
        return forwarded.split(",")[0].trim();
    }
    return req.ip || req.socket.remoteAddress || "unknown";
}

/**
 * POST /api/auth/register
 *
 * Register a new user account and send an email verification link.
 *
 * Expects an email and password in the request body. Validates input,
 * applies rate limiting by client IP, creates the user account,
 * generates an email verification token, and sends a verification email.
 *
 * @route POST /api/auth/register
 * @bodyparam email - User email address (required).
 * @bodyparam password - User password (required).
 *
 * @returns 200 { message: string } - Verification email sent successfully.
 * @returns 400 { error: string } - Missing or invalid email/password.
 * @returns 409 { error: string } - Email already registered.
 * @returns 429 { error: string } - Too many registration attempts.
 * @returns 500 { error: string } - Internal registration error.
 */
authRouter.post("/register", async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            res.status(400).json({ error: "Email and password are required" });
            return;
        }

        const authService = new AuthService(getDb());
        const result = await authService.register(email, password, getClientIp(req));

        res.status(200).json(result);
    } catch (error: any) {
        if (error instanceof AuthError) {
            res.status(error.statusCode).json({ error: error.message });
            return;
        }
        console.error("Register error:", error);
        res.status(500).json({ error: "Registration failed" });
    }
});

/**
 * POST /api/auth/login
 *
 * Authenticate a user using email and password and issue JWT tokens.
 *
 * Validates input, applies rate limiting by client IP, verifies user credentials,
 * checks email verification status, and returns a user object along with a newly
 * generated access and refresh token pair on successful authentication.
 *
 * @route POST /api/auth/login
 * @bodyparam email - User email address (required).
 * @bodyparam password - User password (required).
 *
 * @returns 200 { user: User, accessToken: string, refreshToken: string }
 *          - Authentication successful and tokens issued.
 * @returns 400 { error: string } - Missing email or password.
 * @returns 401 { error: string } - Invalid email or password.
 * @returns 403 { error: string } - Email is not verified.
 * @returns 429 { error: string } - Too many login attempts.
 * @returns 500 { error: string } - Internal authentication error.
 */
authRouter.post("/login", async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            res.status(400).json({ error: "Email and password are required" });
            return;
        }

        const authService = new AuthService(getDb());
        const result = await authService.login(email, password, getClientIp(req));

        res.json({
            user: result.user,
            accessToken: result.tokens.accessToken,
            refreshToken: result.tokens.refreshToken,
        });
    } catch (error: any) {
        if (error instanceof AuthError) {
            res.status(error.statusCode).json({ error: error.message });
            return;
        }
        console.error("Login error:", error);
        res.status(500).json({ error: "Login failed" });
    }
});

/**
 * POST /api/auth/refresh
 *
 * Issue a new access and refresh token pair using a valid refresh token.
 *
 * Validates the provided refresh token, revokes the old refresh token (rotation),
 * and returns a newly generated access and refresh token pair.
 * Used to maintain authenticated sessions without requiring the user to log in again.
 *
 * @route POST /api/auth/refresh
 * @bodyparam refreshToken - Refresh token issued during login (required).
 *
 * @returns 200 { accessToken: string, refreshToken: string }
 *          - New token pair issued successfully.
 * @returns 400 { error: string } - Missing refresh token.
 * @returns 401 { error: string } - Invalid or expired refresh token.
 * @returns 500 { error: string } - Internal token refresh error.
 */
authRouter.post("/refresh", async (req: Request, res: Response) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            res.status(400).json({ error: "Refresh token is required" });
            return;
        }

        const authService = new AuthService(getDb());
        const result = await authService.refresh(refreshToken);

        res.json({
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
        });
    } catch (error: any) {
        if (error instanceof AuthError) {
            res.status(error.statusCode).json({ error: error.message });
            return;
        }
        console.error("Refresh error:", error);
        res.status(500).json({ error: "Token refresh failed" });
    }
});

/**
* POST /api/auth/logout
*
* Log out a user by revoking the provided refresh token.
*
* Invalidates the refresh token so it can no longer be used to obtain new access tokens.
* This effectively terminates the user's session on the current device.
*
* @route POST /api/auth/logout
* @bodyparam refreshToken - Refresh token to revoke (required).
*
* @returns 200 { message: string } - Logout completed successfully.
* @returns 400 { error: string } - Missing refresh token.
* @returns 500 { error: string } - Internal logout error.
*/
authRouter.post("/logout", async (req: Request, res: Response) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            res.status(400).json({ error: "Refresh token is required" });
            return;
        }

        const authService = new AuthService(getDb());
        const result = await authService.logout(refreshToken);

        res.json({ message: "Logged out successfully" });
    } catch (error: any) {
        console.error("Logout error:", error);
        res.status(500).json({ error: "Logout failed" });
    }
});

/**
 * GET /api/auth/verify-email
 *
 * Verify a user's email address using a one-time verification token.
 *
 * Expects a verification token as a query parameter. If the token is valid and not expired,
 * marks the user's email as verified and redirects the user to the frontend login page
 * with a success indicator. If the token is invalid or expired, redirects with an error message.
 *
 * This endpoint is typically accessed via a link sent in a verification email.
 *
 * @route GET /api/auth/verify-email
 * @queryparam token - Email verification token (required).
 *
 * @returns 302 Redirect - Redirects to the frontend login page on success:
 *          `/login?verified=true`
 * @returns 302 Redirect - Redirects to the frontend login page with an error message on failure:
 *          `/login?error=<message>`
 * @returns 400 { error: string } - Missing or invalid verification token (API usage).
 * @returns 500 { error: string } - Internal email verification error.
 */
authRouter.get("/verify-email", async (req: Request, res: Response) => {
    try {
        const { token } = req.query;

        if (!token || typeof token !== "string") {
            res.status(400).json({ error: "Verification token is required" });
            return;
        }

        const authService = new AuthService(getDb());
        const result = await authService.verifyEmail(token);

        // Option 1: Return JSON (for API calls)
        // res.json(result);

        // Option 2: Redirect to frontend (for email links)
        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
        res.redirect(`${frontendUrl}/login?verified=true`);
        } catch (error: any) {
            if (error instanceof AuthError) {
                const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
                res.redirect(`${frontendUrl}/login?error=${encodeURIComponent(error.message)}`);
            }
            console.error("Verify email error:", error);
            res.status(500).json({ error: "Email verification failed" });
    }
});

/**
 * POST /api/auth/forgot-password
 *
 * Initiate a password reset flow by sending a reset link to the user's email address.
 *
 * Uses a generic success response regardless of whether the email exists
 * to prevent user enumeration attacks. Applies rate limiting by email/IP,
 * invalidates previous reset tokens for the user (if found), generates a new
 * reset token, and sends a password reset email.
 *
 * @route POST /api/auth/forgot-password
 * @bodyparam email - User email address (required).
 *
 * @returns 200 { message: string }
 *          - Generic response indicating that a reset link may have been sent.
 * @returns 400 { error: string } - Missing email.
 * @returns 429 { error: string } - Too many reset attempts.
 * @returns 500 { message: string }
 *          - Generic success message on internal errors (to prevent enumeration).
 */
authRouter.post("/forgot-password", async (req: Request, res: Response) => {
    try {
        const { email } = req.body;

        if (!email) {
            res.status(400).json({ error: "Email is required" });
            return;
        }

        const authService = new AuthService(getDb());
        const result = await authService.forgotPassword(email, getClientIp(req));

        res.json(result);
    } catch (error: any) {
        if (error instanceof AuthError) {
            res.status(error.statusCode).json({ error: error.message });
            return;
        }
        console.error("Forgot password error:", error);
        // Always return success to prevent email enumeration
        res.json({ message: "If the email exists, a reset link has been sent." });
    }
});

/**
 * POST /api/auth/reset-password
 *
 * Complete the password reset flow using a one-time reset token.
 *
 * Expects a valid reset token and a new password in the request body.
 * Validates the new password, consumes the reset token (one-time use),
 * updates the user's password, and revokes all existing user tokens
 * to force re-authentication across all sessions.
 *
 * @route POST /api/auth/reset-password
 * @bodyparam token - Password reset token from the email link (required).
 * @bodyparam password - New user password (required).
 *
 * @returns 200 { message: string }
 *          - Password reset completed successfully.
 * @returns 400 { error: string } - Missing token/password or invalid password format.
 * @returns 401 { error: string } - Invalid or expired reset token.
 * @returns 500 { error: string } - Internal password reset error.
 */
authRouter.post("/reset-password", async (req: Request, res: Response) => {
    try {
        const { token, password } = req.body;

        if (!token || !password) {
            res.status(400).json({ error: "Token and new password are required" });
            return;
        }

        const authService = new AuthService(getDb());
        const result = await authService.resetPassword(token, password);

        res.json(result);
    } catch (error: any) {
        if (error instanceof AuthError) {
            res.status(error.statusCode).json({ error: error.message });
            return;
        }
        console.error("Reset password error:", error);
        res.status(500).json({ error: "Password reset failed" });
    }
});

/**
 * GET /api/auth/me
 *
 * Retrieve the currently authenticated user's profile information.
 *
 * This endpoint requires a valid JWT access token and is protected by authentication middleware.
 * Uses the userId extracted from the access token to fetch the user's data from the database.
 *
 * @route GET /api/auth/me
 *
 * @returns 200 { user: User } - The authenticated user's profile data.
 * @returns 401 { error: string } - Missing, invalid, or expired access token.
 * @returns 404 { error: string } - User not found.
 * @returns 500 { error: string } - Internal error while retrieving user information.
 */
authRouter.get("/me", authMiddleware, async (req: Request, res: Response) => {
    try {
        const authService = new AuthService(getDb());
        const user = await authService.getCurrentUser(req.userId!);

        res.json( { user });
    } catch (error: any) {
        if (error instanceof AuthError) {
            res.status(error.statusCode).json({ error: error.message });
            return;
        }
        console.error("Get user error:", error);
        res.status(500).json({ error: "Failed to get user info" });
    }
});

/**
 * POST /api/auth/resend-verification
 *
 * Resend an email verification link to a user who has not yet verified their email address.
 *
 * Uses a generic success response to avoid leaking whether the email exists.
 * Applies rate limiting by client IP, checks if the user exists and is unverified,
 * invalidates any previous verification tokens, generates a new verification token,
 * and sends a new verification email.
 *
 * @route POST /api/auth/resend-verification
 * @bodyparam email - User email address (required).
 *
 * @returns 200 { message: string }
 *          - Generic response indicating that a verification link may have been sent.
 * @returns 400 { error: string } - Missing email.
 * @returns 429 { error: string } - Too many resend attempts.
 * @returns 500 { message: string }
 *          - Generic success message on internal errors (to prevent enumeration).
 */
authRouter.post("/resend-verification", async (req: Request, res: Response) => {
    try {
        const { email } = req.body;

        if (!email) {
            res.status(400).json({ error: "Email is required" });
            return;
        }

        const authService = new AuthService(getDb());
        const result = await authService.resendVerification(email, getClientIp(req));

        res.json(result);
    } catch (error: any) {
        if (error instanceof AuthError) {
            res.status(error.statusCode).json({ error: error.message });
            return;
        }
        console.error("Resend verification error:", error);
        res.json({ message: "If the email exists and is unverified, a new verification link has been sent." });
    }
})