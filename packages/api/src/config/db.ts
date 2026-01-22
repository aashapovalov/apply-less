import dotenv from "dotenv";
import path from "node:path";
import pg from "pg";
import { fileURLToPath } from "node:url";

// Load .env from project root (two levels up from this file)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../../../');
const envPath = path.join(rootDir, '.env');
dotenv.config({ path: envPath });

const { Pool } = pg;
type PoolType = InstanceType<typeof Pool>;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : false,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    statement_timeout: 30000,
    query_timeout: 30000,
});

pool.on("connect", () => {
    console.log("✅ Database connection established");
});

pool.on("error", (err) => {
    console.error("❌ Database connection error:", err.message);
});

export const getDb = (): PoolType => pool;

export const closeDb = async (): Promise<void> => {
    await pool.end();
    console.log("✅ Database connection closed");
}

