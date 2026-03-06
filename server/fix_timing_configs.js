import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const { Pool } = pg;
const pool = new Pool({
    user: process.env.DB_USER, host: process.env.DB_HOST,
    database: process.env.DB_NAME, password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432
});

async function fix() {
    // Reminder email: send 5 days after trial starts
    await pool.query(
        "UPDATE email_templates SET timing_type = 'delayed', timing_delay_value = 5, timing_delay_unit = 'days', timing_reference = 'trial_start' WHERE slug = 'trial_5_days_reminder'"
    );
    console.log('trial_5_days_reminder → delayed 5 days from trial_start');

    // Expiry warning: send 6 days after trial starts (1 day before 7-day trial ends)
    await pool.query(
        "UPDATE email_templates SET timing_type = 'delayed', timing_delay_value = 6, timing_delay_unit = 'days', timing_reference = 'trial_start' WHERE slug = 'subscription_expiry_reminder'"
    );
    console.log('subscription_expiry_reminder → delayed 6 days from trial_start');

    // Expired: send 7 days after trial starts (when trial ends)
    await pool.query(
        "UPDATE email_templates SET timing_type = 'delayed', timing_delay_value = 7, timing_delay_unit = 'days', timing_reference = 'trial_start' WHERE slug = 'trial_expired_reminder'"
    );
    console.log('trial_expired_reminder → delayed 7 days from trial_start');

    // Paid expired: send 0 days from paid_end (right when paid period ends)
    await pool.query(
        "UPDATE email_templates SET timing_type = 'delayed', timing_delay_value = 0, timing_delay_unit = 'days', timing_reference = 'paid_end' WHERE slug = 'subscription_expired'"
    );
    console.log('subscription_expired → delayed 0 days from paid_end');

    // Event-only templates: never fired by timing engine (fired directly by API)
    await pool.query(
        "UPDATE email_templates SET timing_type = 'event_only' WHERE slug IN ('welcome_trial', 'payment_confirmation', 'voucher_delivery')"
    );
    console.log('welcome_trial, payment_confirmation, voucher_delivery → event_only (skip timing engine)');

    console.log('\nAll timing configs updated successfully!');
    await pool.end();
    process.exit(0);
}
fix().catch(e => { console.error(e.message); process.exit(1); });
