import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'tributto',
    password: '5432',
    port: 5432
});

const templates = [
    {
        slug: 'trial_expired_reminder',
        language: 'de',
        name: 'Zahlungserinnerung (DE)',
        subject: 'Zahlungserinnerung für [memorial_name]',
        body: `<p>Hallo [user_name],</p>

<p>heute endet die kostenlose Testphase für Ihre Gedenkseite <a href="[memorial_link]" style="color: #c59d5f; text-decoration: underline;">[memorial_name]</a>.</p>

<p>Um die Seite aktiv und zugänglich zu halten, ist nun die einmalige Zahlung von <strong>€ [product_price]</strong> fällig.</p>

<p>Sie können die Zahlung hier abschließen:<br/>
<a href="[payment_link]" style="display: inline-block; background-color: #c59d5f; color: #ffffff; padding: 12px 25px; border-radius: 5px; text-decoration: none; font-weight: bold; margin-top: 15px;">Klicken Sie hier, um zur Zahlung zu gelangen.</a></p>

<p>Vielen Dank, dass Sie diesen Ort der Erinnerung bewahren.</p>

<p>Das Tributoo-Team</p>`
    },
    {
        slug: 'trial_expired_reminder',
        language: 'it',
        name: 'Promemoria di pagamento (IT)',
        subject: 'Promemoria di pagamento per [memorial_name]',
        body: `<p>Ciao [user_name],</p>

<p>oggi termina il periodo gratuito per la tua pagina commemorativa <a href="[memorial_link]" style="color: #c59d5f; text-decoration: underline;">[memorial_name]</a>.</p>

<p>Per mantenere la pagina attiva e accessibile, è ora dovuto il pagamento una tantum di <strong>€ [product_price]</strong>.</p>

<p>Puoi completare il pagamento qui:<br/>
<a href="[payment_link]" style="display: inline-block; background-color: #c59d5f; color: #ffffff; padding: 12px 25px; border-radius: 5px; text-decoration: none; font-weight: bold; margin-top: 15px;">Clicca qui per procedere al pagamento.</a></p>

<p>Grazie per aver preservato questo luogo della memoria.</p>

<p>Il team di Tributoo</p>`
    },
    {
        slug: 'welcome_trial',
        language: 'de',
        name: 'Willkommen (DE)',
        subject: 'Willkommen bei Tributoo - Ihre Gedenkseite ist bereit!',
        body: `<p>Hallo [user_name],</p>
<p>vielen Dank, dass Sie Tributoo gewählt haben, um die Erinnerung an Ihre Liebsten zu ehren.</p>
<p>Ihre Gedenkseite <strong>[memorial_name]</strong> wurde erfolgreich erstellt.</p>
<p>Sie können sie hier ansehen und bearbeiten:<br/>
<a href="[memorial_link]" style="color: #c59d5f; text-decoration: underline;">[memorial_name]</a></p>
<p>Ihre kostenlose 7-tägige Testphase hat heute begonnen. Wir senden Ihnen eine Erinnerung, bevor sie endet.</p>
<p>Mit freundlichen Grüßen,<br/>Das Tributoo-Team</p>`
    },
    {
        slug: 'welcome_trial',
        language: 'it',
        name: 'Benvenuto (IT)',
        subject: 'Benvenuto in Tributoo - La tua pagina commemorativa è pronta!',
        body: `<p>Ciao [user_name],</p>
<p>Grazie per aver scelto Tributoo per onorare la memoria dei tuoi cari.</p>
<p>La tua pagina commemorativa <strong>[memorial_name]</strong> è stata creata con successo.</p>
<p>Puoi visualizzarla e modificarla qui:<br/>
<a href="[memorial_link]" style="color: #c59d5f; text-decoration: underline;">[memorial_name]</a></p>
<p>Il tuo periodo di prova gratuito di 7 giorni è iniziato oggi. Ti invieremo un promemoria prima della scadenza.</p>
<p>Cordiali saluti,<br/>Il team di Tributoo</p>`
    },
    {
        slug: 'subscription_expired',
        language: 'de',
        name: 'Abonnement abgelaufen (DE)',
        subject: 'Ihr Abonnement für [product_name] ist abgelaufen',
        body: `<p>Hallo [user_name],</p>
<p>Ihr Abonnement für <strong>[product_name]</strong> ist heute abgelaufen.</p>
<p>Um den Zugang zu Ihren Gedenkseiten zu behalten, verlängern Sie bitte Ihr Abonnement hier:<br/>
<a href="[renew_link]" style="display: inline-block; background-color: #c59d5f; color: #ffffff; padding: 12px 25px; border-radius: 5px; text-decoration: none; font-weight: bold; margin-top: 15px;">Abonnement erneuern</a></p>
<p>Vielen Dank,<br/>Das Tributoo-Team</p>`
    },
    {
        slug: 'subscription_expired',
        language: 'it',
        name: 'Abbonamento scaduto (IT)',
        subject: 'Il tuo abbonamento per [product_name] è scaduto',
        body: `<p>Ciao [user_name],</p>
<p>Il tuo abbonamento per <strong>[product_name]</strong> è scaduto oggi.</p>
<p>Per mantenere l'accesso alle tue pagine commemorative, rinnova il tuo abbonamento qui:<br/>
<a href="[renew_link]" style="display: inline-block; background-color: #c59d5f; color: #ffffff; padding: 12px 25px; border-radius: 5px; text-decoration: none; font-weight: bold; margin-top: 15px;">Rinnova abbonamento</a></p>
<p>Grazie,<br/>Il team di Tributoo</p>`
    },
    {
        slug: 'subscription_expiry_reminder',
        language: 'de',
        name: 'Ablaufwarnung (DE)',
        subject: '[header_title]: Wirkung von [product_name] endet bald',
        body: `<p>Hallo [user_name],</p>
<p>dies ist eine freundliche Erinnerung daran, dass Ihre <strong>[plan_type]</strong> für <strong>[product_name]</strong> bald abläuft.</p>
<p>Verlängern Sie sie hier, um Unterbrechungen zu vermeiden:<br/>
<a href="[renew_link]" style="color: #c59d5f; text-decoration: underline;">Abonnement verlängern</a></p>
<p>Vielen Dank,<br/>Das Tributoo-Team</p>`
    },
    {
        slug: 'subscription_expiry_reminder',
        language: 'it',
        name: 'Avviso di scadenza (IT)',
        subject: '[header_title]: L\'effetto di [product_name] scadrà presto',
        body: `<p>Ciao [user_name],</p>
<p>Questo è un promemoria amichevole che il tuo <strong>[plan_type]</strong> per <strong>[product_name]</strong> scadrà presto.</p>
<p>Rinnovalo qui per evitare interruzioni:<br/>
<a href="[renew_link]" style="color: #c59d5f; text-decoration: underline;">Rinnova abbonamento</a></p>
<p>Grazie,<br/>Il team di Tributoo</p>`
    }
];

