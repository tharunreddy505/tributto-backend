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

async function fix() {
    try {
        const r = await pool.query('SELECT id, elements FROM voucher_templates WHERE is_default = TRUE LIMIT 1');
        const t = r.rows[0];
        let els = typeof t.elements === 'string' ? JSON.parse(t.elements) : t.elements;
        if (!Array.isArray(els)) els = [];

        console.log(`Original Count: ${els.length}`);

        // Count how many [recipient_message] exist
        const recipientBackups = els.filter(e => e.content === '[recipient_message]');
        console.log(`Initial [recipient_message] count: ${recipientBackups.length}`);

        if (recipientBackups.length > 1) {
            // Remove ALL [recipient_message] elements
            let newEls = els.filter(e => e.content !== '[recipient_message]');

            // Add back ONLY the last one (which usually has the user's latest edit/position)
            // Or better: add back the one with the larger Y value (further down the page)?
            // In the example, one was Y=50, one was Y=74. The lower one (Y=74) is usually the "real" message area.
            // Let's take the one with the highest Y value.

            const bestMessage = recipientBackups.sort((a, b) => b.y - a.y)[0];
            newEls.push(bestMessage);

            console.log(`\nReducing to 1 [recipient_message] at Y=${bestMessage.y}...`);

            // Log final state
            console.log(`Final Count: ${newEls.length}`);
            newEls.forEach((e, i) => console.log(`  EL${i}: ${e.content} (y=${e.y})`));

            await pool.query('UPDATE voucher_templates SET elements = $1 WHERE id = $2', [JSON.stringify(newEls), t.id]);
            console.log('\n✅ FIXED: Database updated.');
        } else {
            console.log('\nNo duplicates found. Nothing to fix.');
        }

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

fix();
