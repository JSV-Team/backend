const sql = require('mssql');
const bcrypt = require('bcrypt');
// Nhớ import file chứa cấu hình kết nối DB của nhóm bạn vào đây nhé!

const verifyUser = async (identifier, password) => {
    const request = new sql.Request();
    request.input('identifier', sql.VarChar, identifier);
    const dbCheck = await request.query("SELECT DB_NAME() AS dbname");
console.log("Current DB:", dbCheck.recordset[0].dbname);
    // Tìm user theo email hoặc username
    const result = await request.query(`
        SELECT * FROM Users 
        WHERE email = @identifier OR username = @identifier
    `);
    console.log("Identifier:", "[" + identifier + "]");
console.log("Query result:", result.recordset);

const user = result.recordset[0];
console.log("User tìm được:", user);
    if (!user) {
        return { success: false, message: "Tài khoản hoặc mật khẩu không chính xác!" };
    }

    // Kiểm tra tài khoản có bị khóa không
   // ... code tìm user ở trên ...

    // Kiểm tra tài khoản có bị khóa không
    if (user.status !== 'active' || user.is_locked) {
        return { success: false, message: "Tài khoản của bạn đã bị khóa hoặc vô hiệu hóa!" };
    }

    // ĐẶT MÁY NGHE LÉN Ở ĐÂY:
    console.log("=== THÔNG TIN DEBUG ===");
    console.log("1. Username tìm được:", user.username);
    console.log("2. Mật khẩu React gửi lên:", password);
    console.log("3. Mã băm trong DB:", user.password_hash);
    
    // So sánh mật khẩu
    const isMatch = await bcrypt.compare(password, user.password_hash);
    
    console.log("4. Kết quả so sánh bcrypt:", isMatch);
    console.log("=======================");

    if (!isMatch) {
        return { success: false, message: "Tài khoản hoặc mật khẩu không chính xác!" };
    }
    // ... code phần dưới ...
    // Thành công thì xóa password khỏi object để bảo mật trước khi ném lên Controller
    delete user.password_hash;
    return { success: true, user: user };
};

module.exports = { verifyUser };