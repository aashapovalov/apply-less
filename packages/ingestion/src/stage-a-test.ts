import {closeDb, getDb} from "./config/db.js";
import {runStageA} from "./stages/stage-a-snc.js";

async function main() {
    console.log('🧪 Testing Stage A: Full Pipeline\n');

    const db = getDb();

    try {
        // Test with limited pages first
        const stats = await runStageA(db, {
            maxPages: 5,        // just 5 pages for testing
            dryRun: false,      // actually write to DB
            delayMs: 1000,      // 1 second delay
        });

        console.log('✅ Stage A completed successfully!\n');
        console.log('Final stats:');
        console.log(`  Total processed: ${stats.totalProcessed}`);
        console.log(`  New: ${stats.newRecords}`);
        console.log(`  Updated: ${stats.updatedRecords}`);
        console.log(`  Failed: ${stats.failedRecords}`);
    } catch (error: any) {
        console.error('❌ Error:', error.message);
        process.exitCode = 1;
    } finally {
        await closeDb();
    }
}

main();
