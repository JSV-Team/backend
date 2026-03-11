const { connectDB, getPool, sql } = require("./src/config/db");

async function check() {
    try {
        await connectDB();
        const pool = await getPool();
        
        console.log("--- ALL ACTIVITIES ---");
        const r = await pool.request().query(`SELECT activity_id, title, status FROM Activities ORDER BY created_at DESC`);
        console.log(r.recordset);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

check();
