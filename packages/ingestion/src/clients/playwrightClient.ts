// Playwright client for getting authenticated cookies from running browser

import playwright from "playwright";

export class PlaywrightClient {
    private browser: playwright.Browser | null = null;

    /**
     * Connect to Chrome running in debug mode
     */
    async connect(): Promise<void> {
        console.log("Connecting to Chrome debug port 9222...");

        try {
            this.browser = await playwright.chromium.connectOverCDP("http://localhost:9222");
            console.log("✅ Connected to Chrome");
            } catch (error) {
            console.error("❌ Failed to connect to Chrome");
            console.error("Make sure Chrome is running with: ");
            console.error('  /Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=9222 --user-data-dir="/tmp/chrome-debug"');
            throw error;
            }
    }

    /**
     *  Get cookies from the authenticated browser session
     */
    async getCookies(): Promise<string> {
        if (!this.browser) {
            throw new Error("Browser not connected. Call connect() first");
        }

        const contexts = this.browser.contexts();
        if (contexts.length === 0) {
            throw new Error("No browser contexts found")
        }

        const context = contexts[0];
        const pages = context.pages();

        if (pages.length === 0) {
            throw new Error("No pages found in browser");
        }

        const page = pages[0];

        // Navigate to SNC if not already there
        const currentUrl = page.url();
        if (!currentUrl.includes("startupnationcentral.org")) {
            console.log("Navigating to SNC Finder...");
            await page.goto('https://finder.startupnationcentral.org/startups/search');
            await page.waitForTimeout(2000);
        }

        // Get all cookies
        const cookies = await context.cookies();

        // Convert to cookie string format
        const cookieString = cookies
            .map(c => `${c.name}=${c.value}`)
            .join("; ");

        console.log(`✅ Got ${cookies.length} cookies`);
        return cookieString;
    }

    /**
     * Close browser connection
     */
    async close(): Promise<void> {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            console.log("✅ Playwright client closed");
        }
    }
}
