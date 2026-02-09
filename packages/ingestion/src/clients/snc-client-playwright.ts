import * as cheerio from 'cheerio';
import playwright, {Browser} from "playwright";
import {SNCCompanyRaw} from "../types/index.js";
import {BASE_URL} from "../constants/index.js";

/**
 * Startup Nation Central (SNC) scraping client implemented with Playwright + Cheerio.
 *
 * This client:
 * - Navigates SNC “startups/search” listing pages with Playwright (for JS-rendered content / bot gates).
 * - Waits for Cloudflare interstitials (e.g., "Just a moment...") to resolve when present.
 * - Extracts structured company data from the rendered HTML using Cheerio.
 *
 * Expected usage:
 * - A higher-level "PlaywrightClient" (or similar) connects to a real Chrome instance via CDP.
 * - That connected {@link Browser} is passed into this class.
 */
export class SNCClientPlaywright {
    /**
     * Create a new SNC client.
     *
     * @param browser - A connected Playwright {@link Browser} instance (often via CDP).
     */
    constructor(private browser: Browser) {
    }

    /**
     * Wait for a Cloudflare interstitial (commonly titled "Just a moment...") to auto-resolve.
     *
     * Detection strategy:
     * - Reads the page title and returns immediately if it is not "Just a moment...".
     *
     * Waiting strategy:
     * - Waits until `document.title` changes away from "Just a moment..." (or times out).
     * - Adds a small delay after resolution to allow the destination page to stabilize.
     *
     * @param page - A Playwright page instance.
     * @param timeout - Max time to wait in milliseconds. Defaults to 20 seconds.
     * @returns Resolves when no Cloudflare interstitial is present or when it clears.
     * @throws If the interstitial does not resolve within {@link timeout}.
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
     * Fetch and parse the list of companies from a specific SNC search results page.
     *
     * Flow:
     * - Builds the SNC listing URL for the given page number.
     * - Uses the first available Playwright browser context and reuses its first page if possible.
     * - Navigates to the listing URL and waits for DOMContentLoaded.
     * - Waits for Cloudflare interstitial (if present).
     * - Waits for the listing item selector to be attached (ensures list content exists).
     * - Reads full HTML (`page.content()`) and parses it via {@link parseCompaniesFromHTML}.
     *
     * @param pageNum - Listing page number (1-based).
     * @returns Parsed array of raw SNC company objects for that page.
     * @throws If no browser contexts are available or navigation/parsing fails.
     */
    async fetchCompaniesPage(pageNum: number): Promise<SNCCompanyRaw[]> {
        const url = `${BASE_URL}/startups/search?&semantic=&page=${pageNum}`;

        const contexts = this.browser.contexts();
        if (contexts.length === 0) {
            throw new Error("No browser context found");
        }

        const context = contexts[0];
        const page = context.pages()[0] || (await context.newPage());


        try {
            console.log(`Fetching list page ${pageNum}...`);

            // Navigate to the page
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await this.waitForCloudFlare(page);

            // Wait for company list to load
            await page.waitForSelector('.company-list-item.company', {
                state: "attached",
                timeout: 15000
            });

            // Get HTML content
            const html = await page.content();

            // Parse companies
            const companies = this.parseCompaniesFromHTML(html);
            console.log(`   Found ${companies.length} companies`);

            return companies;
        } catch (error: any) {
            throw new Error(`Failed to fetch page ${pageNum}: ${error.message}`);

        }
    }

    /**
     * Parse company cards from an SNC listing page HTML string.
     *
     * Extraction details:
     * - Selects each company card using `.company-list-item.company`.
     * - Extracts the company name from `.entity-portfolio-title.header-container-mobile`
     *   and removes trailing “The profile of this organization...” noise if present.
     * - Dedupe by company name (within the page) to avoid duplicates.
     * - Builds `sncUrl` from the closest anchor's `href` plus {@link BASE_URL}.
     * - Extracts:
     *   - `description` from the last `<div>` under `.entity-portfolio-header-container`.
     *   - `foundedYear` by regex parsing `Founded: YYYY`.
     *   - `tags` by splitting the "Business Model" span text on commas.
     *
     * Notes:
     * - `website` is set to `undefined` here and can be populated later from the company detail page.
     *
     * @param html - Full HTML of the listing page (typically from `page.content()`).
     * @returns Array of parsed {@link SNCCompanyRaw} items.
     */
    private parseCompaniesFromHTML(html: string): SNCCompanyRaw[] {
        const $ = cheerio.load(html);
        const companies: SNCCompanyRaw[] = [];
        const seen = new Set<string>();

        // Find all company cards
        $('.company-list-item.company').each((index, element) => {
            const $card = $(element);

            // Extract company name
            const nameEl = $card.find('.entity-portfolio-title.header-container-mobile');
            let name = nameEl.contents().first().text().trim()

            // Remove badge icon text if present
            name = name.replace(/\s*The profile of this organization.*$/i, '').trim();

            if (!name || seen.has(name)) {
                return; // Skip duplicates or empty names
            }
            seen.add(name);

            // Extract SNC URL
            const link = $card.closest('a');
            const href = link.attr('href');
            const sncUrl = href ? `${BASE_URL}${href}` : '';

            // Extract description
            const descriptionEl = $card.find('.entity-portfolio-header-container > div').last();
            const description = descriptionEl.text().trim();

            // Extract founded year
            const foundedText = $card.find('.entity-portfolio-header-container > div').filter((index, element) => {
                return $(element).text().includes('Founded:');
            }).text();
            const foundedMatch = foundedText.match(/Founded:\s*(\d{4})/);
            const foundedYear = foundedMatch ? parseInt(foundedMatch[1]) : undefined;

            // Extract business model as tags
            const businessModelText = $card.find('.entity-portfolio-header-container > div').filter((index, element) => {
                return $(element).text().includes('Business Model:');
            }).find('span').text();
            const tags = businessModelText ? businessModelText.split(',').map(tag => tag.trim()) : [];

            companies.push({
                name,
                sncUrl,
                description,
                foundedYear,
                tags,
                website: undefined, // Not available in list view
            });
        });

        return companies;
    }

    /**
     * Smoke-test the client by attempting to fetch page 1 and checking for results.
     *
     * @returns `true` if at least one company is returned; otherwise `false`.
     */
    async testConnection(): Promise<boolean> {
        try {
            const companies = await this.fetchCompaniesPage(1);
            return companies.length > 0;
        } catch (error) {
            return false;
        }
    }

}
