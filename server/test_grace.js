import db from './db.js';
import fs from 'fs';

async function check() {
    try {
        const res = await db.query("SELECT slug, timing_reference, timing_delay_value, timing_delay_unit FROM email_templates WHERE slug IN ('grace_period_day9', 'grace_period_day10')");
        fs.writeFileSync('test_grace_output.json', JSON.stringify(res.rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

check();
