
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const { Pool } = pg;

const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
});

async function restoreHome() {
    try {
        console.log("Checking for 'home' page...");
        const res = await pool.query("SELECT * FROM pages WHERE slug = 'home'");

        if (res.rows.length > 0) {
            console.log("Found 'home' page. Deleting to restore default layout...");
            await pool.query("DELETE FROM pages WHERE slug = 'home'");
            console.log("Custom 'home' page deleted. Default layout restored.");
        } else {
            console.log("No custom 'home' page found. The default layout should be visible.");
        }
    } catch (err) {
        console.error("Error:", err);
    } finally {
        await pool.end();
    }
}

restoreHome();
