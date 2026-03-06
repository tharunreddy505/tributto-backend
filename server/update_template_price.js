import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'tributto',
    password: '5432',
    port: 5432
});

const body = `<p>Hi [user_name],</p>

<p>Today, the free period for your memorial page <a href="[memorial_link]" style="color: #c59d5f; text-decoration: underline;">[memorial_name]</a> ends.</p>

<p>To keep the page active and accessible, the one-time payment of <strong>€ [product_price]</strong> is now due.</p>

<p>You can complete it here:<br/>
<a href="[payment_link]" style="display: inline-block; background-color: #c59d5f; color: #ffffff; padding: 12px 25px; border-radius: 5px; text-decoration: none; font-weight: bold; margin-top: 15px;">Click here to proceed to payment.</a></p>

<p>Thank you for preserving this place of remembrance.</p>

<p>The Tributoo Team</p>`;

pool.query('UPDATE email_templates SET body = $1 WHERE slug = \'trial_expired_reminder\'', [body], (err, res) => {
    if (err) {
        console.error('Update Error:', err);
    } else {
        console.log('Template body updated successfully to use [product_price]');
    }
    pool.end();
});
