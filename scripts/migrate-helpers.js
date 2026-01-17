import * as path from "node:path";
import * as crypto from "node:crypto";
import pg from "pg";

/**
 * Ensures a required environment variable exists and returns it.
 *
 * Why:
 * - Migration scripts must fail fast if critical config is missing
 * - Avoids undefined behavior later (e.g. connecting to the wrong DB)
 *
 * Used for:
 * - DATABASE_URL
 * - Any future required infra variables
 */
export function requireEnv(name) {
    const variable = process.env[name];
    if (!variable) throw new Error(`Environment variable ${name} not found`);
    return variable;
}

/**
 * Absolute path to the migrations directory.
 *
 * Why:
 * - process.cwd() ensures this works no matter where the script is invoked from
 * - Keeps migration discovery deterministic
 *
 * Expected structure:
 *   db/migrations/
 *     001_*.sql
 *     002_*.sql
 */
export const MIGRATIONS_DIR = path.resolve(process.cwd(), "db", "migrations");


/**
 * Computes a SHA-256 checksum of a string.
 *
 * Why:
 * - Used to fingerprint migration file contents
 * - Protects against editing migrations after they were applied
 *
 * If a migration file changes after execution:
 * - checksum mismatch is detected
 * - script aborts instead of silently drifting schemas
 */
export function sha256(str) {
    return crypto.createHash("sha256").update(str, "utf8").digest("hex");
}

/**
 * Checks whether a file is a SQL migration file.
 *
 * Why:
 * - Allows ignoring non-SQL files (README, notes, temp files)
 * - Keeps migration discovery simple and explicit
 */
export function isSqlFile(name) {
    return name.toLowerCase().endsWith(".sql");
}

/**
 * Creates the schema_migrations table if it does not exist.
 *
 * Why this table exists:
 * - It is the migration system's "memory"
 * - Tracks which migration files have already been applied
 *
 * Why it is NOT in db/migrations:
 * - This table is infrastructure for the migration runner itself
 * - Avoids chicken-and-egg problems
 *
 * Columns:
 * - filename   → migration file name (unique)
 * - checksum   → file content hash at time of execution
 * - applied_at → when the migration was applied
 */
export async function ensureMigrationsTable(client) {
    await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        filename TEXT NOT NULL UNIQUE,
        checksum TEXT NOT NULL,
        applied_at TIMESTAMP NOT NULL DEFAULT NOW()
        );    
    `);
}

/**
 * Reads already-applied migrations from the database.
 *
 * Returns:
 * - Map<filename, checksum>
 *
 * Why a Map:
 * - O(1) lookups when checking if a migration was already applied
 *
 * Used for:
 * - Skipping migrations that already ran
 * - Detecting checksum mismatches (edited migrations)
 */
export async function getAppliedMigrations(client) {
    const result = await client.query(`SELECT  filename, checksum FROM schema_migrations;`);
    const map = new Map();
    for (const row of result.rows) map.set(row.filename, row.checksum);
    return map;
}

/**
 * Applies a single migration file safely.
 *
 * Steps:
 * 1. Compute checksum of SQL file
 * 2. Start transaction
 * 3. Execute SQL
 * 4. Record migration in schema_migrations
 * 5. Commit transaction
 *
 * Why transaction is critical:
 * - Ensures migrations are atomic
 * - Prevents half-applied schema changes
 *
 * If anything fails:
 * - ROLLBACK is executed
 * - Database remains unchanged
 */
export async function applyMigration(client, filename, sql,) {
    const checksum = sha256(sql);
    await client.query("BEGIN");
    try {
        await client.query(sql);
        await client.query(`
        INSERT INTO schema_migrations (filename, checksum) VALUES ($1, $2);`, [filename, checksum]);
        await client.query("COMMIT");
        return { checksum };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    }
}