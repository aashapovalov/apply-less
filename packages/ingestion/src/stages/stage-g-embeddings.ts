import { Pool } from "pg";
import { IngestionStats, JobForEmbedding, Chunk } from "../types/index.js";
import { EmbeddingClient } from "../clients/index.js";
import { prepareJobText } from "../utils/prepare-job-text.js";
import { getChunkByType, getChunkByTypes } from "../utils/index.js";

export interface StageGOptions {
  dryRun?: boolean;
  batchSize?: number;
  companyName?: string;
  limit?: number;
}

/**
 * Stage G: Job Embeddings Generation
 *
 * Generates and stores vector embeddings for job postings that do not yet
 * have embeddings in the database.
 *
 * This stage produces:
 *  - Full document embedding (stored in `job_embeddings_simple`)
 *  - Header embedding (stored in `jobs.header_embedding`)
 *  - Requirements embedding (stored in `jobs.requirements_embedding`)
 *
 * Embeddings are generated using a transformer-based embedding model
 * (e.g. intfloat/e5-base-v2, 768 dimensions).
 *
 * The stage is designed to be:
 *  - Idempotent (jobs with existing embeddings are skipped)
 *  - Resilient (chunking failures do not block full embeddings)
 *  - Batch-oriented with rate limiting protection
 *
 * @param db - PostgreSQL connection pool.
 * @param options - Stage execution options.
 * @param options.dryRun - If true, does not generate or persist embeddings.
 * @param options.batchSize - Number of jobs processed per batch (default: 10).
 * @param options.companyName - Optional company name filter.
 * @param options.limit - Optional limit on total number of jobs processed.
 *
 * @returns Aggregated ingestion statistics for Stage G.
 *
 * @throws Error if a fatal error occurs before or during batch processing.
 */
