import pg from "pg";

import { Profile } from "../types/index.js";
import { getMLClient, MLServiceClient } from "../clients/index.js";

const { Pool } = pg;
type PoolType = InstanceType<typeof Pool>;

/**
 * ProfileService
 *
 * Service responsible for managing user profile text and derived embeddings.
 *
 * Responsibilities:
 *  - Persisting and retrieving raw profile text
 *  - Generating and storing semantic embeddings via ML service
 *  - Ensuring profile persistence is resilient to ML failures
 *
 * This service intentionally treats ML enrichment as a best-effort operation:
 * profile text persistence must never fail due to embedding or chunking errors.
 */
export class ProfileService {
  constructor(private db: PoolType) {}

  /**
   * Retrieve the profile text for a given user.
   *
   * Fetches the stored profile text from the database.
   * Returns `null` if the user exists but has no profile text set.
   *
   * @param userId - Identifier of the authenticated user.
   * @returns An object containing the profile text, or null if not present.
   */
  async getProfile(userId: number): Promise<{ profileText: string | null }> {
    const result = await this.db.query(
      `SELECT profile_text FROM users WHERE id = $1`,
      [userId],
    );
    return { profileText: result.rows[0]?.profile_text || null };
  }

  /**
   * Create or update a user's profile text and derived embeddings.
   *
   * Persists the profile text and updates the modification timestamp.
   * After successful persistence, attempts to enrich the profile with
   * semantic embeddings (title and experience) using the ML service.
   *
   * Embedding generation is performed on a best-effort basis:
   * failures in chunking or embedding generation are logged but do NOT
   * cause the profile save operation to fail.
   *
   * @param userId - Identifier of the authenticated user.
   * @param profileText - Raw profile text (CV, LinkedIn export, free text).
   * @returns The updated profile domain object.
   *
   * @throws Error if the user does not exist in the database.
   */
  async saveProfile(userId: number, profileText: string): Promise<Profile> {
    // Save profile text
    const result = await this.db.query(
      `UPDATE users
       SET profile_text = $1, updated_at = NOW()
       WHERE id = $2
         RETURNING updated_at`,
      [profileText, userId],
    );

    const updatedAt = result.rows[0]?.updated_at || new Date();

    /**
     * ML enrichment block
     *
     * Generates:
     *  - Title embedding (from extracted profile headline)
     *  - Experience embedding (from chunked experience section)
     *
     * This block is intentionally isolated in a try/catch to ensure
     * profile persistence is not coupled to ML availability.
     */
    try {
      const mlClient = getMLClient();

      // Chunk the profile to get experience embedding
      const chunkResult = await mlClient.chunkProfile(profileText);

      // Extract title line and generate its embedding
      const titleLine = MLServiceClient.extractProfileTitle(profileText);
      const titleEmbedding = await mlClient.embedText(titleLine);

      // Get experience embedding from chunks (fallback to full if no experience)
      const expChunk = MLServiceClient.getChunkByType(
        chunkResult.chunks,
        "experience",
      );
      const fullChunk = MLServiceClient.getChunkByType(
        chunkResult.chunks,
        "full",
      );
      const experienceEmbedding = expChunk?.embedding || fullChunk?.embedding;

      if (titleEmbedding && experienceEmbedding) {
        const titleEmbStr = `[${titleEmbedding.join(",")}]`;
        const expEmbStr = `[${experienceEmbedding.join(",")}]`;

        await this.db.query(
          `UPDATE users
           SET title_embedding = $1::vector,
             experience_embedding = $2::vector
           WHERE id = $3`,
          [titleEmbStr, expEmbStr, userId],
        );

        console.log(`✅ Profile embeddings saved for user ${userId}`);
        console.log(`   Title: "${titleLine.substring(0, 50)}..."`);
      }
    } catch (error) {
      // Don't fail the profile save if embeddings fail
      console.error("⚠️ Failed to generate profile embeddings:", error);
    }

    return { userId, profileText, updatedAt };
  }

  /**
   * Delete the user's profile text and all derived embeddings.
   *
   * Clears:
   *  - profile text
   *  - title embedding
   *  - experience embedding
   *
   * Updates the modification timestamp.
   *
   * This operation is idempotent and safe to call multiple times.
   *
   * @param userId - Identifier of the authenticated user.
   */
  async deleteProfile(userId: number): Promise<void> {
    await this.db.query(
      `UPDATE users
       SET profile_text = NULL,
           title_embedding = NULL,
           experience_embedding = NULL,
           updated_at = NOW()
       WHERE id = $1`,
      [userId],
    );
  }
}
