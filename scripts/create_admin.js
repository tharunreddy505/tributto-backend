
import pg from 'pg';
import bcrypt from 'bcryptjs';
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

async function createAdmin() {
    try {
        const username = 'admin@tributo';
        const email = 'admin@tributo';
        const passwordStart = 'admin@123';
        const role = 'admin';

        // Check if user exists
        const checkRes = await pool.query("SELECT * FROM users WHERE email = $1 OR username = $2", [email, username]);

        if (checkRes.rows.length > 0) {
            console.log(`User ${username} or ${email} already exists.`);
            // Optionally update password if it exists
            const salt = await bcrypt.genSalt(10);
            const hash = await bcrypt.hash(passwordStart, salt);
            await pool.query("UPDATE users SET password_hash = $1, role = $2 WHERE email = $3", [hash, role, email]);
            console.log("Updated existing user password and role.");
        } else {
            const salt = await bcrypt.genSalt(10);
            const hash = await bcrypt.hash(passwordStart, salt);

            await pool.query(
                "INSERT INTO users (username, email, password_hash, role, company_name) VALUES ($1, $2, $3, $4, $5)",
                [username, email, hash, role, 'Admin Console']
            );
            console.log(`Created user ${username} with admin role.`);
        }

    } catch (err) {
        console.error("Error creating admin:", err);
    } finally {
        pool.end();
    }
}

createAdmin();
