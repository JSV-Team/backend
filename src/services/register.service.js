const bcrypt = require('bcrypt');
const { getPool } = require('../config/db');

const registerUser = async (email, username, password, fullName, location) => {
    const pool = await getPool();
    
    try {
        // Kiểm tra email đã tồn tại chưa
        const emailCheck = await pool.query(`SELECT user_id FROM users WHERE email = $1`, [email]);
        
        if (emailCheck.rows.length > 0) {
            return { success: false, message: "Email này đã được đăng ký!" };
        }

        // Kiểm tra username đã tồn tại chưa
        const usernameCheck = await pool.query(`SELECT user_id FROM users WHERE username = $1`, [username]);
        
        if (usernameCheck.rows.length > 0) {
            return { success: false, message: "Username này đã được sử dụng!" };
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Tạo user mới
        const result = await pool.query(`
            INSERT INTO users (username, email, password_hash, full_name, location, status, role, created_at)
            VALUES ($1, $2, $3, $4, $5, 'active', 'user', NOW())
            RETURNING user_id;
        `, [username, email, hashedPassword, fullName || null, location || null]);

        const userId = result.rows[0].user_id;

        // Lấy thông tin user mới tạo (trừ password)
        const userResult = await pool.query(`
            SELECT user_id, username, email, full_name, location, status, role, created_at
            FROM users
            WHERE user_id = $1
        `, [userId]);

        const newUser = userResult.rows[0];

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
