import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
    try {
        const res = await pool.query('SELECT id, name, user_id FROM tributes WHERE id = 8');
        console.log('Tribute:', res.rows[0]);

        const users = await pool.query("SELECT id, username, email, role FROM users");
        console.log('Users:', users.rows);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

check();
