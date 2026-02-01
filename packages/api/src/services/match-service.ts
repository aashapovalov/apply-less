import pg from "pg";

import { JobService } from "./job-service.js";
import { MatchRequest, MatchResponse, JobMatch } from "../types/index.js";
import { MATCHING_QUERY } from "../constants/index.js";

const { Pool } = pg;
type PoolType = InstanceType<typeof Pool>;

/**
 * Weight configuration for the matching strategy.
 *
 * The final relevance score is computed as a weighted sum of
 * cosine similarities between profile and job embeddings.
 */
const TITLE_WEIGHT: number = 0.4;
const EXPERIENCE_WEIGHT: number = 0.35;
const FULL_WEIGHT: number = 0.25;

/**
 * MatchService
 *
 * Service responsible for matching a user's profile against job postings
 * using semantic similarity over precomputed vector embeddings.
 *
 * Core responsibilities:
 *  - Retrieve user profile embeddings from the database
 *  - Execute weighted similarity queries against job embeddings
 *  - Apply pagination and threshold filtering
 *
 * Matching is performed entirely at the database level using vector similarity
 * (pgvector), ensuring low latency and scalable retrieval.
 */
export class MatchService {
  private jobService: JobService;

  constructor(private db: PoolType) {
    this.jobService = new JobService(db);
  }

  /**
   * Match a user profile against active jobs using a weighted similarity strategy:
   *  - 40% similarity between profile title and job title/header
   *  - 35% similarity between profile experience and job requirements
   *  - 25% similarity between full profile and full job description
   *
   * Preconditions:
   *  - The user must exist
   *  - The user's profile must have precomputed embeddings
   *
   * @param request - Matching request parameters.
   * @param request.userId - Identifier of the authenticated user.
   * @param request.limit - Maximum number of results to return.
   * @param request.offset - Pagination offset.
   * @param request.threshold - Minimum score threshold for matches.
   *
   * @returns A paginated list of job matches with relevance scores.
   *
   * @throws Error if userId is missing.
   * @throws Error if user does not exist.
   * @throws Error if profile embeddings are not available.
   */
  async matchProfile(request: MatchRequest): Promise<MatchResponse> {
    const { userId, limit = 20, offset = 0, threshold = 0.0 } = request;

    if (!userId) {
      throw new Error("User ID is required");
    }

    console.log(`🔍 Matching jobs for user ${userId}...`);

    // Get user's pre-computed embeddings from DB
    const userResult = await this.db.query(
      `SELECT title_embedding, experience_embedding
      FROM users
      WHERE id = $1`,
      [userId],
    );

    if (!userResult.rows[0]) {
      throw new Error("User not found");
    }

    const { title_embedding, experience_embedding } = userResult.rows[0];

    if (!title_embedding || !experience_embedding) {
      throw new Error(
        "Profile embedding not found. Please save your profile first.",
      );
    }

    // Run weighted matching query
    const { matches, total } = await this.findMatchingJobsWeighted({
      titleEmbedding: title_embedding,
      experienceEmbedding: experience_embedding,
      limit,
      offset,
      threshold,
    });

    console.log(`✅ Found ${total} matches (returning ${matches.length})`);

    return {
      matches,
      total,
      has_more: offset + matches.length < total,
    };
  }

  /**
   * Execute a weighted similarity query to find matching jobs.
   *
   * Uses a dynamically generated SQL query that:
   *  - Computes cosine similarity between profile and job embeddings
   *  - Applies configured weights for title, experience, and full-document similarity
   *  - Filters by score threshold
   *  - Applies pagination (limit/offset)
   *
   * Jobs missing specific chunk embeddings fall back to a neutral similarity
   * score (e.g. 0.5) for the missing components.
   *
   * @param params - Matching parameters.
   * @param params.titleEmbedding - Profile title embedding vector (pgvector).
   * @param params.experienceEmbedding - Profile experience embedding vector (pgvector).
   * @param params.limit - Maximum number of matches to return.
   * @param params.offset - Pagination offset.
   * @param params.threshold - Minimum relevance score.
   *
   * @returns A list of job matches and the total count of eligible jobs.
   */
  private async findMatchingJobsWeighted(params: {
    titleEmbedding: string;
    experienceEmbedding: string;
    limit: number;
    offset: number;
    threshold: number;
  }): Promise<{ matches: JobMatch[]; total: number }> {
    const { titleEmbedding, experienceEmbedding, limit, offset, threshold } =
      params;

    // Weighted matching query
    // Jobs without chunk embeddings fall back to 0.5 for those components
    const query = MATCHING_QUERY(TITLE_WEIGHT, EXPERIENCE_WEIGHT, FULL_WEIGHT);

    const result = await this.db.query(query, [
      titleEmbedding,
      experienceEmbedding,
      threshold,
      limit,
      offset,
    ]);

    //Get total count
    const countResult = await this.db.query(`
    SELECT COUNT(*) as total
    FROM jobs j
    JOIN job_embeddings_simple je on j.id = je.job_id
    WHERE j.country = 'IL' AND j.status = 'active'`);
    const total = parseInt(countResult.rows[0].total);

    const matches: JobMatch[] = result.rows.map((row) => ({
      job_id: row.job_id,
      title: row.title,
      company_name: row.company_name,
      location: row.location,
      region: row.region,
      city: row.city,
      tags: row.tags,
      url: row.url,
      posted_date: row.posted_date,
      score: parseFloat(parseFloat(row.score).toFixed(4)),
    }));

    return { matches, total };
  }
}
