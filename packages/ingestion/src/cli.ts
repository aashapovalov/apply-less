#!/usr/bin/env node
// CLI fro running ingestion stages

import { Command } from "commander";

import { closeDb, getDb } from "./config/db.js";
import {
    runStageA, runStageB,
    runStageD,
    runStageE, runStageG
} from "./stages/index.js";
import {verifyEmbeddings} from "./stages/stage-g-embeddings.js";
import { debugDetection } from "./detectors/index.js";

// Create the root CLI program
const program = new Command();

// Define CLI metadata shown in --help and --version
program
    .name('applyless-ingest')                           // CLI command name
    .description('ApplyLess job ingestion pipeline')    // High-level purpose
    .version('0.1.0');                                  // CLI version

// Define the "snc" subcommand
program
    .command('snc')                             // Usage: applyless-ingest snc
    .description('Run Stage A: Scrape companies from SNC Finder')
    .option('-p, --max-pages <number>', 'Maximum pages to scrape', '200')
    .option('-s, --start-page <number>', 'Start from page number (for resuming)', '1')
    .option('--dry-run', 'Preview without writing to database', false)
    .option('-d, --delay <ms>', 'Delay between pages in milliseconds', '90000')
    .option('--company-delay <ms>', 'Delay between company detail fetches', '25000')
    .option('--skip-recent <days>', 'Skip companies updated within N days', '30')
    .option('--no-details', 'Skip fetching company details')
    .action(async (options) => {
        console.log('\n🚀 ApplyLess Ingestion: Stage A (SNC)\n');

        // Open database connection once for the entire stage
        const db = getDb();

        try {
            // Run Stage A with parsed and normalized options
            const stats = await runStageA(db, {
                maxPages: parseInt(options.maxPages),
                startPage: parseInt(options.startPage),
                dryRun: options.dryRun,
                delayMs: parseInt(options.delay),
                companyDelayMs: parseInt(options.companyDelay),
                skipRecentDays: parseInt(options.skipRecent),
                fetchDetails: options.details, // --no-details sets this to false
            });

            // Mark process as failed if there were partial or hard errors
            if (stats.failedRecords > 0 || stats.errors.length > 0) {
                console.log('⚠️  Completed with errors\n');
                process.exitCode = 1;
            } else {
                console.log('✅ Completed successfully\n');
            }
        } catch (error: any) {
            console.error('❌ Fatal error:', error.message);
            process.exitCode = 1;
        } finally {
            // Always close DB connection to avoid hanging process
            await closeDb();
        }
    });

// Stage B: ATS Detection
program
    .command('detect')
    .description('Run Stage B: Detect ATS (Greenhouse/Comeet/etc) from careers pages')
    .option('--dry-run', 'Preview without writing to database', false)
    .option('-l, --limit <number>', 'Limit number of companies')
    .option('-c, --company <name>', 'Test single company by name')
    .option('-r, --recheck', 'Recheck companies that were checked but have no job_source', false)
    .option('-f, --force', 'Re-detect even if job_source exists', false)
    .option('-d, --deep-crawl', 'Enable deep crawler to investigate links on career website')
    .action(async (options) => {
        console.log('\n🚀 ApplyLess Ingestion: Stage B (ATS Detection)\n');

        const db = getDb();

        try {
            const stats = await runStageB(db, {
                dryRun: options.dryRun,
                limit: options.limit ? parseInt(options.limit) : undefined,
                companyName: options.company,
                recheck: options.recheck,
                force: options.force,
                deepCrawl: options.deepCrawl,
            });

            // Mark process as failed if there were partial or hard errors
            if (stats.failedRecords > 0 || stats.errors.length > 0) {
                console.log('⚠️  Completed with errors\n');
                process.exitCode = 1;
            } else {
                console.log('✅ Completed successfully\n');
            }
        } catch (error: any) {
            console.error('❌ Fatal error:', error.message);
            process.exitCode = 1;
        } finally {
            // Always close DB connection to avoid hanging process
            await closeDb();
        }
    })

