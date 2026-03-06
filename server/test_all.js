import db from './db.js';
import fs from 'fs';
async function run() {
    const res = await db.query("SELECT slug, name, timing_reference, timing_delay_value, timing_delay_unit FROM email_templates ORDER BY slug");
    fs.writeFileSync('configs.json', JSON.stringify(res.rows, null, 2));
    process.exit(0);
}
run();
