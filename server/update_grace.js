import db from './db.js';

async function updateConfig() {
    try {
        await db.query(`UPDATE email_templates SET timing_reference = 'trial_start', timing_delay_value = 9 WHERE slug = 'grace_period_day9'`);
        await db.query(`UPDATE email_templates SET timing_reference = 'trial_start', timing_delay_value = 10 WHERE slug = 'grace_period_day10'`);
        console.log("Updated grace_period timing_reference to trial_start.");
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

updateConfig();
