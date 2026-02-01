import { Router, Request, Response } from "express";

import { authMiddleware } from "../middleware/auth-middleware.js";
import { FavoritesError, FavoritesService } from "../services/index.js";
import { getDb } from "../config/db.js";

export const favoritesRouter = Router();

// All favorites routes require authentication
favoritesRouter.use(authMiddleware);

/**
 * GET /api/favorites
 *
 * Retrieve all favorite jobs saved by the authenticated user.
 *
 * This endpoint requires authentication. Returns the full list of the
 * user's favorite jobs enriched with job and company details,
 * along with the total count of favorites.
 *
 * @route GET /api/favorites
 * @middleware authMiddleware
 *
 * @returns 200 { favorites: FavoriteJob[], count: number }
 *          - List of favorite jobs and total favorites count.
 * @returns 401 { error: string } - Missing, invalid, or expired access token.
 * @returns 500 { error: string } - Internal error while retrieving favorites.
 */
favoritesRouter.get("/", async (req: Request, res: Response) => {
  try {
    const favoritesService = new FavoritesService(getDb());
    const favorites = await favoritesService.getFavorites(req.userId!);
    const count = favorites.length;

    res.json({ favorites, count });
  } catch (error: any) {
    console.error("Get favorites error: ", error);
    res.status(500).json({ error: "Failed to get favorites" });
  }
});

/**
 * GET /api/favorites/:jobId
 *
 * Check whether a specific job is favorited by the authenticated user.
 *
 * This endpoint requires authentication. Returns a boolean flag indicating
 * whether the given job is currently saved in the user's favorites list.
 *
 * @route GET /api/favorites/:jobId
 * @middleware authMiddleware
 * @param jobId - Job identifier from the URL path.
 *
 * @returns 200 { isFavorite: boolean }
 *          - Indicates whether the job is favorited by the user.
 * @returns 400 { error: string } - Invalid job ID format.
 * @returns 401 { error: string } - Missing, invalid, or expired access token.
 * @returns 500 { error: string } - Internal error while checking favorite status.
 */
favoritesRouter.get("/:jobId", async (req: Request, res: Response) => {
  try {
    const jobIdParam = req.params.jobId;

    if (Array.isArray(jobIdParam)) {
      res.status(400).json({ error: "Invalid job ID" });
      return;
    }

    const jobId = parseInt(jobIdParam);

    if (isNaN(jobId)) {
      res.status(400).json({ error: "Invalid job ID" });
      return;
    }

    const favoritesService = new FavoritesService(getDb());
    const isFavorite = await favoritesService.isFavorite(req.userId!, jobId);

    res.json({ isFavorite });
  } catch (error: any) {
    console.error("Get favorites error: ", error);
    res.status(500).json({ error: "Failed to check favorite status" });
  }
});

/**
 * POST /api/favorites/:jobId
 *
 * Add a job to the authenticated user's favorites list.
 *
 * This endpoint requires authentication. Validates the job identifier,
 * verifies that the job exists, and adds it to the user's favorites list.
 * If the job is already favorited, returns the existing favorite identifier
 * without creating a duplicate entry.
 *
 * @route POST /api/favorites/:jobId
 * @middleware authMiddleware
 * @param jobId - Job identifier from the URL path.
 *
 * @returns 201 { message: string, favoriteId: number }
 *          - Job successfully added to favorites (or already existed).
 * @returns 400 { error: string } - Invalid job ID format.
 * @returns 401 { error: string } - Missing, invalid, or expired access token.
 * @returns 404 { error: string } - Job not found.
 * @returns 500 { error: string } - Internal error while adding favorite.
 */
favoritesRouter.post("/:jobId", async (req: Request, res: Response) => {
  try {
    const jobIdParam = req.params.jobId;

    if (Array.isArray(jobIdParam)) {
      res.status(400).json({ error: "Invalid job ID" });
      return;
    }

    const jobId = parseInt(jobIdParam);

    if (isNaN(jobId)) {
      res.status(400).json({ error: "Invalid job ID" });
      return;
    }

    const favoritesService = new FavoritesService(getDb());
    const result = await favoritesService.addFavorite(req.userId!, jobId);

    res.status(201).json({
      message: "Job added to favorites",
      favoriteId: result.favoriteId,
    });
  } catch (error: any) {
    if (error instanceof FavoritesError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error("Add favorite error: ", error);
    res.status(500).json({ error: "Failed to add favorite" });
  }
});

/**
 * DELETE /api/favorites/:jobId
 *
 * Remove a job from the authenticated user's favorites list.
 *
 * This endpoint requires authentication. Validates the job identifier and deletes
 * the favorite record for the given user and job. If the favorite does not exist,
 * responds with 404.
 *
 * @route DELETE /api/favorites/:jobId
 * @middleware authMiddleware
 * @param jobId - Job identifier from the URL path.
 *
 * @returns 200 { message: string } - Job removed from favorites.
 * @returns 400 { error: string } - Invalid job ID format.
 * @returns 401 { error: string } - Missing, invalid, or expired access token.
 * @returns 404 { error: string } - Favorite not found.
 * @returns 500 { error: string } - Internal error while removing favorite.
 */
favoritesRouter.delete("/:jobId", async (req: Request, res: Response) => {
  try {
    const jobIdParam = req.params.jobId;

    if (Array.isArray(jobIdParam)) {
      res.status(400).json({ error: "Invalid job ID" });
      return;
    }

    const jobId = parseInt(jobIdParam);

    if (isNaN(jobId)) {
      res.status(400).json({ error: "Invalid job ID" });
      return;
    }

    const favoritesService = new FavoritesService(getDb());
    const removed = await favoritesService.removeFavorite(req.userId!, jobId);

    if (!removed) {
      res.status(404).json({ error: "Favorite not found" });
    }

    res.json({ message: "Job removed from favorites" });
  } catch (error: any) {
    console.error("Remove favorite error: ", error);
    res.status(500).json({ error: "Failed to remove favorite" });
  }
});
