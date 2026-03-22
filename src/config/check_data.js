const { getPool, connectDB } = require('./db');

async function check() {
    try {
        await connectDB();
        const pool = getPool();
        const users = await pool.query("SELECT COUNT(*) FROM users");
        const ui = await pool.query("SELECT COUNT(*) FROM user_interests");
        console.log("Total Users:", users.rows[0].count);
        console.log("Total User Interests Entries:", ui.rows[0].count);
        
        const sample = await pool.query(`
            SELECT u.full_name, i.name 
            FROM user_interests ui 
            JOIN users u ON u.user_id = ui.user_id 
            JOIN interests i ON i.interest_id = ui.interest_id 
            LIMIT 5
        `);
        console.log("Sample Joins:", JSON.stringify(sample.rows, null, 2));
        
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
