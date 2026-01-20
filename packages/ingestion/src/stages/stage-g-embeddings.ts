import {Pool} from "pg";
import {IngestionStats, JobForEmbedding} from "../types/index.js";
import {HuggingFaceClient} from "../clients/index.js";
import {prepareJobText} from "../utils/prepare-job-text.js";

export interface StageGOptions {
    dryRun?: boolean;
    batchSize?: number;
    companyName?: string;
    limit?: number;
}

/**
 * Stage G: generate embeddings for jobs
 */
export async function runStageG(
    db: Pool,
    options: StageGOptions = {}
): Promise<IngestionStats> {
    const {
        dryRun = false,
        batchSize = 10,
        companyName = undefined,
        limit = undefined
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

    let hfClient: HuggingFaceClient;

    try {
        console.log("\n🚀 Starting Stage G: Embeddings Generation");
        console.log("=".repeat(60));
        console.log(`Model: intfloat/e5-base-v2 (768 dimensions)`);
        console.log(`Dry run: ${dryRun}`);
        console.log(`Batch size: ${batchSize}`);
        console.log(`Company filter: ${companyName || "All"}`);
        console.log(`Limit: ${limit || "None"}\n`);

        // Initialize HuggingFace client
        if (!dryRun) {
            hfClient = new HuggingFaceClient();
            const connected = await hfClient.testConnection();
            if (!connected) {
                throw new Error("Failed to connect to HuggingFace API");
            }
        }

        // Get jobs that don't have embeddings yet
        let query = `
        SELECT j.id, j.title, j,description, c.company_name, j.location
         FROM jobs j
         JOIN companies ON j.company_id = c.id
         LEFT JOIN job_embeddings je ON j.id = je.job_id
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
        for (let i = 0; i<jobs.length; i += batchSize) {
            const batch = jobs.slice(i, i + batchSize);
            const batchNum = Math.floor(i / batchSize) + 1;
            const totalBatches = Math.ceil(jobs.length / batchSize);

            console.log(`\n📦 Processing batch ${batchNum}/${totalBatches} (${batch.length} jobs)`);

            if (dryRun) {
                for (const job of jobs) {
                    const text = prepareJobText(job);
                    console.log(`  [DRY RUN] Would embed: ${job.title} (${text.length} chars)`);
                    stats.totalProcessed++;
                }
                continue;
            }

            try {
                // Prepare texts for batch embedding
                const texts = batch.map(job => prepareJobText(job));

                // Generate embeddings
                console.log(`  🧠 Generating embeddings...`);
                const embeddings = await hfClient.embedBatch(texts);

                // Store embeddings in database
                for (let j = 0; j < batch.length; j++) {
                    const job = batch[j];
                    const embedding = embeddings[j];

                    try {
                        // Verify embeddings dimensions
                        if (embedding.length !== 768) {
                            throw new Error(`Invalid embedding dimension: ${embedding.length}`);
                        }

                        // Insert embedding
                        await db.query(
                            `INSERT INTO job_embeddings (job_id, chunk_index, section_type, embedding, created_at)
                                            VALUES ($1, $2, $3, $4, NOW())`,
                                            [job.id, 0, "full", `[${embedding.join(",")}]`]
                        );

                        stats.newRecords++;
                        console.log(`  ✅ ${job.title} (${job.company_name})`);

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
                    console.log(`  ⏳ Waiting 1s before next batch...`);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }

            } catch (batchError: any) {
                console.error(`  ❌ Batch failed: ${batchError.message}`);
                stats.errors.push({
                    message: `Batch ${batchNum} failed`,
                    details: batchError.message,
                });

                // Mark all jobs in failed batch as failed
                for (const job of batch) {
                    stats.failedRecords++;
                    stats.totalProcessed++;
                }
            }
        }

        stats.endTime = new Date();
        const durationSec = ((stats.endTime.getTime() - stats.startTime.getTime()) / 1000).toFixed(2);

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
 * Verify embeddings were created correctly
 */

export async function verifyEmbeddings(db: Pool): Promise<void> {
    console.log("\n🔍 Verifying embeddings...\n");

    // Count jobs and embeddings
    const jobCount = await db.query("SELECT COUNT(*) FROM jobs");
    const embeddingCount = await db.query("SELECT COUNT(*) FROM job_embeddings");
    const missingCount = await db.query(`
    SELECT COUNT(*) FROM jobs j
    LEFT JOIN job_embedding je ON j.id = je.job_id
    WHERE je.id IS NULL 
    `);

    console.log(`Total jobs: ${jobCount.rows[0].count}`);
    console.log(`Total embeddings: ${embeddingCount.rows[0].count}`);
    console.log(`Jobs without embeddings: ${missingCount.rows[0].count}`);

    // Test similarity search
    console.log("\n🔍 Testing similarity search...\n");

    const testResult = await db.query(`
    SELECT j.title, c.company_name,
        1 - (je.embedding <=> (SELECT embedding FROM job_embeddings LIMIT 1)) AS similarity
        FROM jobs j 
        JOIN companies c ON j.company_id = c.id
        JOIN job_embeddings je ON j.id = je.job_id
        ORDER BY je.embedding <=> (SELECT embedding FROM job_embeddings LIMIT 1)
        LIMIT 5
        `);

    console.log("Top 5 most similar jobs to first job:");
    testResult.rows.forEach((row, index) => {
        console.log(`  ${index + 1}. ${row.title} @ ${row.company_name} (similarity: ${(row.similarity * 100).toFixed(1)}%)`);
    });

    console.log("\n✅ Verification complete!");
}