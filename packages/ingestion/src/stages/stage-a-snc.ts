import { Pool } from 'pg';
import { IngestionStats } from "../types/index.js";
import { PlaywrightClient, SNCClientPlaywright } from "../clients/index.js";
import { CompanyService } from "../services/index.js";
import { CompanyDetailParser } from "../parsers/company-detail-parser.js";
import { normalizeName } from "../utils/index.js";

export interface StageAOptions {
    maxPages?: number;
    startPage?: number;      // Resume from specific page
    dryRun?: boolean;
    delayMs?: number;        // Base delay between pages
    companyDelayMs?: number; // Delay between company detail fetches
    fetchDetails?: boolean;
    skipRecentDays?: number; // Skip companies updated within N days
    maxRetries?: number;     // Max retries on rate limit
}

/**
 * Add random jitter to delays (looks more human)
 */
function addJitter(baseMs: number, jitterPercent: number = 0.3): number {
    const jitter = baseMs * jitterPercent * (Math.random() - 0.5) * 2;
    return Math.floor(baseMs + jitter);
}

/**
 * Sleep with random jitter
 */
async function sleepWithJitter(baseMs: number, silent: boolean = false): Promise<void> {
    const ms = addJitter(baseMs);
    if (!silent) {
        console.log(`   💤 Sleeping ${(ms/1000).toFixed(1)}s...`);
    }
    await new Promise(resolve => setTimeout(resolve, ms));
}

/**
 *  Run Stage A: Scrape companies from SNC Finder + fetch company details
 */
