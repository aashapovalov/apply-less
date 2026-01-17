// Test database connection

import {closeDb, testConnection} from "./config/db.js";

async function main() {
    console.log('Testing database connection... \n');

    const success = await testConnection();
    if (success) {
        console.log('\n✅ Database is ready!')
    } else {
        console.log("\n❌ Database connection failed!")
    process.exitCode = 1;
    }
    await closeDb();
}

main()