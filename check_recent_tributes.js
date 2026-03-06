import pool from './server/db.js';
const res = await pool.query('SELECT id, name, created_at, status FROM tributes ORDER BY created_at DESC LIMIT 5');
console.log(res.rows);
process.exit(0);
