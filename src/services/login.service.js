const { getPool } = require("../config/db");
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const verifyUser = async (identifier, password) => {
    const pool = await getPool();

    // Tìm user theo email hoặc username
    const result = await pool.query(`
        SELECT * FROM users 
        WHERE email = $1 OR username = $1
    `, [identifier]);

    const user = result.rows[0];
    if (!user) {
        return { success: false, message: "Tài khoản hoặc mật khẩu không chính xác!" };
    }

    // Kiểm tra tài khoản có bị khóa không
    if (user.status !== 'active' || user.is_locked) {
        return { success: false, message: "Tài khoản của bạn đã bị khóa hoặc vô hiệu hóa!" };
    }

    // So sánh mật khẩu
    const isMatch = await bcrypt.compare(password, user.password_hash);
    console.log("BCRYPT MATCH RESULT:", isMatch);

    if (!isMatch) {
        return { success: false, message: "Tài khoản hoặc mật khẩu không chính xác!" };
    }

    // Validate JWT_SECRET exists
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        console.error('FATAL: JWT_SECRET environment variable is required!');
        return { success: false, message: "Lỗi cấu hình server - JWT_SECRET missing!" };
    }

    const token = jwt.sign(
        {
            user_id: user.user_id,
            username: user.username,
            email: user.email,
            role: user.role
        },
        jwtSecret,
        { expiresIn: '7d' }
    );

    // Thành công thì xóa password khỏi object để bảo mật
    delete user.password_hash;
    return { success: true, user: user, token: token };
};

module.exports = { verifyUser };
