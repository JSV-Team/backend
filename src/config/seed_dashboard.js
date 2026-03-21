const sql = require('mssql');
const { dbConfig } = require('./env');

async function seedData() {
  try {
    const pool = await sql.connect(dbConfig);
    console.log("Connected to DB...");

    // 1. Seed some fake users
    console.log("Seeding fake users...");
    await pool.request().query(`
      IF (SELECT COUNT(*) FROM Users) < 10
      BEGIN
        INSERT INTO Users (username, email, password_hash, full_name, role, status, created_at)
        VALUES 
        ('user1', 'user1@example.com', 'hash', N'Nguyễn Văn Một', 'user', 'active', DATEADD(day, -5, GETDATE())),
        ('user2', 'user2@example.com', 'hash', N'Trần Thị Hai', 'user', 'active', DATEADD(day, -4, GETDATE())),
        ('user3', 'user3@example.com', 'hash', N'Lê Văn Ba', 'user', 'active', DATEADD(day, -3, GETDATE())),
        ('user4', 'user4@example.com', 'hash', N'Phạm Minh Bốn', 'user', 'active', DATEADD(day, -2, GETDATE())),
        ('user5', 'user5@example.com', 'hash', N'Hoàng Anh Năm', 'user', 'active', DATEADD(day, -1, GETDATE()))
      END
    `);

    // 2. Seed some fake activities
    console.log("Seeding fake activities...");
    await pool.request().query(`
      IF (SELECT COUNT(*) FROM Activities) < 15
      BEGIN
        DECLARE @adminId INT = (SELECT TOP 1 user_id FROM Users WHERE role = 'admin');
        INSERT INTO Activities (creator_id, title, description, location, status, created_at)
        VALUES 
        (@adminId, N'Hoạt động leo núi cuối tuần', N'Leo núi tại Ba Vì', N'Hà Nội', 'active', DATEADD(day, -6, GETDATE())),
        (@adminId, N'Giải chạy marathon 2024', N'Chạy bộ vì sức khỏe', N'Hồ Gươm', 'active', DATEADD(day, -5, GETDATE())),
        (@adminId, N'Offline cộng đồng lập trình', N'Giao lưu dev', N'Cầu Giấy', 'active', DATEADD(day, -4, GETDATE())),
        (@adminId, N'Workshop nhiếp ảnh', N'Học chụp ảnh cơ bản', N'Quận 1', 'active', DATEADD(day, -3, GETDATE())),
        (@adminId, N'Giải bóng đá mini', N'Bóng đá giao hữu', N'Sân Mỹ Đình', 'active', DATEADD(day, -2, GETDATE())),
        (@adminId, N'Hợp ca cuối tuần', N'Hát cho nhau nghe', N'Cafe nến', 'active', DATEADD(day, -1, GETDATE())),
        (@adminId, N'Thiền định sáng sớm', N'Thiền định tại chùa', N'Hà Nội', 'active', GETDATE())
      END
    `);

    // 3. Seed some fake reports
    console.log("Seeding fake reports...");
    await pool.request().query(`
      IF (SELECT COUNT(*) FROM Reports) < 8
      BEGIN
        DECLARE @u1 INT = (SELECT TOP 1 user_id FROM Users WHERE username = 'user1');
        DECLARE @u2 INT = (SELECT TOP 1 user_id FROM Users WHERE username = 'user2');
        DECLARE @reportedU INT = (SELECT TOP 1 user_id FROM Users WHERE role = 'user' AND username NOT IN ('user1', 'user2'));

        IF @u1 IS NOT NULL AND @u2 IS NOT NULL AND @reportedU IS NOT NULL
        BEGIN
          INSERT INTO Reports (reporter_id, reported_user_id, reason, status, reported_at)
          VALUES 
          (@u1, @reportedU, N'Spam quảng cáo', 'pending', DATEADD(day, -3, GETDATE())),
          (@u2, @reportedU, N'Nội dung độc hại', 'pending', DATEADD(day, -2, GETDATE())),
          (@u1, @reportedU, N'Ngôn từ thù ghét', 'pending', DATEADD(day, -1, GETDATE())),
          (@u2, @reportedU, N'Tài khoản giả mạo', 'pending', GETDATE())
        END
      END
    `);

    console.log("Done seeding dummy data!");
    process.exit(0);
  } catch (err) {
    console.error("Error seeding data:", err);
    process.exit(1);
  }
}

seedData();
