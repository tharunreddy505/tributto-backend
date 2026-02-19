import pool from './db.js';

const createOrdersTable = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS orders (
                id SERIAL PRIMARY KEY,
                customer_email VARCHAR(255) NOT NULL,
                customer_name VARCHAR(255),
                address JSONB,
                total_amount DECIMAL(10,2) NOT NULL,
                stripe_payment_intent_id VARCHAR(255),
                status VARCHAR(50) DEFAULT 'pending', -- pending, paid, shipped, cancelled
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS order_items (
                id SERIAL PRIMARY KEY,
                order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
                product_id INTEGER, -- nullable in case product is deleted
                product_name VARCHAR(255) NOT NULL,
                quantity INTEGER NOT NULL,
                price DECIMAL(10,2) NOT NULL,
                metadata JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Orders and Order Items tables created successfully');
    } catch (err) {
        console.error('Error creating orders tables:', err);
    } finally {
        pool.end();
    }
};

createOrdersTable();
