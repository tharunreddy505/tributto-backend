import pool from './db.js';

async function checkSettings() {
    try {
        const result = await pool.query("SELECT * FROM settings WHERE key = 'custom_css'");
        console.log("Settings Result:", result.rows);
    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        process.exit();
    }
}

checkSettings();
