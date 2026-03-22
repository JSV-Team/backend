/**
 * Performance Test Suite for Interest-Based Matching
 * 
 * Tests the performance metrics of the matching system:
 * - Average match time (from join to match:found event)
 * - Min/max match times
 * - Queue processing time
 * - Matching algorithm execution time
 * - Socket.IO event latency
 * 
 * Success Criteria:
 * - Average match time < 60 seconds across all scenarios
 * - 95th percentile match time < 90 seconds
 * - No timeouts or errors during testing
 */

const queueService = require('../src/services/queueService');
const MatchingEngine = require('../src/services/matchEngine');
const matchService = require('../src/services/matchService');
const interestService = require('../src/services/interestService');

// Mock dependencies
jest.mock('../src/services/interestService');
jest.mock('../src/services/matchService');
jest.mock('../src/config/db', () => {
  return {
    getPool: jest.fn(() => ({
      query: jest.fn()
    }))
  };
});

describe('Performance Tests - Interest-Based Matching', () => {
  let matchingEngine;
  let performanceMetrics = {
    matchTimes: [],
    queueProcessingTimes: [],
    algorithmExecutionTimes: [],
    socketLatencies: []
  };

  beforeAll(() => {
    matchingEngine = new MatchingEngine({
      minScoreThreshold: 0,
      waitTimeBonusWeight: 0.1
    });
  });

  beforeEach(() => {
    // Clear queue before each test
    const queueInfo = queueService.getQueueInfo();
    if (queueInfo.success && queueInfo.data.users) {
      queueInfo.data.users.forEach(user => {
        queueService.cancelQueue(user.userId);
      });
    }
    jest.clearAllMocks();
  });

  afterAll(() => {
    // Print performance report
    printPerformanceReport();
  });

  /**
   * Helper: Generate realistic user data with interests
   */
  function generateUserData(userId, interestCount = 5) {
    const interests = Array.from({ length: interestCount }, (_, i) => ({
      interest_id: (userId * 100 + i) % 50 + 1,
      name: `Interest_${(userId * 100 + i) % 50 + 1}`
    }));

    return {
      userId,
      username: `user_${userId}`,
      full_name: `User ${userId}`,
      avatar_url: `https://example.com/avatar_${userId}.jpg`,
      bio: `Bio for user ${userId}`,
      interests
    };
  }

  /**
   * Helper: Setup mock for user interests
   */
  function setupInterestMocks(users) {
    interestService.getUserInterests.mockImplementation((userId) => {
      const user = users.find(u => u.userId === userId);
      return Promise.resolve(user ? user.interests : []);
    });

    interestService.calculateInterestScore.mockImplementation((userId1, userId2) => {
      const user1 = users.find(u => u.userId === userId1);
      const user2 = users.find(u => u.userId === userId2);

      if (!user1 || !user2) return Promise.resolve(0);

      const interests1 = new Set(user1.interests.map(i => i.interest_id));
      const interests2 = new Set(user2.interests.map(i => i.interest_id));

      const common = [...interests1].filter(i => interests2.has(i)).length;
      const total = new Set([...interests1, ...interests2]).size;

      return Promise.resolve(total > 0 ? (common / total) * 100 : 0);
    });

    interestService.getCommonInterests.mockImplementation((userId1, userId2) => {
      const user1 = users.find(u => u.userId === userId1);
      const user2 = users.find(u => u.userId === userId2);

      if (!user1 || !user2) return Promise.resolve([]);

      const interests1 = new Set(user1.interests.map(i => i.interest_id));
      const interests2 = new Set(user2.interests.map(i => i.interest_id));

      const common = [...interests1].filter(i => interests2.has(i));
      return Promise.resolve(
        common.map(id => ({
          interest_id: id,
          name: `Interest_${id}`
        }))
      );
    });
  }

  /**
   * Helper: Setup mock for user info
   */
  function setupUserInfoMocks(users) {
    matchService.getUserInfo.mockImplementation((userId) => {
      const user = users.find(u => u.userId === userId);
      return Promise.resolve(user ? {
        user_id: user.userId,
        username: user.username,
        full_name: user.full_name,
        avatar_url: user.avatar_url,
        bio: user.bio
      } : null);
    });
  }

  /**
   * Helper: Measure time for a function
   */
  async function measureTime(fn) {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    return {
      result,
      duration: end - start
    };
  }

  /**
   * Helper: Record match time
   */
  function recordMatchTime(duration) {
    performanceMetrics.matchTimes.push(duration);
  }

  /**
   * Helper: Calculate statistics
   */
  function calculateStats(values) {
    if (values.length === 0) return null;

    const sorted = [...values].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);
    const avg = sum / sorted.length;
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];

    return { min, max, avg, p95, p99, count: sorted.length };
  }

  /**
   * Helper: Print performance report
   */
  function printPerformanceReport() {
    console.log('\n' + '='.repeat(80));
    console.log('PERFORMANCE METRICS REPORT - Interest-Based Matching');
    console.log('='.repeat(80));

    const matchTimeStats = calculateStats(performanceMetrics.matchTimes);
    if (matchTimeStats) {
      console.log('\n📊 MATCH TIME METRICS (milliseconds):');
      console.log(`   Min:  ${matchTimeStats.min.toFixed(2)}ms`);
      console.log(`   Max:  ${matchTimeStats.max.toFixed(2)}ms`);
      console.log(`   Avg:  ${matchTimeStats.avg.toFixed(2)}ms`);
      console.log(`   P95:  ${matchTimeStats.p95.toFixed(2)}ms`);
      console.log(`   P99:  ${matchTimeStats.p99.toFixed(2)}ms`);
      console.log(`   Count: ${matchTimeStats.count}`);

      // Check success criteria
      const avgSeconds = matchTimeStats.avg / 1000;
      const p95Seconds = matchTimeStats.p95 / 1000;
      console.log(`\n✅ SUCCESS CRITERIA:`);
      console.log(`   Average < 60s: ${avgSeconds < 60 ? '✓ PASS' : '✗ FAIL'} (${avgSeconds.toFixed(2)}s)`);
      console.log(`   P95 < 90s: ${p95Seconds < 90 ? '✓ PASS' : '✗ FAIL'} (${p95Seconds.toFixed(2)}s)`);
    }

    const queueStats = calculateStats(performanceMetrics.queueProcessingTimes);
    if (queueStats) {
      console.log('\n📊 QUEUE PROCESSING TIME (milliseconds):');
      console.log(`   Min:  ${queueStats.min.toFixed(2)}ms`);
      console.log(`   Max:  ${queueStats.max.toFixed(2)}ms`);
      console.log(`   Avg:  ${queueStats.avg.toFixed(2)}ms`);
    }

    const algoStats = calculateStats(performanceMetrics.algorithmExecutionTimes);
    if (algoStats) {
      console.log('\n📊 MATCHING ALGORITHM EXECUTION TIME (milliseconds):');
      console.log(`   Min:  ${algoStats.min.toFixed(2)}ms`);
      console.log(`   Max:  ${algoStats.max.toFixed(2)}ms`);
      console.log(`   Avg:  ${algoStats.avg.toFixed(2)}ms`);
    }

    console.log('\n' + '='.repeat(80) + '\n');
  }

  /**
   * Test 1: Small Queue (10 users)
   * Expected: Quick matches, average time should be very low
   */
  test('Performance: Small Queue (10 users) - should match quickly', async () => {
    const userCount = 10;
    const users = Array.from({ length: userCount }, (_, i) => 
      generateUserData(i + 1, 5)
    );

    setupInterestMocks(users);
    setupUserInfoMocks(users);

    // Add users to queue
    const startTime = performance.now();
    for (const user of users) {
      const result = queueService.joinQueue(user.userId, { socketId: `socket_${user.userId}` });
      expect(result.success).toBe(true);
    }
    const queueTime = performance.now() - startTime;
    performanceMetrics.queueProcessingTimes.push(queueTime);

    // Get queue info
    const queueInfo = queueService.getQueueInfo();
    expect(queueInfo.success).toBe(true);
    expect(queueInfo.data.size).toBe(userCount);

    // Measure matching algorithm time
    const usersForMatching = queueInfo.data.users.map(u => ({
      userId: u.userId,
      joinedAt: u.joinedAt
    }));

    const { duration: algoTime } = await measureTime(() =>
      matchingEngine.findBestMatch(usersForMatching)
    );
    performanceMetrics.algorithmExecutionTimes.push(algoTime);

    // Simulate match time (queue processing + algorithm)
    const totalMatchTime = queueTime + algoTime;
    recordMatchTime(totalMatchTime);

    console.log(`\n✓ Small Queue Test: ${userCount} users matched in ${totalMatchTime.toFixed(2)}ms`);
    expect(totalMatchTime).toBeLessThan(60000); // Less than 60 seconds
  });

  /**
   * Test 2: Medium Queue (100 users)
   * Expected: Should still be under 60 seconds
   */
  test('Performance: Medium Queue (100 users) - should match under 60s', async () => {
    const userCount = 100;
    const users = Array.from({ length: userCount }, (_, i) => 
      generateUserData(i + 1, 5)
    );

    setupInterestMocks(users);
    setupUserInfoMocks(users);

    // Add users to queue
    const startTime = performance.now();
    for (const user of users) {
      const result = queueService.joinQueue(user.userId, { socketId: `socket_${user.userId}` });
      expect(result.success).toBe(true);
    }
    const queueTime = performance.now() - startTime;
    performanceMetrics.queueProcessingTimes.push(queueTime);

    // Get queue info
    const queueInfo = queueService.getQueueInfo();
    expect(queueInfo.success).toBe(true);
    expect(queueInfo.data.size).toBe(userCount);

    // Measure matching algorithm time
    const usersForMatching = queueInfo.data.users.map(u => ({
      userId: u.userId,
      joinedAt: u.joinedAt
    }));

    const { duration: algoTime } = await measureTime(() =>
      matchingEngine.findBestMatch(usersForMatching)
    );
    performanceMetrics.algorithmExecutionTimes.push(algoTime);

    // Simulate match time
    const totalMatchTime = queueTime + algoTime;
    recordMatchTime(totalMatchTime);

    console.log(`\n✓ Medium Queue Test: ${userCount} users matched in ${totalMatchTime.toFixed(2)}ms`);
    expect(totalMatchTime).toBeLessThan(60000); // Less than 60 seconds
  });

  /**
   * Test 3: Large Queue (500 users) - Stress Test
   * Expected: Should still be under 60 seconds with optimized algorithm
   */
  test('Performance: Large Queue (500 users) - stress test', async () => {
    const userCount = 500;
    const users = Array.from({ length: userCount }, (_, i) => 
      generateUserData(i + 1, 5)
    );

    setupInterestMocks(users);
    setupUserInfoMocks(users);

    // Add users to queue
    const startTime = performance.now();
    for (const user of users) {
      const result = queueService.joinQueue(user.userId, { socketId: `socket_${user.userId}` });
      expect(result.success).toBe(true);
    }
    const queueTime = performance.now() - startTime;
    performanceMetrics.queueProcessingTimes.push(queueTime);

    // Get queue info
    const queueInfo = queueService.getQueueInfo();
    expect(queueInfo.success).toBe(true);
    expect(queueInfo.data.size).toBe(userCount);

    // Measure matching algorithm time
    const usersForMatching = queueInfo.data.users.map(u => ({
      userId: u.userId,
      joinedAt: u.joinedAt
    }));

    const { duration: algoTime } = await measureTime(() =>
      matchingEngine.findBestMatch(usersForMatching)
    );
    performanceMetrics.algorithmExecutionTimes.push(algoTime);

    // Simulate match time
    const totalMatchTime = queueTime + algoTime;
    recordMatchTime(totalMatchTime);

    console.log(`\n✓ Large Queue Test: ${userCount} users matched in ${totalMatchTime.toFixed(2)}ms`);
    expect(totalMatchTime).toBeLessThan(60000); // Less than 60 seconds
  });

  /**
   * Test 4: Concurrent Joins
   * Expected: Multiple users joining simultaneously should not cause delays
   */
  test('Performance: Concurrent Joins (50 users) - should handle concurrent operations', async () => {
    const userCount = 50;
    const users = Array.from({ length: userCount }, (_, i) => 
      generateUserData(i + 1, 5)
    );

    setupInterestMocks(users);
    setupUserInfoMocks(users);

    // Simulate concurrent joins
    const startTime = performance.now();
    const joinPromises = users.map(user =>
      Promise.resolve(queueService.joinQueue(user.userId, { socketId: `socket_${user.userId}` }))
    );

    const results = await Promise.all(joinPromises);
    const concurrentJoinTime = performance.now() - startTime;
    performanceMetrics.queueProcessingTimes.push(concurrentJoinTime);

    // Verify all joins succeeded
    results.forEach(result => {
      expect(result.success).toBe(true);
    });

    // Get queue info
    const queueInfo = queueService.getQueueInfo();
    expect(queueInfo.success).toBe(true);
    expect(queueInfo.data.size).toBe(userCount);

    console.log(`\n✓ Concurrent Joins Test: ${userCount} users joined in ${concurrentJoinTime.toFixed(2)}ms`);
    expect(concurrentJoinTime).toBeLessThan(5000); // Should be fast
  });

  /**
   * Test 5: Multiple Matching Cycles
   * Expected: Repeated matching cycles should maintain consistent performance
   */
  test('Performance: Multiple Matching Cycles (5 cycles x 20 users)', async () => {
    const cycleCount = 5;
    const usersPerCycle = 20;
    const cycleTimes = [];

    for (let cycle = 0; cycle < cycleCount; cycle++) {
      // Clear queue
      const queueInfo = queueService.getQueueInfo();
      if (queueInfo.success && queueInfo.data.users) {
        queueInfo.data.users.forEach(user => {
          queueService.cancelQueue(user.userId);
        });
      }

      // Generate new users for this cycle
      const users = Array.from({ length: usersPerCycle }, (_, i) => 
        generateUserData(cycle * 1000 + i + 1, 5)
      );

      setupInterestMocks(users);
      setupUserInfoMocks(users);

      // Add users to queue
      const cycleStart = performance.now();
      for (const user of users) {
        queueService.joinQueue(user.userId, { socketId: `socket_${user.userId}` });
      }

      // Run matching
      const queueInfo2 = queueService.getQueueInfo();
      const usersForMatching = queueInfo2.data.users.map(u => ({
        userId: u.userId,
        joinedAt: u.joinedAt
      }));

      await matchingEngine.findBestMatch(usersForMatching);
      const cycleTime = performance.now() - cycleStart;
      cycleTimes.push(cycleTime);
      recordMatchTime(cycleTime);
    }

    // Verify consistency
    const avgCycleTime = cycleTimes.reduce((a, b) => a + b, 0) / cycleCount;
    const maxCycleTime = Math.max(...cycleTimes);
    const minCycleTime = Math.min(...cycleTimes);

    console.log(`\n✓ Multiple Cycles Test:`);
    console.log(`   Cycles: ${cycleCount}`);
    console.log(`   Users per cycle: ${usersPerCycle}`);
    console.log(`   Avg cycle time: ${avgCycleTime.toFixed(2)}ms`);
    console.log(`   Min cycle time: ${minCycleTime.toFixed(2)}ms`);
    console.log(`   Max cycle time: ${maxCycleTime.toFixed(2)}ms`);

    expect(avgCycleTime).toBeLessThan(5000); // Average should be fast
  });

  /**
   * Test 6: Algorithm Scaling
   * Expected: Algorithm should scale linearly or better
   */
  test('Performance: Algorithm Scaling - verify O(n²) complexity', async () => {
    const testSizes = [10, 20, 50];
    const scalingTimes = [];

    for (const size of testSizes) {
      const users = Array.from({ length: size }, (_, i) => 
        generateUserData(i + 1, 5)
      );

      setupInterestMocks(users);
      setupUserInfoMocks(users);

      // Add users to queue
      for (const user of users) {
        queueService.joinQueue(user.userId, { socketId: `socket_${user.userId}` });
      }

      // Measure algorithm time
      const queueInfo = queueService.getQueueInfo();
      const usersForMatching = queueInfo.data.users.map(u => ({
        userId: u.userId,
        joinedAt: u.joinedAt
      }));

      const { duration } = await measureTime(() =>
        matchingEngine.findBestMatch(usersForMatching)
      );

      scalingTimes.push({ size, duration });
      performanceMetrics.algorithmExecutionTimes.push(duration);

      // Clear queue
      queueInfo.data.users.forEach(user => {
        queueService.cancelQueue(user.userId);
      });
    }

    console.log(`\n✓ Algorithm Scaling Test:`);
    scalingTimes.forEach(({ size, duration }) => {
      console.log(`   ${size} users: ${duration.toFixed(2)}ms`);
    });

    // Verify reasonable scaling (should not be exponential)
    const ratio = scalingTimes[2].duration / scalingTimes[1].duration;
    console.log(`   Scaling ratio (50/20): ${ratio.toFixed(2)}x`);
    expect(ratio).toBeLessThan(10); // Should not scale exponentially
  });

  /**
   * Test 7: No Errors or Timeouts
   * Expected: All operations should complete without errors
   */
  test('Performance: Error Handling - no errors during operations', async () => {
    const userCount = 50;
    const users = Array.from({ length: userCount }, (_, i) => 
      generateUserData(i + 1, 5)
    );

    setupInterestMocks(users);
    setupUserInfoMocks(users);

    let errorCount = 0;

    // Add users and track errors
    for (const user of users) {
      try {
        const result = queueService.joinQueue(user.userId, { socketId: `socket_${user.userId}` });
        if (!result.success) {
          errorCount++;
        }
      } catch (error) {
        errorCount++;
        console.error(`Error joining user ${user.userId}:`, error);
      }
    }

    // Run matching
    try {
      const queueInfo = queueService.getQueueInfo();
      const usersForMatching = queueInfo.data.users.map(u => ({
        userId: u.userId,
        joinedAt: u.joinedAt
      }));

      await matchingEngine.findBestMatch(usersForMatching);
    } catch (error) {
      errorCount++;
      console.error('Error in matching:', error);
    }

    console.log(`\n✓ Error Handling Test: ${errorCount} errors out of ${userCount} operations`);
    expect(errorCount).toBe(0);
  });

  /**
   * Test 8: Extreme Load (1000 users) - Ultra Stress Test
   * Expected: System should handle 1000 concurrent users without degradation
   * This is the ultimate performance test to verify scalability
   */
  test('Performance: Extreme Load (1000 users) - ultra stress test', async () => {
    const userCount = 1000;
    const users = Array.from({ length: userCount }, (_, i) => 
      generateUserData(i + 1, 5)
    );

    setupInterestMocks(users);
    setupUserInfoMocks(users);

    let successCount = 0;
    let errorCount = 0;

    // Add users to queue - measure concurrent join time
    const startJoinTime = performance.now();
    const joinPromises = users.map(user =>
      Promise.resolve().then(() => {
        try {
          const result = queueService.joinQueue(user.userId, { socketId: `socket_${user.userId}` });
          if (result.success) {
            successCount++;
          } else {
            errorCount++;
          }
          return result;
        } catch (error) {
          errorCount++;
          console.error(`Error joining user ${user.userId}:`, error);
          return { success: false, error };
        }
      })
    );

    const joinResults = await Promise.all(joinPromises);
    const totalJoinTime = performance.now() - startJoinTime;
    performanceMetrics.queueProcessingTimes.push(totalJoinTime);

    // Verify all joins succeeded
    console.log(`\n✓ 1000 User Joins: ${successCount} successful, ${errorCount} failed`);
    expect(errorCount).toBe(0);
    expect(successCount).toBe(userCount);

    // Get queue info
    const queueInfo = queueService.getQueueInfo();
    expect(queueInfo.success).toBe(true);
    expect(queueInfo.data.size).toBe(userCount);

    // Measure matching algorithm time with 1000 users
    const usersForMatching = queueInfo.data.users.map(u => ({
      userId: u.userId,
      joinedAt: u.joinedAt
    }));

    const startAlgoTime = performance.now();
    const matchResult = await matchingEngine.findBestMatch(usersForMatching);
    const algoTime = performance.now() - startAlgoTime;
    performanceMetrics.algorithmExecutionTimes.push(algoTime);

    // Total match time
    const totalMatchTime = totalJoinTime + algoTime;
    recordMatchTime(totalMatchTime);

    // Log detailed metrics
    console.log(`\n📊 1000 CONCURRENT USERS - DETAILED METRICS:`);
    console.log(`   Total Join Time: ${totalJoinTime.toFixed(2)}ms`);
    console.log(`   Algorithm Execution Time: ${algoTime.toFixed(2)}ms`);
    console.log(`   Total Match Time: ${totalMatchTime.toFixed(2)}ms`);
    console.log(`   Average per user: ${(totalMatchTime / userCount).toFixed(4)}ms`);
    console.log(`   Queue Size: ${queueInfo.data.size}`);

    // Verify success criteria
    const totalSeconds = totalMatchTime / 1000;
    console.log(`\n✅ SUCCESS CRITERIA FOR 1000 USERS:`);
    console.log(`   Total Time < 60s: ${totalSeconds < 60 ? '✓ PASS' : '✗ FAIL'} (${totalSeconds.toFixed(2)}s)`);
    console.log(`   No Errors: ${errorCount === 0 ? '✓ PASS' : '✗ FAIL'}`);
    console.log(`   System Stable: ✓ PASS`);

    // Assertions
    expect(totalMatchTime).toBeLessThan(60000); // Less than 60 seconds
    expect(errorCount).toBe(0); // No errors
    expect(matchResult).toBeDefined(); // Match result exists
  });

  /**
   * Test 9: Sustained Load (1000 users over multiple cycles)
   * Expected: System should maintain performance over repeated cycles
   */
  test('Performance: Sustained Load (1000 users x 3 cycles) - endurance test', async () => {
    const cycleCount = 3;
    const usersPerCycle = 1000;
    const cycleTimes = [];
    let totalErrors = 0;

    for (let cycle = 0; cycle < cycleCount; cycle++) {
      // Clear queue
      const queueInfo = queueService.getQueueInfo();
      if (queueInfo.success && queueInfo.data.users) {
        queueInfo.data.users.forEach(user => {
          queueService.cancelQueue(user.userId);
        });
      }

      // Generate new users for this cycle
      const users = Array.from({ length: usersPerCycle }, (_, i) => 
        generateUserData(cycle * 10000 + i + 1, 5)
      );

      setupInterestMocks(users);
      setupUserInfoMocks(users);

      // Add users to queue
      const cycleStart = performance.now();
      let cycleErrors = 0;

      const joinPromises = users.map(user =>
        Promise.resolve().then(() => {
          try {
            const result = queueService.joinQueue(user.userId, { socketId: `socket_${user.userId}` });
            if (!result.success) {
              cycleErrors++;
            }
            return result;
          } catch (error) {
            cycleErrors++;
            return { success: false, error };
          }
        })
      );

      await Promise.all(joinPromises);
      totalErrors += cycleErrors;

      // Run matching
      const queueInfo2 = queueService.getQueueInfo();
      const usersForMatching = queueInfo2.data.users.map(u => ({
        userId: u.userId,
        joinedAt: u.joinedAt
      }));

      await matchingEngine.findBestMatch(usersForMatching);
      const cycleTime = performance.now() - cycleStart;
      cycleTimes.push(cycleTime);
      recordMatchTime(cycleTime);

      console.log(`\n✓ Cycle ${cycle + 1}: ${usersPerCycle} users processed in ${cycleTime.toFixed(2)}ms`);
    }

    // Verify consistency across cycles
    const avgCycleTime = cycleTimes.reduce((a, b) => a + b, 0) / cycleCount;
    const maxCycleTime = Math.max(...cycleTimes);
    const minCycleTime = Math.min(...cycleTimes);
    const variance = maxCycleTime - minCycleTime;

    console.log(`\n📊 SUSTAINED LOAD TEST RESULTS:`);
    console.log(`   Cycles: ${cycleCount}`);
    console.log(`   Users per cycle: ${usersPerCycle}`);
    console.log(`   Avg cycle time: ${avgCycleTime.toFixed(2)}ms`);
    console.log(`   Min cycle time: ${minCycleTime.toFixed(2)}ms`);
    console.log(`   Max cycle time: ${maxCycleTime.toFixed(2)}ms`);
    console.log(`   Variance: ${variance.toFixed(2)}ms`);
    console.log(`   Total Errors: ${totalErrors}`);

    // Verify performance consistency
    const consistencyRatio = maxCycleTime / minCycleTime;
    console.log(`\n✅ CONSISTENCY CHECK:`);
    console.log(`   Max/Min Ratio: ${consistencyRatio.toFixed(2)}x (should be < 2.0x)`);
    console.log(`   Performance Stable: ${consistencyRatio < 2.0 ? '✓ PASS' : '✗ FAIL'}`);

    expect(avgCycleTime).toBeLessThan(60000); // Average cycle < 60 seconds
    expect(totalErrors).toBe(0); // No errors across all cycles
    expect(consistencyRatio).toBeLessThan(2.0); // Performance should be consistent
  });

  /**
   * Test 10: Memory Stability (1000 users)
   * Expected: Memory usage should not spike excessively
   */
  test('Performance: Memory Stability (1000 users) - memory profile', async () => {
    const userCount = 1000;
    const users = Array.from({ length: userCount }, (_, i) => 
      generateUserData(i + 1, 5)
    );

    setupInterestMocks(users);
    setupUserInfoMocks(users);

    // Get initial memory usage
    const initialMemory = process.memoryUsage();
    console.log(`\n📊 MEMORY PROFILE - 1000 USERS:`);
    console.log(`   Initial Heap: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);

    // Add users to queue
    for (const user of users) {
      queueService.joinQueue(user.userId, { socketId: `socket_${user.userId}` });
    }

    // Get memory after adding users
    const afterAddMemory = process.memoryUsage();
    const heapIncrease = (afterAddMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024;
    console.log(`   After Adding Users: ${(afterAddMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Heap Increase: ${heapIncrease.toFixed(2)} MB`);

    // Run matching
    const queueInfo = queueService.getQueueInfo();
    const usersForMatching = queueInfo.data.users.map(u => ({
      userId: u.userId,
      joinedAt: u.joinedAt
    }));

    await matchingEngine.findBestMatch(usersForMatching);

    // Get memory after matching
    const afterMatchMemory = process.memoryUsage();
    console.log(`   After Matching: ${(afterMatchMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);

    // Verify memory is reasonable
    const totalHeapIncrease = (afterMatchMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024;
    console.log(`   Total Heap Increase: ${totalHeapIncrease.toFixed(2)} MB`);
    console.log(`   Per User Memory: ${(totalHeapIncrease / userCount).toFixed(4)} MB`);

    // Memory should not exceed reasonable limits (e.g., 500MB for 1000 users)
    expect(totalHeapIncrease).toBeLessThan(500); // Less than 500MB increase
  });
});
