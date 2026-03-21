const { getPool } = require("../config/db");
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

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
    
    if (!isMatch) {
        return { success: false, message: "Tài khoản hoặc mật khẩu không chính xác!" };
    }

    // Thành công -> Tạo JWT
    const token = jwt.sign(
        { 
            user_id: user.user_id, 
            username: user.username, 
            role: user.role 
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );

    // Xóa password khỏi object để bảo mật
    delete user.password_hash;
    
    return { 
        success: true, 
        user: user,
        token: token
    };
};

module.exports = { verifyUser };