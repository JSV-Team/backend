const { getPool } = require('./src/config/db');
require('dotenv').config();

async function test() {
    const pool = await getPool();
    const userId = 3;
    const query = `
        WITH combined_posts AS (
            SELECT 
                a.activity_id AS post_id, a.creator_id AS creator_id, 
                a.title AS content, a.description AS extra_content, a.location, 
                a.duration_minutes, a.max_participants, a.created_at,
                (SELECT image_url FROM activity_images WHERE activity_id = a.activity_id LIMIT 1) AS image_url,
                'activity' AS post_type
            FROM activities a
            WHERE a.creator_id = $1 AND a.status = 'active'
            
            UNION ALL
            
            SELECT 
                s.status_id AS post_id, s.user_id AS creator_id, 
                s.content, '' AS extra_content, '' AS location, 
                NULL AS duration_minutes, NULL AS max_participants, s.created_at,
                s.image_url,
                'status' AS post_type
            FROM daily_status s
            WHERE s.user_id = $1
        )
        SELECT 
            cp.post_id, cp.creator_id, cp.content, cp.extra_content, cp.location, 
            cp.duration_minutes, cp.max_participants, cp.created_at, cp.image_url, cp.post_type,
            u.full_name, u.avatar_url,
            (SELECT COUNT(*) FROM post_reactions pr WHERE pr.post_id = cp.post_id) AS reactions_count,
            (SELECT COUNT(*) FROM post_comments  pc WHERE pc.post_id = cp.post_id) AS comments_count,
            (SELECT COUNT(*) FROM post_shares    ps WHERE ps.post_id = cp.post_id) AS shares_count
        FROM combined_posts cp
        JOIN users u ON u.user_id = cp.creator_id
        ORDER BY cp.created_at DESC
    `;
    try {
        const res = await pool.query(query, [userId]);
        console.log('Success! Rows:', res.rows.length);
    } catch (err) {
        console.error('SQL Error:', err.message);
        if (err.hint) console.error('Hint:', err.hint);
        if (err.position) console.error('Position:', err.position);
    }
    process.exit(0);
}

test();