// Stage D: Greenhouse Jobs
program
    .command('greenhouse')
    .description('Run Stage D: Fetch jobs from Greenhouse API')
    .option('--dry-run', 'Preview without writing to database', false)
    .option('-c, --company <slug>', 'Test with single company slug (e.g., "appsflyer")')
    .action(async (options) => {
        console.log('\n🚀 ApplyLess Ingestion: Stage D (Greenhouse)\n');

        const db = getDb();

        try {
            const stats = await runStageD(db, {
                dryRun: options.dryRun,
                companySlug: options.company,
            });

            if (stats.failedRecords > 0 || stats.errors.length > 0) {
                console.log('⚠️  Completed with errors\n');
                process.exitCode = 1;
            } else {
                console.log('✅ Completed successfully\n');
            }
        } catch (error: any) {
            console.error('❌ Fatal error:', error.message);
            process.exitCode = 1;
        } finally {
            await closeDb();
        }
    });

// Stage E: Comeet Jobs
program
    .command('comeet')
    .description('Run Stage E: Fetch jobs from Comeet API')
    .option('--dry-run', 'Preview without writing to database', false)
    .option('-c, --company <uid>', 'Test with single company uid (e.g., "ai21labs")')
    .action(async (options) => {
        console.log('\n🚀 ApplyLess Ingestion: Stage E (Comeet)\n');

        const db = getDb();

        try {
            const stats = await runStageE(db, {
                dryRun: options.dryRun,
                companyUid: options.company,
            });

            if (stats.failedRecords > 0 || stats.errors.length > 0) {
                console.log('⚠️  Completed with errors\n');
                process.exitCode = 1;
            } else {
                console.log('✅ Completed successfully\n');
            }
        } catch (error: any) {
            console.error('❌ Fatal error:', error.message);
            process.exitCode = 1;
        } finally {
            await closeDb();
        }
    });

// Stage G: Embeddings Generation
program
    .command('embeddings')
    .description('Run Stage G: Generate embeddings for jobs using E5-base-v2')
    .option('--dry-run', 'Preview without generating embeddings', false)
    .option('-b, --batch-size <number>', 'Number of jobs per batch', '10')
    .option('-c, --company <name>', 'Filter by company name')
    .option('-l, --limit <number>', 'Limit number of jobs to process')
    .option('--verify', 'Verify embeddings after generation', false)
    .action(async (options) => {
        console.log('\n🚀 ApplyLess Ingestion: Stage G (Embeddings)\n');

        const db = getDb();

        try {
            const stats = await runStageG(db, {
                dryRun: options.dryRun,
                batchSize: parseInt(options.batchSize),
                companyName: options.company,
                limit: options.limit ? parseInt(options.limit) : undefined,
            });

            if (options.verify && !options.dryRun) {
                await verifyEmbeddings(db);
            }

            if (stats.failedRecords > 0 || stats.errors.length > 0) {
                console.log('⚠️  Completed with errors\n');
                process.exitCode = 1;
            } else {
                console.log('✅ Completed successfully\n');
            }
        } catch (error: any) {
            console.error('❌ Fatal error:', error.message);
            process.exitCode = 1;
        } finally {
            await closeDb();
        }
    });

// Debug: Run detailed detection analysis on single company
program
    .command('debug')
    .description('Debug ATS detection pipeline for a single company')
    .option('-c, --company <name>', 'Company name to debug')
    .option('-u, --url <url>', 'Careers URL to debug (bypasses DB lookup)')
    .action(async (options) => {
        console.log('\n🔬 ApplyLess Ingestion: Debug Detection\n');

        if (!options.company && !options.url) {
            console.error('❌ Must provide either --company or --url');
            process.exitCode = 1;
            return;
        }

        try {
            await debugDetection(options.company || 'unknown', options.url);
        } catch (error: any) {
            console.error('❌ Fatal error:', error.message);
            process.exitCode = 1;
        }
    });

// Show help output if CLI is run without any command
if (process.argv.length === 2) {
    program.help();
}

// Parse CLI arguments and execute matching command
program.parse();