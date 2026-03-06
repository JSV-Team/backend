const { connectDB, getPool } = require('./src/config/db');

async function insertTestUser() {
    await connectDB();
    const pool = getPool();

    // Bcrypt hash for "Password123!"
    const hash = '$2b$10$57dG/C9nZFCvC1lki1YUTKmvomEr3eQQVvLNkWupc8IdrldlwJr.SRgi.6MZtS';

    const query = `
    INSERT INTO Users (username, email, email_verified, password_hash, full_name, bio, location, reputation_score, status, is_locked, role, created_at)
    VALUES (
      'testuser2', 
      'testuser2@example.com', 
      1, 
      '${hash}', 
      'Tài Khoản Test 2', 
      'Tài khoản mới được tạo để test tính năng đăng nhập tự động lấy dữ liệu động.', 
      'Đà Nẵng', 
      100, 
      'active', 
      0, 
      'user', 
      CURRENT_TIMESTAMP
    );
  `;

    try {
        await pool.request().query(query);
        console.log('✅ Đã chèn thành công tài khoản testuser2');
    } catch (err) {
        if (err.message.includes('Violation of UNIQUE KEY constraint')) {
            console.log('⚠️ Tài khoản testuser2 đã tồn tại trong DB.');
        } else {
            console.error('❌ Lỗi:', err);
        }
    }

    process.exit(0);
}

insertTestUser().catch(err => {
    console.error(err);
    process.exit(1);
});
