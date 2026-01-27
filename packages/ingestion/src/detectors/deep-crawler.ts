import { Page } from "playwright";
import {ATS_DOMAINS, EXCLUDED_DOMAINS, EXCLUDED_PATHS, EXCLUDED_SELECTORS, JOB_PATTERNS} from "./ats-patterns.js";
import {ATSDetectionResult} from "../types/index.js";
import {detectATSFromHTML} from "./ats-detector.js";

/**
 * Check if a URL os a known ATS domain.
 */
function isATSDomain(href: string): boolean {
    try {
        const url = new URL(href);
        return ATS_DOMAINS.some(d => url.hostname === d || url.hostname.endsWith('.' + d));
    } catch {
        return false;
    }
}

async function extractJobLinks(page: Page, baseOrigin: string, visited: Set<string>): Promise<string[]> {
    const links: string[] = await page.$$eval(
        'a[href]',
        (anchors, args) => {
            const { origin, excludeSelectors, atsDomains } = args;

            return anchors
                .filter(a => {
                    for (const selector of excludeSelectors) {
                        if (a.closest(selector)) {
                            return false
                        }
                    }
                    return true
                })
                .map(a => (a as HTMLAnchorElement).href)
                .filter(href => {
                    if (!href) return false;

                    // Allow same-origin links
                    if (href.startsWith(origin)) return true;

                    // Allow known ATS domains
                    try {
                        const url = new URL(href);
                        return atsDomains.some((domain: string) =>
                            url.hostname === domain || url.hostname.endsWith('.' + domain)
                        );
                    } catch {
                        return false;
                    }
                });
        },
        { origin: baseOrigin, excludeSelectors: EXCLUDED_SELECTORS, atsDomains: ATS_DOMAINS }
    );

    return [... new Set(links)].filter(link => {
        const lower = link.toLowerCase();

        // Exclude social/bad domains
        if (EXCLUDED_DOMAINS.some(domain => lower.includes(domain))) return false;

        // Exclude non-job paths
        if (EXCLUDED_PATHS.some(domain => lower.includes(domain))) return false;

        // For ATS domains, always allow (they're inherently job-related)
        if (isATSDomain(link)) {
            return !visited.has(link);
        }

        // For same-origin links, mest match job pattern
        if (!JOB_PATTERNS.some(pattern => lower.includes(pattern))) return false;

        // Not already visited
        return !visited.has(link);
    });
}

export interface DeepCrawlOptions {
    maxDepth?: number;
    maxLinksPerLevel?: number;
}

export async function deepCrawlForAts(
    page: Page,
    baseUrl: string,
    options: DeepCrawlOptions = {},
    visited: Set<string> = new Set(),
): Promise<ATSDetectionResult | null> {
    const { maxDepth = 2, maxLinksPerLevel = 3 } = options;

    if (maxDepth <= 0) {
        return null;
    }

    const baseOrigin = new URL(baseUrl).origin;
    const currentUrl = page.url();
    visited.add(currentUrl);

    const potentialLinks = await extractJobLinks(page, baseOrigin, visited);

    if (potentialLinks.length === 0) {
        return null;
    }

    const depthIndicator = '→'.repeat(3 - maxDepth);
    console.log(`   ${depthIndicator} Found ${potentialLinks.length} job links at depth ${3 - maxDepth}, probing up to ${maxLinksPerLevel}...`);

    for (const link of potentialLinks.slice(0, maxLinksPerLevel)) {
        try {
            visited.add(link);

            // Show shortened link (remove origin for same origin, keep full for ATS
            const isATS = isATSDomain(link);
            const displayLink = isATS ? link : link.replace(baseOrigin, '');
            console.log(`   ${depthIndicator} ${isATS ? '🔗 ' : ''}${displayLink}`);

            await page.goto(link, { waitUntil: "domcontentloaded", timeout: 15000 });
            await page.waitForTimeout(2000);

            const html = await page.content();
            const detection = detectATSFromHTML(html, page.url());

            // Found ATS!
            if (detection.atsType !== 'unknown' && detection.confidence >= 0.6) {
                console.log(`   ${depthIndicator} ✅ Found ${detection.atsType}!`);
                return {
                    ...detection,
                    detectionMethod: `deep_crawl+d${3 - maxDepth}:${detection.detectionMethod}`,
                    careersUrl: baseUrl,
                };
            }

            // Only go deeper on same-origin links (not ATS domains)
            // ATS domains are the destination, no need to crawl further
            if (!isATS) {
                const deeperResult = await deepCrawlForAts(
                    page,
                    baseUrl,
                    { maxDepth: maxDepth - 1, maxLinksPerLevel },
                    visited,
                );

                if (deeperResult) {
                    return deeperResult;
                }
            }

        } catch (error: any) {
            console.log(`   ${depthIndicator} ⚠️ Failed: ${error.message}`);
        }
    }

    return null;
}

