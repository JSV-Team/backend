const sql = require('mssql');
require('dotenv').config();

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    port: parseInt(process.env.DB_PORT),
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

async function updateSchema() {
    try {
        let pool = await sql.connect(config);
        console.log('Connected to SQL Server');

        // 1. Add severity column if not exists
        console.log('Adding severity column...');
        await pool.request().query(`
            IF NOT EXISTS (
                SELECT * FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_NAME = 'Reports' AND COLUMN_NAME = 'severity'
            )
            BEGIN
                ALTER TABLE Reports ADD severity NVARCHAR(20) DEFAULT N'Trung bình';
                PRINT 'Added severity column to Reports table.';
            END
        `);

        // 2. Clear old test reports to avoid confusion (optional, but good for demo)
        // await pool.request().query("DELETE FROM Reports");

        // 3. Add seed data for the demo
        console.log('Seeding report data...');
        await pool.request().query(`
            -- Ensure users and activities exist for FKs (assuming they exist from database.sql)
            -- We'll use IDs 2, 3, 4, 5, 10 for reporters/targets
            
            INSERT INTO Reports (reporter_id, reported_user_id, reported_activity_id, reason, status, severity, created_at)
            VALUES 
            (3, 5, NULL, N'Spam quảng cáo trong nhóm chat liên tục.', 'pending', N'Cao', DATEADD(HOUR, -2, SYSDATETIME())),
            (2, 6, NULL, N'Nội dung không phù hợp với tiêu chuẩn cộng đồng.', 'pending', N'Trung bình', DATEADD(HOUR, -5, SYSDATETIME())),
            (10, 4, NULL, N'Tài khoản giả mạo (Fake news).', 'resolved', N'Cao', DATEADD(DAY, -1, SYSDATETIME())),
            (7, 3, NULL, N'Gây rối và xúc phạm người khác.', 'dismissed', N'Thấp', DATEADD(DAY, -2, SYSDATETIME()));
        `);

        console.log('Schema updated and data seeded successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Error updating schema:', err);
        process.exit(1);
    }
}

updateSchema();
