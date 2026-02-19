import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Client } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const commonPasswords = [
    'password',
    'postgres',
    'admin',
    'root',
    '123456',
    '1234',
    'toor',
    ''
];

const testConnection = async () => {
    console.log("Testing common PostgreSQL passwords...");

    for (const pass of commonPasswords) {
        process.stdout.write(`Trying password: '${pass}' ... `);
        const client = new Client({
            user: 'postgres',
            host: 'localhost',
            database: 'postgres',
            password: pass,
            port: 5432,
        });

        try {
            await client.connect();
            console.log("\n✅ SUCCESS! Found correct password: " + (pass === '' ? '(empty string)' : pass));

            // Update .env file
            const envPath = path.join(__dirname, '../.env');
            let envContent = fs.readFileSync(envPath, 'utf8');

            // Replace DB_PASSWORD line
            const newContent = envContent.replace(/DB_PASSWORD=.*/, `DB_PASSWORD=${pass}`);
            fs.writeFileSync(envPath, newContent);

            console.log("✅ Updated .env file with the correct password.");
            console.log("You can now run 'npm run db:setup'.");

            await client.end();
            process.exit(0);
        } catch (err) {
            console.log("❌ Failed");
            await client.end();
        }
    }

    console.log("\n❌ Could not find the password in the common list.");
    console.log("Please check POSTGRES_CREDENTIALS_HELP.md to reset your password manually.");
    process.exit(1);
};

testConnection();
