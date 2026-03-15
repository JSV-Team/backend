const sql = require('mssql');

const config = {
  user: 'sa',
  password: '123456',
  server: '127.0.0.1',
  port: 1433,
  database: 'SoThichDB',
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

async function seedTestData() {
  try {
    let pool = await sql.connect(config);
    
    console.log('🌱 Seeding Test Data...\n');
    
    // 1. Create test user
    console.log('1️⃣ Creating test user...');
    const userResult = await pool.request()
      .input('username', sql.NVarChar(50), 'testuser')
      .input('email', sql.NVarChar(255), 'test@example.com')
      .input('password_hash', sql.NVarChar(255), 'hashed_password_123')
      .input('full_name', sql.NVarChar(100), 'Test User')
      .input('avatar_url', sql.NVarChar(500), 'https://i.pravatar.cc/150?img=1')
      .query(`
        IF NOT EXISTS (SELECT 1 FROM Users WHERE username = @username)
        BEGIN
          INSERT INTO Users (username, email, password_hash, full_name, avatar_url, status, role, created_at)
          VALUES (@username, @email, @password_hash, @full_name, @avatar_url, 'active', 'user', SYSDATETIME());
          SELECT SCOPE_IDENTITY() AS user_id;
        END
        ELSE
        BEGIN
          SELECT user_id FROM Users WHERE username = @username;
        END
      `);
    
    const userId = userResult.recordset[0].user_id;
    console.log(`   ✅ User created/found with ID: ${userId}\n`);
    
    // 2. Create test activities
    console.log('2️⃣ Creating test activities...');
    
    const activities = [
      {
        title: 'Nhóm chạy bộ sáng sớm',
        description: 'Tập luyện chạy bộ vào sáng sớm tại công viên',
        location: 'Công viên Tao Đàn, TP.HCM',
        maxParticipants: 15,
        duration: 90
      },
      {
        title: 'Đá bóng đá giao hữu',
        description: 'Trận đá bóng thân thiện, ai cũng có thể tham gia',
        location: 'Sân cỏ nhân tạo quận 7',
        maxParticipants: 22,
        duration: 120
      },
      {
        title: 'Yoga tư thế sáng',
        description: 'Lớp yoga nhẹ nhàng cho người mới bắt đầu',
        location: 'Studio Yoga Zenith',
        maxParticipants: 20,
        duration: 60
      },
      {
        title: 'Bơi lội nước ấm',
        description: 'Tập bơi tại hồ bơi xã hội',
        location: 'Trung tâm bơi Olympic',
        maxParticipants: 30,
        duration: 75
      },
      {
        title: 'Chuỗi rủi ro nhỏ',
        description: 'Tập gym nhóm với HLV hết sức tận tâm',
        location: 'Phòng tập Gold Gym',
        maxParticipants: 12,
        duration: 60
      }
    ];
    
    for (const activity of activities) {
      const actResult = await pool.request()
        .input('creator_id', sql.Int, userId)
        .input('title', sql.NVarChar(sql.MAX), activity.title)
        .input('description', sql.NVarChar(sql.MAX), activity.description)
        .input('location', sql.NVarChar(100), activity.location)
        .input('max_participants', sql.Int, activity.maxParticipants)
        .input('duration_minutes', sql.Int, activity.duration)
        .query(`
          INSERT INTO Activities (creator_id, title, description, location, max_participants, duration_minutes, status, created_at)
        VALUES (@creator_id, @title, @description, @location, @max_participants, @duration_minutes, 'approved', SYSDATETIME());
          SELECT SCOPE_IDENTITY() AS activity_id;
        `);
      
      console.log(`   ✅ "${activity.title}" (ID: ${actResult.recordset[0].activity_id})`);
    }
    
    // 3. Verify data
    console.log('\n3️⃣ Verifying data...');
    const countResult = await pool.request()
      .query(`SELECT COUNT(*) as total FROM Activities WHERE status = 'active'`);
    
    console.log(`   ✅ Active activities: ${countResult.recordset[0].total}`);
    
    // 4. Test what frontend will get
    console.log('\n4️⃣ Frontend will receive:');
    const frontendResult = await pool.request()
      .query(`
        SELECT TOP 50
          a.activity_id AS status_id,
          a.creator_id AS user_id,
          a.title AS content,
          a.description AS extra_content,
          a.location,
          a.max_participants,
          a.duration_minutes,
          a.created_at,
          u.username,
          u.full_name,
          u.avatar_url
        FROM Activities a
        LEFT JOIN Users u ON a.creator_id = u.user_id
        WHERE a.status IN ('approved', 'active')
        ORDER BY a.created_at DESC
      `);
    
    console.log(`   Total activities: ${frontendResult.recordset.length}`);
    frontendResult.recordset.slice(0, 3).forEach(activity => {
      console.log(`   - ${activity.content} (by ${activity.full_name})`);
    });
    
    await pool.close();
    
    console.log('\n✅ Test data seeded successfully!');
    console.log('🔄 Now refresh frontend to see the activities!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

seedTestData();
