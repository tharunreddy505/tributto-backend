import pool from './db.js';

async function checkFullCss() {
    try {
        const result = await pool.query("SELECT value FROM settings WHERE key = 'custom_css'");
        if (result.rows.length > 0) {
            console.log("FULL CSS VALUE START:");
            console.log(result.rows[0].value);
            console.log("FULL CSS VALUE END");
        } else {
            console.log("No custom_css found.");
        }
    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        process.exit();
    }
}

checkFullCss();
