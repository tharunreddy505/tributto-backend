import pool from './db.js';

const migrateVouchers = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS vouchers (
                id SERIAL PRIMARY KEY,
                code VARCHAR(50) UNIQUE NOT NULL,
                order_id INTEGER REFERENCES orders(id),
                product_id INTEGER REFERENCES products(id),
                value DECIMAL(10,2) NOT NULL,
                is_used BOOLEAN DEFAULT FALSE,
                used_at TIMESTAMP,
                expiry_date TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Vouchers table created successfully');
    } catch (err) {
        console.error('Error creating vouchers table:', err);
    } finally {
        pool.end();
    }
};

migrateVouchers();
