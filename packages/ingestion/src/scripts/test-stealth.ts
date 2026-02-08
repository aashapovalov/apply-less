/**
 * Test 3: Launch REAL Chrome headlessly + connect via CDP
 * 
 * This uses your actual Chrome installation (not Playwright's Chromium),
 * which has a genuine TLS fingerprint that Cloudflare trusts.
 * 
 * Run:
 *   npx tsx src/scripts/test-stealth.ts
 */

import { chromium } from 'playwright';
import { execSync, spawn } from 'child_process';
import { existsSync, mkdirSync, rmSync } from 'fs';
import path from 'path';

const TEST_URL = 'https://finder.startupnationcentral.org/startups/search?&semantic=&page=1';
const DETAIL_URL = 'https://finder.startupnationcentral.org/company_page/wiz';
const SUCCESS_MARKER = 'company-list-item';
const DETAIL_MARKER = 'social-links-container';

const CHROME_PATHS = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',        // macOS
    '/usr/bin/google-chrome',                                               // Linux
    '/usr/bin/google-chrome-stable',                                        // Linux alt
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',           // Windows
];

function findChrome(): string {
    for (const p of CHROME_PATHS) {
        if (existsSync(p)) return p;
    }
    throw new Error('Chrome not found. Install Google Chrome or set path manually.');
}

async function launchRealChrome(port: number = 9333): Promise<ReturnType<typeof spawn>> {
    const chromePath = findChrome();
    const userDataDir = path.join('/tmp', `chrome-stealth-test-${port}`);

    // Clean up previous profile
    if (existsSync(userDataDir)) {
        rmSync(userDataDir, { recursive: true, force: true });
    }
    mkdirSync(userDataDir, { recursive: true });

    console.log(`   Launching real Chrome from: ${chromePath}`);
    console.log(`   User data dir: ${userDataDir}`);
    console.log(`   Debug port: ${port}`);

    const chromeProcess = spawn(chromePath, [
        `--remote-debugging-port=${port}`,
        `--user-data-dir=${userDataDir}`,
        '--headless=new',               // Chrome's native headless mode
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-default-apps',
        '--disable-extensions',
        '--disable-sync',
        '--window-size=1920,1080',
    ], {
        stdio: 'pipe',
    });

    // Wait for Chrome to be ready
    for (let i = 0; i < 20; i++) {
        try {
            const res = await fetch(`http://127.0.0.1:${port}/json/version`);
            if (res.ok) {
                console.log('   ✅ Chrome is ready');
                return chromeProcess;
            }
        } catch {
            // not ready yet
        }
        await new Promise(r => setTimeout(r, 500));
    }

    chromeProcess.kill();
    throw new Error('Chrome failed to start within 10s');
}

async function testUrl(page: any, name: string, url: string, marker: string): Promise<boolean> {
    console.log(`\n📄 Test: ${name}`);
    console.log(`   URL: ${url}`);

    try {
        const response = await page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: 30000,
        });

        const status = response?.status();
        console.log(`   Initial status: ${status}`);

        if (status === 403) {
            console.log('   ⏳ Got 403 — waiting for CF challenge to auto-solve...');
            try {
                await page.waitForFunction(
                    (m: string) => document.body.innerHTML.includes(m),
                    marker,
                    { timeout: 20000 }
                );
                console.log('   ✅ Challenge resolved!');
            } catch {
                // Check if URL changed (redirect after challenge)
                const html = await page.content();
                if (html.includes(marker)) {
                    console.log('   ✅ Content found after wait');
                } else {
                    console.log('   ❌ Challenge did NOT resolve');
                    if (html.includes('Verify you are human')) console.log('   ℹ️  Turnstile CAPTCHA required');
                    if (html.includes('Just a moment')) console.log('   ℹ️  Still on challenge page');
                    return false;
                }
            }
        }

        // Wait for dynamic content
        await page.waitForTimeout(3000);

        const html = await page.content();
        console.log(`   HTML size: ${(html.length / 1024).toFixed(1)}KB`);

        if (html.includes(marker)) {
            const title = await page.title();
            console.log(`   Title: ${title}`);
            console.log(`   ✅ SUCCESS`);
            return true;
        } else {
            console.log('   ❌ FAILED — expected content not found');
            const snippet = html.substring(0, 300);
            console.log(`   Snippet: ${snippet}`);
            return false;
        }
    } catch (error: any) {
        console.log(`   ❌ ERROR: ${error.message}`);
        return false;
    }
}

