#!/usr/bin/env node
/**
 * Debug script for ATS detection pipeline.
 * Run on a single company to see detailed output at every step.
 * 
 * Usage:
 *   npx ts-node src/debug-detection.ts "Company Name"
 *   npx ts-node src/debug-detection.ts --url "https://company.com/careers"
 */

import { chromium, Page } from "playwright";
import { getDb, closeDb } from "../config/db.js";
import { detectATSFromHTML, detectATSFromPage } from "./ats-detector.js";
import { generateSlugVariations, probeGreenhouseAPI } from "./greenhouse-probe.js";
import { detectByKeyword } from "./keyword-detector.js";
import { ATS_PATTERNS } from "./ats-patterns.js";

// ============== CONFIG ==============
const DEBUG = true;
const DEEP_CRAWL_MAX_DEPTH = 2;
const DEEP_CRAWL_MAX_LINKS = 5;

// ============== HELPERS ==============
function log(section: string, message: string, data?: any) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📍 ${section}`);
    console.log('='.repeat(60));
    console.log(message);
    if (data !== undefined) {
        if (typeof data === 'object') {
            console.log(JSON.stringify(data, null, 2));
        } else {
            console.log(data);
        }
    }
}

function logStep(step: number, name: string) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`🔹 Step ${step}: ${name}`);
    console.log('─'.repeat(60));
}

// ============== PATTERN ANALYSIS ==============
function analyzePatterns(html: string, url: string) {
    log('PATTERN ANALYSIS', 'Checking all ATS patterns against page...');
    
    for (const pattern of ATS_PATTERNS) {
        console.log(`\n🏷️  ${pattern.type.toUpperCase()}`);
        
        // URL patterns
        if (pattern.urlPatterns) {
            for (const regex of pattern.urlPatterns) {
                const match = url.match(regex);
                console.log(`   URL [${regex.source.substring(0, 40)}...]: ${match ? '✅ MATCH: ' + match[0] : '❌'}`);
            }
        }
        
        // HTML patterns
        if (pattern.htmlPatterns) {
            for (const regex of pattern.htmlPatterns) {
                const match = html.match(regex);
                console.log(`   HTML [${regex.source.substring(0, 40)}]: ${match ? '✅ MATCH' : '❌'}`);
            }
        }
        
        // Script patterns
        if (pattern.scriptPatterns) {
            for (const regex of pattern.scriptPatterns) {
                const match = html.match(regex);
                console.log(`   Script [${regex.source.substring(0, 40)}]: ${match ? '✅ MATCH' : '❌'}`);
            }
        }
        
        // Slug extraction
        if (pattern.slugExtractor) {
            const extracted = pattern.slugExtractor(html, url);
            console.log(`   Slug extractor: ${extracted ? '✅ ' + JSON.stringify(extracted) : '❌ null'}`);
        }
    }
}

// ============== LINK EXTRACTION ==============
async function extractAllLinks(page: Page, baseOrigin: string) {
    log('LINK EXTRACTION', `Extracting all links from ${page.url()}...`);
    
    const links = await page.$$eval('a[href]', (anchors) => {
        return anchors.map(a => ({
            href: (a as HTMLAnchorElement).href,
            text: a.textContent?.trim().substring(0, 50) || '',
            inHeader: !!a.closest('header, nav, [role="navigation"], .header, .nav, #header, #nav'),
            inFooter: !!a.closest('footer, [role="contentinfo"], .footer, #footer'),
        }));
    });
    
    // Categorize links
    const internal = links.filter(l => l.href.startsWith(baseOrigin));
    const external = links.filter(l => !l.href.startsWith(baseOrigin) && l.href.startsWith('http'));
    
    console.log(`\n📊 Link Summary:`);
    console.log(`   Total: ${links.length}`);
    console.log(`   Internal: ${internal.length}`);
    console.log(`   External: ${external.length}`);
    console.log(`   In header/nav: ${links.filter(l => l.inHeader).length}`);
    console.log(`   In footer: ${links.filter(l => l.inFooter).length}`);
    
    // Job-like patterns
    const jobPatterns = ['/position', '/job', '/opening', '/role', '/vacancy', '/career', '/location', '/department', '/team'];
    const jobLinks = links.filter(l => jobPatterns.some(p => l.href.toLowerCase().includes(p)));
    
    console.log(`\n🎯 Job-like links (${jobLinks.length}):`);
    jobLinks.slice(0, 20).forEach(l => {
        const flags = [];
        if (l.inHeader) flags.push('header');
        if (l.inFooter) flags.push('footer');
        console.log(`   ${l.href}`);
        console.log(`      Text: "${l.text}" ${flags.length ? `[${flags.join(', ')}]` : ''}`);
    });
    
    // ATS domain links
    const atsDomains = ['greenhouse.io', 'lever.co', 'workable.com', 'comeet.co', 'comeet.com'];
    const atsLinks = external.filter(l => atsDomains.some(d => l.href.includes(d)));
    
    if (atsLinks.length > 0) {
        console.log(`\n🔗 ATS Domain links (${atsLinks.length}):`);
        atsLinks.forEach(l => {
            console.log(`   ${l.href}`);
            console.log(`      Text: "${l.text}"`);
        });
    }
    
    return { links, internal, external, jobLinks, atsLinks };
}

// ============== DEEP CRAWL DEBUG ==============
async function debugDeepCrawl(page: Page, baseUrl: string, depth: number = DEEP_CRAWL_MAX_DEPTH, visited: Set<string> = new Set()) {
    if (depth <= 0) return;
    
    const baseOrigin = new URL(baseUrl).origin;
    visited.add(page.url());
    
    log(`DEEP CRAWL (depth ${DEEP_CRAWL_MAX_DEPTH - depth + 1})`, `Analyzing: ${page.url()}`);
    
    // Extract and analyze links
    const { jobLinks, atsLinks } = await extractAllLinks(page, baseOrigin);
    
    // Check current page for ATS
    const html = await page.content();
    const currentDetection = detectATSFromHTML(html, page.url());
    console.log(`\n🔍 Current page detection: ${currentDetection.atsType} (${(currentDetection.confidence * 100).toFixed(0)}%)`);
    if (currentDetection.extractedSlug) {
        console.log(`   Slug: ${currentDetection.extractedSlug}`);
    }
    
    if (currentDetection.atsType !== 'unknown' && currentDetection.confidence >= 0.6) {
        console.log(`\n✅ ATS FOUND! Stopping crawl.`);
        return currentDetection;
    }
    
    // Filter links for crawling
    const excludedDomains = ['linkedin.com', 'facebook.com', 'twitter.com', 'instagram.com', 'youtube.com', 'github.com'];
    const excludedPaths = ['/privacy', '/terms', '/about', '/contact', '/blog', '/login'];
    
    const atsDomains = ['greenhouse.io', 'lever.co', 'workable.com', 'comeet.co'];
    
    const crawlCandidates = [...jobLinks, ...atsLinks]
        .filter(l => !visited.has(l.href))
        .filter(l => !l.inHeader && !l.inFooter)
        .filter(l => !excludedDomains.some(d => l.href.includes(d)))
        .filter(l => !excludedPaths.some(p => l.href.toLowerCase().includes(p)))
        .slice(0, DEEP_CRAWL_MAX_LINKS);
    
    console.log(`\n📋 Crawl candidates (${crawlCandidates.length}):`);
    crawlCandidates.forEach((l, i) => {
        console.log(`   ${i + 1}. ${l.href}`);
    });
    
    // Crawl each candidate
    for (const link of crawlCandidates) {
        visited.add(link.href);
        
        try {
            console.log(`\n➡️  Navigating to: ${link.href}`);
            await page.goto(link.href, { waitUntil: 'domcontentloaded', timeout: 15000 });
            await page.waitForTimeout(2000);
            
            const result = await debugDeepCrawl(page, baseUrl, depth - 1, visited);
            if (result) return result;
            
        } catch (e: any) {
            console.log(`   ⚠️ Failed: ${e.message}`);
        }
    }
    
    return null;
}

// ============== MAIN DEBUG FUNCTION ==============
async function debugDetection(companyName: string, careersUrl?: string) {
    console.log('\n' + '🔬'.repeat(30));
    console.log('  ATS DETECTION PIPELINE DEBUG');
    console.log('🔬'.repeat(30));
    
    const db = getDb();
    let browser;
    
    try {
        // Get company info if URL not provided
        if (!careersUrl) {
            const result = await db.query(
                `SELECT id, company_name, careers_page_url FROM companies 
                 WHERE company_name ILIKE $1 AND careers_page_url IS NOT NULL 
                 LIMIT 1`,
                [`%${companyName}%`]
            );
            
            if (result.rows.length === 0) {
                console.error(`❌ Company "${companyName}" not found or has no careers URL`);
                return;
            }
            
            const company = result.rows[0];
            careersUrl = company.careers_page_url;
            log('COMPANY INFO', `Found company:`, {
                id: company.id,
                name: company.company_name,
                careersUrl: careersUrl,
            });
        }
        
        // Launch browser
        log('BROWSER', 'Launching Playwright (headed mode)...');
        browser = await chromium.launch({ headless: false });
        const page = await browser.newPage();
        
        // ========== STEP 1: Load Page ==========
        logStep(1, 'LOAD CAREERS PAGE');
        console.log(`Navigating to: ${careersUrl}`);
        
        await page.goto(careersUrl!, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(3000);
        
        // Scroll to trigger lazy loading
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(2000);
        
        const finalUrl = page.url();
        const html = await page.content();
        
        console.log(`\n📄 Page loaded:`);
        console.log(`   Final URL: ${finalUrl}`);
        console.log(`   HTML length: ${html.length}`);
        console.log(`   Title: ${await page.title()}`);
        
        // ========== STEP 2: Pattern Analysis ==========
        logStep(2, 'PATTERN ANALYSIS');
        analyzePatterns(html, finalUrl);
        
        // ========== STEP 3: Main Detection ==========
        logStep(3, 'MAIN DETECTION (detectATSFromHTML)');
        const mainDetection = detectATSFromHTML(html, finalUrl);
        console.log(`Result:`, JSON.stringify(mainDetection, null, 2));
        
        // ========== STEP 4: Greenhouse API Probe ==========
        logStep(4, 'GREENHOUSE API PROBE');
        const slugVariations = generateSlugVariations(companyName);
        console.log(`Slug variations from "${companyName}":`);
        slugVariations.forEach(s => console.log(`   - ${s}`));
        
        console.log(`\nProbing Greenhouse API...`);
        const greenhouseResult = await probeGreenhouseAPI(companyName, careersUrl!);
        if (greenhouseResult) {
            console.log(`✅ Found:`, JSON.stringify(greenhouseResult, null, 2));
        } else {
            console.log(`❌ No match found`);
        }
        
        // ========== STEP 5: Link Analysis ==========
        logStep(5, 'LINK ANALYSIS');
        await extractAllLinks(page, new URL(careersUrl!).origin);
        
        // ========== STEP 6: Deep Crawl ==========
        logStep(6, 'DEEP CRAWL');
        console.log(`Starting deep crawl (max depth: ${DEEP_CRAWL_MAX_DEPTH}, max links per level: ${DEEP_CRAWL_MAX_LINKS})...`);
        
        // Reset to careers page
        await page.goto(careersUrl!, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(2000);
        
        const deepCrawlResult = await debugDeepCrawl(page, careersUrl!);
        if (deepCrawlResult) {
            console.log(`\n✅ Deep crawl found ATS:`, JSON.stringify(deepCrawlResult, null, 2));
        } else {
            console.log(`\n❌ Deep crawl found nothing`);
        }
        
        // ========== STEP 7: Keyword Detection ==========
        logStep(7, 'KEYWORD DETECTION');
        // Go back to original page for keyword check
        await page.goto(careersUrl!, { waitUntil: 'domcontentloaded', timeout: 15000 });
        const finalHtml = await page.content();
        
        const keywordResult = detectByKeyword(finalHtml, careersUrl!);
        if (keywordResult) {
            console.log(`✅ Found:`, JSON.stringify(keywordResult, null, 2));
        } else {
            console.log(`❌ No keyword matches`);
        }
        
        // ========== SUMMARY ==========
        log('SUMMARY', 'Detection results:');
        console.log(`\n1. Main detection: ${mainDetection.atsType} (${(mainDetection.confidence * 100).toFixed(0)}%) ${mainDetection.extractedSlug ? `slug: ${mainDetection.extractedSlug}` : 'no slug'}`);
        console.log(`2. Greenhouse probe: ${greenhouseResult ? `✅ ${greenhouseResult.extractedSlug}` : '❌'}`);
        console.log(`3. Deep crawl: ${deepCrawlResult ? `✅ ${deepCrawlResult.atsType} slug: ${deepCrawlResult.extractedSlug}` : '❌'}`);
        console.log(`4. Keyword: ${keywordResult ? `✅ ${keywordResult.atsType}` : '❌'}`);
        
        // Best result
        const best = [mainDetection, greenhouseResult, deepCrawlResult, keywordResult]
            .filter(Boolean)
            .filter(r => r!.atsType !== 'unknown')
            .sort((a, b) => b!.confidence - a!.confidence)[0];
        
        if (best) {
            console.log(`\n🏆 BEST RESULT: ${best.atsType} (${(best.confidence * 100).toFixed(0)}%) via ${best.detectionMethod}`);
            if (best.extractedSlug) console.log(`   Slug: ${best.extractedSlug}`);
        } else {
            console.log(`\n❌ NO ATS DETECTED`);
        }
        
    } catch (error: any) {
        console.error(`\n❌ Error: ${error.message}`);
        console.error(error.stack);
    } finally {
        if (browser) await browser.close();
        await closeDb();
    }
}

// ============== CLI ==============
const args = process.argv.slice(2);

if (args.length === 0) {
    console.log(`
Usage:
  npx ts-node src/debug-detection.ts "Company Name"
  npx ts-node src/debug-detection.ts --url "https://company.com/careers"
  
Examples:
  npx ts-node src/debug-detection.ts "Beewise"
  npx ts-node src/debug-detection.ts --url "https://www.beewise.ag/careers"
`);
    process.exit(0);
}

if (args[0] === '--url') {
    debugDetection('unknown', args[1]);
} else {
    debugDetection(args.join(' '));
}
