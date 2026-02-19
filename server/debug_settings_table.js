import pool from './db.js';

async function checkTable() {
    try {
        const result = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'settings';
        `);

        if (result.rows.length > 0) {
            console.log("Table 'settings' exists.");

            // Check columns
            const columns = await pool.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'settings';
            `);
            console.log("Columns:", columns.rows);

            // Check rows
            const rows = await pool.query("SELECT * FROM settings");
            console.log("Rows:", rows.rows);

        } else {
            console.log("Table 'settings' DOES NOT exist.");
        }

    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        process.exit();
    }
}

checkTable();