export async function runStageA (
    db: Pool,
    options: StageAOptions = {},
) : Promise<IngestionStats> {
    const {
        maxPages = 200,
        startPage = 1,
        dryRun = false,
        delayMs = 90000,         // 1.5 min between pages
        companyDelayMs = 25000,  // 25s between company details
        fetchDetails = true,
        skipRecentDays = 30,     // Skip if updated within 30 days
        maxRetries = 3,
    } = options;

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

    // Track additional stats
    let detailsFetched = 0;
    let careersUrlsFound = 0;

    const playwrightClient = new PlaywrightClient();
    let sncClient: SNCClientPlaywright | null = null;
    let consecutiveErrors = 0;
    let currentBackoffMultiplier = 1;

    try {
        console.log('\n🚀 Starting Stage A: SNC Company Ingestion');
        console.log('='.repeat(60));
        console.log(`Pages: ${startPage} to ${startPage + maxPages - 1}`);
        console.log(`Dry run: ${dryRun}`);
        console.log(`Fetch details: ${fetchDetails}`);
        console.log(`Skip if updated within: ${skipRecentDays} days`);
        console.log(`Page delay: ${(delayMs/1000).toFixed(0)}s (±30% jitter)`);
        console.log(`Company delay: ${(companyDelayMs/1000).toFixed(0)}s (±30% jitter)\n`);

        // Step1: get authenticated cookies
        await playwrightClient.connect();
        const cookies = await playwrightClient.getCookies();
        console.log('');

        // Step2: create clients and services
        const browser = playwrightClient.getBrowser();
        console.log('');

        sncClient = new SNCClientPlaywright(browser);
        const companyService = new CompanyService(db);
        const detailParser = new CompanyDetailParser();

        // Step3: test connection
        console.log('🔍 Testing SNC connection...');
        const isValid = await sncClient.testConnection();
        if (!isValid) {
            throw new Error('Failed to connect to SNC - cookies may be invalid');
        }
        console.log('✅ Connection test passed\n');

        // Calculate cutoff date for skipping
        const skipCutoffDate = new Date();
        skipCutoffDate.setDate(skipCutoffDate.getDate() - skipRecentDays);

        // Step4: scrape pages
        const endPage = startPage + maxPages - 1;
        console.log(`📚 Scraping pages ${startPage} to ${endPage}...\n`);

        for (let pageNum = startPage; pageNum <= endPage; pageNum += 1) {
            let retries = 0;
            let pageSuccess = false;

            while (retries < maxRetries && !pageSuccess) {
                try {
                    // Fetch page
                    const companies = await sncClient.fetchCompaniesPage(pageNum);

                    if (companies.length === 0) {
                        console.log(`\n⚠️  Page ${pageNum} returned 0 companies. Stopping.\n`);
                        stats.endTime = new Date();
                        return stats;
                    }

                    // Reset backoff on success
                    consecutiveErrors = 0;
                    currentBackoffMultiplier = 1;

                    stats.totalProcessed += companies.length;

                    // Process each company
                    for (const rawCompany of companies) {
                        try {
                            if (dryRun) {
                                console.log(`   [DRY RUN] Would process: ${rawCompany.name}`);
                                continue;
                            }

                            // Check if company was recently updated (skip if so)
                            const existingCompany = await db.query(
                                `SELECT id, updated_at FROM companies 
                                 WHERE normalized_name = $1 OR snc_company_page_url = $2
                                 LIMIT 1`,
                                [normalizeName(rawCompany.name), rawCompany.sncUrl]
                            );

                            if (existingCompany.rows.length > 0) {
                                const lastUpdated = new Date(existingCompany.rows[0].updated_at);
                                if (lastUpdated > skipCutoffDate) {
                                    const daysAgo = Math.floor((Date.now() - lastUpdated.getTime()) / 86400000);
                                    console.log(`   ⏭️  Skipping ${rawCompany.name} (updated ${daysAgo} days ago)`);
                                    stats.skippedRecords++;
                                    continue;
                                }
                            }

                            // Transform and upsert company
                            const company = companyService.transformSNCCompany(rawCompany);
                            const result = await companyService.upsertCompany(company);

                            if (result.isNew) {
                                stats.newRecords++;
                                console.log(`   ✨ New: ${rawCompany.name}`);
                            } else {
                                stats.updatedRecords++;
                                console.log(`   ♻️  Updated: ${rawCompany.name}`);
                            }

                            // Fetch company details from URL
                            if (fetchDetails && rawCompany.sncUrl) {
                                try {
                                    const slug = extractCompanySlug(rawCompany.sncUrl);

                                    if (!slug) {
                                        console.log(`      ⚠️  Could not extract slug from: ${rawCompany.sncUrl}`);
                                        continue;
                                    }

                                    console.log(`      📄 Fetching details...`);

                                    // Fetch using Playwright (bypass CloudFlare)
                                    const detailsHtml = await playwrightClient.fetchCompanyDetailPage(slug);
                                    const details = detailParser.parseCompanyDetails(detailsHtml);

                                    if (detailParser.isValidCompanyDetails(details)) {
                                        // Update company with details
                                        await companyService.updateCompanyDetails(result.id, details);
                                        detailsFetched++;

                                        console.log(`      ✅ Website: ${details.websiteUrl || 'N/A'}`);
                                        console.log(`      ✅ Careers: ${details.careersUrl || 'N/A'}`);
                                        console.log(`      ✅ LinkedIn: ${details.socialLinks?.linkedin || 'N/A'}`);

                                        // Create job source if careers URL found
                                        if (details.careersUrl) {
                                            careersUrlsFound++;

                                        }

                                    } else {
                                        console.log(`      ⚠️  No valid details found`);
                                        console.log(`      🎯 Careers URL saved (ATS detection in Stage B)`);
                                    }

                                    // Delay between companies with jitter
                                    await sleepWithJitter(companyDelayMs * currentBackoffMultiplier);

                                } catch (detailError: any) {
                                    // Handle rate limit specifically
                                    if (detailError.message.includes('429') || 
                                        detailError.message.toLowerCase().includes('rate') ||
                                        detailError.message.toLowerCase().includes('too many')) {
                                        consecutiveErrors++;
                                        currentBackoffMultiplier = Math.min(currentBackoffMultiplier * 2, 8);
                                        console.log(`      ⚠️  Rate limited! Backing off ${currentBackoffMultiplier}x`);
                                        await sleepWithJitter(companyDelayMs * currentBackoffMultiplier * 2);
                                    } else {
                                        console.error(`      ⚠️  Failed to fetch details: ${detailError.message}`);
                                    }
                                    stats.errors.push({
                                        message: `Failed to fetch details for: ${rawCompany.name}`,
                                        details: detailError.message,
                                    });
                                }
                            }
                        } catch (companyError: any) {
                            stats.failedRecords++;
                            stats.errors.push({
                                message: `Failed to process: ${rawCompany.name}`,
                                details: companyError.message,
                            });
                            console.error(`   ❌ Failed: ${rawCompany.name} - ${companyError.message}`);
                        }
                    }

                    pageSuccess = true;

                } catch (pageError: any) {
                    retries++;
                    
                    if (pageError.message.includes('429') || 
                        pageError.message.toLowerCase().includes('rate') ||
                        pageError.message.toLowerCase().includes('too many')) {
                        consecutiveErrors++;
                        currentBackoffMultiplier = Math.min(currentBackoffMultiplier * 2, 8);
                        const backoffTime = delayMs * currentBackoffMultiplier;
                        console.log(`\n⚠️  Rate limited on page ${pageNum}! Retry ${retries}/${maxRetries}`);
                        console.log(`   Backing off for ${(backoffTime/1000).toFixed(0)}s...\n`);
                        await sleepWithJitter(backoffTime);
                    } else if (pageError.message.includes('Authentication failed')) {
                        console.error('\n🛑 Authentication failed. Stopping ingestion.\n');
                        console.log(`   Resume with: --start-page ${pageNum}\n`);
                        break;
                    } else {
                        console.error(`\n❌ Page ${pageNum} error (retry ${retries}/${maxRetries}): ${pageError.message}\n`);
                        await sleepWithJitter(delayMs);
                    }
                }
            }

            if (!pageSuccess) {
                console.log(`\n🛑 Failed page ${pageNum} after ${maxRetries} retries. Stopping.\n`);
                console.log(`   Resume with: --start-page ${pageNum}\n`);
                break;
            }

            // Delay between pages with jitter
            if (pageNum < endPage) {
                console.log(`\n📄 Page ${pageNum} complete. Moving to page ${pageNum + 1}...`);
                await sleepWithJitter(delayMs * currentBackoffMultiplier);
            }
        }

        stats.endTime = new Date();
        const durationSec = ((stats.endTime.getTime() - stats.startTime.getTime()) / 1000).toFixed(0);
        const durationMin = (parseInt(durationSec) / 60).toFixed(1);

        // Print summary
        console.log('\n' + '='.repeat(60));
        console.log('📊 Stage A Summary');
        console.log('='.repeat(60));
        console.log(`Total processed: ${stats.totalProcessed}`);
        console.log(`New companies: ${stats.newRecords}`);
        console.log(`Updated companies: ${stats.updatedRecords}`);
        console.log(`Skipped (recent): ${stats.skippedRecords}`);
        console.log(`Failed: ${stats.failedRecords}`);
        console.log(`Errors: ${stats.errors.length}`);
        if (fetchDetails) {
            console.log(`\n📄 Company Details:`);
            console.log(`   Details fetched: ${detailsFetched}`);
            console.log(`   Careers URLs found: ${careersUrlsFound}`);
        }
        console.log(`\nDuration: ${durationMin} minutes (${durationSec}s)`);
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
        await playwrightClient.close();
    }
}

/**
 * Extract company slug from SNC URL
 * Example: https://finder.startupnationcentral.org/company_page/galmobile -> galmobile
 */
function extractCompanySlug(sncUrl: string): string | null {
    const match = sncUrl.match(/\/company_page\/([^/?]+)/);
    return match ? match[1] : null;
}
