import { Router, Request, Response } from "express";

import { getDb } from "../config/db.js";
import { MatchService } from "../services/index.js";
import { authMiddleware } from "../middleware/auth-middleware.js";

export const matchRouter = Router();

// All match routes require authentication
matchRouter.use(authMiddleware);
/**
 * POST /api/match
 *
 * Match the authenticated user's profile against available jobs.
 *
 * This endpoint uses pre-computed profile embeddings generated when the
 * profile was last saved and matches them against job embeddings using
 * a weighted semantic similarity strategy:
 *
 *  - 40% profile title ↔ job title similarity
 *  - 35% profile experience ↔ job requirements similarity
 *  - 25% full profile ↔ full job description similarity
 *
 * @route POST /api/match
 * @middleware authMiddleware
 *
 * @body {number} [limit=20]    - Maximum number of results to return (max: 100)
 * @body {number} [offset=0]   - Pagination offset
 * @body {number} [threshold=0] - Minimum relevance score threshold
 *
 * @returns 200 { matches: JobMatch[], total: number, has_more: boolean }
 *          - List of matched jobs with relevance scores and pagination metadata.
 * @returns 401 { error: string }
 *          - Missing, invalid, or expired access token.
 * @returns 500 { error: string, details?: string }
 *          - Internal error during profile matching.
 */
matchRouter.post("/", async (req: Request, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const { limit = 20, offset = 0, threshold = 0.0 } = req.body;

    const matchService = new MatchService(getDb());

    const results = await matchService.matchProfile({
      userId,
      limit: Math.min(limit, 100),
      offset,
      threshold,
    });

    res.json(results);
  } catch (error: any) {
    console.error("Error matching profile:", error.message);
    res
      .status(500)
      .json({ error: "Failed to match profile", details: error.message });
  }
});
