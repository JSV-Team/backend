// Setup matching test data
const { connectDB, getPool } = require('./src/config/db');

async function setup() {
    await connectDB();
    const pool = getPool();

    // minhkhoa98 (user 2) has interests: Leo núi(1), Nhiếp ảnh(2), Du lịch(10)
    // ducpham_hn (user 6) has the SAME interests: Leo núi(1), Nhiếp ảnh(2), Du lịch(10) — perfect match!
    // camtu_hcm (user 10) has: Nhiếp ảnh(2), Du lịch(10), Ẩm thực(11) — 2 shared interests
    // thuyhang_dn (user 3) has: Nấu ăn(3), Du lịch(10), Ẩm thực(11) — 1 shared interest

    // Enable matching for these users
    await pool.request().query(`
        UPDATE Users SET is_matching_enabled = 1 
        WHERE user_id IN (3, 6, 10)
    `);
    console.log('[OK] Enabled matching for users 3, 6, 10');

    // Also end ALL other active MatchSessions to get a clean state
    await pool.request().query(`
        UPDATE MatchSessions SET status = 'ended' WHERE status = 'active'
    `);
    console.log('[OK] Ended all active match sessions');

    // Verify
    const enabled = await pool.request().query(`
        SELECT u.user_id, u.username, u.full_name, u.is_matching_enabled,
               STRING_AGG(i.name, ', ') as interests
        FROM Users u
        LEFT JOIN UserInterests ui ON u.user_id = ui.user_id
        LEFT JOIN Interests i ON ui.interest_id = i.interest_id
        WHERE u.is_matching_enabled = 1
        GROUP BY u.user_id, u.username, u.full_name, u.is_matching_enabled
    `);
    console.log('\n=== Users with Matching Enabled ===');
    enabled.recordset.forEach(u => {
        console.log(`  ${u.username} (${u.full_name}) — Interests: ${u.interests || 'none'}`);
    });

    // Check active match sessions
    const active = await pool.request().query(`
        SELECT * FROM MatchSessions WHERE status = 'active'
    `);
    console.log('\n=== Active Match Sessions ===', active.recordset.length, 'sessions');

    process.exit(0);
}

setup();
