const sql = require('mssql');
const bcrypt = require('bcrypt');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const seedAdmin = async () => {
    try {
        const config = {
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            server: process.env.DB_SERVER,
            database: process.env.DB_DATABASE,
            options: {
                encrypt: true,
                trustServerCertificate: true
            }
        };

        const pool = await sql.connect(config);
        const hashedPassword = await bcrypt.hash('Password123!', 10);

        const checkQuery = await pool.request()
            .input('username', sql.NVarChar, 'admin36')
            .query("SELECT * FROM Users WHERE username = @username");

        if (checkQuery.recordset.length === 0) {
            await pool.request()
                .input('username', sql.NVarChar, 'admin36')
                .input('email', sql.NVarChar, 'admin36@jsv.com')
                .input('password_hash', sql.NVarChar, hashedPassword)
                .input('role', sql.NVarChar, 'admin')
                .query(`
                    INSERT INTO Users (username, email, password_hash, role, status, email_verified, reputation_score)
                    VALUES (@username, @email, @password_hash, @role, 'active', 1, 200)
                `);
            console.log("✅ Admin user 'admin36' created successfully.");
        } else {
            console.log("ℹ️ Admin user 'admin36' already exists.");
        }

        await pool.close();
    } catch (err) {
        console.error("❌ Error seeding admin:", err.message);
    }
};

seedAdmin();
