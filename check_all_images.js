const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

async function checkImages() {
    try {
        console.log('--- Activity Images ---');
        const actImgs = await pool.query('SELECT * FROM activity_images LIMIT 10');
        console.log(JSON.stringify(actImgs.rows, null, 2));
        
        console.log('--- Daily Status Images ---');
        const statusImgs = await pool.query('SELECT status_id, user_id, image_url FROM daily_status WHERE image_url IS NOT NULL LIMIT 10');
        console.log(JSON.stringify(statusImgs.rows, null, 2));
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkImages();
