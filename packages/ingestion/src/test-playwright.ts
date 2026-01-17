import {PlaywrightClient} from "./clients/playwrightClient.js";

async function main() {
    const client = new PlaywrightClient();

    try {
        await client.connect();

        const cookies = await client.getCookies();

        const hasToken = cookies.includes('snc-token=');
        const hasRefresh = cookies.includes('snc-refreshtoken=');
        console.log("\n Important cookies: ");
        console.log(`   snc-token: ${hasToken ? '✅' : '❌'}`)
        console.log(`   snc-refreshtoken: ${hasRefresh ? '✅' : '❌'}`)

        if (!hasToken || !hasRefresh) {
            console.log("Warning: missing auth cookies. Make sure you're logged in.");
        }
    } catch (error: any) {
        console.error('\n❌ Error: ', error.message);
        process.exitCode = 1;
    } finally {
        await client.close();
    }
}

main();