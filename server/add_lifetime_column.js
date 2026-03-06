import pool from './db.js';

const addLifetimeColumn = async () => {
    try {
        console.log('Adding is_lifetime column to products table...');
        await pool.query("ALTER TABLE products ADD COLUMN IF NOT EXISTS is_lifetime BOOLEAN DEFAULT FALSE");
        console.log('Column added successfully.');
    } catch (err) {
        console.error('Error adding column:', err.message);
    } finally {
        pool.end();
    }
};

addLifetimeColumn();
