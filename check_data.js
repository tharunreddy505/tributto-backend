import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function checkTributes() {
    try {
        const res = await pool.query('SELECT id, name, user_id, status FROM tributes ORDER BY created_at DESC LIMIT 10');
        console.log('\n--- LATEST TRIBUTES ---');
        console.log(JSON.stringify(res.rows, null, 2));
        await pool.end();
    } catch (err) {
        console.error('Error fetching tributes:', err.message);
        process.exit(1);
    }
}

checkTributes();
