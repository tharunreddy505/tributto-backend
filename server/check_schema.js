import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'tributto',
    password: '5432',
    port: 5432
});

async function checkSchema() {
    try {
        const users = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'users'");
        console.log('--- USERS ---');
        users.rows.forEach(r => console.log(r.column_name));

        const email_templates = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'email_templates'");
        console.log('--- EMAIL TEMPLATES ---');
        email_templates.rows.forEach(r => console.log(r.column_name));

        const subs = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'subscriptions'");
        console.log('--- SUBSCRIPTIONS ---');
        subs.rows.forEach(r => console.log(r.column_name));

        const tributes = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'tributes'");
        console.log('--- TRIBUTES ---');
        tributes.rows.forEach(r => console.log(r.column_name));

        const constraints = await pool.query("SELECT conname FROM pg_constraint WHERE conrelid = 'email_templates'::regclass");
        console.log('--- EMAIL TEMPLATES CONSTRAINTS ---');
        constraints.rows.forEach(r => console.log(r.conname));

        const subscriptions = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'subscriptions'");
        console.log('--- SUBSCRIPTIONS ---');
        subscriptions.rows.forEach(r => console.log(r.column_name));

        const subConstraints = await pool.query("SELECT conname FROM pg_constraint WHERE conrelid = 'subscriptions'::regclass");
        console.log('--- SUBSCRIPTIONS CONSTRAINTS ---');
        subConstraints.rows.forEach(r => console.log(r.conname));

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkSchema();
