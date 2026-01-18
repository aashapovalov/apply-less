#!/usr/bin/env node
// CLI fro running ingestion stages

import {Command} from "commander";
import {closeDb, getDb} from "./config/db.js";
import {runStageA} from "./stages/stage-a-snc.js";

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
    .description('Run Stage A: Scrape companies fron SNC Finder')
    .option('-p, --max-pages <number>', 'Maximum pages to scrape', '200')
    .option('--dry-run', 'Preview without writing to database', false)
    .option('-d, --delay <ms>', 'Delay between pages in milliseconds', '2000')
    .action(async (options) => {          // Command execution handler
        console.log('\n🚀 ApplyLess Ingestion: Stage A (SNC)\n');

        // Open database connection once for the entire stage
        const db = getDb();

        try {
            // Run Stage A with parsed and normalized options
            const stats = await runStageA(db, {
                maxPages: parseInt(options.maxPages),
                dryRun: options.dryRun,
                delayMs: parseInt(options.delay),
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

// Show help output if CLI is run without any command
if (process.argv.length === 2) {
    program.help();
}

// Parse CLI arguments and execute matching command
program.parse();