#!/usr/bin/env node
/**
 * Debug script for ATS detection pipeline.
 * Run on a single company to see detailed output at every step.
 * 
 * Usage (via CLI):
 *   npm run detect -- --debug -c "Company Name"
 *   npm run detect -- --debug --url "https://company.com/careers"
 * 
 * Usage (direct):
 *   npx ts-node src/detectors/debug-detection.ts "Company Name"
 *   npx ts-node src/detectors/debug-detection.ts --url "https://company.com/careers"
 */

import { chromium, Page } from "playwright";
import { Pool } from "pg";
import { getDb, closeDb } from "../config/db.js";
import { detectATSFromHTML } from "./ats-detector.js";
import { generateSlugVariations, probeGreenhouseAPI } from "./greenhouse-probe.js";
import { detectByKeyword } from "./keyword-detector.js";
import { deepCrawlForAts } from "./deep-crawler.js";
import { ATS_PATTERNS } from "./ats-patterns.js";

// ============== CONFIG ==============
const DEEP_CRAWL_MAX_DEPTH = 2;
const DEEP_CRAWL_MAX_LINKS = 3;

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

// ============== DB QUERIES ==============
async function getCompanyInfo(db: Pool, companyName: string) {
    const result = await db.query(
        `SELECT c.id, c.company_name, c.careers_page_url, c.ats_checked_at,
                js.id as job_source_id, js.source_type, js.ats_identifier, 
                js.api_token, js.detection_method, js.confidence, js.status,
                (SELECT COUNT(*) FROM jobs j WHERE j.company_id = c.id) as job_count
         FROM companies c
         LEFT JOIN job_sources js ON c.id = js.company_id
         WHERE c.company_name ILIKE $1 AND c.careers_page_url IS NOT NULL 
         LIMIT 1`,
        [`%${companyName}%`]
    );
    return result.rows[0] || null;
}

// ============== PATTERN ANALYSIS ==============
function analyzePatterns(html: string, url: string) {
    log('PATTERN ANALYSIS', 'Checking all ATS patterns against page...');
    
    for (const pattern of ATS_PATTERNS) {
        console.log(`\n🏷️  ${pattern.type.toUpperCase()}`);
        
        let hasMatch = false;
        
        // URL patterns
        if (pattern.urlPatterns) {
            for (const regex of pattern.urlPatterns) {
                const match = url.match(regex);
                if (match) {
                    console.log(`   URL ✅ MATCH: ${regex.source.substring(0, 50)}`);
                    hasMatch = true;
                }
            }
        }
        
        // HTML patterns
        if (pattern.htmlPatterns) {
            for (const regex of pattern.htmlPatterns) {
                const match = html.match(regex);
                if (match) {
                    console.log(`   HTML ✅ MATCH: ${regex.source.substring(0, 50)}`);
                    hasMatch = true;
                }
            }
        }
        
        // Script patterns
        if (pattern.scriptPatterns) {
            for (const regex of pattern.scriptPatterns) {
                const match = html.match(regex);
                if (match) {
                    console.log(`   Script ✅ MATCH: ${regex.source.substring(0, 50)}`);
                    hasMatch = true;
                }
            }
        }
        
        // Slug extraction
        if (pattern.slugExtractor) {
            const extracted = pattern.slugExtractor(html, url);
            if (extracted) {
                console.log(`   Slug ✅ EXTRACTED: ${JSON.stringify(extracted)}`);
                hasMatch = true;
            }
        }
        
        if (!hasMatch) {
            console.log(`   ❌ No matches`);
        }
    }
}

