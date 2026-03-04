const { connectDB, getPool } = require('./src/config/db');
const sql = require('mssql');
const chatService = require('./src/services/chat.service');

const seedData = async () => {
    await connectDB();
    const pool = getPool();

    console.log("🌱 Bắt đầu tạo dữ liệu test Chat...");

    // 1. Đảm bảo User 1 & User 2 tồn tại
    await pool.request().query(`
        IF NOT EXISTS (SELECT 1 FROM Users WHERE user_id = 1)
            INSERT INTO Users (user_id, email, username, full_name, password_hash, status, created_at) VALUES (1, 'host@test.com', 'host_user', 'Host Bố Tộc', '123', 'active', SYSDATETIME());
        
        IF NOT EXISTS (SELECT 1 FROM Users WHERE user_id = 2)
            INSERT INTO Users (user_id, email, username, full_name, password_hash, status, created_at) VALUES (2, 'guest@test.com', 'guest_user', 'Guest Lang Thang', '123', 'active', SYSDATETIME());
    `);
    console.log("✅ Đã kiểm tra User 1 và User 2.");

    // 2. Tạo 1 Activity mẫu 
    const resultAct = await pool.request().query(`
        INSERT INTO Activities (creator_id, title, description, location, max_participants, duration_minutes, status, created_at) 
        VALUES (1, N'Cafe code xuyên màn đêm 🚀', N'Cùng nhau code web app...', N'The Coffee House Cầu Giấy', 5, 120, 'active', SYSDATETIME());
        SELECT SCOPE_IDENTITY() AS activityId;
    `);
    const activityId = resultAct.recordset[0].activityId;
    console.log("✅ Đã tạo Activity mẫu ID:", activityId);

    // 3. Giả lập Host (User 1) duyệt xin vào nhóm của User 2
    // Vì initOrJoinActivityChat sẽ lo việc tạo Group nếu chưa có, và thêm host + member
    await chatService.initOrJoinActivityChat(activityId, 1, 2);
    console.log("✅ Đã tạo phòng Chat và Add User 1, User 2 vào phòng.");

    // Lấy ra Convesation ID vừa tạo
    const convResult = await pool.request().input('actId', sql.Int, activityId).query(`SELECT conversation_id FROM Conversations WHERE activity_id = @actId`);
    const convId = convResult.recordset[0].conversation_id;

    // 4. Bắn một vài tin nhắn mẫu (User 1 chào)
    await chatService.saveMessage(convId, 1, "Hello bạn mới vào nhóm nha! 👋");
    await chatService.saveMessage(convId, 2, "Chào thớt, mình mới học code. Mong được giúp đỡ ạ!");
    await chatService.saveMessage(convId, 1, "Ok b, tối nay ra the coffee house cầu giấy nhé!");

    console.log("✅ Đã tạo các tin nhắn mẫu. Hoàn tất!");
    process.exit(0);
}

seedData().catch(err => {
    console.error("Lỗi:", err);
    process.exit(1);
});
