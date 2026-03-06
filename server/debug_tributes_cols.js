import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ user: 'postgres', host: 'localhost', database: 'tributto', password: '5432', port: 5432 });
async function run() {
    const res = await pool.query("SELECT * FROM tributes LIMIT 1");
    if (res.rows.length > 0) {
        console.log("Columns:", Object.keys(res.rows[0]).join(', '));
    }
    await pool.end();
}
run();
