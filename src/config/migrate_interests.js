const { getPool, connectDB } = require('./db');

async function migrate() {
    try {
        await connectDB();
        const pool = getPool();
        console.log('Connected to PostgreSQL Database');

        // 1. Add created_at column if not exists
        console.log('Adding created_at column to user_interests...');
        await pool.query(`
            ALTER TABLE user_interests ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
        `);
        console.log('Column added successfully.');

        // 2. Clear old interests data to start fresh (optional, but good for demo)
        // await pool.query("DELETE FROM user_interests");

        // 3. Seed some data for the "Emerging" ranking
        console.log('Seeding user interests data...');
        // IDs for testing users (assuming they exist from previous conversations or system seed)
        const commonUsers = [2, 3, 4, 5, 6, 7, 8, 9, 10];
        
        const interests = [
            { name: 'Coding', baseFreq: 8, recency: 2 },
            { name: 'Hiking', baseFreq: 5, recency: 10 },
            { name: 'Music', baseFreq: 12, recency: 5 },
            { name: 'Coffee', baseFreq: 6, recency: 15 },
            { name: 'Gaming', baseFreq: 10, recency: 20 },
            { name: 'Photography', baseFreq: 4, recency: 3 },
            { name: 'Reading', baseFreq: 7, recency: 1 },
            { name: 'Yoga', baseFreq: 3, recency: 25 },
        ];
        
        for (const item of interests) {
            const insRes = await pool.query(`
                INSERT INTO interests (name) VALUES ($1) 
                ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name 
                RETURNING interest_id
            `, [item.name]);
            const iid = insRes.rows[0].interest_id;
            
            // Assign to some random users with varying timestamps
            const sampleSize = Math.min(commonUsers.length, Math.floor(Math.random() * 5) + 3);
            const selectedUsers = commonUsers.sort(() => 0.5 - Math.random()).slice(0, sampleSize);
            
            for (const uid of selectedUsers) {
                // Determine a created_at: based on 'recency' weight
                const daysAgo = Math.floor(Math.random() * 30); // 0 to 29 days ago
                await pool.query(`
                    INSERT INTO user_interests (user_id, interest_id, created_at) 
                    VALUES ($1, $2, NOW() - ($3 * INTERVAL '1 day'))
                    ON CONFLICT (user_id, interest_id) DO NOTHING
                `, [uid, iid, daysAgo]);
            }
        }

        console.log('Migration and seeding completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Error in migration:', err);
        process.exit(1);
    }
}

migrate();
