import {PlaywrightClient} from "./clients/playwrightClient.js";
import {SNCClient} from "./clients/sncClient.js";

async function main() {
    console.log("Testing SNC Client... \n");

    const playwrightClient = new PlaywrightClient();

    try {
        // Step1: Get cookies from Chrome
        await playwrightClient.connect();
        const cookies = await playwrightClient.getCookies();
        console.log("");

        // Step2: Create SNC Client
        const sncClient =  new SNCClient(cookies);

        // Step3: Test connection
        console.log("Testing connection...");
        const isValid = await sncClient.testConnection();

        if (!isValid) {
            console.log("❌ Connection test failed");
            process.exitCode = 1;
        }
        console.log("✅ Connection test passed\n");

        // Step4: Fetch pages 1, 2, 3

        console.log(" Fetching multiple pages... \n");

        const allCompanies: any[] = [];
        for (let page = 1; page <= 3; page++) {
            const companies = await sncClient.fetchCompaniesPage(page);
            allCompanies.push(...companies);

            //Small delay to be polite
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        console.log(`\n✅ Total companies fetched: ${allCompanies.length}\n`);

        // Display first 10
        console.log("First 10 companies: \n");
        allCompanies.slice(0, 10).forEach((company, index) => {
            console.log(`${index + 1}. ${company.name}`);
            if (company.description) console.log(`   ${company.description}`);
            if (company.foundedYear) console.log(`   Founded: ${company.foundedYear}`);
            if (company.tags && company.tags.length > 0) console.log(`   Tags: ${company.tags.join(', ')}`);
            console.log(`   ${company.sncUrl}`);
            console.log('');
        });
    } catch (error: any) {
        console.error('❌ Error:', error.message);
        process.exitCode = 1;
    } finally {
        await playwrightClient.close();
    }
}

main();