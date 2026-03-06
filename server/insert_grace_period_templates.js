import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const { Pool } = pg;
const pool = new Pool({
    user: process.env.DB_USER, host: process.env.DB_HOST,
    database: process.env.DB_NAME, password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432
});

const templates = [
    // ── Day 9 Grace Period Reminder ──────────────────────────────────────────
    {
        slug: 'grace_period_day9',
        timing_delay_value: 9,
        rows: [
            {
                language: 'en',
                name: 'Grace Period Reminder (Day 9)',
                subject: 'Your Memorial Page — Payment Still Outstanding',
                body: `
<p>Hi [user_name],</p>

<p>We noticed that the payment for your memorial page
<strong><a href="[memorial_link]" style="color:#c59d5f;">[memorial_name]</a></strong>
is still outstanding.</p>

<p>Your page is currently in a <strong>9-day grace period</strong>. You have
<strong>1 day remaining</strong> to complete the payment before the page is temporarily paused.</p>

<p style="margin: 25px 0;">
    <a href="[payment_link]"
       style="background-color:#c59d5f; color:#000; padding:14px 30px;
              text-decoration:none; border-radius:6px; font-weight:bold; font-size:15px;">
        Complete Payment — [product_price]/year
    </a>
</p>

<p>If you need any help, our team is always here for you.</p>

<p>With care,<br><strong>The Tributoo Team</strong></p>
                `
            },
            {
                language: 'de',
                name: 'Kulanzzeit-Erinnerung (Tag 9)',
                subject: 'Ihre Gedenkseite — Zahlung noch ausstehend',
                body: `
<p>Hallo [user_name],</p>

<p>Wir haben festgestellt, dass die Zahlung für Ihre Gedenkseite
<strong><a href="[memorial_link]" style="color:#c59d5f;">[memorial_name]</a></strong>
noch aussteht.</p>

<p>Ihre Seite befindet sich derzeit in einer <strong>9-tägigen Kulanzzeit</strong>.
Sie haben noch <strong>1 Tag</strong>, um die Zahlung abzuschließen, bevor die Seite vorübergehend pausiert wird.</p>

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
                name: 'Promemoria Periodo di Grazia (Giorno 9)',
                subject: 'La tua pagina memoriale — Pagamento ancora in sospeso',
                body: `
<p>Ciao [user_name],</p>

<p>Abbiamo notato che il pagamento per la tua pagina memoriale
<strong><a href="[memorial_link]" style="color:#c59d5f;">[memorial_name]</a></strong>
è ancora in sospeso.</p>

<p>La tua pagina è attualmente in un <strong>periodo di grazia di 9 giorni</strong>.
Hai ancora <strong>1 giorno</strong> per completare il pagamento prima che la pagina venga temporaneamente sospesa.</p>

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
        ]
    },

    // ── Day 10 Final Grace Period Warning ─────────────────────────────────────
    {
        slug: 'grace_period_day10',
        timing_delay_value: 10,
        rows: [
            {
                language: 'en',
                name: 'Grace Period Final Warning (Day 10)',
                subject: '⚠️ Your Memorial Page Has Been Paused — Complete Payment to Restore',
                body: `
<p>Hi [user_name],</p>

<p>Your 9-day grace period has now ended and your memorial page
<strong><a href="[memorial_link]" style="color:#c59d5f;">[memorial_name]</a></strong>
has been <strong>temporarily paused</strong>.</p>

<p>The page and all its content are safely stored. Simply complete the payment to
<strong>instantly restore</strong> your memorial page.</p>

<p style="margin: 25px 0;">
    <a href="[payment_link]"
       style="background-color:#c59d5f; color:#000; padding:14px 30px;
              text-decoration:none; border-radius:6px; font-weight:bold; font-size:15px;">
        Restore My Memorial — [product_price]/year
    </a>
</p>

<p>Your memories are safe with us. We're here whenever you're ready.</p>

<p>With care,<br><strong>The Tributoo Team</strong></p>
                `
            },
            {
                language: 'de',
                name: 'Letzte Kulanzzeit-Warnung (Tag 10)',
                subject: '⚠️ Ihre Gedenkseite wurde pausiert — Zahlen Sie, um sie wiederherzustellen',
                body: `
<p>Hallo [user_name],</p>

<p>Ihre 9-tägige Kulanzzeit ist nun abgelaufen und Ihre Gedenkseite
<strong><a href="[memorial_link]" style="color:#c59d5f;">[memorial_name]</a></strong>
wurde <strong>vorübergehend pausiert</strong>.</p>

<p>Die Seite und alle Inhalte sind sicher gespeichert. Schließen Sie einfach die Zahlung ab,
um Ihre Gedenkseite <strong>sofort wiederherzustellen</strong>.</p>

<p style="margin: 25px 0;">
    <a href="[payment_link]"
       style="background-color:#c59d5f; color:#000; padding:14px 30px;
              text-decoration:none; border-radius:6px; font-weight:bold; font-size:15px;">
        Seite wiederherstellen — [product_price]/Jahr
    </a>
</p>

<p>Ihre Erinnerungen sind bei uns sicher. Wir sind da, wenn Sie bereit sind.</p>

<p>Mit freundlichen Grüßen,<br><strong>Das Tributoo-Team</strong></p>
                `
            },
            {
                language: 'it',
                name: 'Avviso Finale Periodo di Grazia (Giorno 10)',
                subject: '⚠️ La tua pagina memoriale è stata sospesa — Completa il pagamento per ripristinarla',
                body: `
<p>Ciao [user_name],</p>

<p>Il tuo periodo di grazia di 9 giorni è terminato e la tua pagina memoriale
<strong><a href="[memorial_link]" style="color:#c59d5f;">[memorial_name]</a></strong>
è stata <strong>temporaneamente sospesa</strong>.</p>

<p>La pagina e tutti i contenuti sono al sicuro. Completa semplicemente il pagamento per
<strong>ripristinare immediatamente</strong> la tua pagina memoriale.</p>

<p style="margin: 25px 0;">
    <a href="[payment_link]"
       style="background-color:#c59d5f; color:#000; padding:14px 30px;
              text-decoration:none; border-radius:6px; font-weight:bold; font-size:15px;">
        Ripristina la mia pagina — [product_price]/anno
    </a>
</p>

<p>I tuoi ricordi sono al sicuro con noi. Siamo qui quando sei pronto.</p>

<p>Con affetto,<br><strong>Il Team Tributoo</strong></p>
                `
            }
        ]
    }
];

async function run() {
    // Remove old grace_period templates
    await pool.query(`DELETE FROM email_templates WHERE slug IN ('grace_period_reminder', 'grace_period_day9', 'grace_period_day10')`);
    console.log('🗑️  Removed old grace_period templates');

    for (const tplGroup of templates) {
        for (const row of tplGroup.rows) {
            await pool.query(
                `INSERT INTO email_templates
                 (slug, name, subject, body, language, header_enabled, footer_enabled,
                  timing_type, timing_delay_value, timing_delay_unit, timing_reference)
                 VALUES ($1, $2, $3, $4, $5, TRUE, TRUE, 'delayed', $6, 'days', 'trial_end')`,
                [tplGroup.slug, row.name, row.subject, row.body, row.language, tplGroup.timing_delay_value]
            );
            console.log(`✅ Inserted ${tplGroup.slug} [${row.language}] — fires ${tplGroup.timing_delay_value} days after trial_end`);
        }
    }

    console.log('\n📅 Grace Period Schedule:');
    console.log('   Day 9 after trial_end → grace_period_day9  → "1 day left" warning');
    console.log('   Day 10 after trial_end → grace_period_day10 → "Page paused" final notice');
    await pool.end();
    process.exit(0);
}

run().catch(e => { console.error(e.message); process.exit(1); });
