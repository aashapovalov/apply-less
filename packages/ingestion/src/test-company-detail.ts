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
        const cookies = playwrightClient.getCookies();
        console.log("");

        // Step2: git a company from database
        const result = await db.query(
            `SELECT id, company_name, snc_company_page_url
            FROM companies
            WHERE snc_company_page_url IS NOT NULL
            LIMIT 5`
        );

        if (result.rows.length === 0) {
            console.log('❌ No companies found in database');
            process.exitCode = 1;
        }

        console.log(`📋 Testing with ${result.rows.length} companies:\n`);

        // Step3: test parsing each company
        const sncClient = new SNCClient(cookies);
        const parser = new CompanyDetailParser();

        for (const company of result.rows) {
            console.log(`🔍 ${company.company_name}`);
            console.log(`   SNC URL: ${company.snc_company_page_url}`);

            // Extract slug
            const slug = sncClient.extractCompanySlug(company.snc_company_page_url);
            if (!slug) {
                console.log('   ❌ Could not extract slug\n');
                continue;
            }

            console.log(`   Slug: ${slug}`);

            // Fetch detail page
            try {
                const html = await sncClient.fetchCompanyDetailPage(slug);
                console.log(`   ✅ Fetched HTML (${html.length} chars)`);

                // Parse details
                const details = parser.parseCompanyDetails(html);
                console.log(`   Website: ${details.websiteUrl || '(none)'}`);
                console.log(`   Careers: ${details.careersUrl || '(none)'}`);

                if (details.socialLinks && Object.keys(details.socialLinks).length > 0) {
                    console.log(`   Social: ${Object.entries(details.socialLinks)
                        .filter(([, value]) => Boolean(value))
                        .map(([key]) => key)
                        .join(', ')}`);
                }
                console.log(`   Valid: ${parser.isValidCompanyDetails(details) ? '✅' : '❌'}\n`);

                //Small delay
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error: any) {
                console.log(`   ❌ Error: ${error.message}\n`);
            }
        }
    } catch (error: any) {
        console.error('❌ Error:', error.message);
        process.exitCode = 1;
    } finally {
        await playwrightClient.close();
        await closeDb()
    }
}

main();
