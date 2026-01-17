import * as dotenv from "dotenv";
import * as fs from "node:fs";
import * as path from "node:path";
import pg from "pg";

import {
    requireEnv,
    isSqlFile,
    getAppliedMigrations,
    ensureMigrationsTable,
    applyMigration,
    sha256
} from "./migrate-helpers.js";

import { MIGRATIONS_DIR } from "./migrate-helpers.js";


dotenv.config();
const { Client } = pg;

/**
 * Main migration runner.
 *
 * Discovers SQL migration files, checks which ones were already applied,
 * and executes only new migrations in order using a single DB connection.
 * Ensures migrations are applied atomically and safely.
 */
async function main() {
    // Read DATABASE_URL and fail early if it is missing
    const databaseUrl = requireEnv("DATABASE_URL");

    if (!fs.existsSync(MIGRATIONS_DIR)) {
        throw Error(`Migrations directory not found: ${MIGRATIONS_DIR}`);
    }

    // Read all files from migrations directory,
    // keep only .sql files, and sort them in execution order
    const files = fs
        .readdirSync(MIGRATIONS_DIR)
        .filter(isSqlFile)
        .sort((a, b) => a.localeCompare(b, "en"));

    // If there are no migrations, exit early
    if (files.length === 0) {
        console.log(`[migrate] No .sql files found in ${MIGRATIONS_DIR}`);
        return;
    }
    // Create a single Postgres client (one connection)
    const client = new Client({ connectionString: databaseUrl });
    console.log(`[migrate] Connection to Postgres...`);
    await client.connect();

    try {
        // Ensure migration bookkeeping table exists
        await ensureMigrationsTable(client);

        // Load already-applied migrations from the database
        const applied = await getAppliedMigrations(client);
        console.log(`[migrate] Found ${files.length} migration(s).`);

        // Process migrations one by one in order
        for (const filename of files) {
            // Read migration SQL file contents
            const fullPath = path.join(MIGRATIONS_DIR, filename);
            const sql = fs.readFileSync(fullPath, { encoding: "utf8" });
            // Compute checksum of migration contents
            const checksum = sha256(sql);

            // If migration was already applied
            if (applied.has(filename)) {
                const oldChecksum = applied.get(filename);

                // Detect edited migrations and fail hard
                if (oldChecksum !== checksum) {
                    throw new Error(
                        `[migrate] Checksum mismatch for already-applied migration (${filename}\n` +
                        `Applied: ${oldChecksum}\n` +
                        `Current: ${checksum}\n` +
                        `Fix: create a new migration instead of editing old ones.`
                    );
                }
                // Skip migrations that were already applied
                console.log(`[migrate] SKIP ${filename} (already applied)`);
                continue;
            }
            // Run new migration inside a transaction
            console.log(`[migrate] RUN ${filename}`);
            await applyMigration(client, filename, sql);
            console.log(`[migrate] OK   ${filename}`);
        }
        // All migrations processed successfully
        console.log(`[migrate] Done`)
    } finally {
        // Always close DB connection
        await client.end();
    }
}

main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`\n[migrate] FAILED: ${message}`);
    process.exitCode = 1;
});
