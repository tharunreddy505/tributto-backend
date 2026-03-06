import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:5432@localhost:5432/tributto'
});

async function cleanupBunny() {
    try {
        // 1. Find bunny's ID
        const userRes = await pool.query("SELECT id FROM users WHERE username = 'bunny'");
        if (userRes.rows.length === 0) {
            console.log("User 'bunny' not found.");
            return;
        }
        const bunnyId = userRes.rows[0].id;
        console.log(`Cleaning up user 'bunny' (ID: ${bunnyId})`);

        // 2. Clear subscription links to avoid FK issues
        await pool.query("UPDATE subscriptions SET memorial_id = NULL WHERE user_id = $1", [bunnyId]);

        // 3. Delete tributes (memorials)
        const tributeRes = await pool.query("DELETE FROM tributes WHERE user_id = $1", [bunnyId]);
        console.log(`Deleted ${tributeRes.rowCount} memorials.`);

        // 4. Delete subscriptions
        const subRes = await pool.query("DELETE FROM subscriptions WHERE user_id = $1", [bunnyId]);
        console.log(`Deleted ${subRes.rowCount} subscriptions.`);

        console.log("Cleanup complete.");

    } catch (err) {
        console.error("Error during cleanup:", err);
    } finally {
        await pool.end();
    }
}

cleanupBunny();
