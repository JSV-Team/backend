const { getPool } = require('../config/db');
const matchingService = require('../services/matchingService');
const MatchingEngine = require('../services/matchEngine');
const locationUtils = require('../utils/locationUtils');

async function runTest() {
  console.log('🧪 Starting Distance Matching Test...');
  
  const pool = getPool();
  
  try {
    // 0. Debug Schema
    console.log('\n--- 0. Debugging Schema ---');
    const schemaDebug = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'users'");
    console.log('Available columns in "users" table:', schemaDebug.rows.map(r => r.column_name).join(', '));
    
    // 1. Setup Test Users
    
    const now = new Date().toISOString();
    
    // Hanoi User (User A)
    const userA = {
      user_id: 9991,
      userId: 9991, // Support both for safety
      dob: '1990-01-01',
      latitude: 21.0285,
      longitude: 105.8542,
      location: 'Hà Nội',
      joinedAt: now,
      username: 'TestUserA (Hanoi)'
    };
    
    // Nearby Hanoi User (User B - 5km away)
    const userB = {
      user_id: 9992,
      userId: 9992,
      dob: '1992-05-15',
      latitude: 21.0500, // Slightly north
      longitude: 105.8800, // Slightly east
      location: 'Hà Nội',
      joinedAt: now,
      username: 'TestUserB (Hanoi Nearby)'
    };
    
    // HCMC User (User C - ~1100km away)
    const userC = {
      user_id: 9993,
      userId: 9993,
      dob: '1988-10-20',
      latitude: 10.7626,
      longitude: 106.6602,
      location: 'Hồ Chí Minh',
      joinedAt: now,
      username: 'TestUserC (HCMC)'
    };
    
    console.log(`User A: ${userA.username} at (${userA.latitude}, ${userA.longitude})`);
    console.log(`User B: ${userB.username} at (${userB.latitude}, ${userB.longitude})`);
    console.log(`User C: ${userC.username} at (${userC.latitude}, ${userC.longitude})`);
    
    // 2. Test Distance Calculation
    console.log('\n--- 2. Testing Distance Calculation ---');
    const distAB = locationUtils.calculateDistance(userA.latitude, userA.longitude, userB.latitude, userB.longitude);
    const distAC = locationUtils.calculateDistance(userA.latitude, userA.longitude, userC.latitude, userC.longitude);
    
    console.log(`Distance A-B: ${distAB.toFixed(2)} km`);
    console.log(`Distance A-C: ${distAC.toFixed(2)} km`);
    
    console.log('\n--- 3. Testing Match Scores ---');
    
    // Instantiate engine
    const engine = new MatchingEngine({ minScoreThreshold: 0 });
    
    console.log('\n>>> Match A <-> B (Nearby) <<<');
    const scoreAB = await engine.calculateMatchScore(userA, userB);
    console.log(`    Distance: ${scoreAB.breakdown.distance.km} km, Score: ${scoreAB.breakdown.distance.score}`);
    console.log(`    Interest Score: ${scoreAB.interestScore}`);
    console.log(`    Numerology Score: ${scoreAB.numerologyScore}`);
    console.log(`    Total: ${scoreAB.score}`);
    
    console.log('\n>>> Match A <-> C (Distant) <<<');
    const scoreAC = await engine.calculateMatchScore(userA, userC);
    console.log(`    Distance: ${scoreAC.breakdown.distance.km} km, Score: ${scoreAC.breakdown.distance.score}`);
    console.log(`    Interest Score: ${scoreAC.interestScore}`);
    console.log(`    Numerology Score: ${scoreAC.numerologyScore}`);
    console.log(`    Total: ${scoreAC.score}`);
    
    console.log('\n--- 4. Summary Results ---');
    console.log(`A-B Total Score: ${scoreAB.score}`);
    console.log(`A-C Total Score: ${scoreAC.score}`);
    
    if (scoreAB.score > scoreAC.score) {
      console.log('\n✅ SUCCESS: Nearby user has a higher score!');
    } else {
      console.log('\n❌ FAILURE: Distant user has a higher score? Check weights.');
    }

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    process.exit(0);
  }
}

runTest();
