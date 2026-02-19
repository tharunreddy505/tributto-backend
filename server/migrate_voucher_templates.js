import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

const migrate = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS voucher_templates (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL DEFAULT 'Default Template',
                background_color VARCHAR(50) DEFAULT '#1a1a1a',
                background_image TEXT,
                logo_url TEXT,
                elements JSONB DEFAULT '[]',
                is_default BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Insert a default template
        const existing = await pool.query("SELECT id FROM voucher_templates WHERE is_default = TRUE");
        if (existing.rows.length === 0) {
            await pool.query(`
                INSERT INTO voucher_templates (name, background_color, is_default, elements)
                VALUES (
                    'Default Voucher',
                    '#1a1a1a',
                    TRUE,
                    '[
                        {"id":"title","type":"text","content":"ERINNERUNG, DIE BLEIBT","x":50,"y":38,"fontSize":28,"fontWeight":"bold","color":"#D4AF37","align":"center","width":80},
                        {"id":"subtitle","type":"text","content":"Ein Gutschein für eine persönliche Gedenkseite","x":50,"y":48,"fontSize":12,"fontWeight":"normal","color":"#ffffff","align":"center","width":80},
                        {"id":"code_label","type":"text","content":"VOUCHER CODE","x":50,"y":60,"fontSize":10,"fontWeight":"bold","color":"#D4AF37","align":"center","width":80},
                        {"id":"code","type":"shortcode","content":"[voucher_code]","x":50,"y":67,"fontSize":22,"fontWeight":"bold","color":"#D4AF37","align":"center","width":80},
                        {"id":"message","type":"shortcode","content":"[recipient_message]","x":50,"y":78,"fontSize":11,"fontWeight":"normal","color":"#cccccc","align":"center","width":80},
                        {"id":"footer","type":"shortcode","content":"Valid until: [expiry_date]","x":50,"y":90,"fontSize":9,"fontWeight":"normal","color":"#888888","align":"center","width":80}
                    ]'::jsonb
                )
            `);
            console.log("✅ Default voucher template inserted.");
        }

        console.log("✅ voucher_templates table created successfully.");
    } catch (err) {
        console.error("Migration Error:", err.message);
    } finally {
        await pool.end();
    }
};

migrate();
