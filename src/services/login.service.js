const sql = require('mssql');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const verifyUser = async (identifier, password) => {
    const request = new sql.Request();
    request.input('identifier', sql.VarChar, identifier);
    
    // Tìm user theo email hoặc username
    const result = await request.query(`
        SELECT * FROM Users 
        WHERE email = @identifier OR username = @identifier
    `);

    const user = result.recordset[0];
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

    // Tạo JWT Token
    const token = jwt.sign(
        { 
            user_id: user.user_id, 
            username: user.username, 
            email: user.email, 
            role: user.role 
        },
        process.env.JWT_SECRET || 'super_secret_key',
        { expiresIn: '7d' }
    );

    // Thành công thì xóa password khỏi object để bảo mật
    delete user.password_hash;
    return { success: true, user: user, token: token };
};

module.exports = { verifyUser };