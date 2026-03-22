const { getPool, connectDB } = require('./db');

async function migrate_real() {
    try {
        await connectDB();
        const pool = getPool();
        
        // Let's get actual user IDs from the DB
        const userRes = await pool.query("SELECT user_id FROM users LIMIT 10");
        const realUserIds = userRes.rows.map(u => u.user_id);
        
        if (realUserIds.length === 0) {
            console.log("No users in DB to seed interests for!");
            process.exit(0);
        }

        const interests = [
            { name: 'Phượt', base: 5 },
            { name: 'Leo núi', base: 4 },
            { name: 'Nấu ăn', base: 10 },
            { name: 'Nhiếp ảnh', base: 8 },
            { name: 'Lập trình', base: 15 },
            { name: 'Thể thao', base: 12 },
        ];
        
        for (const item of interests) {
            const insRes = await pool.query(`
                INSERT INTO interests (name) VALUES ($1) 
                ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name 
                RETURNING interest_id
            `, [item.name]);
            const iid = insRes.rows[0].interest_id;
            
            // Assign to some real users
            const sampleSize = Math.floor(Math.random() * (realUserIds.length / 2)) + 1;
            const chosen = realUserIds.sort(() => 0.5 - Math.random()).slice(0, sampleSize);
            
            for (const uid of chosen) {
                const daysAgo = Math.floor(Math.random() * 30);
                await pool.query(`
                    INSERT INTO user_interests (user_id, interest_id, created_at) 
                    VALUES ($1, $2, NOW() - ($3 * INTERVAL '1 day'))
                    ON CONFLICT (user_id, interest_id) DO NOTHING
                `, [uid, iid, daysAgo]);
            }
        }

        console.log('Seeded interests for actual users in DB!');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
migrate_real();
