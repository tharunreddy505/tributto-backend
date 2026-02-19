
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function check() {
    try {
        const r = await pool.query('SELECT elements FROM voucher_templates WHERE is_default = TRUE LIMIT 1');
        const els = typeof r.rows[0].elements === 'string' ? JSON.parse(r.rows[0].elements) : r.rows[0].elements;

        console.log('Total Elements:', els.length);

        els.forEach((e, i) => {
            console.log(`\nEL_${i}: [${e.type}]`);
            console.log(`Content: "${e.content}"`);
            console.log(`Y: ${e.y}`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

check();
