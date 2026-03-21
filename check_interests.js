const { getPool } = require('./src/config/db');
require('dotenv').config();

async function check() {
    const pool = await getPool();
    const r = await pool.query(`
        SELECT u.user_id, u.username, 
               ARRAY_AGG(i.name) as interest_names
        FROM users u
        LEFT JOIN user_interests ui ON u.user_id = ui.user_id
        LEFT JOIN interests i ON i.interest_id = ui.interest_id
        GROUP BY u.user_id, u.username
        ORDER BY u.user_id
    `);
    console.log(JSON.stringify(r.rows, null, 2));
    process.exit(0);
}
check();
