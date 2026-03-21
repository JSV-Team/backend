const { getPool } = require('./src/config/db');
require('dotenv').config();

async function seed() {
    const pool = await getPool();
    // User 22 interests: '─Éß╗ìc s├ích' (1), 'Leo n├║i' (2), '├ém nhß║íc' (3)
    // Actually using IDs: 1 (─Éß╗ìc s├ích), 2 (Leo n├║i), 3 (├ém nhß║íc)
    try {
        await pool.query(`
            INSERT INTO user_interests (user_id, interest_id) 
            VALUES (22, 1), (22, 2), (22, 3)
            ON CONFLICT DO NOTHING
        `);
        console.log('Seed interests for User 22 successful.');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
seed();
