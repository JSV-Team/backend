/**
 * Quick script to check users in database
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

async function checkUsers() {
  try {
    console.log('🔍 Checking users in database...\n');

    // Get all users with their interests and location
    const result = await pool.query(`
      SELECT 
        u.user_id,
        u.username,
        u.location,
        u.dob,
        u.status,
        COALESCE(
          json_agg(
            json_build_object('interest_id', ui.interest_id, 'name', i.name)
          ) FILTER (WHERE ui.interest_id IS NOT NULL),
          '[]'
        ) as interests
      FROM users u
      LEFT JOIN user_interests ui ON u.user_id = ui.user_id
      LEFT JOIN interests i ON ui.interest_id = i.interest_id
      WHERE u.status != 'banned'
      GROUP BY u.user_id
      ORDER BY u.user_id
    `);

    console.log(`📊 Total users: ${result.rows.length}\n`);

    result.rows.forEach(user => {
      console.log(`👤 User ${user.user_id}: ${user.username}`);
      console.log(`   Location: ${user.location || 'N/A'}`);
      console.log(`   DOB: ${user.dob || 'N/A'}`);
      console.log(`   Status: ${user.status}`);
      console.log(`   Interests: ${user.interests.length} interests`);
      if (user.interests.length > 0) {
        user.interests.forEach(int => {
          console.log(`      - ${int.name} (ID: ${int.interest_id})`);
        });
      }
      console.log('');
    });

    // Check match sessions
    const matchResult = await pool.query(`
      SELECT 
        ms.session_id,
        ms.user_one,
        ms.user_two,
        ms.status,
        ms.created_at,
        u1.username as user_one_name,
        u2.username as user_two_name
      FROM match_sessions ms
      JOIN users u1 ON ms.user_one = u1.user_id
      JOIN users u2 ON ms.user_two = u2.user_id
      WHERE ms.status = 'active'
      ORDER BY ms.created_at DESC
      LIMIT 10
    `);

    console.log(`\n📊 Active match sessions: ${matchResult.rows.length}\n`);
    matchResult.rows.forEach(match => {
      console.log(`🤝 Match ${match.session_id}:`);
      console.log(`   ${match.user_one_name} (${match.user_one}) <-> ${match.user_two_name} (${match.user_two})`);
      console.log(`   Created: ${match.created_at}`);
      console.log('');
    });

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

checkUsers();
