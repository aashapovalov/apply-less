import { Router, Request, Response } from "express";

import { getDb } from "../config/db.js";
import {authMiddleware} from "../middleware/auth-middleware.js";
import {ProfileService} from "../services/index.js";

/**
 * Profile API router.
 *
 * Provides endpoints for retrieving, creating/updating, and deleting
 * the authenticated user's profile information.
 *
 * All routes in this router require authentication and use authMiddleware
 * to extract the user identity from the access token.
 */
export const profileRouter = Router();

// All favorites routes require authentication
profileRouter.use(authMiddleware);

/**
 * GET /api/profile
 *
 * Retrieve the authenticated user's profile information.
 *
 * This endpoint requires authentication. Returns the user's profile text
 * and last update timestamp if a profile exists. If no profile data is found,
 * responds with 404.
 *
 * @route GET /api/profile
 * @middleware authMiddleware
 *
 * @returns 200 { profile: Profile }
 *          - The user's profile data.
 * @returns 401 { error: string } - Missing, invalid, or expired access token.
 * @returns 404 { error: string } - Profile not found.
 * @returns 500 { error: string } - Internal error while retrieving profile.
 */
profileRouter.get("/", async (req:Request, res:Response) => {
    try {
        const profileService = new ProfileService(getDb());
        const profile = await profileService.getProfile(req.userId!);

        if (!profile) {
            res.status(404).json({ error: "Profile not found" });
            return;
        }

        res.json({ profile });
    } catch (error: any) {
        console.error("Get profile error", error);
        res.status(500).json({ error: "Failed to get profile" });
    }
})

/**
* POST /api/profile
*
* Create or update the authenticated user's profile text.
*
* This endpoint requires authentication. Validates the provided profile text,
* enforces a maximum length limit, and saves the profile content for the user.
* Can be used both for initial profile creation and subsequent updates.
*
* @route POST /api/profile
* @middleware authMiddleware
* @bodyparam profileText - Profile text content (required, max 50 000 characters).
*
* @returns 200 { profile: Profile, message: string }
*          - Updated profile data and confirmation message.
* @returns 400 { error: string } - Missing or invalid profileText, or text too long.
* @returns 401 { error: string } - Missing, invalid, or expired access token.
* @returns 500 { error: string } - Internal error while saving profile.
*/
profileRouter.post("/", async (req:Request, res:Response) => {
    try {
        const { profileText } = req.body;

        if (!profileText || typeof profileText !== "string") {
            res.status(400).json({ error: "profileText is required" });
            return;
        }

        if (profileText.length > 50000) {
            res.status(400).json({ error: "ProfileText too long (max 50 000 chars)" });
            return;
        }

        const profileService = new ProfileService(getDb());
        const profile = await profileService.saveProfile(req.userId!, profileText);

        res.json({ profile, message: "Profile saved successfully" });
    } catch (error: any) {
        console.error("Save profile error", error);
        res.status(500).json({ error: "Failed to save profile" });
    }
});

/**
 * DELETE /api/profile
 *
 * Delete the authenticated user's profile text.
 *
 * This endpoint requires authentication. Clears the profile text by setting it
 * to NULL and updates the profile modification timestamp. The operation is
 * idempotent and succeeds even if the profile is already empty.
 *
 * @route DELETE /api/profile
 * @middleware authMiddleware
 *
 * @returns 200 { message: string } - Profile deleted successfully.
 * @returns 401 { error: string } - Missing, invalid, or expired access token.
 * @returns 500 { error: string } - Internal error while deleting profile.
 */
profileRouter.delete("/", async (req:Request, res:Response) => {
    try {
        const profileService = new ProfileService(getDb());
        await profileService.deleteProfile(req.userId!);

        res.json({ message: "Profile deleted successfully" });
    } catch (error: any) {
        console.error("Delete profile error", error);
        res.status(500).json({ error: "Failed to delete profile" });
    }
});