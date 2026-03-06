import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();
const { Pool } = pg;

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'tributto',
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

async function addTemplate() {
    const slug = 'trial_5_days_reminder';
    const bodyEn = `
<div style="font-family: Arial, sans-serif; color: #1d2327; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px; overflow: hidden;">
    <div style="background-color: #1d2327; padding: 20px; text-align: center; border-bottom: 3px solid #c59d5f;">
        <h1 style="color: #fff; margin: 0; font-size: 24px;">[header_title]</h1>
    </div>
    <div style="padding: 30px; background-color: #fafafa;">
        <div style="background-color: #fff; border: 1px solid #eaeaea; border-radius: 6px; padding: 25px; margin-bottom: 25px;">
            <p style="color: #666; font-size: 14px; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-top: 0;">Reminder: Payment due on [due_date]</p>
            <p style="font-size: 16px; margin-top: 20px;">Hi [user_name],</p>
            <p style="font-size: 16px; line-height: 1.6;">
                We hope the memorial page <a href="[memorial_link]" style="color: #c59d5f;">[memorial_name]</a> has been a meaningful place of remembrance for you.
            </p>
            <p style="font-size: 16px; line-height: 1.6;">
                In <strong>2 days</strong>, the one-time payment of &#8364; <strong>[product_price]</strong> will be due to keep the page active.
            </p>
            <p style="font-size: 16px; margin-bottom: 30px;">
                You can complete it anytime here: <a href="[payment_link]" style="color: #c59d5f; font-weight: bold;">Click here to proceed to payment</a>
            </p>
            <p style="font-size: 16px; color: #666; margin-bottom: 5px;">Warmly,</p>
            <p style="font-size: 16px; color: #999; margin-top: 0;">The Tributoo Team</p>
        </div>
        <div style="text-align: center; border-top: 1px solid #eee; padding-top: 20px;">
            <p style="font-size: 12px; color: #999; margin: 0;">&copy; Tributoo &bull; <a href="https://tributoo.de/kontakt" style="color: #c59d5f;">Support</a></p>
        </div>
    </div>
</div>`;

    const bodyDe = `
<div style="font-family: Arial, sans-serif; color: #1d2327; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px; overflow: hidden;">
    <div style="background-color: #1d2327; padding: 20px; text-align: center; border-bottom: 3px solid #c59d5f;">
        <h1 style="color: #fff; margin: 0; font-size: 24px;">[header_title]</h1>
    </div>
    <div style="padding: 30px; background-color: #fafafa;">
        <div style="background-color: #fff; border: 1px solid #eaeaea; border-radius: 6px; padding: 25px; margin-bottom: 25px;">
            <p style="color: #666; font-size: 14px; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-top: 0;">Erinnerung: Zahlung f&#228;llig am [due_date]</p>
            <p style="font-size: 16px; margin-top: 20px;">Hallo [user_name],</p>
            <p style="font-size: 16px; line-height: 1.6;">
                Wir hoffen, dass die Gedenkseite <a href="[memorial_link]" style="color: #c59d5f;">[memorial_name]</a> ein bedeutungsvoller Ort der Erinnerung f&#252;r Sie war.
            </p>
            <p style="font-size: 16px; line-height: 1.6;">
                In <strong>2 Tagen</strong> wird die einmalige Zahlung von &#8364; <strong>[product_price]</strong> f&#228;llig, um die Seite aktiv zu halten.
            </p>
            <p style="font-size: 16px; margin-bottom: 30px;">
                Sie k&#246;nnen es jederzeit hier abschlie&#223;en: <a href="[payment_link]" style="color: #c59d5f; font-weight: bold;">Hier klicken um zur Zahlung zu gelangen</a>
            </p>
            <p style="font-size: 16px; color: #666; margin-bottom: 5px;">Mit freundlichen Gr&#252;&#223;en,</p>
            <p style="font-size: 16px; color: #999; margin-top: 0;">Das Tributoo Team</p>
        </div>
        <div style="text-align: center; border-top: 1px solid #eee; padding-top: 20px;">
            <p style="font-size: 12px; color: #999; margin: 0;">&copy; Tributoo &bull; <a href="https://tributoo.de/kontakt" style="color: #c59d5f;">Support</a></p>
        </div>
    </div>
</div>`;

    const bodyIt = `
<div style="font-family: Arial, sans-serif; color: #1d2327; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px; overflow: hidden;">
    <div style="background-color: #1d2327; padding: 20px; text-align: center; border-bottom: 3px solid #c59d5f;">
        <h1 style="color: #fff; margin: 0; font-size: 24px;">[header_title]</h1>
    </div>
    <div style="padding: 30px; background-color: #fafafa;">
        <div style="background-color: #fff; border: 1px solid #eaeaea; border-radius: 6px; padding: 25px; margin-bottom: 25px;">
            <p style="color: #666; font-size: 14px; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-top: 0;">Promemoria: Pagamento in scadenza il [due_date]</p>
            <p style="font-size: 16px; margin-top: 20px;">Ciao [user_name],</p>
            <p style="font-size: 16px; line-height: 1.6;">
                Speriamo che la pagina memoriale <a href="[memorial_link]" style="color: #c59d5f;">[memorial_name]</a> sia stata un luogo significativo di ricordo per te.
            </p>
            <p style="font-size: 16px; line-height: 1.6;">
                Tra <strong>2 giorni</strong>, il pagamento una tantum di &#8364; <strong>[product_price]</strong> sar&#224; dovuto per mantenere la pagina attiva.
            </p>
            <p style="font-size: 16px; margin-bottom: 30px;">
                Puoi completarlo in qualsiasi momento qui: <a href="[payment_link]" style="color: #c59d5f; font-weight: bold;">Clicca qui per procedere al pagamento</a>
            </p>
            <p style="font-size: 16px; color: #666; margin-bottom: 5px;">Cordialmente,</p>
            <p style="font-size: 16px; color: #999; margin-top: 0;">Il Team Tributoo</p>
        </div>
        <div style="text-align: center; border-top: 1px solid #eee; padding-top: 20px;">
            <p style="font-size: 12px; color: #999; margin: 0;">&copy; Tributoo &bull; <a href="https://tributoo.de/kontakt" style="color: #c59d5f;">Supporto</a></p>
        </div>
    </div>
</div>`;

    try {
        await pool.query("DELETE FROM email_templates WHERE slug = $1", [slug]);
        await pool.query(
            "INSERT INTO email_templates (slug, name, subject, body, language) VALUES ($1, $2, $3, $4, $5)",
            [slug, 'Trial 5 Days Reminder', 'Payment Due Reminder — [memorial_name]', bodyEn, 'en']
        );
        await pool.query(
            "INSERT INTO email_templates (slug, name, subject, body, language) VALUES ($1, $2, $3, $4, $5)",
            [slug, 'Erinnerung nach 5 Tagen Probezeit', 'Zahlungserinnerung — [memorial_name]', bodyDe, 'de']
        );
        await pool.query(
            "INSERT INTO email_templates (slug, name, subject, body, language) VALUES ($1, $2, $3, $4, $5)",
            [slug, 'Promemoria di 5 giorni di prova', 'Promemoria di pagamento — [memorial_name]', bodyIt, 'it']
        );
        console.log("✅ Trial 5-day reminder templates inserted successfully!");
    } catch (err) {
        console.error("Error inserting template:", err.message);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

addTemplate();
