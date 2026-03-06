import db from './db.js';
import fs from 'fs';
async function test() {
    const res = await db.query("SELECT * FROM email_templates WHERE slug = 'subscription_expiry_reminder'");
    fs.writeFileSync('output.json', JSON.stringify(res.rows, null, 2));
    process.exit(0);
}
test();
