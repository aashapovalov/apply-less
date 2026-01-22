import path from "node:path";
import dotenv from "dotenv";
import express from "express";

import { fileURLToPath } from "node:url";

import {jobsRouter, matchRouter, authRouter} from "./routes/index.js";
import { getDb, closeDb } from "./config/db.js";

// Load .env from project root (two levels up from this file)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../../../');
const envPath = path.join(rootDir, '.env');
dotenv.config({ path: envPath });

export const app = express();
const PORT = process.env.PORT || 3001;

//Middleware
app.use(express.json({ limit: "1mb"}));

// Trust proxy for correct IP detection (required for rate limiting behind reverse proxy)
app.set("trust proxy", 1);

// CORS (allow all for now, restrict in prod)
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") {
        res.sendStatus(200);
        return;
    }
    next();
});

// Health check
app.get("/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API routes
app.use("/api/auth", authRouter);
app.use("/api/jobs", jobsRouter);
app.use("/api/match", matchRouter);

// 404 handler

app.use((req, res) => {
    res.status(404).json({ error: "Not Found" });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Internal Server Error" });
})

// Start server
const server = app.listen(PORT, () => {
    console.log(`\n🚀 ApplyLess API running on port ${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/health`);
    console.log(`   Jobs:   http://localhost:${PORT}/api/jobs`);
    console.log(`   Match:  POST http://localhost:${PORT}/api/match\n`);

    // Test database connection
    getDb().query("SELECT 1").then(() => {
        console.log("✅ Database connection verified\n");
    }).catch((err) => {
        console.error("❌ Database connection failed:", err.message);
    });
});

// Graceful shutdown
const shutdown = async (signal: string) => {
    console.log(`\n⏳ Received ${signal}. Shutting down gracefully...`);
    const forceExitTimout = setTimeout(() => {
        console.error("❌ Force shutdown");
        process.exitCode = 1;
    }, 10000); // 10 seconds to close

    server.close(async () => {
        try {
            await closeDb();
            console.log("✅ Server closed");
            clearTimeout(forceExitTimout);
            process.exitCode = 0;
        } catch (error) {
            console.error("❌ Error during shutdown", error);
            process.exitCode = 1;
        }
    })
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
