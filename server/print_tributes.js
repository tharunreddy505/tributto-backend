import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ user: 'postgres', host: 'localhost', database: 'tributto', password: '5432', port: 5432 });
async function run() {
    const res = await pool.query("SELECT id, name FROM tributes");
    console.log("--- Tributes ---");
    res.rows.forEach(r => console.log(`ID: ${r.id}, Name: ${r.name}`));
    console.log("----------------");
    await pool.end();
}
run();
