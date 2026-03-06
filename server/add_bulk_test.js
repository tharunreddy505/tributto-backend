import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ user: 'postgres', host: 'localhost', database: 'tributto', password: '5432', port: 5432 });
async function run() {
    const tributes = await pool.query("SELECT id FROM tributes");
    for (const t of tributes.rows) {
        await pool.query(
            "INSERT INTO comments (tribute_id, name, content) VALUES ($1, $2, $3)",
            [t.id, "Auto Test", `Message for tribute ${t.id}`]
        );
    }
    console.log(`Added ${tributes.rows.length} test comments.`);
    await pool.end();
}
run();
