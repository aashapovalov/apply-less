import { Pool } from 'pg';
import { IngestionStats } from "../types/index.js";
import { PlaywrightClient, SNCClientPlaywright } from "../clients/index.js";
import { CompanyService, ReportingService } from "../services/index.js";
import { CompanyDetailParser } from "../parsers/company-detail-parser.js";

export interface StageAOptions {
    /** Max requests per run (default: 250). Each SNC page fetch consumes 1 request from this budget. */
    budget?: number;
    /** Base delay between list page fetches in milliseconds (jitter is applied). */
    pageDelayMs?: number;
    /** Base delay between detail page fetches in milliseconds (jitter is applied). */
    detailDelayMs?: number;
    /** Consider details stale after N days (default: 90). */
    staleDays?: number;
    /** Force list scan even if there is detail work to do. */
    forceListScan?: boolean;
    /** Max list pages to scan (will stop earlier if budget runs out). */
    maxPages?: number;
    /** If true, do not write to the database or fetch detail pages (best-effort). */
    dryRun?: boolean;
    /** AbortSignal for graceful shutdown (Ctrl+C). When aborted, current phase stops and data is saved. */
    signal?: AbortSignal;
}

/**
 * Add random jitter (±30%) to a base delay to reduce predictable request patterns.
 *
 * @param baseMs - Base duration in milliseconds.
 * @returns Jittered duration in milliseconds (rounded down to an integer).
 */
function addJitter(baseMs: number): number {
    const jitter = baseMs * 0.3 * (Math.random() - 0.5) * 2;
    return Math.floor(baseMs + jitter);
}

/**
 * Sleep for a base duration with jitter applied, optionally logging a label.
 *
 * @param baseMs - Base sleep duration in milliseconds (jitter is applied).
 * @param label - Optional label to include in logs (e.g., "Page delay").
 * @returns Resolves after the delay completes.
 */
async function sleep(baseMs: number, label?: string): Promise<void> {
    const ms = addJitter(baseMs);
    if (label) {
        console.log(`   💤 ${label} (${(ms / 1000).toFixed(1)}s)...`);
    }
    await new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Run Stage A: budget-based ingestion of SNC companies (daily-friendly).
 *
 * High-level behavior:
 * - Uses a daily request budget to reduce the chance of hitting Cloudflare/ratelimits.
 * - Prioritizes fetching missing or stale company details before scanning list pages.
 * - Optionally forces a list scan (via `forceListScan`) or performs a deeper scan on Sundays.
 *
 * Ingestion phases:
 * 1) **Missing details**: fetch details for companies that have never been scraped.
 * 2) **Stale details**: refresh companies whose `details_fetched_at` is older than `staleDays`.
 * 3) **Discovery scan**: scan listing pages for new/updated companies (budget permitting).
 *
 * Budget model:
 * - Each SNC HTTP navigation / page fetch is treated as 1 "request" from the budget.
 * - The budget is expected to reset daily (Cloudflare window is ~24h).
 *
 * Side effects:
 * - May insert/update rows in `companies`.
 * - May update detail fields and `details_fetched_at`.
 * - Spawns a real Chrome instance via {@link PlaywrightClient} and connects via CDP.
 *
 * @param db - PostgreSQL pool used by {@link CompanyService} and occasional direct queries.
 * @param options - Stage configuration overrides.
 * @returns An {@link IngestionStats} object describing work performed, errors, and timings.
 * @throws Rethrows fatal errors after recording them in stats (and ensures cleanup).
 */