// ============== LINK ANALYSIS ==============
async function analyzeLinks(page: Page, baseOrigin: string) {
    log('LINK ANALYSIS', `Extracting links from ${page.url()}...`);
    
    const links = await page.$$eval('a[href]', (anchors) => {
        return anchors.map(a => ({
            href: (a as HTMLAnchorElement).href,
            text: a.textContent?.trim().substring(0, 50) || '',
            inHeader: !!a.closest('header, nav, [role="navigation"], .header, .nav, #header, #nav'),
            inFooter: !!a.closest('footer, [role="contentinfo"], .footer, #footer'),
        }));
    });
    
    const internal = links.filter(l => l.href.startsWith(baseOrigin));
    const external = links.filter(l => !l.href.startsWith(baseOrigin) && l.href.startsWith('http'));
    
    console.log(`\n📊 Link Summary:`);
    console.log(`   Total: ${links.length}`);
    console.log(`   Internal: ${internal.length}`);
    console.log(`   External: ${external.length}`);
    
    // Job-like links
    const jobPatterns = ['/position', '/job', '/opening', '/role', '/vacancy', '/career', '/location', '/department', '/team'];
    const jobLinks = links.filter(l => jobPatterns.some(p => l.href.toLowerCase().includes(p)));
    
    if (jobLinks.length > 0) {
        console.log(`\n🎯 Job-like links (${jobLinks.length}):`);
        jobLinks.slice(0, 10).forEach(l => {
            const flags = [];
            if (l.inHeader) flags.push('header');
            if (l.inFooter) flags.push('footer');
            console.log(`   ${l.href} ${flags.length ? `[${flags.join(', ')}]` : ''}`);
        });
        if (jobLinks.length > 10) console.log(`   ... and ${jobLinks.length - 10} more`);
    }
    
    // ATS domain links
    const atsDomains = ['greenhouse.io', 'lever.co', 'workable.com', 'comeet.co', 'comeet.com'];
    const atsLinks = external.filter(l => atsDomains.some(d => l.href.includes(d)));
    
    if (atsLinks.length > 0) {
        console.log(`\n🔗 ATS Domain links (${atsLinks.length}):`);
        atsLinks.forEach(l => {
            console.log(`   ${l.href}`);
        });
    }
    
    return { jobLinks, atsLinks };
}

