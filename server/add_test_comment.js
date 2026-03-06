import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'tributto',
    password: '5432',
    port: 5432,
});

async function addTestComment() {
    try {
        const tribute = await pool.query("SELECT id FROM tributes LIMIT 1");
        if (tribute.rows.length === 0) {
            console.log("No tributes found. Add one first.");
            return;
        }
        const tid = tribute.rows[0].id;
        await pool.query(
            "INSERT INTO comments (tribute_id, name, content) VALUES ($1, $2, $3)",
            [tid, "Test User", "This is a test condolence message."]
        );
        console.log(`Added test comment to tribute ${tid}`);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

addTestComment();
