import pool from './db.js';

async function cleanup() {
    console.log("Starting database cleanup...");
    try {
        // Find duplicate media (same tribute_id and url)
        // Keep the one with the lowest ID
        const res = await pool.query(`
            DELETE FROM media a
            USING media b
            WHERE a.id > b.id
            AND a.tribute_id = b.tribute_id
            AND a.url = b.url
        `);

        console.log(`Cleanup finished. Removed ${res.rowCount || 0} duplicate media entries.`);

        // Final check
        const count = await pool.query("SELECT COUNT(*) FROM media");
        console.log(`Total media items remaining: ${count.rows[0].count}`);

        process.exit(0);
    } catch (err) {
        console.error("Cleanup failed:", err);
        process.exit(1);
    }
}

cleanup();
