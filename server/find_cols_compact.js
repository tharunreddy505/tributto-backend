import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    user: 'postgres', host: 'localhost', database: 'tributto', password: '5432', port: 5432,
});

async function run() {
    const res = await pool.query(`
        SELECT table_name, column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND (column_name LIKE '%tribute%' OR column_name LIKE '%memorial%' OR column_name LIKE '%comment%' OR table_name LIKE '%comment%')
    `);
    console.log(res.rows.map(r => `${r.table_name}.${r.column_name}`).join(', '));
    await pool.end();
}
run();
