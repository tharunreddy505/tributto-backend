import pool from './db.js';
import fs from 'fs';

pool.query("SELECT slug, language, name FROM email_templates WHERE slug = 'welcome_trial'")
    .then(res => {
        const out = JSON.stringify(res.rows, null, 2);
        fs.writeFileSync('email_output.txt', out, 'utf8');
    })
    .catch(err => fs.writeFileSync('email_output.txt', err.message, 'utf8'))
    .finally(() => pool.end());
