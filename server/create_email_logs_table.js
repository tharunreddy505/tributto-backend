import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const { Pool } = pg;
const pool = new Pool({
    user: process.env.DB_USER, host: process.env.DB_HOST,
    database: process.env.DB_NAME, password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432
});

async function run() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS email_logs (
            id SERIAL PRIMARY KEY,
            template_slug VARCHAR(100),
            template_name VARCHAR(200),
            recipient_email VARCHAR(255),
            recipient_name VARCHAR(200),
            subject VARCHAR(500),
            html_body TEXT,
            language VARCHAR(10) DEFAULT 'en',
            status VARCHAR(20) DEFAULT 'sent',
            error_message TEXT,
            sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at DESC)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON email_logs(recipient_email)`);
    console.log('✅ email_logs table created!');
    await pool.end();
    process.exit(0);
}
run().catch(e => { console.error(e.message); process.exit(1); });
