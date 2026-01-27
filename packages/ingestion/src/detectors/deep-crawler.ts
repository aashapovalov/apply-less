import { Page } from "playwright";
import {ATS_DOMAINS, EXCLUDED_DOMAINS, EXCLUDED_PATHS, EXCLUDED_SELECTORS, JOB_PATTERNS} from "./ats-patterns.js";
import {ATSDetectionResult} from "../types/index.js";
import {detectATSFromHTML} from "./ats-detector.js";

/**
 * Check whether a given URL belongs to a known ATS provider domain.
 */
function isATSDomain(href: string): boolean {
    try {
        const url = new URL(href);
        return ATS_DOMAINS.some(d => url.hostname === d || url.hostname.endsWith('.' + d));
    } catch {
        return false;
    }
}

interface LinkInfo {
    href: string;
    text: string;
    inExcludedContainer: boolean;
}

/**
 * Extract all links with metadata for verbose logging.
 */
async function extractAllLinks(page: Page, baseOrigin: string): Promise<LinkInfo[]> {
    return page.$$eval(
        'a[href]',
        (anchors, args) => {
            const { excludeSelectors } = args;

            return anchors.map(a => {
                const inExcluded = excludeSelectors.some((selector: string) => a.closest(selector));
                return {
                    href: (a as HTMLAnchorElement).href,
                    text: a.textContent?.trim().substring(0, 40) || '',
                    inExcludedContainer: inExcluded,
                };
            });
        },
        { excludeSelectors: EXCLUDED_SELECTORS }
    );
}

/**
 * Filter links and return both filtered results and rejection reasons (for verbose mode).
 */
function filterLinks(
    links: LinkInfo[],
    baseOrigin: string,
    visited: Set<string>,
    verbose: boolean
): { accepted: string[]; rejections: Array<{ href: string; reason: string }> } {
    const accepted: string[] = [];
    const rejections: Array<{ href: string; reason: string }> = [];

    for (const link of links) {
        const { href, inExcludedContainer } = link;
        const lower = href.toLowerCase();

        // Skip empty
        if (!href) {
            continue;
        }

        // Check if in excluded container
        if (inExcludedContainer) {
            if (verbose) rejections.push({ href, reason: 'in header/footer/nav' });
            continue;
        }

        // Must be same-origin or ATS domain
        const isSameOrigin = href.startsWith(baseOrigin);
        const isATS = isATSDomain(href);

        if (!isSameOrigin && !isATS) {
            if (verbose && href.startsWith('http')) {
                rejections.push({ href, reason: 'external (not ATS domain)' });
            }
            continue;
        }

        // Check excluded domains
        if (EXCLUDED_DOMAINS.some(d => lower.includes(d))) {
            if (verbose) rejections.push({ href, reason: `excluded domain` });
            continue;
        }

        // Check excluded paths
        if (EXCLUDED_PATHS.some(p => lower.includes(p))) {
            if (verbose) rejections.push({ href, reason: `excluded path` });
            continue;
        }

        // For same-origin, must match job pattern
        if (isSameOrigin && !isATS) {
            if (!JOB_PATTERNS.some(p => lower.includes(p))) {
                if (verbose) rejections.push({ href, reason: 'no job pattern match' });
                continue;
            }
        }

        // Check already visited
        if (visited.has(href)) {
            if (verbose) rejections.push({ href, reason: 'already visited' });
            continue;
        }

        accepted.push(href);
    }

    return { accepted: [...new Set(accepted)], rejections };
}

export interface DeepCrawlOptions {
    maxDepth?: number;
    maxLinksPerLevel?: number;
    verbose?: boolean;
}

/**
 * Perform a bounded deep crawl to discover ATS provider.
 */