// ============== MAIN DEBUG FUNCTION ==============
export async function debugDetection(companyName: string, careersUrl?: string) {
    console.log('\n' + '🔬'.repeat(30));
    console.log('  ATS DETECTION PIPELINE DEBUG');
    console.log('🔬'.repeat(30));
    
    const db = getDb();
    let browser;
    
    try {
        // ========== STEP 0: DB Info ==========
        logStep(0, 'DATABASE INFO');
        
        let company: any = null;
        if (!careersUrl) {
            company = await getCompanyInfo(db, companyName);
            
            if (!company) {
                console.error(`❌ Company "${companyName}" not found or has no careers URL`);
                return;
            }
            
            careersUrl = company.careers_page_url;
            
            console.log(`Company: ${company.company_name} (id: ${company.id})`);
            console.log(`Careers URL: ${careersUrl}`);
            console.log(`ATS checked at: ${company.ats_checked_at || 'never'}`);
            console.log(`Jobs in DB: ${company.job_count}`);
            
            if (company.job_source_id) {
                console.log(`\n📦 Existing job_source:`);
                console.log(`   ID: ${company.job_source_id}`);
                console.log(`   Type: ${company.source_type}`);
                console.log(`   Slug/UID: ${company.ats_identifier || '❌ NONE'}`);
                console.log(`   Token: ${company.api_token ? '✅ present' : '❌ none'}`);
                console.log(`   Method: ${company.detection_method}`);
                console.log(`   Confidence: ${(company.confidence * 100).toFixed(0)}%`);
                console.log(`   Status: ${company.status}`);
            } else {
                console.log(`\n📦 No existing job_source`);
            }
        } else {
            console.log(`Using provided URL: ${careersUrl}`);
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
        
        // Quick checks
        const checks = [
            ['greenhouse.io', html.includes('greenhouse.io')],
            ['lever.co', html.includes('lever.co')],
            ['comeet', html.toLowerCase().includes('comeet')],
            ['workable', html.includes('workable')],
        ];
        console.log(`\n🔍 Quick HTML checks:`);
        checks.forEach(([name, found]) => {
            console.log(`   ${name}: ${found ? '✅ found' : '❌'}`);
        });
        
        // ========== STEP 2: Pattern Analysis ==========
        logStep(2, 'PATTERN ANALYSIS');
        analyzePatterns(html, finalUrl);
        
        // ========== STEP 3: Main Detection ==========
        logStep(3, 'MAIN DETECTION (detectATSFromHTML)');
        const mainDetection = detectATSFromHTML(html, finalUrl);
        console.log(`Result:`, JSON.stringify(mainDetection, null, 2));
        
        // ========== STEP 4: Greenhouse API Probe ==========
        logStep(4, 'GREENHOUSE API PROBE');
        const effectiveName = company?.company_name || companyName;
        const slugVariations = generateSlugVariations(effectiveName);
        console.log(`Slug variations from "${effectiveName}":`);
        slugVariations.forEach(s => console.log(`   - ${s}`));
        
        console.log(`\nProbing Greenhouse API...`);
        const greenhouseResult = await probeGreenhouseAPI(effectiveName, careersUrl!);
        if (greenhouseResult) {
            console.log(`✅ Found:`, JSON.stringify(greenhouseResult, null, 2));
        } else {
            console.log(`❌ No match found`);
        }
        
        // ========== STEP 5: Link Analysis ==========
        logStep(5, 'LINK ANALYSIS');
        await analyzeLinks(page, new URL(careersUrl!).origin);
        
        // ========== STEP 6: Deep Crawl ==========
        logStep(6, 'DEEP CRAWL');
        console.log(`Starting deep crawl (max depth: ${DEEP_CRAWL_MAX_DEPTH}, max links: ${DEEP_CRAWL_MAX_LINKS})...`);
        
        // Reset to careers page
        await page.goto(careersUrl!, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(2000);
        
        const deepCrawlResult = await deepCrawlForAts(page, careersUrl!, {
            maxDepth: DEEP_CRAWL_MAX_DEPTH,
            maxLinksPerLevel: DEEP_CRAWL_MAX_LINKS,
        });
        
        if (deepCrawlResult) {
            console.log(`\n✅ Deep crawl found ATS:`, JSON.stringify(deepCrawlResult, null, 2));
        } else {
            console.log(`\n❌ Deep crawl found nothing`);
        }
        
        // ========== STEP 7: Keyword Detection ==========
        logStep(7, 'KEYWORD DETECTION');
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
        
        const results = [
            { name: 'Main detection', result: mainDetection },
            { name: 'Greenhouse probe', result: greenhouseResult },
            { name: 'Deep crawl', result: deepCrawlResult },
            { name: 'Keyword', result: keywordResult },
        ];
        
        results.forEach((r, i) => {
            if (r.result && r.result.atsType !== 'unknown') {
                console.log(`${i + 1}. ${r.name}: ✅ ${r.result.atsType} (${(r.result.confidence * 100).toFixed(0)}%) ${r.result.extractedSlug ? `slug: ${r.result.extractedSlug}` : 'NO SLUG'}`);
            } else {
                console.log(`${i + 1}. ${r.name}: ❌`);
            }
        });
        
        // Best result (same logic as pipeline)
        const validResults = results
            .map(r => r.result)
            .filter(Boolean)
            .filter(r => r!.atsType !== 'unknown');
        
        const withSlug = validResults.filter(r => r!.extractedSlug);
        const best = withSlug.length > 0 
            ? withSlug.sort((a, b) => b!.confidence - a!.confidence)[0]
            : validResults.sort((a, b) => b!.confidence - a!.confidence)[0];
        
        console.log('\n' + '─'.repeat(60));
        if (best) {
            const hasSlug = !!best.extractedSlug;
            console.log(`🏆 BEST RESULT: ${best.atsType} (${(best.confidence * 100).toFixed(0)}%)`);
            console.log(`   Method: ${best.detectionMethod}`);
            console.log(`   Slug: ${best.extractedSlug || '❌ NONE'}`);
            console.log(`   Actionable: ${hasSlug || best.atsType === 'comeet' ? '✅ YES' : '❌ NO (no slug)'}`);
        } else {
            console.log(`❌ NO ATS DETECTED`);
        }
        
        // Compare with existing
        if (company?.job_source_id) {
            console.log('\n' + '─'.repeat(60));
            console.log('📊 COMPARISON WITH EXISTING:');
            if (best) {
                const sameType = best.atsType === company.source_type;
                const sameSlug = best.extractedSlug === company.ats_identifier;
                console.log(`   Type: ${sameType ? '✅ same' : `⚠️ different (DB: ${company.source_type}, detected: ${best.atsType})`}`);
                console.log(`   Slug: ${sameSlug ? '✅ same' : `⚠️ different (DB: ${company.ats_identifier || 'none'}, detected: ${best.extractedSlug || 'none'})`}`);
                
                if (!company.ats_identifier && best.extractedSlug) {
                    console.log(`   💡 RE-RUN RECOMMENDED: Can now extract slug!`);
                }
            }
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
if (process.argv[1].includes('debug-detection')) {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.log(`
Usage:
  npx ts-node src/detectors/debug-detection.ts "Company Name"
  npx ts-node src/detectors/debug-detection.ts --url "https://company.com/careers"
  
Examples:
  npx ts-node src/detectors/debug-detection.ts "Beewise"
  npx ts-node src/detectors/debug-detection.ts --url "https://www.beewise.ag/careers"
`);
        process.exit(0);
    }

    if (args[0] === '--url') {
        debugDetection('unknown', args[1]);
    } else {
        debugDetection(args.join(' '));
    }
}
