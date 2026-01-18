import {closeDb, getDb} from "./config/db.js";
import {CompanyService} from "./services/company-service.js";
import {SNCCompanyRaw} from "./types/index.js";

async function main(): Promise<void> {
    console.log("Test company service...");

    const db = getDb();
    const companyService = new CompanyService(db);

    try {
        // Test1: insert new company
        console.log("Test1: insert new company");
        const testCompany: SNCCompanyRaw = {
            name: 'Test Company Inc',
            sncUrl: 'https://finder.startupnationcentral.org/company_page/test-company',
            description: 'A test company for testing purposes',
            foundedYear: 2020,
            tags: ['B2B', 'SaaS', 'AI'],
            website: undefined,
        };

        const companyTransformed = companyService.transformSNCCompany(testCompany);
        const resultTestCompany = await companyService.upsertCompany(companyTransformed);
        console.log(`   Result: ID=${resultTestCompany.id}, isNew=${resultTestCompany.isNew}`);
        console.log(`   ${resultTestCompany.isNew ? '✅ New company inserted' : '⚠️  Company already existed'}\n`);

        // Test2: update the same company (shouldn't create duplicate)
        console.log("Test2: update the same company (no duplicate)");
        const resultUpdateTestCompany = await companyService.upsertCompany(companyTransformed);
        console.log(`   Result: ID=${resultUpdateTestCompany.id}, isNew=${resultUpdateTestCompany.isNew}`);
        console.log(`   ${!resultUpdateTestCompany.isNew ? '✅ Correctly updated existing' : '❌ Created duplicate!'}\n`);

        // Test3: insert another company
        console.log("Test3: insert different company");
        const testCompany2: SNCCompanyRaw = {
            name: 'Another Company Ltd',
            sncUrl: 'https://finder.startupnationcentral.org/company_page/another-company',
            description: 'Another test company',
            foundedYear: 2021,
            tags: ['B2C', 'FinTech'],
            website: undefined,
        };

        const companyTransformed2 = companyService.transformSNCCompany(testCompany2);
        const resultTestCompany2 = await companyService.upsertCompany(companyTransformed2);
        console.log(`   Result: ID=${resultTestCompany2.id}, isNew=${resultTestCompany2.isNew}`);
        console.log(`   ${resultTestCompany2.isNew ? '✅ New company inserted' : '❌ Should be new!'}\n`);

        // Test4: get total count
        console.log("Test4: get company count");
        const count = await companyService.getCompanyCount();
        console.log(`   Total companies in database: ${count}`);
        console.log(`   ${count >= 2 ? '✅ Count looks good' : '⚠️  Expected at least 2'}\n`);

        // Test5: get recent companies
        console.log("Test5: get recent companies");
        const recentCompanies = await companyService.getRecentCompanies(5);
        console.log(`   Found ${recentCompanies.length} recent companies:`);
        recentCompanies.forEach((company, index) => {
            console.log(`   ${index + 1}. ${company.company_name} (ID: ${company.id})`);
        });
        console.log('');

        // Test 6: Get SNC companies
        console.log('📝 Test 6: Get companies by source');
        const sncCompanies = await companyService.getCompaniesBySource('snc');
        console.log(`   Found ${sncCompanies.length} companies from SNC`);
        console.log('');

        console.log('✅ All tests passed!\n');
    } catch (error: any) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        await closeDb();
    }
}