export async function deepCrawlForAts(
    page: Page,
    baseUrl: string,
    options: DeepCrawlOptions = {},
    visited: Set<string> = new Set(),
): Promise<ATSDetectionResult | null> {
    const { maxDepth = 2, maxLinksPerLevel = 3, verbose = false } = options;

    if (maxDepth <= 0) {
        return null;
    }

    const baseOrigin = new URL(baseUrl).origin;
    const currentUrl = page.url();
    const depth = 3 - maxDepth;
    const depthIndicator = '→'.repeat(depth);
    const indent = '   ';

    visited.add(currentUrl);

    // Extract all links
    const allLinks = await extractAllLinks(page, baseOrigin);

    if (verbose) {
        console.log(`\n${indent}${depthIndicator} 📄 Page: ${currentUrl}`);
        console.log(`${indent}${depthIndicator} 📊 Total links on page: ${allLinks.length}`);
    }

    // Filter links
    const { accepted, rejections } = filterLinks(allLinks, baseOrigin, visited, verbose);

    if (verbose && rejections.length > 0) {
        console.log(`${indent}${depthIndicator} ❌ Rejected links:`);
        
        // Group by reason
        const byReason: Record<string, string[]> = {};
        for (const r of rejections) {
            if (!byReason[r.reason]) byReason[r.reason] = [];
            byReason[r.reason].push(r.href);
        }
        
        for (const [reason, hrefs] of Object.entries(byReason)) {
            console.log(`${indent}${depthIndicator}    ${reason}: ${hrefs.length}`);
            if (hrefs.length <= 3) {
                hrefs.forEach(h => console.log(`${indent}${depthIndicator}       - ${h.replace(baseOrigin, '')}`));
            }
        }
    }

    if (accepted.length === 0) {
        if (verbose) {
            console.log(`${indent}${depthIndicator} ⚠️ No candidate links found`);
        }
        return null;
    }

    console.log(`${indent}${depthIndicator} Found ${accepted.length} job links at depth ${depth}, probing up to ${maxLinksPerLevel}...`);

    if (verbose) {
        console.log(`${indent}${depthIndicator} ✅ Candidate links:`);
        accepted.slice(0, 10).forEach((href, i) => {
            const isATS = isATSDomain(href);
            const display = isATS ? href : href.replace(baseOrigin, '');
            const marker = i < maxLinksPerLevel ? '→' : '  (skip)';
            console.log(`${indent}${depthIndicator}    ${marker} ${isATS ? '🔗 ' : ''}${display}`);
        });
        if (accepted.length > 10) {
            console.log(`${indent}${depthIndicator}    ... and ${accepted.length - 10} more`);
        }
    }

    // Crawl selected links
    for (const link of accepted.slice(0, maxLinksPerLevel)) {
        try {
            visited.add(link);

            const isATS = isATSDomain(link);
            const displayLink = isATS ? link : link.replace(baseOrigin, '');
            
            if (!verbose) {
                console.log(`${indent}${depthIndicator} ${isATS ? '🔗 ' : ''}${displayLink}`);
            } else {
                console.log(`\n${indent}${depthIndicator} ➡️  Navigating: ${isATS ? '🔗 ' : ''}${displayLink}`);
            }

            await page.goto(link, { waitUntil: "domcontentloaded", timeout: 15000 });
            await page.waitForTimeout(2000);

            const html = await page.content();
            const detection = detectATSFromHTML(html, page.url());

            if (verbose) {
                console.log(`${indent}${depthIndicator}    Detection: ${detection.atsType} (${(detection.confidence * 100).toFixed(0)}%) ${detection.extractedSlug ? `slug: ${detection.extractedSlug}` : ''}`);
            }

            // Found ATS!
            if (detection.atsType !== 'unknown' && detection.confidence >= 0.6) {
                console.log(`${indent}${depthIndicator} ✅ Found ${detection.atsType}!`);
                return {
                    ...detection,
                    detectionMethod: `deep_crawl_d${depth}:${detection.detectionMethod}`,
                    careersUrl: baseUrl,
                };
            }

            // Only go deeper on same-origin links
            if (!isATS) {
                const deeperResult = await deepCrawlForAts(
                    page,
                    baseUrl,
                    { maxDepth: maxDepth - 1, maxLinksPerLevel, verbose },
                    visited,
                );

                if (deeperResult) {
                    return deeperResult;
                }
            }

        } catch (error: any) {
            console.log(`${indent}${depthIndicator} ⚠️ Failed: ${error.message}`);
        }
    }

    return null;
}
