import pg from "pg";
import type { Pool as PoolType } from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;
let pool: PoolType | null = null;

/**
 * Returns a shared PostgreSQL connection pool.
 * Creates the pool on first call and reuses it afterwards.
 */
export function getDb(): PoolType {
    if (pool) return pool;              // Reuse existing pool if already created

    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        throw new Error("DATABASE_URL environment variable is not set");
    }

    pool = new Pool({
        connectionString: databaseUrl,  // Full DB connection string
        max: 10,                        // Max number of simultaneous connections
        idleTimeoutMillis: 30000,       // Close idle connections after 30s
        connectionTimeoutMillis: 2000,  // Fail if connection not acquired in 2s
    });

    // Handle unexpected pool-level errors (e.g. network drop)
    pool.on("error", (error: Error) => {
        console.error('❌ Unexpected database error:', error);
        process.exitCode = 1;           // Mark process as failed without abrupt exit
    });

    console.log("✅ Database connection pool created");
    return pool;
}

/**
 * Gracefully closes the database connection pool.
 * Used during shutdown or tests cleanup.
 */
export async function closeDb(): Promise<void> {
    if (pool) {
        await pool.end();
        pool = null;
        console.log("✅ Database connection closed");
    }
}

/**
 * Performs a lightweight query to verify database connectivity.
 */
export async function testConnection(): Promise<boolean> {
    try {
        const db = getDb();
        const result = await db.query("SELECT NOW() as now, version() as version");
        console.log("✅ Database connected", result.rows[0].now)
        return true;
    } catch (error) {
        console.error("❌ Database connection failed:", error);
        return false;
    }
}