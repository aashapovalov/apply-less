import {closeDb, getDb} from "./config/db.js";
import {CompanyService} from "./services/company-service.js";
import {SNCCompanyRaw} from "./types/index.js";

async function main(): Promise<void> {
    console.log("Debug company service...\n");

    const db = getDb();
    const companyService = new CompanyService(db);

    try {
        const testCompany: SNCCompanyRaw = {
            name: 'Test Company Inc',
            sncUrl: 'https://finder.startupnationcentral.org/company_page/test-company',
            description: 'A test company for testing purposes',
            foundedYear: 2020,
            tags: ['B2B', 'SaaS', 'AI'],
            website: undefined,
        };

        console.log("Raw company data:");
        console.log(JSON.stringify(testCompany, null, 2));
        console.log("");

        const transformed = companyService.transformSNCCompany(testCompany);
        console.log("Transformed company data:");
        console.log(JSON.stringify(transformed, null, 2));
        console.log("");

        console.log("Attempting to insert...");
        const result = await companyService.upsertCompany(transformed);
        console.log(`✅ Success! ID=${result.id}, isNew=${result.isNew}`);

    } catch (error: any) {
        console.error('\n❌ Full Error Details:');
        console.error('Message:', error.message);
        console.error('Code:', error.code);
        console.error('Detail:', error.detail);
        console.error('Stack:', error.stack);
    } finally {
        await closeDb();
    }
}

main();
