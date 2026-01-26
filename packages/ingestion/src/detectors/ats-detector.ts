import * as cheerio from "cheerio";
import { ATS_PATTERNS } from "./ats-patterns.js";
import { ATSDetectionResult } from "../types/index.js";
import { Page } from "playwright";

/**
 * Detects which ATS vendor is used by a careers page using raw HTML.
 *
 * Detection order (highest priority first):
 *  1. URL pattern match
 *  2. Script/widget signature
 *  3. DOM selector match
 *  4. Generic HTML content match
 *
 * The first ATS whose confidence reaches ≥ 0.6 is returned.
 *
 * @param html - Full HTML content of the careers page
 * @param url  - Final resolved URL of the page
 * @returns Detection result including ATS type, confidence, and extracted identifiers
 */
export function detectATSFromHTML(html: string, url: string): ATSDetectionResult {
    const $ = cheerio.load(html);

    for (const pattern of ATS_PATTERNS) {
        let confidence = 0;
        let detectionMethod = '';

        // Check URL patterns (highest confidence)
        if (pattern.urlPatterns?.some(r => r.test(url))) {
            confidence = 0.95;
            detectionMethod = "url_pattern";
        }

        // Check selectors
        if (confidence < 0.9 && pattern.selectors?.some(s => $(s).length > 0)) {
            confidence = Math.max(confidence, 0.85);
            detectionMethod = detectionMethod || 'selector';
        }

        // Check HTML patterns
        if (confidence < 0.8 && pattern.htmlPatterns?.some(r => r.test(html))) {
            confidence = Math.max(confidence, 0.7);
            detectionMethod = detectionMethod || 'html_pattern';
        }

        // Check script patterns
        if (confidence < 0.9 && pattern.scriptPatterns?.some(r => r.test(html))) {
            confidence = Math.max(confidence, 0.9);
            detectionMethod = detectionMethod || 'script_pattern';
        }

        if (confidence >= 0.6) {
            const extracted = pattern.slugExtractor?.(html, url);
            return {
                atsType: pattern.type,
                confidence,
                detectionMethod,
                extractedSlug: extracted?.slug,
                extractedToken: extracted?.token,
                careersUrl: url,
            }
        }
    }

    return { atsType: 'unknown', confidence: 0, detectionMethod: 'no_match', careersUrl: url };
}

/**
 * Detects ATS vendor by loading a live careers page in Playwright.
 *
 * @param page - Playwright Page instance (already created by the caller)
 * @param url  - Careers page URL to analyze
 * @returns Promise resolving to ATS detection result
 */
export async function detectATSFromPage(page: Page, url: string): Promise<ATSDetectionResult> {
    try {
        console.log(`   🔍 Loading page...`);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        
        // Wait for JS to render content
        console.log(`   🔍 Waiting for content...`);
        await page.waitForTimeout(5000);
        
        // Scroll to trigger lazy loading
        console.log(`   🔍 Scrolling...`);
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(3000);

        const html = await page.content();
        console.log(`   🔍 HTML length: ${html.length}, greenhouse.io found: ${/greenhouse\.io/i.test(html)}`);
        return detectATSFromHTML(html, page.url());
    } catch (error: any) {
        console.log(`   ❌ Error: ${error.message}`);
        return { atsType: 'unknown', confidence: 0, detectionMethod: `error: ${error.message}`, careersUrl: url };
    }
}