async function main() {
    console.log('🧪 Test: Real Chrome (headless) via CDP\n');

    // Strategy 1: Real Chrome --headless=new
    console.log('=' .repeat(60));
    console.log('Strategy 1: Real Chrome --headless=new via CDP');
    console.log('='.repeat(60));

    let chromeProcess;
    try {
        chromeProcess = await launchRealChrome(9333);

        const browser = await chromium.connectOverCDP('http://127.0.0.1:9333');
        const context = browser.contexts()[0] ?? await browser.newContext();
        const page = context.pages()[0] ?? await context.newPage();

        const listResult = await testUrl(page, 'List page', TEST_URL, SUCCESS_MARKER);
        
        if (listResult) {
            await new Promise(r => setTimeout(r, 3000));
            await testUrl(page, 'Detail page', DETAIL_URL, DETAIL_MARKER);
        }

        await browser.close();
    } catch (error: any) {
        console.log(`\n❌ Strategy 1 failed: ${error.message}`);
    } finally {
        chromeProcess?.kill();
        await new Promise(r => setTimeout(r, 1000));
    }

    // Strategy 2: Real Chrome headed (no --headless) — control test
    console.log('\n' + '='.repeat(60));
    console.log('Strategy 2: Real Chrome HEADED via CDP (control test)');
    console.log('='.repeat(60));

    let chromeProcess2;
    try {
        const chromePath = findChrome();
        const userDataDir = '/tmp/chrome-stealth-test-headed';
        if (existsSync(userDataDir)) {
            rmSync(userDataDir, { recursive: true, force: true });
        }
        mkdirSync(userDataDir, { recursive: true });

        console.log('   Launching Chrome headed (a window will pop up)...');
        chromeProcess2 = spawn(chromePath, [
            '--remote-debugging-port=9334',
            `--user-data-dir=${userDataDir}`,
            '--no-first-run',
            '--no-default-browser-check',
            '--disable-default-apps',
            '--disable-extensions',
            '--disable-sync',
            '--window-size=1920,1080',
        ], { stdio: 'pipe' });

        // Wait for ready
        for (let i = 0; i < 20; i++) {
            try {
                const res = await fetch('http://127.0.0.1:9334/json/version');
                if (res.ok) break;
            } catch {}
            await new Promise(r => setTimeout(r, 500));
        }

        const browser = await chromium.connectOverCDP('http://127.0.0.1:9334');
        const context = browser.contexts()[0] ?? await browser.newContext();
        const page = context.pages()[0] ?? await context.newPage();

        const listResult = await testUrl(page, 'List page', TEST_URL, SUCCESS_MARKER);

        if (listResult) {
            await new Promise(r => setTimeout(r, 3000));
            await testUrl(page, 'Detail page', DETAIL_URL, DETAIL_MARKER);
        }

        await browser.close();
    } catch (error: any) {
        console.log(`\n❌ Strategy 2 failed: ${error.message}`);
    } finally {
        chromeProcess2?.kill();
    }

    console.log('\n' + '='.repeat(60));
    console.log('Summary:');
    console.log('  If Real Chrome headless works → automate with cron, no manual steps');
    console.log('  If only headed works → use Xvfb on Linux for virtual display');
    console.log('  If nothing works → try Camoufox next');
    console.log('='.repeat(60));
}

main().catch(console.error);
