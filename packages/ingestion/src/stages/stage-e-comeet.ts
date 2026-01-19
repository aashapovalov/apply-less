import { Pool } from "pg";

import { IngestionStats } from "../types/index.js";
import { ComeetClient } from "../clients/index.js";
import { JobService } from "../services/index.js";
import {normalizeText} from "../utils/index.js";

export interface StageEOptions {
    dryRun?: boolean;       // Run without writing to DB
    companyUid?: string;   // Optional, test single company
}

/**
 * Run Stage E: fetch jobs from Comeet
 */
export async function runStageE(
    db: Pool,
    options: StageEOptions = {}
): Promise<IngestionStats> {
    const {
        dryRun = false,
        companyUid = undefined
    } = options;

    // Define stage metadata
    const stats: IngestionStats = {
        stage: "Stage E: Comeet jobs",
        startTime: new Date(),
        totalProcessed: 0,
        newRecords: 0,
        updatedRecords: 0,
        skippedRecords: 0,
        failedRecords: 0,
        errors: []
    };

    const comeetClient = new ComeetClient();
    const jobService = new JobService(db);

    try {
        console.log('\n🚀 Starting Stage E: Comeet Job Ingestion');
        console.log('='.repeat(60));
        console.log(`Dry run: ${dryRun}`);
        console.log(`Single company: ${companyUid || 'All'}\n`);

        //Get companies with Comeet job sources from DB
        let companies;

        if (companyUid) {
            // Test single company by UID
            companies = await db.query(
                `SELECT c.id, c.company_name, c.careers_page_url, c.normalized_name
                FROM companies c
                WHERE c.company_name = $1 OR c.normalized_name = $1
                LIMIT 1`,
                [companyUid]
            );
        } else {
            // Get all Comeet companies
            companies = await db.query(
                `SELECT DISTINCT c.id, c.company_name, c.careers_page_url, c.normalized_name
                 FROM companies c
                 JOIN job_sources js ON c.id = js.company_id
                 WHERE js.source_type = 'comeet'
                 AND js.status = 'active'
                 ORDER BY c.company_name`
            );
        }

        if (companies.rows.length === 0) {
            console.log('⚠️  No  companies found');
            console.log('Run ATS detection first or specify a company slug\n');
            return stats;
        }

        console.log(`📋 Found ${companies.rows.length} Comeet companies\n`);

        // Process each company
        for (const company of companies.rows) {
            try {
                console.log(`\n🏢 Processing: ${company.company_name}`);

                // Try to extract uid from careers URL or use normalized name
                let uid = companyUid;

                if (!uid && company.career_page_url) {
                    uid = comeetClient.extractUidFromUrl(company.careers_page_url) ?? undefined;
                }

                // If no UID, try to find it by company name
                if (!uid) {
                    console.log(`  🔍 Searching for Comeet UID...`);
                    uid = await comeetClient.findCompanyUid(company.company_name) ?? undefined;
                }

                if (!uid) {
                    console.log(`  ⚠️  Could not determine Comeet UID, skipping`);
                    stats.skippedRecords++;
                    continue;
                }

                console.log(`  🔍 Using UID: ${uid}`);

                // Fetch jobs from Comeet
                const positions = await comeetClient.fetchPositions(uid);

                if (positions.length === 0) {
                    console.log(`  ⚠️  No jobs found`);
                    stats.skippedRecords++;
                    continue;
                }

                stats.totalProcessed+= positions.length;

                //Process each job
                for (const position of positions) {
                    try {
                        if (dryRun) {
                            console.log(`    [DRY RUN] Would insert: ${position.name} - ${position.location.name}`);
                            continue;
                        }

                        // Extract location
                        const location = position.location.city
                            ? `${position.location.city}, ${position.location.country || ''}`
                            : position.location.name;

                        // Create job object
                        const job = {
                            company_id: company.id,
                            title: position.name,
                            normalized_title: normalizeText(position.name),
                            location: location.trim(),
                            department: position.department?.name,
                            employment_type: position.employment_type,
                            description: position.description,
                            requirements: position.requirements,
                            benefits: undefined,
                            canonical_url: position.url_active_page || position.url_comeet_page,
                            external_id: `comeet${position.uid}`,
                            posted_date: new Date(position.time_updated),
                            status: "active" as const
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
                        await new Promise(resolve => setTimeout(resolve, 500));

                    } catch (jobError: any) {
                        stats.failedRecords++;
                        stats.errors.push({
                            message: `Failed to process job: ${position.name}`,
                            details: jobError.message,
                        });
                        console.error(`    ❌ Failed: ${position.name} - ${jobError.message}`);
                    }
                }

                // Delay between companies
                await new Promise(resolve => setTimeout(resolve, 2000));

            } catch (companyError: any) {
                stats.errors.push({
                    message: `Failed to process company: ${company.company_name}`,
                    details: companyError.message,
                });
                console.error(`❌ Failed: ${company.company_name} - ${companyError.message}`);
            }
        }

        stats.endTime = new Date();
        const durationSec = ((stats.endTime.getTime() - stats.endTime.getTime()) / 1000).toFixed(2);

        // Print summary
        console.log('\n' + '='.repeat(60));
        console.log('📊 Stage E Summary');
        console.log('='.repeat(60));
        console.log(`Companies processed: ${companies.rows.length}`);
        console.log(`Jobs processed: ${stats.totalProcessed}`);
        console.log(`New jobs: ${stats.newRecords}`);
        console.log(`Updated jobs: ${stats.updatedRecords}`);
        console.log(`Skipped: ${stats.skippedRecords}`);
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
            message: 'Fatal error in Stage D',
            details: error.message,
        });
        console.error('\n❌ Fatal error:', error.message);
        throw error;
    }
}
