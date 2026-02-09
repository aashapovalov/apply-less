/**
 * Playwright client that auto-launches a locally installed Google Chrome instance
 * and connects to it via the Chrome DevTools Protocol (CDP).
 *
 * Rationale:
 * - Uses the real Chrome binary (not Playwright’s bundled Chromium), which can help
 *   with anti-bot / fingerprinting systems (e.g., Cloudflare Turnstile) when running headed.
 * - Chrome is launched programmatically (no manual startup needed).
 *
 * Responsibilities:
 * - Locate a Chrome executable on the host system.
 * - Launch Chrome with a fresh user-data-dir and a fixed remote debugging port.
 * - Connect Playwright to that Chrome instance via CDP.
 * - Provide a browser instance and helper methods for scraping SNC company pages.
 * - Cleanup: close Playwright connection, kill Chrome process, delete temp profile dir.
 */
import playwright from "playwright";
import { spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import path from "path";

import { CHROME_PATHS, CDP_PORT, USER_DATA_DIR } from "../constants/index.js";


export class PlaywrightClient {
    /** Active Playwright browser handle connected over CDP (null until connected). */
    private browser: playwright.Browser | null = null;

    /** Spawned Chrome OS process handle (null until launched). */
    private chromeProcess: ChildProcess | null = null;

    /**
     * Find a locally installed Google Chrome executable.
     *
     * @returns Absolute path to a Chrome executable.
     * @throws If no Chrome executable is found in {@link CHROME_PATHS}.
     */
    private findChrome(): string {
        for (const p of CHROME_PATHS) {
            if (existsSync(p)) return p;
        }
        throw new Error(
            "Google Chrome not found. Install it from https://www.google.com/chrome/"
        )
    }

    /**
     * Launch a real Chrome instance and connect Playwright to it via CDP.
     *
     * Process:
     * 1) Locate Chrome binary via {@link findChrome}.
     * 2) Delete and recreate {@link USER_DATA_DIR} to ensure a clean profile.
     * 3) Spawn Chrome with `--remote-debugging-port` and the user-data-dir.
     * 4) Poll `http://127.0.0.1:<port>/json/version` until CDP is ready (<= 15s).
     * 5) Connect Playwright via {@link playwright.chromium.connectOverCDP}.
     *
     * @returns Resolves when connected and {@link browser} is initialized.
     * @throws If Chrome does not become ready within the timeout window.
     */
    async connect(): Promise<void> {
        const chromePath = this.findChrome();

        // Clean up previous profile to avoid stale locks
        if (existsSync(USER_DATA_DIR)) {
            rmSync(USER_DATA_DIR, { recursive: true, force: true });
        }
        mkdirSync(USER_DATA_DIR, { recursive: true });

        console.log(`🚀 Launching Chrome from: ${chromePath}`);

        this.chromeProcess = spawn(
            chromePath,
            [
                `--remote-debugging-port=${CDP_PORT}`,
                `--user-data-dir=${USER_DATA_DIR}`,
                "--no-first-run",
                "--no-default-browser-check",
                "--disable-default-apps",
                "--disable-extensions",
                "--disable-sync",
                "--window-size=1920,1080",
            ],
            { stdio: "pipe"}
        );

        this.chromeProcess.on("exit", (code) => {
            if (code !== null && code !== 0) {
                console.error("Chrome exited with code: " + code);
            }
        });

        // Wait for CDP to be ready (up to 15 sec)
        console.log("   Waiting for Chrome to start...");
        let ready = false;

        for (let i = 0; i < 30; i++) {
            try {
                const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`);
                if (res.ok) {
                    ready = true;
                    break;
                }
            } catch {
                // not ready yet
            }
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        if (!ready) {
            this.chromeProcess.kill();
            throw new Error("Chrome failed to start within 15 sec");
        }

        this.browser = await playwright.chromium.connectOverCDP(
            `http://127.0.0.1:${CDP_PORT}`,
        );

        console.log("✅ Connected to Chrome");
    }


    /**
     * Wait for a Cloudflare "Just a moment..." interstitial to clear.
     *
     * Detection:
     * - If `document.title` is not `"Just a moment..."`, returns immediately.
     *
     * Waiting strategy:
     * - Waits until the document title changes (or times out).
     * - Adds a short extra delay after resolution to allow the target page to stabilize.
     *
     * @param page - The page to inspect/wait on.
     * @param timeout - Max time to wait in milliseconds. Defaults to 20 seconds.
     * @returns Resolves when the challenge is gone or not present.
     * @throws If the challenge does not resolve within {@link timeout}.
     */
    private async waitForCloudFlare(
        page: playwright.Page,
        timeout: number = 20000
    ): Promise<void> {
        const title = await page.title();
        if (title !== "Just a moment...") return;

        console.log("      ⏳ Cloudflare challenge detected, waiting...");

        try {
            await page.waitForFunction(
                () => document.title !== "Just a moment...",
                { timeout }
            );
            await page.waitForTimeout(2000);
            console.log("      ✅ Cloudflare challenge resolved");
        } catch {
            throw new Error(
                "Cloudflare challenge did not resolve — check browser environment"
            );
        }
    }

    /**
     * Get the connected Playwright browser instance.
     *
     * @returns A {@link playwright.Browser} connected over CDP.
     * @throws If {@link connect} has not been called successfully yet.
     */
    getBrowser(): playwright.Browser {
        if (!this.browser) {
            throw new Error("Browser not connected. Call connect() first");
        }
        return this.browser;
    }

    /**
     * Fetch the HTML content of an SNC company detail page.
     *
     * Flow:
     * - Reuses the first available browser context (CDP typically exposes one).
     * - Reuses an existing page if present; otherwise creates a new one.
     * - Navigates to the company page URL.
     * - Waits out Cloudflare (if presented).
     * - Waits for `#social-links-container` which indicates the page loaded key content.
     *
     * @param companySlug - The SNC company slug used in the URL path.
     * @returns The page's full HTML content as a string.
     * @throws If the browser is not connected or the page fails to load/resolve.
     */
    async fetchCompanyDetailPage(companySlug: string): Promise<string> {
        if (!this.browser) {
            throw new Error("Browser not connected. Call connect() first");
        }

        const context = this.browser.contexts()[0];
        if (!context) throw new Error("No browser contexts found");

        const page = context.pages()[0] || (await context.newPage());
        const url = `https://finder.startupnationcentral.org/company_page/${companySlug}`;

        try {
            // Navigate to company page
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
            await this.waitForCloudFlare(page);

            // Wait for the social links section to load (30s to account for slow pages)
            await page.waitForSelector("#social-links-container", { timeout: 30000 });

            // Get the HTML content
            return await page.content();
        } catch (error: any) {
            throw new Error(`Failed to fetch company page: ${error.message}: ${error.message}`);
        }
    }

    /**
     * Close the Playwright browser connection, kill the spawned Chrome process,
     * and remove the temporary user profile directory.
     *
     * Safe to call multiple times.
     *
     * @returns Resolves after cleanup completes.
     */
    async close(): Promise<void> {
        if (this.browser) {
            try {
                await this.browser.close();
            } catch {
                // already closed
            }
            this.browser = null;
        }

        if (this.chromeProcess) {
            this.chromeProcess.kill();
            this.chromeProcess = null;
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        if (existsSync(USER_DATA_DIR)) {
            rmSync(USER_DATA_DIR, { recursive: true, force: true });
        }

        console.log("✅ Chrome closed and cleaned up");
    }
}
