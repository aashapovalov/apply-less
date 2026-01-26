import { Pool } from "pg";
import * as cheerio from "cheerio";

import { IngestionStats } from "../types/index.js";
import { GreenhouseClient } from "../clients/index.js";
import { JobService } from "../services/index.js";
import { normalizeText } from "../utils/index.js";

export interface StageDOptions {
    dryRun?: boolean;       // Run without writing to DB
    companySlug?: string;   // Optional, test single company
}

/**
 * Run Stage D: fetch jobs from Greenhouse
 */
export async function runStageD(
    db: Pool,
    options: StageDOptions = {}
): Promise<IngestionStats> {

    const {
        dryRun = false,
        companySlug = undefined
    } = options;

    // Define stage metadata
    const stats: IngestionStats = {
        stage: "Stage D: Greenhouse jobs",
        startTime: new Date(),
        totalProcessed: 0,
        newRecords: 0,
        updatedRecords: 0,
        skippedRecords: 0,
        failedRecords: 0,
        errors: []
    };

    const greenhouseClient = new GreenhouseClient();
    const jobService = new JobService(db);

    try {
        console.log('\n🚀 Starting Stage D: Greenhouse Job Ingestion');
        console.log('='.repeat(60));
        console.log(`Dry run: ${dryRun}`);
        console.log(`Single company: ${companySlug || 'All'}\n`);

        //Get companies with Greenhouse job sources from DB
        let companies;

        if (companySlug) {
            // Test single company - look up by ats_identifier OR company name
            companies = await db.query(
                `SELECT DISTINCT c.id, c.company_name, c.careers_page_url, c.normalized_name, js.ats_identifier
                FROM companies c
                JOIN job_sources js ON c.id = js.company_id
                WHERE js.source_type = 'greenhouse'
                AND js.status = 'active'
                AND (js.ats_identifier = $1 OR c.company_name ILIKE $2 OR c.normalized_name = $1)
                LIMIT 1`,
                [companySlug, `%${companySlug}%`]
            );
        } else {
            // Get all Greenhouse companies
            companies = await db.query(
                `SELECT DISTINCT c.id, c.company_name, c.careers_page_url, c.normalized_name, js.ats_identifier
                 FROM companies c
                 JOIN job_sources js ON c.id = js.company_id
                 WHERE js.source_type = 'greenhouse'
                 AND js.status = 'active'
                 ORDER BY c.company_name`
            );
        }

        if (companies.rows.length === 0) {
            console.log('⚠️  No Greenhouse companies found');
            console.log('Run ATS detection first or specify a company slug\n');
            return stats;
        }

        console.log(`📋 Found ${companies.rows.length} Greenhouse companies\n`);

        // Process each company
        for (const company of companies.rows) {
            try {
                console.log(`\n🏢 Processing: ${company.company_name}`);

                // Use ats_identifier from job_sources (most reliable)
                let slug = company.ats_identifier;
                
                // Skip invalid slugs like 'embed'
                if (slug === 'embed') {
                    console.log(`  ⚠️  Invalid slug 'embed' - re-run detection for this company`);
                    stats.skippedRecords++;
                    continue;
                }
                
                // Fallback: try to extract from careers URL
                if (!slug && company.careers_page_url) {
                    slug = greenhouseClient.extractSlugFromUrl(company.careers_page_url) ?? undefined;
                }

                // Fallback: try normalized company name
                if (!slug) {
                    slug = company.normalized_name;
                }

                console.log(`  🔍 Using slug: ${slug}`);

                // Fetch jobs from Greenhouse
                const greenhouseJobs = await greenhouseClient.fetchJobs(slug!);

                if (greenhouseJobs.length === 0) {
                    console.log(`  ⚠️  No jobs found`);
                    stats.skippedRecords++;
                    continue;
                }

                stats.totalProcessed+= greenhouseJobs.length;

                //Process each job
                for (const ghJob of greenhouseJobs) {
                    try {
                        if (dryRun) {
                            console.log(`    [DRY RUN] Would insert: ${ghJob.title} - ${ghJob.location?.name}`);
                            continue;
                        }

                        // Fetch full job details (including description)
                        const jobDetail = await greenhouseClient.fetchJobDetail(slug!, ghJob.id)

                        if (!jobDetail) {
                            console.log(`    ⚠️  Could not fetch details for: ${ghJob.title}`);
                            continue;
                        }

                        // Parse HTML content to extract text
                        const $ = cheerio.load(jobDetail.content);
                        const description = $("body").text().trim();

                        // Extract department
                        const department = jobDetail.departments && jobDetail.departments.length > 0
                            ? jobDetail.departments[0].name
                            : undefined;

                        // Create job object
                        const job = {
                            company_id: company.id,
                            title: jobDetail.title,
                            normalized_title: normalizeText(jobDetail.title),
                            location: jobDetail.location?.name,
                            department,
                            employment_type: undefined,
                            description,
                            requirements: undefined,
                            benefits: undefined,
                            canonical_url: jobDetail.absolute_url,
                            external_id: `greenhouse_${jobDetail.id}`,
                            posted_date: new Date(jobDetail.updated_at),
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
                            message: `Failed to process job: ${ghJob.title}`,
                            details: jobError.message,
                        });
                        console.error(`    ❌ Failed: ${ghJob.title} - ${jobError.message}`);
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
        console.log('📊 Stage D Summary');
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
