const sql = require('mssql');
const bcrypt = require('bcrypt');
const { getPool } = require('../config/db');

const registerUser = async (email, username, password, fullName, location) => {
    const pool = getPool();
    
    try {
        // Kiểm tra email đã tồn tại chưa
        const emailCheck = await pool.request()
            .input('email', sql.NVarChar, email)
            .query(`SELECT user_id FROM Users WHERE email = @email`);
        
        if (emailCheck.recordset.length > 0) {
            return { success: false, message: "Email này đã được đăng ký!" };
        }

        // Kiểm tra username đã tồn tại chưa
        const usernameCheck = await pool.request()
            .input('username', sql.NVarChar, username)
            .query(`SELECT user_id FROM Users WHERE username = @username`);
        
        if (usernameCheck.recordset.length > 0) {
            return { success: false, message: "Username này đã được sử dụng!" };
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Tạo user mới
        const result = await pool.request()
            .input('username', sql.NVarChar, username)
            .input('email', sql.NVarChar, email)
            .input('password_hash', sql.NVarChar, hashedPassword)
            .input('full_name', sql.NVarChar, fullName || null)
            .input('location', sql.NVarChar, location || null)
            .query(`
                INSERT INTO Users (username, email, password_hash, full_name, location, status, role, created_at)
                VALUES (@username, @email, @password_hash, @full_name, @location, 'active', 'user', SYSDATETIME());
                
                SELECT CAST(SCOPE_IDENTITY() as int) as user_id;
            `);

        const userId = result.recordset[0].user_id;

        // Lấy thông tin user mới tạo (trừ password)
        const userResult = await pool.request()
            .input('userId', sql.Int, userId)
            .query(`
                SELECT user_id, username, email, full_name, location, status, role, created_at
                FROM Users
                WHERE user_id = @userId
            `);

        const newUser = userResult.recordset[0];

        return {
            success: true,
            message: "Đăng ký thành công!",
            user: newUser
        };

    } catch (error) {
        console.error('Register error:', error.message);
        return {
            success: false,
            message: "Lỗi server: " + error.message
        };
    }
};

module.exports = { registerUser };