export async function runStageA (
    db: Pool,
    options: StageAOptions = {},
) : Promise<IngestionStats> {
    const {
        budget = 250,
        pageDelayMs = 90000, // 1.5 min between list pages
        detailDelayMs = 25000, // 25s between detail pages
        staleDays = 90,
        forceListScan = false,
        maxPages = 200,
        dryRun = false,
        signal,
    } = options;

    /** Check if graceful shutdown was requested */
    const isAborted = () => signal?.aborted ?? false;
    /** Whether today is Sunday (0 = Sunday). Used to optionally force a deeper list scan. */
    const isSunday = new Date().getDay() === 0;

    // Define stage metadata
    const stats: IngestionStats = {
        stage: "Stage A: SNC Companies",
        startTime: new Date(),
        totalProcessed: 0,
        newRecords: 0,
        updatedRecords: 0,
        skippedRecords: 0,
        failedRecords: 0,
        errors: [],
    };

    // Internal counters used for logs/summary (not necessarily part of IngestionStats schema)
    let requestsUsed = 0;
    let detailsFetched = 0;
    let careersUrlsFound = 0;
    let listPagesScanned = 0;
    let rateLimited = false;

    const playwrightClient = new PlaywrightClient();
    const detailParser = new CompanyDetailParser();

    try {
        console.log("\n🚀 Starting Stage A: SNC Daily Ingestion");
        console.log("=".repeat(60));
        console.log(`Budget: ${budget} requests`);
        console.log(`Sunday (force list scan): ${isSunday}`);
        console.log(`Stale threshold: ${staleDays} days`);
        console.log(
            `Page delay: ${(pageDelayMs / 1000).toFixed(0)}s | Detail delay: ${(
                detailDelayMs / 1000
            ).toFixed(0)}s`
        );
        console.log(`Dry run: ${dryRun}\n`);

        // Launch Chrome + connect Playwright over CDP
        await playwrightClient.connect();
        const browser = playwrightClient.getBrowser();
        const sncClient = new SNCClientPlaywright(browser);
        const companyService = new CompanyService(db);

        /**
         * Quick validation that SNC is reachable and returns data.
         * This consumes 1 request from the budget.
         */
        console.log('🔍 Testing SNC connection...');
        const isValid = await sncClient.testConnection();
        if (!isValid) {
            throw new Error('Failed to connect to SNC - cookies may be invalid');
        }

        console.log(`✅ Connection OK (${budget - requestsUsed} requests remaining)\n`);

        // ─── Phase 1: Fetch details for companies never scraped ──────────────
        const needDetails = await companyService.getCompaniesNeedingDetails(budget);

        if (needDetails.length > 0) {
            console.log(
                `\n📋 Phase 1: ${needDetails.length} companies need details (never fetched)`
            );
            console.log("-".repeat(40));

                for (const company of needDetails) {
                if (isAborted()) {
                    console.log('\n🛑 Shutdown requested — stopping Phase 1');
                    break;
                }
                if (requestsUsed >= budget) {
                    console.log(`\n⚠️  Budget exhausted (${requestsUsed}/${budget})`);
                    break;
                }
                const slug = extractCompanySlug(company.snc_company_page_url);

                if (!slug) {
                    console.log(`      ⚠️  No slug for: ${company.company_name}`);
                    continue;
                }

                try {
                    console.log(
                        `   📄 [${requestsUsed + 1}/${budget}] ${company.company_name}`
                    );

                    if (!dryRun) {
                        const html = await playwrightClient.fetchCompanyDetailPage(slug);
                        requestsUsed++;

                        const details = detailParser.parseCompanyDetails(html);
                        if (detailParser.isValidCompanyDetails(details)) {
                            // Update company with details
                            await companyService.updateCompanyDetails(company.id, details);
                            detailsFetched++;
                            console.log(
                                `      ✅ Website: ${details.websiteUrl || "N/A"} | Careers: ${
                                    details.careersUrl || "N/A"
                                }`
                            );
                            if (details.careersUrl) careersUrlsFound++;
                        } else {
                            // Mark as fetched even if no details found (avoid retrying endlessly)
                            await db.query(
                                `UPDATE companies
                                 SET details_fetched_at = NOW()
                                 WHERE id = $1`,
                                [company.id],
                            );
                            console.log(`      ⚠️  No valid details found`);
                        }
                    } else {
                        console.log(`      [DRY RUN] Would fetch details`);
                    }

                    stats.totalProcessed++;
                    await sleep(detailDelayMs, "Detail delay");
                } catch (error: any) {
                    // Stop immediately on rate limit
                    if (error.message === 'RATE_LIMITED_429') {
                        console.log('\n🛑 Rate limited by SNC (429). Stopping run.');
                        requestsUsed = budget; // Exhaust budget to skip remaining phases
                        rateLimited = true;
                        break;
                    }

                    stats.failedRecords++;
                    stats.errors.push({
                        message: `Detail fetch failed: ${company.company_name}`,
                        details: error.message,
                    });
                    console.error(`      ❌ ${error.message}`);

                    // Mark as fetched so this company doesn't block the queue forever
                    if (!dryRun) {
                        await db.query(
                            `UPDATE companies SET details_fetched_at = NOW() WHERE id = $1`,
                            [company.id],
                        );
                    }

                    await sleep(detailDelayMs * 2, "Error backoff")
                }
            }
        } else {
            console.log("📋 Phase 1: No companies need initial details");
        }

        // ─── Phase 2: Refresh stale details ──────────────────────────────────
        if (requestsUsed < budget) {
            const remaining = budget - requestsUsed;
            const stale = await companyService.getStaleCompanies(staleDays, remaining);

            if (stale.length > 0) {
                console.log(
                    `\n♻️  Phase 2: ${stale.length} companies have stale details (>${staleDays} days)`
                );
                console.log("-".repeat(40));

                for (const company of stale) {
                    if (isAborted()) {
                        console.log('\n🛑 Shutdown requested — stopping Phase 2');
                        break;
                    }
                    if (requestsUsed >= budget) {
                        console.log(`\n⚠️  Budget exhausted (${requestsUsed}/${budget})`);
                        break;
                    }

                    const slug = extractCompanySlug(company.snc_company_page_url);

                    if (!slug) {
                        console.log(`      ⚠️  No slug for: ${company.company_name}`);
                        continue;
                    }

                    try {
                        console.log(
                            `   📄 [${requestsUsed + 1}/${budget}] ${company.company_name}`
                        );

                        if (!dryRun) {
                            const html = await playwrightClient.fetchCompanyDetailPage(slug);
                            requestsUsed++;

                            const details = detailParser.parseCompanyDetails(html);
                            if (detailParser.isValidCompanyDetails(details)) {
                                // Update company with details
                                await companyService.updateCompanyDetails(company.id, details);
                                detailsFetched++;
                                console.log(
                                    `      ✅ Website: ${details.websiteUrl || "N/A"} | Careers: ${
                                        details.careersUrl || "N/A"
                                    }`
                                );
                                if (details.careersUrl) careersUrlsFound++;
                            } else {
                                // Mark as refreshed even if no details found (avoid retrying endlessly)
                                await db.query(
                                    `UPDATE companies
                                     SET details_fetched_at = NOW()
                                     WHERE id = $1`,
                                    [company.id],
                                );
                                console.log(`      ⚠️  No valid details found`);
                            }
                        } else {
                            console.log(`      [DRY RUN] Would refresh details`);
                        }

                        stats.totalProcessed++;
                        await sleep(detailDelayMs, "Detail delay");
                    } catch (error: any) {
                        // Stop immediately on rate limit
                        if (error.message === 'RATE_LIMITED_429') {
                            console.log('\n🛑 Rate limited by SNC (429). Stopping run.');
                            requestsUsed = budget;
                            rateLimited = true;
                            break;
                        }

                        stats.failedRecords++;
                        stats.errors.push({
                            message: `Detail refresh failed: ${company.company_name}`,
                            details: error.message,
                        });
                        console.error(`      ❌ ${error.message}`);

                        // Mark as fetched so this company doesn't block the queue forever
                        if (!dryRun) {
                            await db.query(
                                `UPDATE companies SET details_fetched_at = NOW() WHERE id = $1`,
                                [company.id],
                            );
                        }

                        await sleep(detailDelayMs * 2, "Error backoff")
                    }
                }
            } else {
                console.log("\n♻️  Phase 2: No stale companies to refresh");
            }
        }

        // ─── Phase 3: List scan (discovery) ──────────────────────────────────
        const shouldScanList = isSunday || forceListScan || requestsUsed < budget;

        if (shouldScanList && requestsUsed < budget) {
            const pagesAvailable = Math.min(budget - requestsUsed, maxPages);

            console.log(
                `\n🔍 Phase 3: List scan (${isSunday ? "Sunday full scan" : "budget remaining"})`
            );
            console.log(
                `   Up to ${pagesAvailable} pages (${budget - requestsUsed} requests remaining)`
            );
            console.log("-".repeat(40));

            let consecutiveEmptyPages = 0;

            for (let pageNum = 1; pageNum <= pagesAvailable; pageNum ++) {
                if (isAborted()) {
                    console.log('\n🛑 Shutdown requested — stopping Phase 3');
                    break;
                }
                if (requestsUsed >= budget) {
                    console.log(`\n⚠️  Budget exhausted (${requestsUsed}/${budget})`);
                    break;
                }

                try {
                    const companies = await sncClient.fetchCompaniesPage(pageNum);
                    requestsUsed++;
                    listPagesScanned++;

                    if (companies.length === 0) {
                        consecutiveEmptyPages++;
                        console.log(`      ⚠️  Empty page (${consecutiveEmptyPages} consecutive)`);
                        if (consecutiveEmptyPages >= 1) {
                            console.log(`\n   🛑 Empty page detected — end of results (page ${pageNum})`);
                            break;
                        }
                        continue;
                    }
                    consecutiveEmptyPages = 0;

                    let newOnPage = 0;
                    let updatedOnPage = 0;

                    for (const rawCompany of companies) {
                        try {
                            if (dryRun) continue;

                            const company = companyService.transformSNCCompany(rawCompany);
                            const result = await companyService.upsertCompany(company);

                            if (result.isNew) {
                                newOnPage++;
                                stats.newRecords++;
                            } else {
                                updatedOnPage++;
                                stats.updatedRecords++;
                            }
                        } catch (error: any) {
                            stats.failedRecords++;
                            stats.errors.push({
                                message: `Failed to process: ${rawCompany.name}`,
                                details: error.message,
                            });
                        }
                    }

                    stats.totalProcessed += companies.length;

                    const summary: string[] = [];
                    if (newOnPage > 0) summary.push(`${newOnPage} new`);
                    if (updatedOnPage > 0) summary.push(`${updatedOnPage} updated`);

                    console.log(
                        `      [${requestsUsed}/${budget}] Page ${pageNum}: ${
                            companies.length
                        } companies (${summary.join(", ") || "all skipped"})`
                    );

                    if (pageNum < pagesAvailable && requestsUsed < budget) {
                        await sleep(detailDelayMs, "Page delay");
                    }
                } catch (error: any) {
                    stats.errors.push({
                        message: `List page ${pageNum} failed`,
                        details: error.message,
                    });
                    console.error(`      ❌ Page ${pageNum}: ${error.message}`);

                    // If it looks like a rate limit, stop the list scan
                    if (
                        error.message.includes("429") ||
                        error.message.toLowerCase().includes("rate")
                    ) {
                        console.log("   🛑 Rate limited — stopping list scan");
                        break;
                    }

                    await sleep(detailDelayMs * 2, "Error backoff");
                }
            }
        } else if (requestsUsed >= budget) {
            console.log("\n🔍 Phase 3: Skipped (budget exhausted)");
        }

        // ─── Summary ─────────────────────────────────────────────────────────
        stats.endTime = new Date();

        const durationSec = (
            (stats.endTime.getTime() - stats.startTime.getTime()) / 1000
        ).toFixed(0);
        const durationMin = (parseInt(durationSec, 10) / 60).toFixed(1);

        // Print summary
        console.log('\n' + '='.repeat(60));
        console.log('📊 Stage A Summary');
        console.log('='.repeat(60));
        console.log(`Requests used: ${requestsUsed}/${budget}`);
        console.log(`Total processed: ${stats.totalProcessed}`);
        console.log(`New companies: ${stats.newRecords}`);
        console.log(`Updated companies: ${stats.updatedRecords}`);
        console.log(`Failed: ${stats.failedRecords}`);
        console.log(`Details fetched: ${detailsFetched}`);
        console.log(`Careers URLs found: ${careersUrlsFound}`);
        console.log(`List pages scanned: ${listPagesScanned}`);
        console.log(`Duration: ${durationMin} minutes (${durationSec}s)`);
        console.log('='.repeat(60) + '\n');

        if (stats.errors.length > 0) {
            console.log('⚠️  Errors encountered:');
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
            message: 'Fatal error in Stage A',
            details: error.message,
        });
        console.error('\n❌ Fatal error:', error.message);
        throw error;
    } finally {
        // Always save reporting data, even on crash or Ctrl+C
        try {
            stats.endTime = stats.endTime || new Date();
            const reportingService = new ReportingService(db);
            await reportingService.saveIngestionRun({
                startedAt: stats.startTime,
                finishedAt: stats.endTime,
                budget,
                requestsUsed,
                detailsFetched,
                listPagesScanned,
                companiesCreated: stats.newRecords,
                companiesUpdated: stats.updatedRecords,
                companiesFailed: stats.failedRecords,
                careersUrlsFound,
                rateLimited,
                errors: stats.errors,
            });
            await reportingService.captureDailySnapshot();
            console.log('📊 Reporting data saved (finally block).');
        } catch (reportErr: any) {
            console.error(`⚠️  Failed to save reporting data in finally: ${reportErr.message}`);
        }
        await playwrightClient.close();
    }
}

/**
 * Extract a company slug from an SNC company page URL.
 *
 * Example:
 * - Input:  `https://finder.startupnationcentral.org/company_page/galmobile`
 * - Output: `galmobile`
 *
 * @param sncUrl - Full SNC company page URL.
 * @returns The slug if found, otherwise `null`.
 */
function extractCompanySlug(sncUrl: string): string | null {
    const match = sncUrl.match(/\/company_page\/([^/?]+)/);
    return match ? match[1] : null;
}
