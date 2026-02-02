import { Router } from "express";

import { authMiddleware } from "../middleware/auth-middleware.js";
import { MLServiceClient } from "../clients/index.js";
import { getDb } from "../config/db.js";
import { MIN_PROFILE_WORDS } from "../constants/index.js";

export const cvRouter = Router();

/**
 * POST /api/cv/generate
 *
 * Generate a job-specific CV for the authenticated user.
 *
 * This endpoint generates a tailored CV by combining the user's saved
 * profile with a target job description using the ML service.
 *
 * The request requires the user to be authenticated and to have a
 * sufficiently detailed profile stored in the system.
 *
 * Processing steps:
 * 1. Authenticate the user via access token
 * 2. Retrieve the user's profile text from the database
 * 3. Validate profile existence and minimum length
 * 4. Validate required job fields
 * 5. Call the ML service to generate a tailored CV
 * 6. Return the generated CV and match summary
 *
 * @route POST /api/cv/generate
 * @middleware authMiddleware
 *
 * @body {string} job_title
 *        Target job title.
 * @body {string} job_description
 *        Full job description text.
 * @body {string} [job_company]
 *        Optional company name.
 * @body {string} [job_location]
 *        Optional job location.
 *
 * @returns 200
 *          - Generated CV in Markdown format with skill match summary.
 * @returns 400 { error: string }
 *          - Missing or invalid input (e.g. profile missing or too short).
 * @returns 401 { error: string }
 *          - Missing or invalid authentication token.
 * @returns 500 { error: string }
 *          - Internal error during CV generation.
 */
cvRouter.post("/generate", authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;

    // Get user profile
    const db = await getDb();
    const profileResult = await db.query(
      "SELECT profile_text FROM users WHERE id = $1",
      [userId],
    );

    const profileText = profileResult.rows[0]?.profile_text;

    if (!profileText || profileText.trim().length === 0) {
      return res
        .status(400)
        .json({ error: "Profile is required to generate CV" });
    }

    const wordCount = profileText.trim().split(/\s+/).length;
    if (wordCount < MIN_PROFILE_WORDS) {
      return res.status(400).json({
        error: `Profile too short (${wordCount} words). Minimum ${MIN_PROFILE_WORDS} words required.`,
        wordCount,
        minRequired: MIN_PROFILE_WORDS,
      });
    }

    const { job_title, job_company, job_location, job_description } = req.body;

    if (!job_title || !job_description) {
      return res
        .status(400)
        .json({ error: "job_title and job_description are required" });
    }

    // Call ML service
    const mlClient = new MLServiceClient();
    const result = await mlClient.generateCV({
      job_title,
      job_company: job_company || "",
      job_location: job_location || "",
      job_description,
      profile_text: profileText,
    });

    res.json(result);
  } catch (error) {
    console.error("CV generation error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to generate CV";
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/cv/compare
 *
 * Compare a CV against a job description.
 *
 * This endpoint evaluates how well a given CV matches a specific job by:
 *  - extracting skills from both CV and job description
 *  - checking coverage of mandatory and preferred requirements
 *  - computing a semantic similarity score
 *
 * The comparison does not require a stored user profile and operates
 * directly on the provided CV text.
 *
 * @route POST /api/cv/compare
 * @middleware authMiddleware
 *
 * @body {string} cv_text
 *        Full CV / resume text.
 * @body {string} job_description
 *        Full job description text.
 * @body {string} [job_title]
 *        Optional job title for semantic enrichment.
 * @body {string} [job_company]
 *        Optional company name for semantic enrichment.
 *
 * @returns 200
 *          - CV comparison result including match score and coverage analysis.
 * @returns 400 { error: string }
 *          - Missing required input fields.
 * @returns 401 { error: string }
 *          - Missing or invalid authentication token.
 * @returns 500 { error: string }
 *          - Internal error during CV comparison.
 */
cvRouter.post("/compare", authMiddleware, async (req, res) => {
  try {
    const { cv_text, job_title, job_company, job_description } = req.body;

    if (!cv_text || !job_description) {
      return res
        .status(400)
        .json({ error: "cv_text and job_description are required" });
    }

    // Call ML service
    const mlClient = new MLServiceClient();
    const result = await mlClient.compareCV({
      cv_text,
      job_title: job_title || "",
      job_company: job_company || "",
      job_description,
    });

    res.json(result);
  } catch (error) {
    console.error("CV comparison error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to compare CV";
    res.status(500).json({ error: message });
  }
});
