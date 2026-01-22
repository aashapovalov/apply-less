import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import path from "node:path";
import pg from "pg";

import {fileURLToPath} from "node:url";
import { NextFunction, Request, Response } from "express";

import { JwtPayload } from "../types/index.js"


// Load .env from project root (two levels up from this file)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../../../');
const envPath = path.join(rootDir, '.env');
dotenv.config({ path: envPath });

// Extend Express Request type to include user
declare global {
    namespace Express {
        interface Request {
            userId?: number;
        }
    }
}

/**
* Middleware to authenticate requests using a JWT access token.
* Expects an Authorization header in the format "Bearer <token>".
* Verifies the token signature, checks token type, and attaches the userId
* from the token payload to the request object if valid.
    *
    * On failure, responds with an appropriate 401 error and does not call next().
*
* @param req - Express request object (userId is attached on success).
* @param res - Express response object.
* @param next - Express next middleware function.
*
* @throws 401 if Authorization header is missing, malformed, token is invalid,
*         expired, or token type is not "access".
* @throws 500 if JWT_SECRET is not configured or an unexpected error occurs.
*/
export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ error: "Authentication header required" });
        return;
    }

    const token = authHeader.substring(7); // Remove "Bearer" prefix

    try {
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            console.error("JWT_SECRET not configured");
            res.status(500).json({ error: "Server configuration error"});
            return;
        }

        const payload = jwt.verify(token, jwtSecret) as JwtPayload;

        if (payload.type !== "access") {
            res.status(401).json({ error: "Invalid token type" });
            return;
        }

        req.userId = payload.userId;
        next();
    } catch (error: any) {
        if (error.name === "TokenExpiredError") {
            res.status(401).json({ error: "Token expired", code: "TOKEN_EXPIRED" });
            return;
        }
        if (error.name === "JsonWebTokenError") {
            res.status(401).json({ error: "Invalid token" });
            return;
        }
        console.error("Auth middleware error:", error);
        res.status(500).json({ error: "Authentication failed"});
    }
};

/**
 * Optional authentication middleware.
 *
 * Attempts to authenticate the request using a JWT access token if present,
 * but never blocks the request if authentication fails or no token is provided.
 *
 * If a valid access token is found, attaches the userId from the token payload
 * to the request object. Otherwise, the request continues as an anonymous user.
 *
 * Useful for endpoints that behave differently for authenticated vs anonymous users
 * (e.g., personalization, conditional data exposure, feature flags).
 *
 * @param req - Express request object (userId is attached if authentication succeeds).
 * @param res - Express response object.
 * @param next - Express next middleware function.
 */
export const optionalAuthMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        next();
        return;
    }

    const token = authHeader.substring(7);

    try {
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            next();
            return;
        }

        const payload = jwt.verify(token, jwtSecret) as JwtPayload;

        if (payload.type === "access") {
            req.userId = payload.userId;
        }
    } catch (error: any) {
        // Ignore errors for optional auth
    }
    next();
}