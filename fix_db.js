const { connectDB, getPool, sql } = require("./src/config/db");

async function fix() {
    try {
        await connectDB();
        const pool = await getPool();
        
        console.log("--- FIXING ACTIVITY STATUSES ---");
        const r = await pool.request().query(`
            UPDATE Activities 
            SET status = 'active' 
            WHERE status = 'approved'
        `);
        console.log(`Rows affected: ${r.rowsAffected}`);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

fix();
