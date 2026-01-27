import {Pool} from "pg";
import {ATSDetectionResult, IngestionStats} from "../types/index.js";
import { PlaywrightClient } from "../clients/index.js";
import { JobSourceService } from "../services/index.js";
import { detectATSFromPage } from "../detectors/index.js";

export interface StageBOptions {
    dryRun?: boolean;
    limit?: number;
    companyName?: string;
    recheck?: boolean;
    force?: boolean;
}

/**
 * Runs Stage B of the ingestion pipeline: ATS Detection.
 *
 * Flag behavior:
 *   (none)           - Process companies where ats_checked_at IS NULL (new companies)
 *   --recheck        - Process companies checked but no job_source found
 *   --force          - Process new companies OR companies without job_source
 *   --recheck --force - Process ALL companies (full re-run)
 *
 * Always excludes LinkedIn career pages.
 * Always updates ats_checked_at after processing.
 * Only creates job_source when actionable data found (slug, UID, etc).
 */
export async function runStageB(db: Pool, options: StageBOptions = {}): Promise<IngestionStats> {
    const { dryRun = false, limit, companyName, recheck=false, force = false } = options;

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
        console.log(`Mode: ${recheck && force ? 'FULL RE-RUN' : recheck ? 'RECHECK (no source found)' : force ? 'NEW + FAILED' : 'NEW ONLY'}`);
        console.log(`Dry run: ${dryRun}`);

        await playwrightClient.launch({ headless: false });  // Headed mode to avoid bot detection
        const browser = playwrightClient.getBrowser();
        const page = await browser.newPage();

        // Get companies without job sources OR with a specific name
        let query = `
        SELECT c.id, c.company_name, c.normalized_name, c.careers_page_url
        FROM companies c
        WHERE c.careers_page_url IS NOT NULL
        AND c.careers_page_url NOT LIKE '%linkedin.com%'
        `;
        const params: any = [];

        if (companyName) {
            // Filter by company name (overrides other flags)
            params.push(`%${companyName}%`);
            query += ` AND c.company_name ILIKE $${params.length}`;
        } else if (recheck && force) {
            // --recheck --force: ALL companies
            // No additional filter
        } else if (recheck) {
            // --recheck: checked but no job_source
            query += `
            AND c.ats_checked_at IS NOT NULL
            AND NOT EXISTS (SELECT 1 FROM job_sources WHERE js.company_id = c.id)
            `;
        }
        else if (force) {
            // --force: new OR no job_source
            query += `
              AND (
                c.ats_checked_at IS NULL
                OR NOT EXISTS (SELECT 1 FROM job_sources js WHERE js.company_id = c.id)
              )
            `;
        } else {
            // Default: new companies only
            query += ` AND c.ats_checked_at IS NULL`;
        }

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
                let detection: ATSDetectionResult = await detectATSFromPage(page, company.careers_page_url);

                // Fallback 1: Greenhouse API probe fallback
                if (detection.atsType === 'unknown') {
                    console.log(`   🔄 Trying Greenhouse API probe...`);

                    const slugVariations = generateSlugVariations(company.company_name);
                    console.log(`   📝 Slug variations: ${slugVariations.join(', ')}`);

                    const foundSlug = await probeGreenhouseAPI(slugVariations);

                    if (foundSlug) {
                        console.log(`   🎯 Greenhouse API probe SUCCESS: ${foundSlug}`);
                        detection = {
                            atsType: 'greenhouse',
                            confidence: 0.75,
                            detectionMethod: 'api-probe',
                            extractedSlug: foundSlug,
                            careersUrl: company.careers_page_url,
                        };
                    } else {
                        console.log(`   ❌ Greenhouse API probe: no match`);
                    }
                }

                // Fallback 2: Comeet keyword detection
                if (detection.atsType === 'unknown') {
                    const html = await page.content();

                    if (/comeet/i.test(html)) {
                        console.log(`   🎯 Comeet keyword found (UID unknown)`);
                        detection = {
                            atsType: "comeet",
                            confidence: 0.65,
                            detectionMethod: "keyword_match",
                            extractedSlug: undefined,
                            careersUrl: company.careers_page_url,
                        };
                    }
                }

                console.log(`   ✅ Detected: ${detection.atsType} (${(detection.confidence * 100).toFixed(0)}%)`);
                if (detection.extractedSlug) {
                    console.log(`   🔑 Slug/UID: ${detection.extractedSlug}`);
                }

                results[detection.atsType] = (results[detection.atsType] || 0) + 1;

                if (!dryRun) {
                    // Always update ats_checked_at
                    await db.query(
                        `UPDATE companies SET ats_checked_at = NOW()
                                        WHERE id = $1`,
                        [company.id]
                    );
                }

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

                // Throttle between navigations to reduce rate limiting / load
                await page.waitForTimeout(2000);

            } catch (error: any) {
                stats.failedRecords++;
                stats.errors.push({ message: company.companyName, details: error.message});
                console.log(`   ❌ Error: ${error.message}`);

                // Still mark as checked even on error
                if (!dryRun) {
                    await db.query(
                        `UPDATE companies SET ats_checked_at = NOW()  WHERE id = $1`,
                        [company.id]
                    );
                }
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

/**
 * Generate slug variations from company name for Greenhouse API probing
 * Greenhouse slugs are typically lowercase, alphanumeric, sometimes with hyphens
 */
function generateSlugVariations(companyName: string): string[] {
    const base = companyName.toLowerCase().trim();

    const variations = new Set<string>();

    // Remove all non-alphanumeric: "App's Flyer Inc." -> "appsflyerinc"
    variations.add(base.replace(/[^a-z0-9]/g, ""));

    // Replace spaces/special chars with nothing, remove common suffixes
    const noSuffix = base
        .replace(/\s*(inc\.?|llc\.?|ltd\.?|corp\.?|co\.?|company)$/i, "")
        .trim();
    variations.add(noSuffix.replace(/[^a-z0-9]/g, ""));

    // Replace spaces with hyphens: "Apps Flyer" -> "apps-flyer"
    variations.add(base.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
    variations.add(noSuffix.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));

    // Just first word (common for single-word company names)
    const firstWord = base.split(/[^a-z0-9]/)[0];
    if (firstWord && firstWord.length > 2) {
        variations.add(firstWord);
    }

    // Filter out empty strings and duplicates
    return Array.from(variations).filter(str => str.length > 1);
}

/**
 * Probe Greenhouse API to check if a slug returns jobs
 * Returns the working slug if found, null otherwise
 */
async function probeGreenhouseAPI(slugVariations: string[]): Promise<string | null> {
    for (const slug of slugVariations) {
        try {
            const url = `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`;
            const response = await fetch(url);

            if (response.ok) {
                const data = await response.json();
                if (data.jobs && data.jobs.length > 0) {
                    return slug
                }
            }

            // Small delay between API calls to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 300));
        } catch {
            // Ignore fetch errors, try next variation
        }
    }
    return null;
}
