import { Pool } from 'pg';

import { IngestionStats } from "../types/index.js";
import { PlaywrightClient, SNCClient } from "../clients/index.js";
import {CompanyService} from "../services/company-service.js";

export interface StageAOptions {
    maxPages?: number;
    dryRun?: boolean;
    delayMs?: number;
}

/**
 *  Run Stage A: Scrape companies from SNC Finder
 */
export async function runStageA (
    db: Pool,
    options: StageAOptions = {},
) : Promise<IngestionStats> {
    const {
        maxPages = 200,
        dryRun = false,
        delayMs = 2000,
    } = options;

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

    const playwrightClient = new PlaywrightClient();
    let sncClient: SNCClient | null = null;

    try {
        console.log('\n🚀 Starting Stage A: SNC Company Ingestion');
        console.log('='.repeat(60));
        console.log(`Max pages: ${maxPages}`);
        console.log(`Dry run: ${dryRun}`);
        console.log(`Delay: ${delayMs}ms\n`);

        // Step1: get authenticated cookies
        await playwrightClient.connect();
        const cookies = await playwrightClient.getCookies()
        console.log('');

        // Step2: create clients;
        sncClient = new SNCClient(cookies);
        const companyService = new CompanyService(db);

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

                        // Transform and upsert
                        const company = companyService.transformSNCCompany(rawCompany);
                        const result = await companyService.upsertCompany(company);

                        if (result.isNew) {
                            stats.newRecords++;
                        } else {
                            stats.updatedRecords++;
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
        console.log(`Duration: ${durationSec}s`);
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