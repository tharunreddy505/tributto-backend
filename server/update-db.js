import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL || `postgresql://postgres:5432@localhost:5432/tributto`
});

async function updateSchema() {
    try {
        const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
        await pool.query(schemaSql);
        console.log("Database schema updated successfully.");
    } catch (err) {
        console.error("Error updating schema:", err);
    } finally {
        await pool.end();
    }
}

updateSchema();
