import {Pool} from "pg";
import {ATSDetectionResult, IngestionStats} from "../types/index.js";
import { PlaywrightClient } from "../clients/index.js";
import { JobSourceService } from "../services/index.js";
import {detectATSFromPage, runDetectionPipeline} from "../detectors/index.js";
import {buildQuery} from "../utils/index.js";

export interface StageBOptions {
    dryRun?: boolean;
    limit?: number;
    companyName?: string;
    recheck?: boolean;
    force?: boolean;
    deepCrawl?: boolean;
}

/**
 * Runs Stage B of the ingestion pipeline: ATS Detection.
 *
 * Flag behavior:
 *   (none)              - Process companies where ats_checked_at IS NULL (new)
 *   --recheck           - Process companies checked but no job_source found
 *   --force             - Process new OR companies without job_source
 *   --recheck --force   - Process ALL companies (full re-run)
 *   --deep-crawl        - Enable deep crawling for hidden ATS (slower)
 *
 * Always excludes LinkedIn career pages.
 * Always updates ats_checked_at after processing.
 * Only creates job_source when actionable data found.
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


                // Run detecion pipeline
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
                stats.errors.push({ message: company.companyName, details: error.message});
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
 * Get mode description for logging.
 */
function getModeDescription(recheck: boolean, force: boolean): string {
    if (recheck && force) return 'FULL RE-RUN';
    if (recheck) return 'RECHECK (no source found)';
    if (force) return 'NEW + FAILED';
    return 'NEW ONLY';
}

/**
 * Mark company as checked.
 */
async function markCompanyChecked(db: Pool, companyId: number): Promise<void> {
    await db.query(
        `UPDATE companies SET ats_checked_at = NOW() WHERE id = $1`,
        [companyId]
    );
}
