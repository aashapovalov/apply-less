import { Pool } from 'pg';
import { IngestionStats } from "../types/index.js";
import { PlaywrightClient, SNCClientPlaywright } from "../clients/index.js";
import { CompanyService, JobSourceService } from "../services/index.js";
import { CompanyDetailParser } from "../parsers/company-detail-parser.js";

export interface StageAOptions {
    maxPages?: number;
    dryRun?: boolean;       // Run without writing to DB
    delayMs?: number;       // Delay between pages
    fetchDetails?: boolean; // whether to fetch company details
}

/**
 *  Run Stage A: Scrape companies from SNC Finder  + fetch company details
 */
export async function runStageA (
    db: Pool,
    options: StageAOptions = {},
) : Promise<IngestionStats> {
    const {
        maxPages = 200,
        dryRun = false,
        delayMs = 2000,
        fetchDetails = true,
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
    let jobSourcesCreated = 0;

    const playwrightClient = new PlaywrightClient();
    let sncClient: SNCClientPlaywright | null = null;

    try {
        console.log('\n🚀 Starting Stage A: SNC Company Ingestion');
        console.log('='.repeat(60));
        console.log(`Max pages: ${maxPages}`);
        console.log(`Dry run: ${dryRun}`);
        console.log(`Fetch details: ${fetchDetails}`);
        console.log(`Delay: ${delayMs}ms\n`);

        // Step1: get authenticated cookies
        await playwrightClient.connect();
        const cookies = await playwrightClient.getCookies()
        console.log('');

        // Step2: create clients and services;
        const browser = playwrightClient.getBrowser();
        console.log('');

        sncClient = new SNCClientPlaywright(browser);
        const companyService = new CompanyService(db);
        const jobSourceService = new JobSourceService(db);
        const detailParser = new CompanyDetailParser();

        // Step3: test connection
        console.log('🔍 Testing SNC connection...');
        const isValid = await sncClient.testConnection();
        if (!isValid) {
            throw new Error('Failed to connect to SNC - cookies may be invalid');
        }
        console.log('✅ Connection test passed\n');

        // Step4: scrape pages
        console.log(`📚 Scraping up to ${maxPages} pages...\n`);

        for (let pageNum = 1; pageNum <= maxPages; pageNum += 1) {
            try {
                // Fetch page
                const companies = await sncClient.fetchCompaniesPage(pageNum);

                if (companies.length === 0) {
                    console.log(`\n⚠️  Page ${pageNum} returned 0 companies. Stopping.\n`);
                    break;
                }

                stats.totalProcessed += companies.length;

                // Process each company
                for (const rawCompany of companies) {
                    try {
                        if (dryRun) {
                            console.log(`   [DRY RUN] Would insert: ${rawCompany.name}`);
                            continue;
                        }

                        // Transform and upsert company
                        const company = companyService.transformSNCCompany(rawCompany);
                        const result = await companyService.upsertCompany(company);

                        if (result.isNew) {
                            stats.newRecords++;
                        } else {
                            stats.updatedRecords++;
                        }

                        // Fetch company details from URL
                        if (fetchDetails && rawCompany.sncUrl) {
                            try {
                                // Extract company slug from URL
                                // Example: https://finder.startupnationcentral.org/company_page/galmobile -> galmobile
                                const slug = extractCompanySlug(rawCompany.sncUrl);

                                if (!slug) {
                                    console.log(`   ⚠️  Could not extract slug from: ${rawCompany.sncUrl}`);
                                    continue;
                                }

                                console.log(`   📄 Fetching details for: ${rawCompany.name} (${slug})`);

                                // fetch using Playwright (bypass CloudFlare)
                                const detailsHtml = await playwrightClient.fetchCompanyDetailPage(slug);
                                const details = detailParser.parseCompanyDetails(detailsHtml);

                                if (detailParser.isValidCompanyDetails(details)) {
                                    // Update company with details
                                    await companyService.updateCompanyDetails(result.id, details);
                                    detailsFetched++;

                                    console.log(`   ✅ Website: ${details.websiteUrl || 'N/A'}`);
                                    console.log(`   ✅ Careers: ${details.careersUrl || 'N/A'}`);
                                    console.log(`   ✅ LinkedIn: ${details.socialLinks?.linkedin || 'N/A'}`);

                                    // Create job source if careers URL found
                                    if (details.careersUrl) {
                                        careersUrlsFound++;

                                        const jobSourceResult = await jobSourceService.upsertJobSource({
                                            company_id: result.id,
                                            source_type: "careers_html",
                                            base_url: details.careersUrl,
                                            detection_method: "snc_careers_button",
                                            confidence: 1.0,
                                            status: "active",
                                            last_checked_at: new Date(),
                                        });

                                        if (jobSourceResult.isNew) {
                                            jobSourcesCreated++;
                                            console.log(`   🎯 Created job source for careers page`);
                                        } else {
                                            console.log(`   ♻️  Updated existing job source`);
                                        }
                                    }
                                } else {
                                    console.log(`   ⚠️  No valid details found`);
                                }

                                // Small delay to be polite
                                await new Promise(resolve => setTimeout(resolve, 15000));
                            } catch (detailError: any) {
                                console.error(`   ⚠️  Failed to fetch details: ${detailError.message}`);
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

                // Delay between pages (we are polite)
                if (pageNum < maxPages) {
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                }
            } catch (pageError: any) {
                stats.errors.push({
                    message: `Failed to fetch page ${pageNum}`,
                    details: pageError.message,
                });
                console.error(`\n❌ Page ${pageNum} error: ${pageError.message}\n`);

                // If authentication failed, stop
                if (pageError.message.includes('Authentication failed')) {
                    console.error('🛑 Authentication failed. Stopping ingestion.\n');
                    break;
                }

                // Otherwise continue to the next page
                continue;
            }
        }

        stats.endTime = new Date();
        const durationSec = ((stats.endTime.getTime() - stats.startTime.getTime()) / 10000).toFixed(2);

        // Print summary
        console.log('\n' + '='.repeat(60));
        console.log('📊 Stage A Summary');
        console.log('='.repeat(60));
        console.log(`Total processed: ${stats.totalProcessed}`);
        console.log(`New companies: ${stats.newRecords}`);
        console.log(`Updated companies: ${stats.updatedRecords}`);
        console.log(`Failed: ${stats.failedRecords}`);
        console.log(`Errors: ${stats.errors.length}`);
        if (fetchDetails) {
            console.log(`\n📄 Company Details:`);
            console.log(`   Details fetched: ${detailsFetched}`);
            console.log(`   Careers URLs found: ${careersUrlsFound}`);
            console.log(`   Job sources created: ${jobSourcesCreated}`);
        }
        console.log(`\nDuration: ${durationSec}s`);
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
