import pool from './db.js';

async function listAllSettings() {
    try {
        const result = await pool.query("SELECT key, length(value) as val_len FROM settings");
        console.log("Settings Keys found:", result.rows);
    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        process.exit();
    }
}

listAllSettings();
