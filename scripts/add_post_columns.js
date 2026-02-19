import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const { Pool } = pg;

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function addColumns() {
    try {
        console.log('Adding missing columns to posts table...');
        await pool.query(`
            ALTER TABLE posts 
            ADD COLUMN IF NOT EXISTS excerpt TEXT,
            ADD COLUMN IF NOT EXISTS image_url TEXT,
            ADD COLUMN IF NOT EXISTS user_id INTEGER;
        `);
        console.log('Columns added successfully.');
    } catch (err) {
        console.error('Error altering table:', err);
    } finally {
        await pool.end();
    }
}

addColumns();
