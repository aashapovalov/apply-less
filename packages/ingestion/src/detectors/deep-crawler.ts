import { Page } from "playwright";
import {ATS_DOMAINS, EXCLUDED_DOMAINS, EXCLUDED_PATHS, EXCLUDED_SELECTORS, JOB_PATTERNS} from "./ats-patterns.js";
import {ATSDetectionResult} from "../types/index.js";
import {detectATSFromHTML} from "./ats-detector.js";

/**
 * Check whether a given URL belongs to a known ATS provider domain.
 *
 * Matches both:
 *  - exact domains       → "greenhouse.io"
 *  - subdomains          → "company.greenhouse.io", "jobs.lever.co"
 *
 * Used to:
 *  - allow outbound crawling into ATS platforms
 *  - distinguish destination ATS pages from internal company links
 *  - stop recursion once an ATS domain is reached
 *
 * @param href - Absolute URL to evaluate
 * @returns true if the URL belongs to a known ATS domain, false otherwise
 */
function isATSDomain(href: string): boolean {
    try {
        const url = new URL(href);
        return ATS_DOMAINS.some(d => url.hostname === d || url.hostname.endsWith('.' + d));
    } catch {
        return false;
    }
}

/**
 * Extract and filter potential job / careers links from the current page.
 *
 * Strategy:
 *  - Collect all anchor tags with href
 *  - Exclude anchors inside blacklisted DOM sections (headers, footers, nav, etc.)
 *  - Allow:
 *      - same-origin links (company site)
 *      - known ATS provider domains
 *  - Apply post-filters:
 *      - exclude social / irrelevant domains
 *      - exclude non-job paths
 *      - enforce job-related keyword patterns on same-origin links
 *      - avoid already visited URLs
 *
 * ATS domain links are always allowed (assumed job-related by definition).
 * Same-origin links must match JOB_PATTERNS heuristics.
 *
 * This function is designed to maximize recall while controlling crawl noise.
 *
 * @param page - Playwright page instance (current DOM context)
 * @param baseOrigin - Origin of the company website (protocol + host)
 * @param visited - Set of already visited URLs (to avoid loops)
 *
 * @returns Promise resolving to a list of unique, filtered candidate job / career links
 */
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

/**
 * Perform a bounded deep crawl starting from a company's base page in order
 * to discover and identify the ATS provider used by the company.
 *
 * High-level algorithm:
 *  1. Extract candidate job / career links from the current page
 *  2. Visit a limited number of them (breadth control)
 *  3. On each visited page:
 *      - analyze HTML for ATS signals
 *      - stop immediately if a confident ATS match is found
 *  4. Recurse only on same-origin links (never recurse inside ATS domains)
 *  5. Track visited URLs to avoid cycles and infinite loops
 *
 * Detection characteristics:
 *  - Multi-step heuristic crawl
 *  - Medium–high recall
 *  - Controlled runtime via depth and breadth limits
 *  - Produces explainable detectionMethod path (depth + method chain)
 *
 * Stopping conditions:
 *  - maxDepth reached
 *  - no candidate links found
 *  - confident ATS detection achieved
 *
 * Special handling:
 *  - ATS domains are considered terminal destinations (no further crawling)
 *  - detectionMethod is annotated with crawl depth for traceability
 *
 * @param page - Active Playwright page instance
 * @param baseUrl - Original company homepage or careers root URL
 * @param options - Crawl limits (depth and links per level)
 * @param visited - Set of already visited URLs (used internally for cycle prevention)
 *
 * @returns Promise resolving to:
 *  - ATSDetectionResult when an ATS provider is confidently detected
 *  - null if no ATS is found within crawl limits
 */
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

