import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'tributto',
    password: '5432',
    port: 5432,
});

async function findColumns() {
    try {
        const res = await pool.query(`
            SELECT table_name, column_name 
            FROM information_schema.columns 
            WHERE column_name LIKE '%tribute%' OR column_name LIKE '%memorial%' OR column_name LIKE '%comment%'
        `);
        console.log('Columns matching tribute/memorial/comment:');
        res.rows.forEach(r => console.log(` - ${r.table_name}.${r.column_name}`));
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

findColumns();
