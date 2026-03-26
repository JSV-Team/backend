/**
 * Test script để verify logic matching mới
 * Chạy: node test_matching_logic.js
 */

const { getPool } = require('./src/config/db');

async function testMatchingLogic() {
  console.log('🧪 Testing Matching Logic\n');
  
  try {
    const pool = getPool();
    
    // Test data
    const userIds = [18, 19, 21];
    
    // Bước 1: Lấy thông tin users
    console.log('📋 Step 1: Get users info');
    const usersInfoQuery = await pool.query(
      'SELECT user_id, username, location, dob FROM users WHERE user_id = ANY($1)',
      [userIds]
    );
    
    console.log('Users:');
    usersInfoQuery.rows.forEach(u => {
      console.log(`  - User ${u.user_id} (${u.username}): location="${u.location}"`);
    });
    
    // Bước 2: Lấy existing matches
    console.log('\n📋 Step 2: Get existing matches');
    const existingMatchesQuery = await pool.query(`
      SELECT user_one, user_two 
      FROM match_sessions 
      WHERE (user_one = ANY($1) OR user_two = ANY($1))
        AND status = 'active'
    `, [userIds]);
    
    const alreadyMatchedPairs = new Set();
    existingMatchesQuery.rows.forEach(row => {
      const pair1 = `${row.user_one}-${row.user_two}`;
      const pair2 = `${row.user_two}-${row.user_one}`;
      alreadyMatchedPairs.add(pair1);
      alreadyMatchedPairs.add(pair2);
      console.log(`  - User ${row.user_one} <-> User ${row.user_two} (already matched)`);
    });
    
    // Bước 3: Normalize location
    console.log('\n📋 Step 3: Normalize locations');
    const normalizeLocation = (location) => {
      if (!location) return null;
      return location.trim().toLowerCase().replace(/\s+/g, ' ');
    };
    
    const usersWithNormalizedLocation = usersInfoQuery.rows.map(u => ({
      userId: u.user_id,
      username: u.username,
      location: normalizeLocation(u.location),
      originalLocation: u.location
    }));
    
    usersWithNormalizedLocation.forEach(u => {
      console.log(`  - User ${u.userId}: "${u.originalLocation}" → "${u.location}"`);
    });
    
    // Bước 4: Nhóm theo location
    console.log('\n📋 Step 4: Group by location');
    const locationGroups = new Map();
    usersWithNormalizedLocation.forEach(user => {
      if (!user.location) {
        console.log(`  ⚠️  User ${user.userId} has no location - skipping`);
        return;
      }
      
      if (!locationGroups.has(user.location)) {
        locationGroups.set(user.location, []);
      }
      locationGroups.get(user.location).push(user);
    });
    
    console.log('Location groups:');
    locationGroups.forEach((groupUsers, location) => {
      console.log(`  - "${location}": ${groupUsers.length} users - [${groupUsers.map(u => u.userId).join(', ')}]`);
    });
    
    // Bước 5: Tìm valid pairs
    console.log('\n📋 Step 5: Find valid pairs (same location + not matched)');
    const hasAlreadyMatched = (userId1, userId2) => {
      const pair = `${userId1}-${userId2}`;
      return alreadyMatchedPairs.has(pair);
    };
    
    let totalValidPairs = 0;
    for (const [location, groupUsers] of locationGroups.entries()) {
      if (groupUsers.length < 2) {
        console.log(`  ⏭️  Skipping "${location}" - only ${groupUsers.length} user(s)`);
        continue;
      }
      
      console.log(`  📍 Location "${location}":`);
      const validPairs = [];
      
      for (let i = 0; i < groupUsers.length; i++) {
        for (let j = i + 1; j < groupUsers.length; j++) {
          const user1 = groupUsers[i];
          const user2 = groupUsers[j];
          
          if (hasAlreadyMatched(user1.userId, user2.userId)) {
            console.log(`     🚫 User ${user1.userId} <-> User ${user2.userId} (already matched)`);
          } else {
            console.log(`     ✅ User ${user1.userId} <-> User ${user2.userId} (valid pair)`);
            validPairs.push([user1, user2]);
          }
        }
      }
      
      totalValidPairs += validPairs.length;
      console.log(`     → ${validPairs.length} valid pair(s) in this location`);
    }
    
    // Kết luận
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY:');
    console.log(`  - Total users: ${userIds.length}`);
    console.log(`  - Location groups: ${locationGroups.size}`);
    console.log(`  - Already matched pairs: ${existingMatchesQuery.rows.length}`);
    console.log(`  - Valid pairs to match: ${totalValidPairs}`);
    console.log('='.repeat(60));
    
    if (totalValidPairs === 0) {
      console.log('\n❌ NO VALID PAIRS - Matching should NOT happen');
      console.log('Reasons:');
      console.log('  1. All users in different locations, OR');
      console.log('  2. All pairs already matched');
    } else {
      console.log(`\n✅ ${totalValidPairs} VALID PAIR(S) - Matching can happen`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testMatchingLogic();
