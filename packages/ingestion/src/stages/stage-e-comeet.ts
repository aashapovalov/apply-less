import { Pool } from "pg";

import { IngestionStats } from "../types/index.js";
import { ComeetClient } from "../clients/index.js";
import { JobService } from "../services/index.js";
import { normalizeLocation, normalizeText } from "../utils/index.js";

export interface StageEOptions {
  dryRun?: boolean;
  companyUid?: string; // Optional, test single company by name
}

/**
 * Run Stage E: fetch jobs from Comeet
 */
export async function runStageE(
  db: Pool,
  options: StageEOptions = {},
): Promise<IngestionStats> {
  const { dryRun = false, companyUid = undefined } = options;

  const stats: IngestionStats = {
    stage: "Stage E: Comeet jobs",
    startTime: new Date(),
    totalProcessed: 0,
    newRecords: 0,
    updatedRecords: 0,
    skippedRecords: 0,
    failedRecords: 0,
    errors: [],
  };

  const comeetClient = new ComeetClient();
  const jobService = new JobService(db);

  try {
    console.log("\n🚀 Starting Stage E: Comeet Job Ingestion");
    console.log("=".repeat(60));
    console.log(`Dry run: ${dryRun}`);
    console.log(`Single company: ${companyUid || "All"}\n`);

    // Get companies with Comeet job sources from DB
    // Includes ats_identifier (the Comeet UID) and api_token from job_sources
    let companies;

    if (companyUid) {
      // Test single company by name
      companies = await db.query(
        `SELECT c.id, c.company_name, c.careers_page_url, c.normalized_name,
                        js.ats_identifier, js.api_token
                 FROM companies c
                 LEFT JOIN job_sources js ON c.id = js.company_id AND js.source_type = 'comeet'
                 WHERE c.company_name ILIKE $1 OR c.normalized_name ILIKE $1
                 LIMIT 1`,
        [`%${companyUid}%`],
      );
    } else {
      // Get all Comeet companies with their detected UIDs
      companies = await db.query(
        `SELECT DISTINCT c.id, c.company_name, c.careers_page_url, c.normalized_name,
                        js.ats_identifier, js.api_token
                 FROM companies c
                 JOIN job_sources js ON c.id = js.company_id
                 WHERE js.source_type = 'comeet'
                 AND js.status = 'active'
                 ORDER BY c.company_name`,
      );
    }

    if (companies.rows.length === 0) {
      console.log("⚠️  No Comeet companies found");
      console.log(
        "Run ATS detection first: npm run start --workspace=packages/ingestion -- detect\n",
      );
      return stats;
    }

    console.log(`📋 Found ${companies.rows.length} Comeet companies\n`);

    // Process each company
    for (const company of companies.rows) {
      try {
        console.log(`\n🏢 Processing: ${company.company_name}`);

        // Use the detected UID from job_sources
        const uid = company.ats_identifier;
        const token = company.api_token;

        if (!uid) {
          console.log(
            `  ⚠️  No Comeet UID saved, run detection first. Skipping.`,
          );
          stats.skippedRecords++;
          continue;
        }

        console.log(`  🔑 Using UID: ${uid}`);
        if (token) {
          console.log(`  🔑 Using token: ${token.substring(0, 15)}...`);
        }

        // Fetch jobs from Comeet API
        const positions = await comeetClient.fetchPositions(uid, token);

        if (positions.length === 0) {
          console.log(`  ⚠️  No jobs found`);
          stats.skippedRecords++;
          continue;
        }

        console.log(`  📋 Found ${positions.length} positions`);
        stats.totalProcessed += positions.length;

        // Process each job
        for (const position of positions) {
          try {
            if (dryRun) {
              console.log(
                `    [DRY RUN] ${position.name} - ${position.location?.name || "No location"}`,
              );
              continue;
            }

            // Extract location
            const rawLocation = position.location?.city
              ? `${position.location.city}, ${position.location.country || ""}`
              : position.location?.name || "";

            // Check if Israeli location
            const locationResult = normalizeLocation(rawLocation);

            if (!locationResult.isIsraeli) {
              console.log(
                `    ⏭️  Skipped (non-Israeli): ${position.name} - ${rawLocation} [${locationResult.country}]`,
              );
              stats.skippedRecords++;
              continue;
            }

            // Create job object
            const job = {
              company_id: company.id,
              title: position.name,
              normalized_title: normalizeText(position.name),
              location: locationResult.normalized,
              country: locationResult.country,
              region: locationResult.region,
              city: locationResult.city,
              department: position.department?.name,
              employment_type: position.employment_type,
              description: position.description || "",
              requirements: position.requirements,
              benefits: undefined,
              canonical_url:
                position.url_active_page || position.url_comeet_page,
              external_id: `comeet_${position.uid}`,
              posted_date: position.time_updated
                ? new Date(position.time_updated)
                : undefined,
              status: "active" as const,
            };

            // Upsert job
            const result = await jobService.upsertJob(job);

            if (result.isNew) {
              stats.newRecords++;
              console.log(`    ✅ New: ${job.title}`);
            } else {
              stats.updatedRecords++;
              console.log(`    ♻️  Updated: ${job.title}`);
            }

            // Small delay to be polite
            await new Promise((resolve) => setTimeout(resolve, 100));
          } catch (jobError: any) {
            stats.failedRecords++;
            stats.errors.push({
              message: `Failed to process job: ${position.name}`,
              details: jobError.message,
            });
            console.error(
              `    ❌ Failed: ${position.name} - ${jobError.message}`,
            );
          }
        }

        // Delay between companies
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (companyError: any) {
        stats.errors.push({
          message: `Failed to process company: ${company.company_name}`,
          details: companyError.message,
        });
        console.error(
          `❌ Failed: ${company.company_name} - ${companyError.message}`,
        );
      }
    }

    stats.endTime = new Date();
    const durationSec = (
      (stats.endTime.getTime() - stats.startTime.getTime()) /
      1000
    ).toFixed(2);

    // Print summary
    console.log("\n" + "=".repeat(60));
    console.log("📊 Stage E Summary");
    console.log("=".repeat(60));
    console.log(`Companies processed: ${companies.rows.length}`);
    console.log(`Jobs processed: ${stats.totalProcessed}`);
    console.log(`New jobs: ${stats.newRecords}`);
    console.log(`Updated jobs: ${stats.updatedRecords}`);
    console.log(`Skipped: ${stats.skippedRecords}`);
    console.log(`Failed: ${stats.failedRecords}`);
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
      message: "Fatal error in Stage E",
      details: error.message,
    });
    console.error("\n❌ Fatal error:", error.message);
    throw error;
  }
}
