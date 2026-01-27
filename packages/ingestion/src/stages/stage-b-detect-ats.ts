import {Pool} from "pg";

import { IngestionStats } from "../types/index.js";
import { PlaywrightClient } from "../clients/index.js";
import { JobSourceService } from "../services/index.js";
import { runDetectionPipeline } from "../detectors/index.js";
import { buildQuery } from "../utils/index.js";

export interface StageBOptions {
    dryRun?: boolean;
    limit?: number;
    companyName?: string;
    recheck?: boolean;
    force?: boolean;
    deepCrawl?: boolean;
}

/**
 * Run Stage B of the ingestion pipeline: ATS Detection.
 *
 * Responsibilities:
 *  - Select companies with valid careers_page_url (LinkedIn pages excluded by query builder)
 *  - Navigate to each careers page using Playwright (headed mode helps reduce bot detection)
 *  - Run a multi-step ATS detection pipeline (page signals → API probe → optional deep crawl → keyword fallback)
 *  - Persist detection bookkeeping and (when actionable) create/update a job_sources record
 *
 * Flag behavior (company selection):
 *  - (none)            → new companies only (ats_checked_at IS NULL)
 *  - --recheck         → previously checked, but still no job_source
 *  - --force           → new OR no job_source
 *  - --recheck --force → all companies with careers_page_url (full re-run)
 *  - --companyName     → filters by name; overrides selection flags
 *
 * Persistence behavior:
 *  - Always updates companies.ats_checked_at after processing each company (unless dryRun)
 *  - Upserts job_sources only when detection is actionable:
 *      - confidence > 0.6
 *      - atsType !== "unknown"
 *      - extractedSlug exists OR provider supports detection without slug (e.g., Comeet)
 *
 * Operational behavior:
 *  - Uses throttling between navigations to reduce rate limiting
 *  - Errors are collected into stats and processing continues for remaining companies
 *  - Even on error, the company is marked as checked (unless dryRun)
 *
 * @param db - node-postgres Pool instance
 * @param options - Stage B options controlling selection + detection behavior
 *
 * @returns IngestionStats summary including totals, errors, and timestamps
 */
export async function runStageB(db: Pool, options: StageBOptions = {}): Promise<IngestionStats> {
    const {
        dryRun = false,
        recheck=false,
        force = false,
        deepCrawl = false,
    } = options;

    const stats: IngestionStats = {
        stage: "Stage B: ATS Detection",
        startTime: new Date(),
        totalProcessed: 0,
        newRecords: 0,
        updatedRecords: 0,
        skippedRecords: 0,
        failedRecords: 0,
        errors: [],
    };

    const playwrightClient = new PlaywrightClient();
    const jobSourceService = new JobSourceService(db);

    try {
        // Log configuration
        console.log('\n🔍 Starting Stage B: ATS Detection');
        console.log('='.repeat(60));
        console.log(`Mode: ${getModeDescription(recheck, force)}`);
        console.log(`Deep crawl: ${deepCrawl ? 'ENABLED' : 'disabled'}`);
        console.log(`Dry run: ${dryRun}`);

        // Setup browser
        await playwrightClient.launch({ headless: false });  // Headed mode to avoid bot detection
        const browser = playwrightClient.getBrowser();
        const page = await browser.newPage();

        // Fetch companies
        const { query, params } = buildQuery(options);
        console.log('Query:', query);
        console.log('Params:', params);

        const companies = await db.query(query, params);
        console.log(`📋 Found ${companies.rows.length} companies to analyze\n`);

        // Aggregated counts of ATS types detected (e.g. greenhouse: 12).
        const results: Record<string, number> = {};

        for (const company of companies.rows) {
            try {
                console.log(`\n🏢 ${company.company_name}`);
                console.log(`   URL: ${company.careers_page_url}`);

                stats.totalProcessed++;


                // Run detection pipeline
                const detection = await runDetectionPipeline(
                    {
                        page,
                        companyName: company.company_name,
                        careersUrl: company.careers_page_url,
                    },
                    {
                        enableDeepCrawl: deepCrawl,
                    }
                );


                console.log(`   ✅ Detected: ${detection.atsType} (${(detection.confidence * 100).toFixed(0)}%)`);
                if (detection.extractedSlug) {
                    console.log(`   🔑 Slug/UID: ${detection.extractedSlug}`);
                }

                results[detection.atsType] = (results[detection.atsType] || 0) + 1;

                // Persist results
                if (!dryRun) {
                    // Always update ats_checked_at
                    await markCompanyChecked(db, company.id);


                    // Only create job_source if we have actionable data
                    const hasActionableData =
                        detection.confidence > 0.6 &&
                        detection.atsType !== 'unknown' &&
                        (detection.extractedSlug || detection.atsType === 'comeet');

                    if (hasActionableData) {
                        const result = await jobSourceService.upsertJobSource({
                            company_id: company.id,
                            source_type: detection.atsType as any,
                            base_url: detection.careersUrl,
                            ats_identifier: detection.extractedSlug,
                            api_token: detection.extractedToken,
                            detection_method: detection.detectionMethod,
                            confidence: detection.confidence,
                            status: "active",
                        });

                        if (result.isNew) {
                            stats.newRecords++;
                            console.log(`   💾 Created job_source`);

                        } else {
                            stats.updatedRecords++;
                            console.log(`   ♻️  Updated job_source`);
                        }

                    } else {
                        stats.skippedRecords++;
                        console.log(`   ⏭️  No actionable data, skipped job_source`);
                    }
                }

                // Throttle between navigations to reduce rate limiting / load
                await page.waitForTimeout(2000);

            } catch (error: any) {
                stats.failedRecords++;
                stats.errors.push({ message: company.company_name, details: error.message});
                console.log(`   ❌ Error: ${error.message}`);

                // Still mark as checked even on error
                if (!dryRun) {
                    await markCompanyChecked(db, company.id);
                }
            }
        }
        // Print summary

        stats.endTime = new Date();

        console.log('\n' + '='.repeat(60));
        console.log('📊 Detection Summary');
        console.log('='.repeat(60));
        Object.entries(results)
            .sort((a, b) => b[1] - a[1])
            .forEach(([ats, count]) => {
                console.log(`   ${ats}: ${count}`);
            });
        console.log('='.repeat(60));

        return stats;
    } finally {
        await playwrightClient.close();
    }
}

/**
 * Get a human-readable mode label for logging based on selection flags.
 *
 * @param recheck - Whether the pipeline is running in recheck mode
 * @param force - Whether the pipeline is running in force mode
 * @returns Mode label used in console output
 */
function getModeDescription(recheck: boolean, force: boolean): string {
    if (recheck && force) return 'FULL RE-RUN';
    if (recheck) return 'RECHECK (no source found)';
    if (force) return 'NEW + FAILED';
    return 'NEW ONLY';
}

/**
 * Mark a company as ATS-checked by setting companies.ats_checked_at to NOW().
 * Used to avoid re-processing the same company in default mode.
 *
 * Note: In this stage, the company is marked as checked even if detection fails,
 * to prevent repeated failures from blocking the pipeline (unless dryRun).
 *
 * @param db - node-postgres Pool instance
 * @param companyId - Companies table primary key
 * @returns Promise resolved when the update query finishes
 */
async function markCompanyChecked(db: Pool, companyId: number): Promise<void> {
    await db.query(
        `UPDATE companies SET ats_checked_at = NOW() WHERE id = $1`,
        [companyId]
    );
}
