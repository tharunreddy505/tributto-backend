import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:5432@localhost:5432/tributto'
});

async function deleteBunnySubscriptions() {
    try {
        // 1. Find bunny's ID
        const userRes = await pool.query("SELECT id FROM users WHERE username = 'bunny'");
        if (userRes.rows.length === 0) {
            console.log("User 'bunny' not found.");
            return;
        }
        const bunnyId = userRes.rows[0].id;

        // 2. Delete subscriptions
        const deleteRes = await pool.query("DELETE FROM subscriptions WHERE user_id = $1", [bunnyId]);
        console.log(`Successfully deleted ${deleteRes.rowCount} subscriptions for user 'bunny'.`);

    } catch (err) {
        console.error("Error during deletion:", err);
    } finally {
        await pool.end();
    }
}

deleteBunnySubscriptions();
