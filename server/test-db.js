import pool from './db.js';

pool.query("SELECT email, username, password_hash FROM users LIMIT 1")
    .then(res => console.log(res.rows))
    .finally(() => pool.end());
