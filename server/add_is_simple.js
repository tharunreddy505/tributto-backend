import db from './db.js';

async function run() {
    try {
        await db.query("ALTER TABLE products ADD COLUMN IF NOT EXISTS is_simple BOOLEAN DEFAULT false");
        console.log('Added is_simple column');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

run();
