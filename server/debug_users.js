import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
    try {
        const users = await pool.query("SELECT id, username, email, role FROM users");
        console.log('--- USERS ---');
        console.table(users.rows);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

check();
