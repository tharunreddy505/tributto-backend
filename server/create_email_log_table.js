import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const { Pool } = pg;
const pool = new Pool({
    user: process.env.DB_USER, host: process.env.DB_HOST,
    database: process.env.DB_NAME, password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

async function run() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS subscription_email_log (
            id SERIAL PRIMARY KEY,
            subscription_id INTEGER NOT NULL,
            template_slug VARCHAR(100) NOT NULL,
            sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(subscription_id, template_slug)
        )
    `);
    // Also add timing_reference column to email_templates to know what date to use
    await pool.query(`ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS timing_reference VARCHAR(30) DEFAULT 'trial_start'`);
    await pool.query(`ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS timing_sent BOOLEAN DEFAULT FALSE`);
    console.log('✅ subscription_email_log table and timing columns created!');
    process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
