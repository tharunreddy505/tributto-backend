import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'tributto',
    password: '5432',
    port: 5432,
});

async function checkComments() {
    try {
        const comments = await pool.query('SELECT * FROM comments');
        console.log(`Total comments in table: ${comments.rows.length}`);
        if (comments.rows.length > 0) {
            console.log('First 5 comments:');
            console.log(JSON.stringify(comments.rows.slice(0, 5), null, 2));
        }

        const tributes = await pool.query('SELECT id, name FROM tributes');
        console.log(`Total tributes in table: ${tributes.rows.length}`);

        const joined = await pool.query(`
            SELECT c.id, c.tribute_id, t.name as tribute_name 
            FROM comments c 
            LEFT JOIN tributes t ON c.tribute_id = t.id
        `);
        console.log('Comments with their tributes (LEFT JOIN):');
        joined.rows.forEach(r => {
            console.log(`Comment ID: ${r.id}, Tribute ID: ${r.tribute_id}, Tribute Name: ${r.tribute_name || 'NULL (MISSING TRIBUTE)'}`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkComments();
