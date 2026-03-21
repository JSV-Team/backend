const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

async function fixImages() {
    try {
        console.log('--- Fixing User Avatars ---');
        // Update users with cdn.sothich.vn avatar_url
        await pool.query(`
            UPDATE users 
            SET avatar_url = 'https://i.pravatar.cc/150?u=' || user_id
            WHERE avatar_url LIKE '%cdn.sothich.vn%'
        `);
        console.log('Fixed users.');

        console.log('--- Fixing Activity Images ---');
        // Update activity_images
        await pool.query(`
            UPDATE activity_images 
            SET image_url = 'https://picsum.photos/seed/act' || activity_id || '_' || image_id || '/800/600'
            WHERE image_url LIKE '%cdn.sothich.vn%'
        `);
        console.log('Fixed activity_images.');

        console.log('--- Fixing Daily Status Images ---');
        // Update daily_status
        await pool.query(`
            UPDATE daily_status 
            SET image_url = 'https://picsum.photos/seed/status' || status_id || '/800/600'
            WHERE image_url LIKE '%cdn.sothich.vn%'
        `);
        console.log('Fixed daily_status.');

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

fixImages();