async function insertTemplates() {
    try {
        for (const t of templates) {
            console.log(`Inserting ${t.slug} (${t.language})...`);
            await pool.query(
                `INSERT INTO email_templates (slug, language, name, subject, body, shortcodes, header_enabled, footer_enabled)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 ON CONFLICT (slug, language) DO UPDATE 
                 SET name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body, updated_at = CURRENT_TIMESTAMP`,
                [t.slug, t.language, t.name, t.subject, t.body, JSON.stringify([]), true, true]
            );
        }
        console.log('Templates inserted successfully');
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

// Check for unique constraint first
async function prepareTable() {
    try {
        // Find existing unique constraints on slug
        const res = await pool.query(`
            SELECT conname 
            FROM pg_constraint 
            WHERE conrelid = 'email_templates'::regclass 
            AND contype = 'u'
        `);

        for (const row of res.rows) {
            console.log(`Dropping constraint ${row.conname}...`);
            await pool.query(`ALTER TABLE email_templates DROP CONSTRAINT IF EXISTS "${row.conname}"`);
        }

        console.log('Adding new unique constraint (slug, language)...');
        await pool.query('ALTER TABLE email_templates ADD CONSTRAINT email_templates_slug_language_key UNIQUE (slug, language)');
    } catch (e) {
        console.warn('Constraint update warning:', e.message);
    }
}

async function run() {
    await prepareTable();
    await insertTemplates();
}

run();
