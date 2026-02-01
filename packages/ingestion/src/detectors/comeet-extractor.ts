import { Page } from "playwright";
import { ATSDetectionResult } from "../types/index.js";

/**
 * Patterns to find Comeet UID/token in HTML/scripts
 */
const COMEET_SCRIPT_PATTERNS = [
    /"company-uid":\s*"([^"]+)"/,
    /'company-uid':\s*'([^']+)'/,
    /["']company-uid["']\s*:\s*["']([^"']+)["']/,
];

const COMEET_TOKEN_PATTERNS = [
    /"token":\s*"([^"]+)"/,
    /'token':\s*'([^']+)'/,
    /["']token["']\s*:\s*["']([A-Z0-9]+)["']/,
];

/**
 * Patterns to find position/job links
 */
const POSITION_URL_PATTERNS = [
    /\/position\/[^\/]+\/?$/i,
    /\/job\/[^\/]+\/?$/i,
    /\/jobs\/[^\/]+\/?$/i,
    /comeet\.(co|com)\/jobs\/[^\/]+/i,  // Match both .co and .com
];

/**
 * Extract Comeet UID and token from page HTML.
 */
function extractFromHTML(html: string): { uid: string | null; token: string | null } {
    let uid: string | null = null;
    let token: string | null = null;

    for (const pattern of COMEET_SCRIPT_PATTERNS) {
        const match = html.match(pattern);
        if (match) {
            uid = match[1];
            break;
        }
    }

    for (const pattern of COMEET_TOKEN_PATTERNS) {
        const match = html.match(pattern);
        if (match) {
            token = match[1];
            break;
        }
    }

    return { uid, token };
}

/**
 * Find position links on the page using multiple strategies.
 * Checks ALL links regardless of nav/header location.
 */
