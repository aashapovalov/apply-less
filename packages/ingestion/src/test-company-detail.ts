import {PlaywrightClient, SNCClient} from "./clients/index.js";
import {closeDb, getDb} from "./config/db.js";
import {CompanyDetailParser} from "./parsers/company-detail-parser.js";

async function main() {
    console.log('🧪 Testing Company Detail Fetching...\n');

    const playwrightClient = new PlaywrightClient();
    const db = await getDb();

    try {
        // Step1: get cookies
        await playwrightClient.connect();
        console.log("");

        // Step2: git a company from database
        const result = await db.query(
            `SELECT id, company_name, snc_company_page_url
             FROM companies
             WHERE snc_company_page_url IS NOT NULL
               AND snc_company_page_url LIKE '%finder.startupnationcentral.org%'
               AND company_name NOT LIKE '%Test%'
               AND company_name NOT LIKE '%Another%'
             ORDER BY id
                 LIMIT 5`
        );

        if (result.rows.length === 0) {
            console.log('❌ No companies found in database');
            process.exitCode = 1;
        }

        console.log(`📋 Testing with ${result.rows.length} real companies:\n`);

        // Step3: test parsing each company
        const parser = new CompanyDetailParser();
        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < result.rows.length; i++) {
            const company = result.rows[i];
            console.log(`🔍 [${i + 1}/${result.rows.length}] ${company.company_name}`);


            // Extract slug
            const match = company.snc_company_page_url.match(/\/company_page\/([^/?]+)/);
            const slug = match ? match[1] : null;

            if (!slug) {
                console.log('   ❌ Could not extract slug\n');
                failCount++;
                continue;
            }

            // Fetch detail page
            try {
                console.log('   ⏳ Fetching with browser...');
                const html = await playwrightClient.fetchCompanyDetailPage(slug);
                console.log(`   ✅ Fetched HTML (${(html.length / 1024).toFixed(1)} KB)`);

                // Parse details
                const details = parser.parseCompanyDetails(html);
                if (details.websiteUrl) {
                    console.log(`   🌐 Website: ${details.websiteUrl}`);
                }

                if (details.careersUrl) {
                    console.log(`   💼 Careers: ${details.careersUrl}`);
                }

                if (details.socialLinks?.linkedin) {
                    console.log(`   🔗 LinkedIn: ${details.socialLinks.linkedin}`);
                }

                const isValid = parser.isValidCompanyDetails(details);
                console.log(`   ${isValid ? '✅' : '⚠️ '} Valid: ${isValid}\n`);

                if (isValid) {
                    successCount++;
                } else {
                    failCount++;
                }

                //Small delay
                await new Promise(resolve => setTimeout(resolve, 3000));
            } catch (error: any) {
                console.log(`   ❌ Error: ${error.message}\n`);
            }
        }

        console.log('='.repeat(60));
        console.log('📊 Summary');
        console.log('='.repeat(60));
        console.log(`✅ Success: ${successCount}`);
        console.log(`❌ Failed: ${failCount}`);
        console.log(`📈 Success rate: ${((successCount / result.rows.length) * 100).toFixed(1)}%`);
        console.log('');
    } catch (error: any) {
        console.error('❌ Error:', error.message);
        process.exitCode = 1;
    } finally {
        await playwrightClient.close();
        await closeDb()
    }
}

main();
