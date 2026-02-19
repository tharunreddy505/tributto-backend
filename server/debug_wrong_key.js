import pool from './db.js';

async function checkValueKey() {
    try {
        const result = await pool.query("SELECT * FROM settings WHERE key = 'value'");
        if (result.rows.length > 0) {
            console.log("FOUND ROW WITH KEY='value':");
            console.log(result.rows[0]);
        } else {
            console.log("No row with key='value'.");
        }
    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        process.exit();
    }
}

checkValueKey();
