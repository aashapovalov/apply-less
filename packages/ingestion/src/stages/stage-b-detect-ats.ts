import {Pool} from "pg";
import { IngestionStats } from "../types/index.js";
import { PlaywrightClient } from "../clients/index.js";
import { JobSourceService } from "../services/index.js";
import { detectATSFromPage } from "../detectors/index.js";

export interface StageBOptions {
    dryRun?: boolean;
    limit?: number;
    companyName?: string;
    force?: boolean;
}

/**
 * Runs Stage B of the ingestion pipeline: ATS Detection.
 *
 * Stage B:
 *  - Loads companies that have a careers_page_url
 *  - By default, processes only companies that do NOT have an existing job_source
 *  - Optionally filters by company name substring
 *  - Uses a single Playwright browser/page to visit each careers page
 *  - Detects ATS vendor via `detectATSFromPage`
 *  - Optionally upserts a job_sources record when confidence ≥ 0.6
 *
 * Notes:
 *  - Uses a fixed 2s delay between companies to reduce load / rate limits.
 *  - Always closes the Playwright client in a `finally` block.
 *
 * @param db - Postgres connection pool used for reading companies and writing job_sources
 * @param options - Stage configuration (dry run / limit / company name filter)
 * @returns IngestionStats summary for Stage B (counts, errors, timestamps)
 */
export async function runStageB(db: Pool, options: StageBOptions = {}): Promise<IngestionStats> {
    const { dryRun = false, limit, companyName, force = false } = options;

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
        console.log('\n🔍 Starting Stage B: ATS Detection');
        console.log('='.repeat(60));

        await playwrightClient.launch();
        const browser = playwrightClient.getBrowser();
        const page = await browser.newPage();

        // Get companies without job sources OR with a specific name
        let query = `
        SELECT c.id, c.company_name, c.careers_page_url
        FROM companies c
        WHERE c.careers_page_url IS NOT NULL
        AND c.careers_page_url NOT LIKE '%linkedin.com%'
        `;
        const params: any = [];

        if (companyName) {
            query += ` AND company_name ILIKE $1`;
            params.push(`%${companyName}%`);
        } else if (!force) {
            // Only process companies without existing job sources (skip if --force)
            query += ` AND NOT EXISTS (
                SELECT 1 FROM job_sources js WHERE js.company_id = c.id
            )`;
        }
        // When force=true, process all companies with careers_page_url

        query += ` ORDER BY c.company_name`;
        if (limit) {
            query += ` LIMIT ${limit}`;
        }

        // Debug: show the query
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

                // Detect ATS for the current company careers page.
                const detection = await detectATSFromPage(page, company.careers_page_url);

                console.log(`   ✅ Detected: ${detection.atsType} (${(detection.confidence * 100).toFixed(0)}%)`);
                if (detection.extractedSlug) {
                    console.log(`   🔑 Slug/UID: ${detection.extractedSlug}`);
                }

                results[detection.atsType] = (results[detection.atsType] || 0) + 1;

                // Persist detection result to job_sources if: 1) not a dry run, 2) confidence meets the minimum threshold (≥ 0.6)
                if (!dryRun && detection.confidence >= 0.6) {
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
                    } else {
                        stats.updatedRecords++;
                    }
                }

                // Throttle between navigations to reduce rate limiting / load
                await page.waitForTimeout(2000);

            } catch (error: any) {
                stats.failedRecords++;
                stats.errors.push({ message: company.companyName, details: error.message});
                console.log(`   ❌ Error: ${error.message}`);
            }
        }

        stats.endTime = new Date();

        console.log('\n' + '='.repeat(60));
        console.log('📊 Detection Summary');
        console.log('='.repeat(60));
        Object.entries(results).sort((a, b) => b[1] - a[1]).forEach(([ats, count]) => {
            console.log(`   ${ats}: ${count}`);
        });
        console.log('='.repeat(60));

        return stats;
    } finally {
        await playwrightClient.close();
    }
}