async function findPositionLinks(page: Page, baseOrigin: string): Promise<string[]> {
    const links = new Set<string>();

    // Strategy 1: Standard href links
    const hrefLinks = await page.$$eval('a[href]', anchors => 
        anchors.map(a => (a as HTMLAnchorElement).href)
    );
    
    for (const href of hrefLinks) {
        if (href && !href.endsWith('#') && !href.includes('/#')) {
            if (POSITION_URL_PATTERNS.some(p => p.test(href))) {
                links.add(href);
            }
        }
    }

    // Strategy 2: Check for hash-based routing (SPA style)
    // Links like /careers/#/position/123 or #position/123
    const hashLinks = await page.$$eval('a[href*="#"]', anchors => 
        anchors.map(a => (a as HTMLAnchorElement).href)
    );
    
    for (const href of hashLinks) {
        if (href && href.includes('#') && /position|job/i.test(href)) {
            links.add(href);
        }
    }

    // Strategy 3: Check onclick handlers that navigate to positions
    const onclickLinks = await page.$$eval('[onclick*="position"], [onclick*="job"]', elements => 
        elements
            .map(el => el.getAttribute('onclick') || '')
            .filter(onclick => /position|job/i.test(onclick))
    );
    
    console.log(`   📊 Found: ${hrefLinks.length} href links, ${hashLinks.length} hash links, ${onclickLinks.length} onclick handlers`);

    // Strategy 4: Look for position IDs in the page and construct URLs
    const html = await page.content();
    const positionIdMatches = html.matchAll(/["']?\/position\/([A-Z0-9]+\.[A-Z0-9]+)\/?["']?/gi);
    for (const match of positionIdMatches) {
        const positionUrl = `${baseOrigin}/position/${match[1]}/`;
        links.add(positionUrl);
    }

    return [...links];
}

/**
 * Check for Comeet iframe and extract UID from its src or by navigating into it.
 */
async function checkComeetIframe(page: Page): Promise<{ uid: string | null; token: string | null }> {
    // Check for iframes with comeet in src
    const iframeSrcs = await page.$$eval('iframe[src]', frames => 
        frames.map(f => (f as HTMLIFrameElement).src)
    );
    
    for (const src of iframeSrcs) {
        if (src.includes('comeet')) {
            console.log(`   🖼️ Found Comeet iframe: ${src}`);
            // Try to extract UID from iframe URL
            const uidMatch = src.match(/comeet\.co\/jobs\/([^\/\?]+)/);
            if (uidMatch) {
                return { uid: uidMatch[1], token: null };
            }
        }
    }

    return { uid: null, token: null };
}

/**
 * Wait for dynamic content to load and check for position elements.
 */
async function waitForDynamicContent(page: Page): Promise<void> {
    // Wait for potential Comeet widget to load
    try {
        await page.waitForSelector('[class*="comeet"], [id*="comeet"], [data-comeet]', { timeout: 3000 });
        console.log(`   ⏳ Comeet widget detected, waiting for content...`);
        await page.waitForTimeout(2000);
    } catch {
        // No Comeet widget found, continue
    }
}

/**
 * Extract Comeet UID by navigating to position pages.
 * 
 * Strategy:
 * 1. First check current page HTML for COMEET.init script
 * 2. Check for Comeet iframes
 * 3. Wait for dynamic content to load
 * 4. Look for position/job links (even in header/nav)
 * 5. Navigate to position page and extract UID from script
 * 
 * @param page - Playwright page instance
 * @param careersUrl - Original careers URL (to return to)
 * @returns ATSDetectionResult with UID if found, null otherwise
 */
export async function extractComeetUID(
    page: Page,
    careersUrl: string
): Promise<ATSDetectionResult | null> {
    console.log(`   🔍 Extracting Comeet UID...`);

    const baseOrigin = new URL(careersUrl).origin;

    // 1. Check current page first
    const currentHtml = await page.content();
    const currentExtract = extractFromHTML(currentHtml);

    if (currentExtract.uid) {
        console.log(`   ✅ Found UID on current page: ${currentExtract.uid}`);
        return {
            atsType: 'comeet',
            confidence: 0.9,
            detectionMethod: 'comeet_script_extraction',
            careersUrl,
            extractedSlug: currentExtract.uid,
            extractedToken: currentExtract.token || undefined,
        };
    }

    // 2. Extract UID directly from comeet.com/comeet.co links on the page
    // Link format: https://www.comeet.com/jobs/COMPANY/UID/job-title/...
    const comeetLinkMatch = currentHtml.match(/comeet\.(com|co)\/jobs\/[^\/]+\/([A-Z0-9.]+)/i);
    if (comeetLinkMatch) {
        const uid = comeetLinkMatch[2];
        console.log(`   ✅ Found UID from Comeet link: ${uid}`);
        return {
            atsType: 'comeet',
            confidence: 0.95,
            detectionMethod: 'comeet_link_extraction',
            careersUrl,
            extractedSlug: uid,
        };
    }

    // 3. Check for Comeet iframe
    const iframeResult = await checkComeetIframe(page);
    if (iframeResult.uid) {
        console.log(`   ✅ Found UID in iframe: ${iframeResult.uid}`);
        return {
            atsType: 'comeet',
            confidence: 0.85,
            detectionMethod: 'comeet_iframe_extraction',
            careersUrl,
            extractedSlug: iframeResult.uid,
            extractedToken: iframeResult.token || undefined,
        };
    }

    // 4. Wait for dynamic content
    await waitForDynamicContent(page);

    // Re-check HTML after dynamic load
    const dynamicHtml = await page.content();
    const dynamicExtract = extractFromHTML(dynamicHtml);
    if (dynamicExtract.uid) {
        console.log(`   ✅ Found UID after dynamic load: ${dynamicExtract.uid}`);
        return {
            atsType: 'comeet',
            confidence: 0.9,
            detectionMethod: 'comeet_dynamic_extraction',
            careersUrl,
            extractedSlug: dynamicExtract.uid,
            extractedToken: dynamicExtract.token || undefined,
        };
    }

    // 5. Find position links (even in header/nav)
    const positionLinks = await findPositionLinks(page, baseOrigin);

    if (positionLinks.length === 0) {
        console.log(`   ⚠️ No position links found`);
        return null;
    }

    console.log(`   📋 Found ${positionLinks.length} position links, checking up to 3...`);
    positionLinks.slice(0, 5).forEach(l => console.log(`      - ${l}`));

    // 6. Visit position pages to find UID
    for (const link of positionLinks.slice(0, 3)) {
        try {
            const shortLink = link.length > 70 ? link.substring(0, 70) + '...' : link;
            console.log(`   → Visiting: ${shortLink}`);

            await page.goto(link, { waitUntil: 'domcontentloaded', timeout: 15000 });
            await page.waitForTimeout(3000); // Wait longer for Comeet script to initialize

            const html = await page.content();
            const { uid, token } = extractFromHTML(html);

            if (uid) {
                console.log(`   ✅ Found UID: ${uid}, token: ${token ? 'yes' : 'no'}`);
                
                // Navigate back to careers page
                await page.goto(careersUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });

                return {
                    atsType: 'comeet',
                    confidence: 0.9,
                    detectionMethod: 'comeet_position_extraction',
                    careersUrl,
                    extractedSlug: uid,
                    extractedToken: token || undefined,
                };
            } else {
                console.log(`   ❌ No UID found on this page`);
            }

        } catch (e: any) {
            console.log(`   ⚠️ Failed: ${e.message}`);
        }
    }

    // Navigate back to careers page
    try {
        await page.goto(careersUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    } catch {}

    console.log(`   ❌ Could not extract Comeet UID`);
    return null;
}
