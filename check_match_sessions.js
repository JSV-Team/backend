/**
 * Check match sessions in database
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

async function checkMatchSessions() {
  try {
    console.log('🔍 Checking match sessions in database...\n');

    // Get all active match sessions
    const result = await pool.query(`
      SELECT 
        ms.match_id,
        ms.user_one,
        ms.user_two,
        ms.match_type,
        ms.status,
        ms.created_at,
        u1.username as user_one_name,
        u2.username as user_two_name
      FROM match_sessions ms
      LEFT JOIN users u1 ON ms.user_one = u1.user_id
      LEFT JOIN users u2 ON ms.user_two = u2.user_id
      ORDER BY ms.created_at DESC
      LIMIT 20
    `);

    console.log(`📊 Total match sessions: ${result.rows.length}\n`);

    if (result.rows.length === 0) {
      console.log('❌ No match sessions found in database!');
      console.log('\n💡 To create match sessions:');
      console.log('   1. Open 2 browser windows');
      console.log('   2. Login with 2 different users (same location)');
      console.log('   3. Both click "Tìm Người Ghép Đôi"');
      console.log('   4. Wait 2-3 seconds for matching engine');
      console.log('   5. Match will be created automatically\n');
    } else {
      result.rows.forEach((match, idx) => {
        console.log(`${idx + 1}. Match ${match.match_id}:`);
        console.log(`   User One: ${match.user_one_name} (ID: ${match.user_one})`);
        console.log(`   User Two: ${match.user_two_name} (ID: ${match.user_two})`);
        console.log(`   Type: ${match.match_type}`);
        console.log(`   Status: ${match.status}`);
        console.log(`   Created: ${match.created_at}`);
        console.log('');
      });

      // Check for specific user
      console.log('\n🔍 Enter a user ID to see their match history:');
      console.log('   Example: node check_match_sessions.js 22\n');
      
      const userId = process.argv[2];
      if (userId) {
        console.log(`\n📋 Match history for user ${userId}:\n`);
        
        const userMatches = await pool.query(`
          SELECT 
            ms.match_id,
            ms.user_one,
            ms.user_two,
            ms.status,
            ms.created_at,
            CASE 
              WHEN ms.user_one = $1 THEN u2.username
              ELSE u1.username
            END AS matched_with,
            CASE 
              WHEN ms.user_one = $1 THEN u2.user_id
              ELSE u1.user_id
            END AS matched_user_id
          FROM match_sessions ms
          LEFT JOIN users u1 ON ms.user_one = u1.user_id
          LEFT JOIN users u2 ON ms.user_two = u2.user_id
          WHERE (ms.user_one = $1 OR ms.user_two = $1)
            AND ms.status = 'active'
          ORDER BY ms.created_at DESC
        `, [userId]);

        if (userMatches.rows.length === 0) {
          console.log(`   ❌ No matches found for user ${userId}`);
        } else {
          console.log(`   ✅ Found ${userMatches.rows.length} match(es):\n`);
          userMatches.rows.forEach((match, idx) => {
            console.log(`   ${idx + 1}. Matched with: ${match.matched_with} (ID: ${match.matched_user_id})`);
            console.log(`      Match ID: ${match.match_id}`);
            console.log(`      Status: ${match.status}`);
            console.log(`      Created: ${match.created_at}`);
            console.log('');
          });
        }
      }
    }

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

checkMatchSessions();
