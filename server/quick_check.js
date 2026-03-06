import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'tributto',
    password: '5432',
    port: 5432,
});

async function check() {
    try {
        const c = await pool.query("SELECT COUNT(*) FROM comments");
        const t = await pool.query("SELECT COUNT(*) FROM tributes");
        const u = await pool.query("SELECT COUNT(*) FROM users");
        console.log(`COMMENTS: ${c.rows[0].count}`);
        console.log(`TRIBUTES: ${t.rows[0].count}`);
        console.log(`USERS: ${u.rows[0].count}`);

        const latestComments = await pool.query("SELECT * FROM comments ORDER BY created_at DESC LIMIT 5");
        console.log("Latest 5 comments:", latestComments.rows);
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
check();
