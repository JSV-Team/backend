const { connectDB, getPool, sql } = require("./src/config/db");

async function check() {
    try {
        await connectDB();
        const pool = await getPool();
        
        console.log("--- TEST SQL listByUser for User 2 ---");
        const r = await pool.request()
            .input("userId", sql.Int, 2)
            .query(`
                SELECT a.activity_id AS post_id, a.creator_id AS user_id, 
                       a.title AS content, a.description, a.location, 
                       a.duration_minutes, a.max_participants, a.created_at,
                       (SELECT TOP 1 image_url FROM ActivityImages WHERE activity_id = a.activity_id) AS image_url
                FROM Activities a
                WHERE a.creator_id=@userId
                ORDER BY a.created_at DESC
            `);
        console.log(JSON.stringify(r.recordset, null, 2));

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

check();
