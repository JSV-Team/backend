const sql = require('mssql');
require('dotenv').config();

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER || 'localhost',
    database: process.env.DB_DATABASE,
    options: {
        encrypt: false,
        trustServerCertificate: true
    },
    port: parseInt(process.env.DB_PORT) || 1433
};

async function testQuery() {
    try {
        const pool = await sql.connect(config);
        console.log("✅ Connected");
        
        const versionResult = await pool.request().query("SELECT @@VERSION as version");
        console.log("SQL Version:", versionResult.recordset[0].version);

        const query = `
            SELECT 
                a.activity_id AS id,
                a.title,
                a.status,
                a.created_at,
                u.full_name AS [user],
                (SELECT COUNT(*) FROM Reports r WHERE r.reported_activity_id = a.activity_id) AS reports
            FROM Activities a
            LEFT JOIN Users u ON a.creator_id = u.user_id
            ORDER BY a.created_at DESC
        `;
        
        const result = await pool.request().query(query);
        console.log("------------------------------------------");
        console.log(`Result length: ${result.recordset.length}`);
        if (result.recordset.length > 0) {
            console.log("First row:", JSON.stringify(result.recordset[0], null, 2));
        }
        console.log("------------------------------------------");
        
        await pool.close();
    } catch (err) {
        console.error("❌ Error:", err.message);
    }
}

testQuery();
