import pool from './db.js';

async function migrate() {
    try {
        console.log("Starting migration...");

        // Add is_super_admin column
        await pool.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT FALSE
        `);
        console.log("Added is_super_admin column.");

        // Add permissions column
        await pool.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]'
        `);
        console.log("Added permissions column.");

        // Set the default admin user as super admin and give full permissions
        const allPermissions = [
            'dashboard', 'memorials', 'condolences', 'media', 'pages',
            'posts', 'products', 'orders', 'menus', 'settings',
            'users', 'subscriptions'
        ];

        await pool.query(`
            UPDATE users 
            SET is_super_admin = TRUE, 
                role = 'admin',
                permissions = $1
            WHERE username = 'admin' OR email = 'admin@tributo'
        `, [JSON.stringify(allPermissions)]);

        console.log("Updated admin user to super admin with all permissions.");
        console.log("Migration completed successfully.");
    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        await pool.end();
    }
}

migrate();