export async function runStageG(
  db: Pool,
  options: StageGOptions = {},
): Promise<IngestionStats> {
  const {
    dryRun = false,
    batchSize = 10,
    companyName = undefined,
    limit = undefined,
  } = options;

  const stats: IngestionStats = {
    stage: "Stage G: Embeddings Generation",
    startTime: new Date(),
    totalProcessed: 0,
    newRecords: 0,
    updatedRecords: 0,
    skippedRecords: 0,
    failedRecords: 0,
    errors: [],
  };

  let embeddingClient: EmbeddingClient;

  try {
    console.log("\n🚀 Starting Stage G: Embeddings Generation");
    console.log("=".repeat(60));
    console.log(`Model: intfloat/e5-base-v2 (768 dimensions)`);
    console.log(`Dry run: ${dryRun}`);
    console.log(`Batch size: ${batchSize}`);
    console.log(`Company filter: ${companyName || "All"}`);
    console.log(`Limit: ${limit || "None"}\n`);

    // Initialize client
    if (!dryRun) {
      embeddingClient = new EmbeddingClient();
      const connected = await embeddingClient.testConnection();
      if (!connected) {
        throw new Error("Failed to connect to ML Service");
      }
    }

    // Get jobs that don't have embeddings yet
    let query = `
      SELECT j.id, j.title, j.description, c.company_name, j.location
      FROM jobs j
      JOIN companies c ON j.company_id = c.id
      LEFT JOIN job_embeddings_simple je ON j.id = je.job_id
      WHERE je.id IS NULL
    `;
    const params: any[] = [];

    if (companyName) {
      params.push(`%${companyName}%`);
      query += ` AND c.company_name ILIKE $${params.length}`;
    }

    query += ` ORDER BY j.id`;

    if (limit) {
      params.push(limit);
      query += ` LIMIT $${params.length}`;
    }

    const result = await db.query(query, params);
    const jobs: JobForEmbedding[] = result.rows;

    if (jobs.length === 0) {
      console.log("✅ All jobs already have embeddings!\n");
      return stats;
    }

    console.log(`📋 Found ${jobs.length} jobs without embeddings\n`);

    // Process in batches
    for (let i = 0; i < jobs.length; i += batchSize) {
      const batch = jobs.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(jobs.length / batchSize);

      console.log(
        `\n📦 Processing batch ${batchNum}/${totalBatches} (${batch.length} jobs)`,
      );

      if (dryRun) {
        for (const job of batch) {
          const text = prepareJobText(job);
          console.log(
            `  [DRY RUN] Would embed: ${job.title} (${text.length} chars)`,
          );
          stats.totalProcessed++;
        }
        continue;
      }

      try {
        // Prepare texts for batch embedding (full document)
        const texts = batch.map((job) => prepareJobText(job));

        // Generate full document embeddings
        console.log(`  🧠 Generating full document embeddings...`);
        const fullEmbeddings = await embeddingClient!.embedBatch(texts);

        // Process each job for chunk embeddings
        for (let j = 0; j < batch.length; j++) {
          const job = batch[j];
          const fullEmbedding = fullEmbeddings[j];

          try {
            // Verify embedding dimensions
            if (fullEmbedding.length !== 768) {
              throw new Error(
                `Invalid embedding dimension: ${fullEmbedding.length}`,
              );
            }

            // Get chunk embeddings
            let headerEmbedding: number[] | null = null;
            let requirementsEmbedding: number[] | null = null;

            try {
              const chunkResult = await embeddingClient!.chunkJob(
                job.description || "",
                job.title,
                job.company_name,
                job.location,
              );

              const headerChunk = getChunkByType(chunkResult.chunks, "header");
              const reqChunk = getChunkByTypes(chunkResult.chunks, [
                "requirements",
                "description",
              ]);

              headerEmbedding = headerChunk?.embedding || null;
              requirementsEmbedding = reqChunk?.embedding || null;

              if (headerEmbedding && requirementsEmbedding) {
                console.log(
                  `  📦 Chunks: header(${headerChunk?.token_count}t) + req(${reqChunk?.token_count}t)`,
                );
              }
            } catch (chunkError: any) {
              console.log(
                `  ⚠️ Chunk extraction failed for ${job.title}: ${chunkError.message}`,
              );
              // Continue without chunk embeddings
            }

            // Insert full embedding into job_embeddings_simple
            await db.query(
              `INSERT INTO job_embeddings_simple (job_id, embedding, created_at)
               VALUES ($1, $2, NOW())`,
              [job.id, `[${fullEmbedding.join(",")}]`],
            );

            // Update jobs table with chunk embeddings (if available)
            if (headerEmbedding && requirementsEmbedding) {
              await db.query(
                `UPDATE jobs 
                 SET header_embedding = $1::vector,
                     requirements_embedding = $2::vector
                 WHERE id = $3`,
                [
                  `[${headerEmbedding.join(",")}]`,
                  `[${requirementsEmbedding.join(",")}]`,
                  job.id,
                ],
              );
            }

            stats.newRecords++;
            const chunkStatus = headerEmbedding ? "✅" : "⚠️";
            console.log(`  ${chunkStatus} ${job.title} (${job.company_name})`);
          } catch (insertError: any) {
            stats.failedRecords++;
            stats.errors.push({
              message: `Failed to insert embedding for job ${job.id}`,
              details: insertError.message,
            });
            console.error(`  ❌ ${job.title}: ${insertError.message}`);
          }

          stats.totalProcessed++;
        }

        // Small delay between batches to avoid rate limiting
        if (i + batchSize < jobs.length) {
          console.log(`  ⏳ Waiting 2s before next batch...`);
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      } catch (batchError: any) {
        console.error(`  ❌ Batch failed: ${batchError.message}`);
        stats.errors.push({
          message: `Batch ${batchNum} failed`,
          details: batchError.message,
        });

        for (const job of batch) {
          stats.failedRecords++;
          stats.totalProcessed++;
        }
      }
    }

    stats.endTime = new Date();
    const durationSec = (
      (stats.endTime.getTime() - stats.startTime.getTime()) /
      1000
    ).toFixed(2);

    // Print Summary
    console.log("\n" + "=".repeat(60));
    console.log("📊 Stage G Summary");
    console.log("=".repeat(60));
    console.log(`Jobs processed: ${stats.totalProcessed}`);
    console.log(`Embeddings created: ${stats.newRecords}`);
    console.log(`Failed: ${stats.failedRecords}`);
    console.log(`Errors: ${stats.errors.length}`);
    console.log(`Duration: ${durationSec}s`);
    console.log("=".repeat(60) + "\n");

    if (stats.errors.length > 0) {
      console.log("⚠️  Errors encountered:");
      stats.errors.slice(0, 5).forEach((error, index) => {
        console.log(`${index + 1}. ${error.message}`);
        if (error.details) console.log(`   ${error.details}`);
      });
      if (stats.errors.length > 5) {
        console.log(`   ... and ${stats.errors.length - 5} more\n`);
      }
    }

    return stats;
  } catch (error: any) {
    stats.endTime = new Date();
    stats.errors.push({
      message: "Fatal error in Stage G",
      details: error.message,
    });
    console.error("\n❌ Fatal error:", error.message);
    throw error;
  }
}

/**
 * Verify job embeddings integrity and basic similarity behavior.
 *
 * Performs a lightweight validation of the embeddings pipeline by:
 *  - Counting total jobs
 *  - Counting jobs with full embeddings
 *  - Counting jobs with chunk-level embeddings
 *  - Identifying jobs missing embeddings
 *  - Executing a sample similarity query using pgvector
 *
 * This function is intended for manual or post-ingestion verification
 * and does not modify any data.
 *
 * @param db - PostgreSQL connection pool.
 *
 * @returns void
 */
export async function verifyEmbeddings(db: Pool): Promise<void> {
  console.log("\n🔍 Verifying embeddings...\n");

  // Count jobs and embeddings
  const jobCount = await db.query("SELECT COUNT(*) FROM jobs");
  const embeddingCount = await db.query(
    "SELECT COUNT(*) FROM job_embeddings_simple",
  );
  const missingCount = await db.query(`
    SELECT COUNT(*) FROM jobs j
    LEFT JOIN job_embeddings_simple je ON j.id = je.job_id
    WHERE je.id IS NULL
  `);

  // Count chunk embeddings
  const chunkCount = await db.query(`
    SELECT COUNT(*) FROM jobs 
    WHERE header_embedding IS NOT NULL 
      AND requirements_embedding IS NOT NULL
  `);

  console.log(`Total jobs: ${jobCount.rows[0].count}`);
  console.log(`Full embeddings: ${embeddingCount.rows[0].count}`);
  console.log(`Chunk embeddings: ${chunkCount.rows[0].count}`);
  console.log(`Jobs without embeddings: ${missingCount.rows[0].count}`);

  // Test similarity search
  console.log("\n🔍 Testing similarity search...\n");

  const testResult = await db.query(`
    SELECT j.title, c.company_name,
      1 - (je.embedding <=> (SELECT embedding FROM job_embeddings_simple LIMIT 1)) AS similarity
    FROM jobs j
    JOIN companies c ON j.company_id = c.id
    JOIN job_embeddings_simple je ON j.id = je.job_id
    ORDER BY je.embedding <=> (SELECT embedding FROM job_embeddings_simple LIMIT 1)
    LIMIT 5
  `);

  console.log("Top 5 most similar jobs to first job:");
  testResult.rows.forEach((row, index) => {
    console.log(
      `  ${index + 1}. ${row.title} @ ${row.company_name} (similarity: ${(row.similarity * 100).toFixed(1)}%)`,
    );
  });

  console.log("\n✅ Verification complete!");
}
