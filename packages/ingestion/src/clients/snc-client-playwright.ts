import * as cheerio from 'cheerio';
import playwright, {Browser} from "playwright";
import {SNCCompanyRaw} from "../types/index.js";
import {BASE_URL} from "../constants/index.js";

/**
 * Startup Nation Central (SNC) scraping client implemented with Playwright + Cheerio.
 */
export class SNCClientPlaywright {
    constructor(private browser: Browser) {
    }

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

            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await this.waitForCloudFlare(page);

            // Check for 429 rate limit
            const earlyHtml = await page.content();
            if (earlyHtml.includes('exceeded the limit of requests') || earlyHtml.includes('429 :(')) {
                throw new Error('RATE_LIMITED_429');
            }

            // Wait for company list — treat timeout as "empty page" (not an error)
            try {
                await page.waitForSelector('.company-list-item.company', {
                    state: "attached",
                    timeout: 10000
                });
            } catch {
                // No companies found — check if it's actually a 429
                const html = await page.content();
                if (html.includes('exceeded the limit of requests') || html.includes('429 :(')) {
                    throw new Error('RATE_LIMITED_429');
                }
                console.log(`   Found 0 companies (empty page)`);
                return [];
            }

            const html = await page.content();
            const companies = this.parseCompaniesFromHTML(html);
            console.log(`   Found ${companies.length} companies`);

            return companies;
        } catch (error: any) {
            if (error.message === 'RATE_LIMITED_429') throw error;
            throw new Error(`Failed to fetch page ${pageNum}: ${error.message}`);
        }
    }

    private parseCompaniesFromHTML(html: string): SNCCompanyRaw[] {
        const $ = cheerio.load(html);
        const companies: SNCCompanyRaw[] = [];
        const seen = new Set<string>();

        $('.company-list-item.company').each((index, element) => {
            const $card = $(element);

            const nameEl = $card.find('.entity-portfolio-title.header-container-mobile');
            let name = nameEl.contents().first().text().trim()
            name = name.replace(/\s*The profile of this organization.*$/i, '').trim();

            if (!name || seen.has(name)) {
                return;
            }
            seen.add(name);

            const link = $card.closest('a');
            const href = link.attr('href');
            const sncUrl = href ? `${BASE_URL}${href}` : '';

            const descriptionEl = $card.find('.entity-portfolio-header-container > div').last();
            const description = descriptionEl.text().trim();

            const foundedText = $card.find('.entity-portfolio-header-container > div').filter((index, element) => {
                return $(element).text().includes('Founded:');
            }).text();
            const foundedMatch = foundedText.match(/Founded:\s*(\d{4})/);
            const foundedYear = foundedMatch ? parseInt(foundedMatch[1]) : undefined;

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
                website: undefined,
            });
        });

        return companies;
    }

    async testConnection(): Promise<boolean> {
        try {
            const companies = await this.fetchCompaniesPage(1);
            return companies.length > 0;
        } catch (error) {
            return false;
        }
    }
}
