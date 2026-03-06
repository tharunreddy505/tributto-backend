import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const { Pool } = pg;
const pool = new Pool({
    user: process.env.DB_USER, host: process.env.DB_HOST,
    database: process.env.DB_NAME, password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432
});

const slug = 'grace_period_reminder';

const templates = [
    {
        language: 'en',
        name: 'Grace Period Reminder',
        subject: 'Your Memorial Page Will Be Paused — Action Required',
        body: `
<p>Hi [user_name],</p>

<p>This is a gentle reminder that the payment for your memorial page
<a href="[memorial_link]" style="color:#c59d5f;">[memorial_name]</a> is still outstanding.</p>

<p>Unless the payment is made, the page will be <strong>temporarily paused in 24 hours</strong>.</p>

<p style="margin: 25px 0;">
    <a href="[payment_link]"
       style="background-color:#c59d5f; color:#000; padding:14px 30px;
              text-decoration:none; border-radius:6px; font-weight:bold; font-size:15px;">
        Complete Payment — [product_price]/year
    </a>
</p>

<p>If you need help, we're here for you.</p>

<p>With care,<br><strong>The Tributoo Team</strong></p>
        `
    },
    {
        language: 'de',
        name: 'Kulanzzeit-Erinnerung',
        subject: 'Ihre Gedenkseite wird pausiert — Handlung erforderlich',
        body: `
<p>Hallo [user_name],</p>

<p>Dies ist eine freundliche Erinnerung daran, dass die Zahlung für Ihre Gedenkseite
<a href="[memorial_link]" style="color:#c59d5f;">[memorial_name]</a> noch aussteht.</p>

<p>Wenn die Zahlung nicht erfolgt, wird die Seite in <strong>24 Stunden vorübergehend pausiert</strong>.</p>

<p style="margin: 25px 0;">
    <a href="[payment_link]"
       style="background-color:#c59d5f; color:#000; padding:14px 30px;
              text-decoration:none; border-radius:6px; font-weight:bold; font-size:15px;">
        Zahlung abschließen — [product_price]/Jahr
    </a>
</p>

<p>Wenn Sie Hilfe benötigen, sind wir für Sie da.</p>

<p>Mit freundlichen Grüßen,<br><strong>Das Tributoo-Team</strong></p>
        `
    },
    {
        language: 'it',
        name: 'Promemoria Periodo di Grazia',
        subject: 'La tua pagina memoriale verrà sospesa — Azione richiesta',
        body: `
<p>Ciao [user_name],</p>

<p>Questo è un gentile promemoria che il pagamento per la tua pagina memoriale
<a href="[memorial_link]" style="color:#c59d5f;">[memorial_name]</a> è ancora in sospeso.</p>

<p>Se il pagamento non viene effettuato, la pagina sarà <strong>temporaneamente sospesa entro 24 ore</strong>.</p>

<p style="margin: 25px 0;">
    <a href="[payment_link]"
       style="background-color:#c59d5f; color:#000; padding:14px 30px;
              text-decoration:none; border-radius:6px; font-weight:bold; font-size:15px;">
        Completa il pagamento — [product_price]/anno
    </a>
</p>

<p>Se hai bisogno di aiuto, siamo qui per te.</p>

<p>Con affetto,<br><strong>Il Team Tributoo</strong></p>
        `
    }
];

async function run() {
    // Remove old versions
    await pool.query(`DELETE FROM email_templates WHERE slug = $1`, [slug]);

    for (const t of templates) {
        await pool.query(
            `INSERT INTO email_templates
             (slug, name, subject, body, language, header_enabled, footer_enabled,
              timing_type, timing_delay_value, timing_delay_unit, timing_reference)
             VALUES ($1, $2, $3, $4, $5, TRUE, TRUE, 'delayed', 8, 'days', 'trial_end')`,
            [slug, t.name, t.subject, t.body, t.language]
        );
        console.log(`✅ Inserted grace_period_reminder [${t.language}]`);
    }

    console.log('\n📅 Timing: fires 8 days after trial_end (= 1 day before the 9-day grace period ends)');
    console.log('   → Users get 1 final warning before their page is paused on day 9.');
    await pool.end();
    process.exit(0);
}

run().catch(e => { console.error(e.message); process.exit(1); });
