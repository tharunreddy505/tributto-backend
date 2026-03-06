import pool from './db.js';

const run = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS subscriptions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
                status VARCHAR(30) DEFAULT 'trial',
                trial_start TIMESTAMP,
                trial_end TIMESTAMP,
                paid_start TIMESTAMP,
                paid_end TIMESTAMP,
                is_lifetime BOOLEAN DEFAULT FALSE,
                stripe_payment_intent_id TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ subscriptions table created successfully.');
    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        pool.end();
    }
};

run();
