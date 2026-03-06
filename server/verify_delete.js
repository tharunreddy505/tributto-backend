import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:5432@localhost:5432/tributto'
});

async function verify() {
    try {
        const res = await pool.query("SELECT COUNT(*) FROM tributes WHERE user_id = (SELECT id FROM users WHERE username = 'bunny')");
        console.log(`Memorial count for user 'bunny': ${res.rows[0].count}`);
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
verify();
