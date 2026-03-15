require('dotenv').config();
const { connectDB, getPool } = require('./src/config/db');

async function testQuery() {
    await connectDB();
    const pool = getPool();
    const result = await pool.request().query(`
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
      u.avatar_url,
      (SELECT TOP 1 ai.image_url FROM ActivityImages ai WHERE ai.activity_id = a.activity_id) AS image_url
    FROM Activities a
    LEFT JOIN Users u ON a.creator_id = u.user_id
    WHERE a.status = 'active'
    ORDER BY a.created_at DESC
    `);
    console.log('Query result count:', result.recordset.length);
    console.log('Sample record:', result.recordset[0]);
    process.exit(0);
}
testQuery();
