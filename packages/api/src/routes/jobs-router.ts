import { Router, Request, Response } from "express";

import { getDb } from "../config/db.js";
import { JobService } from "../services/index.js";

export const jobsRouter = Router();

/**
 * GET /api/jobs
 * List all jobs with pagination and filters
 * Defaults to Israel-only jobs
 */
jobsRouter.get("/", async (req: Request, res: Response) => {
    try {
        const {
            limit = "20",
            offset = "0",
            location,
            region,
            city,
            company,
            tags,
            search,
            title,
            postedAfter,
            sort = "posted_date",
        } = req.query;

        const jobService = new JobService(getDb());

        const result = await jobService.getJobs({
            limit: Math.min(parseInt(limit as string) || 20, 100),
            offset: parseInt(offset as string) || 0,
            location: location as string | undefined,
            region: region as string | undefined,
            city: city as string | undefined,
            company: company as string | undefined,
            tags: tags ? (Array.isArray(tags) ? tags as string[] : [tags as string]) : undefined,
            search: search as string | undefined,
            title: title as string | undefined,
            postedAfter: postedAfter as string | undefined,
            sort: (sort as "posted_date" | "company" | "title") || "posted_date",
            countryFilter: "IL", // Israel-only by default
        });

        res.json({
            jobs: result.jobs,
            total: result.total,
            has_more: (parseInt(offset as string) || 0) + result.jobs.length < result.total,
        });
    } catch (error: any) {
        console.error("Error fetching jobs:", error.message);
        res.status(500).json({ error: "Failed to fetch jobs" });
    }
});

/**
 * GET /api/jobs/regions
 * Get available regions with job counts
 */
jobsRouter.get("/regions", async (req: Request, res: Response) => {
    try {
        const jobService = new JobService(getDb());
        const regions = await jobService.getRegions();
        res.json({ regions });
    } catch (error: any) {
        console.error("Error fetching regions:", error.message);
        res.status(500).json({ error: "Failed to fetch regions" });
    }
});

/**
 * GET /api/jobs/cities
 * Get available cities with job counts
 */
jobsRouter.get("/cities", async (req: Request, res: Response) => {
    try {
        const { region } = req.query;
        const jobService = new JobService(getDb());
        const cities = await jobService.getCities(region as string | undefined);
        res.json({ cities });
    } catch (error: any) {
        console.error("Error fetching cities:", error.message);
        res.status(500).json({ error: "Failed to fetch cities" });
    }
});

/**
 * GET /api/jobs/companies
 * Get companies with active jobs (for autocomplete)
 */
jobsRouter.get("/companies", async (req: Request, res: Response) => {
    try {
        const { search, limit = "20" } = req.query;
        const jobService = new JobService(getDb());
        const companies = await jobService.getCompanies(
            search as string | undefined,
            Math.min(parseInt(limit as string) || 20, 50)
        );
        res.json({ companies });
    } catch (error: any) {
        console.error("Error fetching companies:", error.message);
        res.status(500).json({ error: "Failed to fetch companies" });
    }
});

/**
 * GET /api/jobs/:id
 * Get single job with full details
 */
jobsRouter.get("/:id", async (req: Request, res: Response) => {
    try {
        const idParam = req.params.id;

        if (Array.isArray(idParam)) {
            res.status(400).json({ error: "Invalid job ID" });
            return;
        }
        const jobID = parseInt(idParam);

        if (isNaN(jobID)) {
            res.status(400).json({ error: "Invalid job ID" });
            return;
        }

        const jobService = new JobService(getDb());
        const job = await jobService.getJobById(jobID);

        if (!job) {
            res.status(404).json({ error: "Job not found" });
            return;
        }

        res.json(job);
    } catch (error: any) {
        console.error("Error fetching job:", error.message);
        res.status(500).json({ error: "Failed to fetch job" });
    }
});
