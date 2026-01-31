// Comeet API client for fetching jobs
// API Docs: https://www.comeet.com/careers-api/2.0/doc

import axios, { AxiosInstance } from "axios";
import * as cheerio from "cheerio";

import type { Page } from "playwright";

import { ComeetJob } from "../types/index.js";

const BASE_URL = "https://www.comeet.com/careers-api/2.0";

export class ComeetClient {
    private httpClient: AxiosInstance;

    constructor() {
        this.httpClient = axios.create({
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                'Accept': 'application/json',
            },
        });
    }

    /**
     * Fetch positions from API (with optional token)
     */
    async fetchPositions(companyUid: string, token?: string): Promise<ComeetJob[]> {
        let url = `${BASE_URL}/company/${companyUid}/positions`;
        if (token) {
            url += `?token=${token}`;
        }

        try {
            console.log(`  📥 Fetching Comeet API: ${companyUid}`);
            const response = await this.httpClient.get(url);

            const positions = response.data?.positions ||
                (Array.isArray(response.data)) ? response.data : [];
            console.log(`  ✅ API returned ${positions.length} jobs`);
            return positions;
        } catch (error: any) {
            if (error.response?.status === 404) {
                console.log(`  ⚠️  API 404 for: ${companyUid}`);
            }
            return [];
        }
    }

    /**
     * Fetch single position details (includes full description with details=true)
     */
    async fetchPositionDetail(companyUid: string, positionUid: string, token?: string): Promise<ComeetJob | null> {
        let url = `${BASE_URL}/company/${companyUid}/positions/${positionUid}`;
        const params = new URLSearchParams();
        if (token) {
            params.append('token', token);
        }
        params.append('details', 'true'); // This returns the full job description!
        
        url += '?' + params.toString();

        try {
            const response = await this.httpClient.get(url);
            return response.data;
        } catch (error: any) {
            if (error.response?.status === 404) {
                return null;
            }
            console.error(`  ⚠️  Failed to fetch position detail: ${error.message}`);
            return null;
        }
    }

    /**
     * Extract text description from Comeet details array
     * The API returns details as an array: [{name, value (HTML), order}, ...]
     */
    parseDetailsToDescription(details: Array<{name: string; value: string; order: number}> | undefined): string {
        if (!details || !Array.isArray(details) || details.length === 0) {
            return '';
        }

        // Sort by order and combine all sections
        const sorted = [...details].sort((a, b) => a.order - b.order);
        
        const sections: string[] = [];
        for (const section of sorted) {
            if (section.value) {
                // Parse HTML to text
                const $ = cheerio.load(section.value);
                const text = $('body').text().trim();
                if (text) {
                    sections.push(`${section.name}:\n${text}`);
                }
            }
        }

        return sections.join('\n\n');
    }

    /**
     * Scrape positions from page HTML
     */
    scrapeFromHTML(html: string, baseUrl: string): ComeetJob[]{
        const $ = cheerio.load(html);
        const jobs: ComeetJob[] = [];

        $('.comeet-position').each((_, elem) => {
            const $elem = $(elem);
            const name = $elem.find('.comeet-position-name').text().trim();
            let url = $elem.attr('href') || "";

            // Fix relative URLs
            if (url.startsWith('//')) {
                url = 'https:' + url;
            } else if (url.startsWith('/')) {
                const base = new URL(baseUrl);
                url = `${base.origin}${url}`;
            }

            const location = $elem.find('.comeet-position-meta').text().trim();
            const uidMatch = url.match(/\/([A-Z0-9]{2,3}\.[A-Z0-9]{3})\//i);

            if (name) {
                jobs.push({
                    uid: uidMatch?.[1] || "",
                    name,
                    location: { name: location },
                    department: { name: ""},
                    description: "",
                    url_active_page: url,
                    url_comeet_page: url,
                    time_updated: new Date().toISOString(),
                });
            }
        });

        return jobs;
    }

    /**
     * Scrape positions form iframe content (Pattern2: widget)
     */
    async  scrapeFromIFrame(page: Page): Promise<ComeetJob[]> {
        const jobs: ComeetJob[] = [];

        const frame = page.frames().find(f => f.url().includes('comeet'));
        if (!frame) return jobs;

        await frame.waitForTimeout(2000);
        const frameContent = await frame.content();
        const $ = cheerio.load(frameContent);

        $('.comeet-position, [class*="position-item"]').each((_, elem) => {
            const $elem = $(elem);
            const name = $elem.find('[class*="title"], [class*="name').text().trim() ||
                $elem.text().substring(100).trim();
            const location = $elem.find('[class*="location"]').text().trim();
            const url = $elem.attr('href') || "";

            if (name && name.length > 5) {
                jobs.push({
                    uid: "",
                    name,
                    location: { name: location },
                    department: { name: ""},
                    description: "",
                    url_active_page: url,
                    url_comeet_page: url,
                    time_updated: new Date().toISOString(),
                });
            }
        });

        return jobs;
    }

    extractCredentialsFromHTML(html: string): { uid?: string; token?: string } {
        // From comeet.init (company UID with hyphen)
        let uidMatch = html.match(/"company-uid"\s*:\s*"([^"]+)"/);
        let tokenMatch = html.match(/"token"\s*:\s*"([^"]+)"/);

        if (uidMatch) {
            return { uid: uidMatch[1], token: tokenMatch?.[1] }
        }

        // From comeetvar (comeet_uid with underscore)
        uidMatch = html.match(/"comeet_uid"\s*:\s*"([^"]+)"/);
        tokenMatch = html.match(/"comeet_token"\s*:\s*"([^"]+)"/);

        if (uidMatch) {
            return { uid: uidMatch[1], token: tokenMatch?.[1] };
        }

        // From iframe src
        const iframeSrcMatch = html.match(/iframe[^>]*src=["']([^"']*comeet\.co[^"']*)["']/i);
        if (iframeSrcMatch) {
            const src = iframeSrcMatch[1];
            const pathUid = src.match(/\/jobs\/([^/?]+)/);
            const paramToken = src.match(/token=([^&]+)/);
            if (pathUid) {
                return { uid: pathUid[1], token: paramToken?.[1] };
            }
        }

        return {};
    }

    /**
     * Extract UID from URL
     */
    extractUidFromUrl(url: string): string | null {
        const match = url.match(/comeet\.co?m?\/jobs\/([^/?]+)/);
        return match ? match[1] : null;
    }
}