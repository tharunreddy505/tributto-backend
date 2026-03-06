import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL || `postgresql://postgres:5432@localhost:5432/tributto`
});

async function deleteBunnyMemorials() {
    try {
        // 1. Find bunny's ID
        const userRes = await pool.query("SELECT id FROM users WHERE username = 'bunny'");
        if (userRes.rows.length === 0) {
            console.log("User 'bunny' not found.");
            return;
        }
        const bunnyId = userRes.rows[0].id;
        console.log(`Found user 'bunny' with ID: ${bunnyId}`);

        // 2. Count memorials before deletion
        const countRes = await pool.query("SELECT COUNT(*) FROM tributes WHERE user_id = $1", [bunnyId]);
        const count = countRes.rows[0].count;
        console.log(`User 'bunny' has ${count} memorials.`);

        if (count > 0) {
            // 3. Delete memorials (subscriptions will stay but memorial_id will be orphaned or we can null them)
            // Cleanup subscriptions linked to these memorials first if needed, 
            // or let the DELETE on tributes handle it if there's no FK constraint preventing it.
            // Actually, subscriptions table has memorial_id.

            await pool.query("UPDATE subscriptions SET memorial_id = NULL, memorial_name = NULL WHERE user_id = $1", [bunnyId]);
            const deleteRes = await pool.query("DELETE FROM tributes WHERE user_id = $1", [bunnyId]);
            console.log(`Successfully deleted ${deleteRes.rowCount} memorials for user 'bunny'.`);
        } else {
            console.log("Nothing to delete.");
        }

    } catch (err) {
        console.error("Error during deletion:", err);
    } finally {
        await pool.end();
    }
}

deleteBunnyMemorials();
