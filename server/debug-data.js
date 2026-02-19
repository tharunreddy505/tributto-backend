import pool from './db.js';

async function checkData() {
    try {
        const tributeRes = await pool.query('SELECT id, name, birth_date, passing_date FROM tributes WHERE id = 2');
        console.log('Tribute Birth Date Type:', typeof tributeRes.rows[0].birth_date);
        console.log('Tribute Birth Date Value:', tributeRes.rows[0].birth_date);
        console.log('Tribute:', JSON.stringify(tributeRes.rows[0], null, 2));

        const mediaRes = await pool.query('SELECT id, type, LENGTH(url) as url_length FROM media WHERE tribute_id = 2');
        console.log('Media:', JSON.stringify(mediaRes.rows, null, 2));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkData();
