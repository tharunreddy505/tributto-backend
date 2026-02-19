import pg from 'pg';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const { Client } = pg;

// Load .env manually or use dotenv.
// In Node 21+, use process.env.
import dotenv from 'dotenv';
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const schemaPath = path.join(__dirname, 'schema.sql');
const schema = await fs.readFile(schemaPath, 'utf-8');

const config = {
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'tributto'
};

const createTables = async () => {
    // 1. Check/Create Database
    // Connect to 'postgres' first to operate on databases
    const setupClient = new Client({ ...config, database: 'postgres' });

    try {
        await setupClient.connect();

        // Check if database exists
        const res = await setupClient.query(`SELECT 1 FROM pg_database WHERE datname = '${config.database}'`);

        if (res.rowCount === 0) {
            console.log(`Creating database "${config.database}"...`);
            await setupClient.query(`CREATE DATABASE "${config.database}"`);
            console.log("Database created.");
        } else {
            console.log(`Database "${config.database}" already exists.`);
        }
    } catch (err) {
        console.error("Connection failed to 'postgres' database:", err.message);
        if (err.code === '28P01') {
            console.error("\nERROR: Password authentication failed. Please update DB_PASSWORD in .env file.\n");
        } else {
            console.error("Ensure PostgreSQL service is running.");
        }
        process.exit(1);
    } finally {
        await setupClient.end();
    }

    // 2. Connect to tributto and Create Tables
    const dbClient = new Client(config);
    try {
        await dbClient.connect();
        console.log(`Connected to "${config.database}". Creating tables...`);

        await dbClient.query(schema);
        console.log("Tables created successfully!");

    } catch (err) {
        console.error("Error creating tables:", err.message);
    } finally {
        await dbClient.end();
    }
};

createTables();
