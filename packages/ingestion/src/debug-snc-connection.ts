import { PlaywrightClient, SNCClient } from "./clients/index.js";

async function debugSNCConnection() {
    const playwrightClient = new PlaywrightClient();

    try {
        console.log('1️⃣ Connecting to Chrome debug port...');
        await playwrightClient.connect();
        console.log('✅ Connected to Chrome\n');

        console.log('2️⃣ Getting cookies...');
        const cookies = await playwrightClient.getCookies();
        console.log(`✅ Got ${cookies.length} cookies\n`);

        console.log('3️⃣ Cookie string (first 200 chars):');
        console.log(cookies.substring(0, 200) + '...\n');

        console.log('4️⃣ Creating SNC Client...');
        const sncClient = new SNCClient(cookies);
        console.log('✅ SNC Client created\n');

        console.log('5️⃣ Testing connection by fetching page 1...');
        try {
            const companies = await sncClient.fetchCompaniesPage(1);
            console.log(`✅ SUCCESS! Found ${companies.length} companies\n`);

            if (companies.length > 0) {
                console.log('📋 First company:');
                console.log(JSON.stringify(companies[0], null, 2));
            }
        } catch (error: any) {
            console.error('❌ FAILED to fetch companies\n');
            console.error('Error details:');
            console.error('  Message:', error.message);
            console.error('  Response status:', error.response?.status);
            console.error('  Response data (first 500 chars):',
                error.response?.data?.substring(0, 500));

            // Check if it's a CloudFlare issue
            if (error.response?.data?.includes('Just a moment')) {
                console.error('\n⚠️  CloudFlare is blocking the request!');
                console.error('This means we need to use Playwright for fetching, not axios.');
            }

            // Check if it's an auth issue
            if (error.response?.status === 403) {
                console.error('\n⚠️  403 Forbidden - Authentication issue');
                console.error('Make sure you are logged in to SNC in Chrome.');
            }

            // Check if it's a network issue
            if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
                console.error('\n⚠️  Network issue - cannot reach SNC');
            }
        }

    } catch (error: any) {
        console.error('❌ Fatal error:', error.message);
        console.error(error);
    } finally {
        await playwrightClient.close();
    }
}

debugSNCConnection();