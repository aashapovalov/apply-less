// SNC Finder HTTP client using cookies from Playwright

import axios, {AxiosInstance} from "axios";
import {SNCCompanyRaw} from "../types/index.js";
import * as cheerio from 'cheerio';

const BASE_URL = "https://finder.startupnationcentral.org";

export class SNCClient {
    private httpClient: AxiosInstance;
    private cookieString: string;

    constructor(cookieString: string) {
        this.cookieString = cookieString;

        this.httpClient = axios.create({
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': `${BASE_URL}/startups/search`,
            },
        });
    }

    /**
     * Fetch companies from a specific page
     */
    async fetchCompaniesPage(pageNum: number): Promise<SNCCompanyRaw[]> {
        const url = `${BASE_URL}/startups/search?&semantic=&page=${pageNum}`;

        try {
            console.log(`Fetching page ${pageNum}...`);

            const response = await this.httpClient.get(url, {
            headers: {
                'Cookie'
            :
                this.cookieString
            },
            });

            //Chack for CloudFlare block
            if (response.status === 403 || response.data.includes('Just a moment')) {
                throw new Error('Cloudflare blocked request - cookies may have expired');
            }

            //Parse HTML
            const companies = this.parseCompaniesFromHTML(response.data);
            console.log(`   Found ${companies.length} companies`);

            return companies;
        } catch (error: any) {
            if (error.response?.status === 403) {
                throw new Error('Authentication failed - cookies expired. Please restart Chrome debug session')
            }
            throw error;
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
            const foundedMatch = foundedText.match(/Founded:\s*('d{4})/);
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

    /**
     *  Fetch a single company detail page
     */
    async fetchCompanyDetailPage(companySlug: string): Promise<string> {
        const url = `${BASE_URL}/company_page/${companySlug}`;

        try {
            const response = await this.httpClient.get(url, {
                headers: {
                    "Cookie": this.cookieString,
                },
            });

            if (response.status === 403 || response.data.includes('Just a moment')) {
                throw new Error('Cloudflare blocked request');
            }

            return response.data;
        } catch (error: any) {
            if (error.response?.status === 403) {
                throw new Error('Authentication failed - cookies may have expired');
            }
            throw error;
        }
    }

}