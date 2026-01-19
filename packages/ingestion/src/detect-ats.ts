import { getDb, closeDb } from "./config/db.js";
import axios from "axios";

async function detectATS() {
    const db = getDb();

    try {
        // Get all non-LinkedIn career pages
        const result = await db.query(`
            SELECT id, company_name, careers_page_url
            FROM companies 
            WHERE careers_page_url IS NOT NULL 
              AND careers_page_url LIKE '%linkedin%'
            ORDER BY company_name
        `);

        console.log(`\n🔍 Checking ${result.rows.length} career pages for ATS...\n`);

        const stats = {
            greenhouse: [] as string[],
            lever: [] as string[],
            workable: [] as string[],
            comeet: [] as string[],
            ashby: [] as string[],
            other: [] as string[],
        };

        for (const company of result.rows) {
            try {
                console.log(`Checking: ${company.company_name}...`);

                const response = await axios.get(company.careers_page_url, {
                    timeout: 10000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
                    },
                    maxRedirects: 5,
                });

                const html = response.data.toLowerCase();
                const url = response.request.res.responseUrl || company.careers_page_url;

                if (html.includes('greenhouse') || url.includes('greenhouse') || url.includes('boards.greenhouse')) {
                    console.log(`  ✅ Greenhouse detected!`);
                    stats.greenhouse.push(company.company_name);
                } else if (html.includes('lever.co') || url.includes('lever.co') || url.includes('jobs.lever')) {
                    console.log(`  ✅ Lever detected!`);
                    stats.lever.push(company.company_name);
                } else if (html.includes('workable.com') || url.includes('workable.com') || url.includes('apply.workable')) {
                    console.log(`  ✅ Workable detected!`);
                    stats.workable.push(company.company_name);
                } else if (html.includes('comeet.com') || url.includes('comeet.com') || html.includes('comeet')) {
                    console.log(`  ✅ Comeet detected!`);
                    stats.comeet.push(company.company_name);
                } else if (html.includes('ashbyhq.com') || url.includes('ashbyhq.com')) {
                    console.log(`  ✅ Ashby detected!`);
                    stats.ashby.push(company.company_name);
                } else {
                    console.log(`  ⚪ Custom/Other`);
                    stats.other.push(company.company_name);
                }

                // Small delay to be polite
                await new Promise(resolve => setTimeout(resolve, 1000));

            } catch (error: any) {
                console.log(`  ❌ Failed to check: ${error.message}`);
                stats.other.push(company.company_name);
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('📊 ATS Detection Results');
        console.log('='.repeat(60));
        console.log(`Greenhouse: ${stats.greenhouse.length}`);
        if (stats.greenhouse.length > 0) {
            stats.greenhouse.forEach(c => console.log(`  - ${c}`));
        }
        console.log(`\nLever: ${stats.lever.length}`);
        if (stats.lever.length > 0) {
            stats.lever.forEach(c => console.log(`  - ${c}`));
        }
        console.log(`\nWorkable: ${stats.workable.length}`);
        if (stats.workable.length > 0) {
            stats.workable.forEach(c => console.log(`  - ${c}`));
        }
        console.log(`\nComeet: ${stats.comeet.length}`);
        if (stats.comeet.length > 0) {
            stats.comeet.forEach(c => console.log(`  - ${c}`));
        }
        console.log(`\nAshby: ${stats.ashby.length}`);
        if (stats.ashby.length > 0) {
            stats.ashby.forEach(c => console.log(`  - ${c}`));
        }
        console.log(`\nCustom/Other: ${stats.other.length}`);
        console.log('='.repeat(60));

    } catch (error: any) {
        console.error('Error:', error);
    } finally {
        await closeDb();
    }
}

detectATS();