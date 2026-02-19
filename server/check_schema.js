import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'tributto'
});

const checkSchema = async () => {
    try {
        const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'menu_items'");
        console.log("COLUMNS:", JSON.stringify(res.rows, null, 2));

        const res2 = await pool.query("SELECT * FROM menus");
        console.log("MENUS:", JSON.stringify(res2.rows, null, 2));
    } catch (e) {
        console.error("ERROR:", e.message);
    } finally {
        await pool.end();
    }
};

checkSchema();
