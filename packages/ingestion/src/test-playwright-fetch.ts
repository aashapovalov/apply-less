import { PlaywrightClient, SNCClientPlaywright } from "./clients/index.js";

async function testPlaywrightFetch() {
    const playwrightClient = new PlaywrightClient();

    try {
        console.log('1️⃣ Connecting to Chrome...');
        await playwrightClient.connect();
        console.log('✅ Connected\n');

        console.log('2️⃣ Getting browser instance...');
        const browser = playwrightClient.getBrowser();
        console.log('✅ Got browser\n');

        console.log('3️⃣ Creating SNCClientPlaywright...');
        const sncClient = new SNCClientPlaywright(browser);
        console.log('✅ Client created\n');

        console.log('4️⃣ Fetching page 1...');
        const companies = await sncClient.fetchCompaniesPage(1);
        console.log(`✅ SUCCESS! Found ${companies.length} companies\n`);

        if (companies.length > 0) {
            console.log('📋 First 3 companies:');
            companies.slice(0, 3).forEach((c, i) => {
                console.log(`${i + 1}. ${c.name}`);
                console.log(`   URL: ${c.sncUrl}`);
                console.log(`   Founded: ${c.foundedYear || 'N/A'}`);
                console.log('');
            });
        }

    } catch (error: any) {
        console.error('\n❌ FAILED:', error.message);
        console.error('\nFull error:');
        console.error(error);
    } finally {
        await playwrightClient.close();
    }
}

testPlaywrightFetch();
