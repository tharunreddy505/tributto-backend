import pool from './db.js';

async function checkAllMedia() {
    try {
        const res = await pool.query('SELECT tribute_id, type, COUNT(*) FROM media GROUP BY tribute_id, type');
        console.log('Media Counts:', JSON.stringify(res.rows, null, 2));

        const videoRaw = await pool.query("SELECT id, tribute_id, type, LEFT(url, 20) as url_start, LENGTH(url) as len FROM media WHERE type = 'video'");
        console.log('Videos found:', JSON.stringify(videoRaw.rows, null, 2));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkAllMedia();
