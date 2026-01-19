import * as cheerio from 'cheerio';
import {Browser} from "playwright";
import {SNCCompanyRaw} from "../types/index.js";

const BASE_URL = "https://finder.startupnationcentral.org";

export class SNCClientPlaywright {
    constructor(private browser: Browser) {
    }

    /**
     * Fetch companies form a specific page using Playwright
     */
    async fetchCompaniesPage(pageNum: number): Promise<SNCCompanyRaw[]> {
        const url = `${BASE_URL}/startups/search?&semantic=&page=${pageNum}`;

        const contexts = this.browser.contexts();
        if (contexts.length === 0) {
            throw new Error("No browser context found");
        }

        const context = contexts[0];
        const pages = context.pages();

        if (pages.length === 0) {
            throw new Error("No pages found in browser");
        }

        const page = pages[0];

        try {
            console.log(`Fetching page ${pageNum}...`);

            // Navigate to the page
            await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

            // Wait for company list to load
            await page.waitForSelector('.company-list-item.company', { state: "attached", timeout: 15000 });

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
     * Parse companies from HTML using cheerio
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
     * Test if cookies are still valid
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