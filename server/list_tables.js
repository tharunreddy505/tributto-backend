import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'tributto',
    password: '5432',
    port: 5432,
});

async function listTables() {
    try {
        const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");

        console.log('--- Database Status ---');
        for (const row of res.rows) {
            try {
                const countRes = await pool.query(`SELECT COUNT(*) FROM "${row.table_name}"`);
                console.log(`${row.table_name.padEnd(20)} : ${countRes.rows[0].count} rows`);
            } catch (innerErr) {
                console.log(`${row.table_name.padEnd(20)} : ERROR (${innerErr.message})`);
            }
        }
        console.log('-----------------------');

    } catch (err) {
        console.error("Outer Error:", err);
    } finally {
        await pool.end();
    }
}

listTables();
