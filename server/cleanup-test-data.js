import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME
});

async function clean() {
    try {
        const res = await pool.query("DELETE FROM media WHERE type = 'video' AND url LIKE 'data:video/mp4;base64,aaaa%'");
        console.log(`Deleted ${res.rowCount} test videos (dummy data).`);

        // Also check if there are any other videos
        const remaining = await pool.query("SELECT id, length(url) as len FROM media WHERE type = 'video'");
        console.log("Remaining videos in DB:", remaining.rows);

    } catch (e) {
        console.error("Error cleaning DB:", e.message);
    } finally {
        await pool.end();
    }
}

clean();
