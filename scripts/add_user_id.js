
import pool from '../server/db.js';

async function run() {
    try {
        console.log("Adding user_id to tributes table...");
        await pool.query("ALTER TABLE tributes ADD COLUMN IF NOT EXISTS user_id INTEGER;");
        // Also add foreign key constraint if needed, but keeping it simple for now to avoid complexity
        await pool.query("ALTER TABLE media ADD COLUMN IF NOT EXISTS user_id INTEGER;");
        console.log("Done!");
    } catch (err) {
        console.error("Error adding column:", err);
    } finally {
        pool.end();
    }
}

run();
