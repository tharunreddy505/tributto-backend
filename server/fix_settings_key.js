import pool from './db.js';

async function fixSettings() {
    try {
        // Delete the incorrect row
        await pool.query("DELETE FROM settings WHERE key = 'value'");

        // Insert/Update the correct row with the CSS we found
        const css = `
/* Custom CSS */
body .text-primary {
    font-style: normal !important;
}
.italic {
    font-style: normal !important;
}
`;
        await pool.query(
            "INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2",
            ['custom_css', css]
        );
        console.log("Fixed settings table.");
    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        process.exit();
    }
}

fixSettings();
