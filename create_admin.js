
const { getPool } = require("./src/config/db");
const bcrypt = require('bcrypt');
require('dotenv').config();

const createAdmin = async () => {
    const pool = getPool();
    const username = 'admin_antigravity';
    const email = 'admin@antigravity.io';
    const password = 'Password@123';
    const role = 'admin';

    // Check if user exists
    const checkExisted = await pool.query('SELECT user_id FROM users WHERE username = $1 OR email = $2', [username, email]);
    if (checkExisted.rows.length > 0) {
        console.log('Admin user already exists.');
        return;
    }

    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    try {
        await pool.query(
            'INSERT INTO users (username, email, email_verified, password_hash, role, status) VALUES ($1, $2, $3, $4, $5, $6)',
            [username, email, true, passwordHash, role, 'active']
        );
        console.log(`✅ Admin account created successfully!`);
        console.log(`Username: ${username}`);
        console.log(`Password: ${password}`);
    } catch (err) {
        console.error('❌ Error creating admin account:', err);
    } finally {
        // No need to close pool if it's the global one
    }
};

createAdmin().then(() => process.exit(0));
