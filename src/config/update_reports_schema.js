const { getPool, connectDB } = require('./db');

async function updateSchema() {
    try {
        await connectDB();
        const pool = getPool();
        console.log('Connected to PostgreSQL Database');

        // 1. Add severity column if not exists
        console.log('Adding severity column...');
        await pool.query(`
            ALTER TABLE reports ADD COLUMN IF NOT EXISTS severity VARCHAR(20) DEFAULT 'Trung bình';
        `);
        console.log('Added severity column to reports table.');

        // 3. Add seed data for the demo
        console.log('Seeding report data...');
        await pool.query(`
            INSERT INTO reports (reporter_id, reported_user_id, reported_activity_id, reason, status, severity, created_at)
            VALUES 
            (3, 5, NULL, 'Spam quảng cáo trong nhóm chat liên tục.', 'pending', 'Cao', NOW() - INTERVAL '2 hours'),
            (2, 6, NULL, 'Nội dung không phù hợp với tiêu chuẩn cộng đồng.', 'pending', 'Trung bình', NOW() - INTERVAL '5 hours'),
            (10, 4, NULL, 'Tài khoản giả mạo (Fake news).', 'resolved', 'Cao', NOW() - INTERVAL '1 day'),
            (7, 3, NULL, 'Gây rối và xúc phạm người khác.', 'dismissed', 'Thấp', NOW() - INTERVAL '2 days');
        `);

        console.log('Schema updated and data seeded successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Error updating schema:', err);
        process.exit(1);
    }
}

updateSchema();
