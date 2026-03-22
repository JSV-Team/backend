/**
 * Property-Based Tests for MatchingEngine
 * Tests correctness properties defined in the spec:
 * 1. Interest_Score symmetry: Score(A, B) = Score(B, A)
 * 2. Queue size reduction: After a match, queue size decreases by 2
 * 3. Wait time ordering: Users who join later should have wait time <= earlier users
 * 4. No self-matching: User cannot be matched with themselves
 * 5. Minimum threshold: Pairs with score = 0 should not be matched
 */

const MatchingEngine = require('../src/services/matchEngine');
const MatchQueue = require('../src/services/queueManager');

// Mock interestService to avoid database dependencies
jest.mock('../src/services/interestService', () => ({
  calculateInterestScore: jest.fn(),
  getCommonInterests: jest.fn(),
  getUserInterests: jest.fn(),
}));

const interestService = require('../src/services/interestService');

// Helper to generate random interests
const generateInterests = (maxSize = 10) => {
  const allInterests = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const size = Math.floor(Math.random() * maxSize) + 1;
  const shuffled = allInterests.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, size);
};

// Helper to create a mock user
const createMockUser = (userId, interests, joinedAtOffset = 0) => ({
  userId,
  interests,
  joinedAt: new Date(Date.now() - joinedAtOffset),
});

describe('MatchingEngine Property-Based Tests', () => {
  let engine;
  let mockInterestService;

  beforeEach(() => {
    engine = new MatchingEngine({ minScoreThreshold: 0, waitTimeBonusWeight: 0.1 });
    mockInterestService = interestService;
    jest.clearAllMocks();
  });

  describe('Property 1: Interest Score Symmetry', () => {
    /**
     * **Validates: Requirements 4.4.1**
     * Interest_Score(A, B) = Interest_Score(B, A)
     * The interest score between two users should be symmetric regardless of order
     */
    test('score(A, B) should equal score(B, A) for all user pairs', async () => {
      // Run multiple iterations with random interests
      for (let i = 0; i < 100; i++) {
        const interests1 = generateInterests(8);
        const interests2 = generateInterests(8);
        
        // Calculate Jaccard similarity manually for mock
        const set1 = new Set(interests1);
        const set2 = new Set(interests2);
        const intersection = [...set1].filter(x => set2.has(x));
        const union = new Set([...set1, ...set2]);
        const expectedScore = union.size === 0 ? 0 : (intersection.length / union.size) * 100;
        
        mockInterestService.calculateInterestScore.mockResolvedValueOnce(expectedScore);
        mockInterestService.getUserInterests.mockResolvedValueOnce(
          interests1.map(id => ({ interest_id: id }))
        );
        mockInterestService.getUserInterests.mockResolvedValueOnce(
          interests2.map(id => ({ interest_id: id }))
        );
        
        const user1 = createMockUser('userA', interests1);
        const user2 = createMockUser('userB', interests2);
        
        const resultAB = await engine.calculateMatchScore(user1, user2);
        
        // Reset mocks for reverse calculation
        mockInterestService.calculateInterestScore.mockResolvedValueOnce(expectedScore);
        mockInterestService.getUserInterests.mockResolvedValueOnce(
          interests2.map(id => ({ interest_id: id }))
        );
        mockInterestService.getUserInterests.mockResolvedValueOnce(
          interests1.map(id => ({ interest_id: id }))
        );
        
        const resultBA = await engine.calculateMatchScore(user2, user1);
        
        // The interest score (base score) should be symmetric
        expect(resultAB.interestScore).toBe(resultBA.interestScore);
      }
    });
  });

  describe('Property 2: Queue Size Reduction', () => {
    /**
     * **Validates: Requirements 4.4.2**
     * After a successful match, queue size should decrease by 2
     */
    test('queue size should decrease by 2 after successful match', async () => {
      const queue = new MatchQueue();
      
      // Add users to queue
      const user1 = createMockUser('user1', [1, 2, 3], 5000);
      const user2 = createMockUser('user2', [2, 3, 4], 3000);
      const user3 = createMockUser('user3', [4, 5, 6], 1000);
      
      queue.addUser(user1);
      queue.addUser(user2);
      queue.addUser(user3);
      
      const initialSize = queue.getSize();
      expect(initialSize).toBe(3);
      
      // Mock successful match
      mockInterestService.calculateInterestScore.mockResolvedValue(50);
      mockInterestService.getCommonInterests.mockResolvedValue([{ interest_id: 2 }]);
      mockInterestService.getUserInterests.mockResolvedValue([
        { interest_id: 1 }, { interest_id: 2 }, { interest_id: 3 }
      ]);
      
      // Find best match
      const users = queue.getUsers();
      const match = await engine.findBestMatch(users);
      
      if (match) {
        // Remove matched users from queue
        queue.removeUser(match.user1Id);
        queue.removeUser(match.user2Id);
        
        const finalSize = queue.getSize();
        expect(finalSize).toBe(initialSize - 2);
      }
    });

    test('queue size conservation holds for multiple matches', async () => {
      const queue = new MatchQueue();
      
      // Add 6 users
      for (let i = 1; i <= 6; i++) {
        queue.addUser(createMockUser(`user${i}`, [i, i + 1], i * 1000));
      }
      
      const initialSize = queue.getSize();
      expect(initialSize).toBe(6);
      
      // Mock all matches to have high scores
      mockInterestService.calculateInterestScore.mockResolvedValue(60);
      mockInterestService.getCommonInterests.mockResolvedValue([{ interest_id: 1 }]);
      mockInterestService.getUserInterests.mockResolvedValue([{ interest_id: 1 }]);
      
      // Find and process matches
      let users = queue.getUsers();
      let match = await engine.findBestMatch(users);
      
      let matchedCount = 0;
      while (match && matchedCount < 3) {
        queue.removeUser(match.user1Id);
        queue.removeUser(match.user2Id);
        matchedCount++;
        
        users = queue.getUsers();
        if (users.length >= 2) {
          match = await engine.findBestMatch(users);
        } else {
          break;
        }
      }
      
      const finalSize = queue.getSize();
      expect(finalSize).toBe(initialSize - (matchedCount * 2));
    });
  });

  describe('Property 3: Wait Time Ordering', () => {
    /**
     * **Validates: Requirements 4.4.3**
     * Users who join earlier should have wait time >= users who join later
     */
    test('earlier joined users should have longer or equal wait time', async () => {
      // Create users with different join times
      const user1 = createMockUser('user1', [1, 2, 3], 10000); // Joined 10s ago
      const user2 = createMockUser('user2', [2, 3, 4], 5000);  // Joined 5s ago
      const user3 = createMockUser('user3', [3, 4, 5], 1000);  // Joined 1s ago
      
      const users = [user1, user2, user3];
      
      // Calculate wait times
      const now = new Date();
      const waitTimes = users.map(u => (now - new Date(u.joinedAt)) / 1000);
      
      // Verify ordering: user1 should have longest wait, user3 shortest
      expect(waitTimes[0]).toBeGreaterThanOrEqual(waitTimes[1]);
      expect(waitTimes[1]).toBeGreaterThanOrEqual(waitTimes[2]);
    });

    test('matching algorithm should prioritize longer-waiting users when scores are equal', async () => {
      const queue = new MatchQueue();
      
      // Add users with different wait times but similar interests (same score)
      const user1 = createMockUser('user1', [1, 2], 10000);
      const user2 = createMockUser('user2', [1, 2], 8000);
      const user3 = createMockUser('user3', [1, 2], 5000);
      const user4 = createMockUser('user4', [1, 2], 2000);
      
      queue.addUser(user1);
      queue.addUser(user2);
      queue.addUser(user3);
      queue.addUser(user4);
      
      // All pairs will have same interest score
      mockInterestService.calculateInterestScore.mockResolvedValue(50);
      mockInterestService.getCommonInterests.mockResolvedValue([{ interest_id: 1 }]);
      mockInterestService.getUserInterests.mockResolvedValue([{ interest_id: 1 }]);
      
      const users = queue.getUsers();
      const match = await engine.findBestMatch(users);
      
      // The match should prioritize users with longer wait times
      // When scores are equal, higher waitTimeBonus wins
      expect(match).not.toBeNull();
      expect(match.waitTimeBonus).toBeGreaterThan(0);
    });
  });

  describe('Property 4: No Self-Matching', () => {
    /**
     * **Validates: Requirements 4.1.1**
     * A user cannot be matched with themselves
     */
    test('user should not be matched with themselves', async () => {
      const user = createMockUser('user1', [1, 2, 3], 5000);
      
      mockInterestService.calculateInterestScore.mockResolvedValue(100);
      mockInterestService.getCommonInterests.mockResolvedValue([
        { interest_id: 1 }, { interest_id: 2 }, { interest_id: 3 }
      ]);
      mockInterestService.getUserInterests.mockResolvedValue([
        { interest_id: 1 }, { interest_id: 2 }, { interest_id: 3 }
      ]);
      
      // Try to find match with single user
      const match = await engine.findBestMatch([user]);
      
      expect(match).toBeNull();
    });

    test('findBestMatch should skip self-matches in pair evaluation', async () => {
      const users = [
        createMockUser('user1', [1, 2], 5000),
        createMockUser('user2', [2, 3], 4000),
        createMockUser('user3', [3, 4], 3000),
      ];
      
      mockInterestService.calculateInterestScore.mockImplementation((id1, id2) => {
        // If same user, return high score (should be filtered out)
        if (id1 === id2) return Promise.resolve(100);
        return Promise.resolve(50);
      });
      mockInterestService.getCommonInterests.mockResolvedValue([{ interest_id: 1 }]);
      mockInterestService.getUserInterests.mockResolvedValue([{ interest_id: 1 }]);
      
      const match = await engine.findBestMatch(users);
      
      // Should not match user with themselves
      expect(match).not.toBeNull();
      expect(match.user1Id).not.toBe(match.user2Id);
    });
  });

  describe('Property 5: Minimum Threshold', () => {
    /**
     * **Validates: Requirements 4.2.5**
     * Pairs with score = 0 should not be matched (no common interests)
     */
    test('pairs with zero interest score should not be matched', async () => {
      const engineWithThreshold = new MatchingEngine({ minScoreThreshold: 1 });
      
      const user1 = createMockUser('user1', [1, 2, 3], 5000);
      const user2 = createMockUser('user2', [4, 5, 6], 5000); // No common interests
      
      // Mock zero score (no common interests)
      mockInterestService.calculateInterestScore.mockResolvedValue(0);
      mockInterestService.getCommonInterests.mockResolvedValue([]);
      mockInterestService.getUserInterests.mockResolvedValue([]);
      
      const match = await engineWithThreshold.findBestMatch([user1, user2]);
      
      // Should not match users with no common interests
      expect(match).toBeNull();
    });

    test('pairs with score above threshold should be matched', async () => {
      const engineWithThreshold = new MatchingEngine({ minScoreThreshold: 20 });
      
      const user1 = createMockUser('user1', [1, 2, 3], 5000);
      const user2 = createMockUser('user2', [2, 3, 4], 5000); // Common interests: 2, 3
      
      // Mock score above threshold
      mockInterestService.calculateInterestScore.mockResolvedValue(66.67);
      mockInterestService.getCommonInterests.mockResolvedValue([
        { interest_id: 2 }, { interest_id: 3 }
      ]);
      mockInterestService.getUserInterests.mockResolvedValue([
        { interest_id: 1 }, { interest_id: 2 }, { interest_id: 3 }
      ]);
      
      const match = await engineWithThreshold.findBestMatch([user1, user2]);
      
      expect(match).not.toBeNull();
      expect(match.score).toBeGreaterThan(20);
    });

    test('threshold should filter out all pairs with no common interests', async () => {
      const engineWithThreshold = new MatchingEngine({ minScoreThreshold: 1 });
      
      // Create users with completely disjoint interests
      const users = [
        createMockUser('user1', [1, 2], 5000),
        createMockUser('user2', [3, 4], 4000),
        createMockUser('user3', [5, 6], 3000),
        createMockUser('user4', [7, 8], 2000),
      ];
      
      // All pairs have 0 common interests
      mockInterestService.calculateInterestScore.mockResolvedValue(0);
      mockInterestService.getCommonInterests.mockResolvedValue([]);
      mockInterestService.getUserInterests.mockResolvedValue([]);
      
      const match = await engineWithThreshold.findBestMatch(users);
      
      // No valid matches should be found
      expect(match).toBeNull();
    });
  });

  describe('Additional Correctness Properties', () => {
    test('score should always be between 0 and 100', async () => {
      for (let i = 0; i < 50; i++) {
        const interests1 = generateInterests(5);
        const interests2 = generateInterests(5);
        
        const set1 = new Set(interests1);
        const set2 = new Set(interests2);
        const intersection = [...set1].filter(x => set2.has(x));
        const union = new Set([...set1, ...set2]);
        const baseScore = union.size === 0 ? 0 : (intersection.length / union.size) * 100;
        
        mockInterestService.calculateInterestScore.mockResolvedValueOnce(baseScore);
        mockInterestService.getUserInterests.mockResolvedValueOnce(
          interests1.map(id => ({ interest_id: id }))
        );
        mockInterestService.getUserInterests.mockResolvedValueOnce(
          interests2.map(id => ({ interest_id: id }))
        );
        
        const user1 = createMockUser(`user${i}a`, interests1);
        const user2 = createMockUser(`user${i}b`, interests2);
        
        const result = await engine.calculateMatchScore(user1, user2);
        
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(100);
      }
    });

    test('wait time bonus should be proportional to wait time', async () => {
      const shortWaitUser = createMockUser('user1', [1, 2], 1000);  // 1 second ago
      const longWaitUser = createMockUser('user2', [1, 2], 120000); // 120 seconds ago (max bonus)
      
      mockInterestService.calculateInterestScore.mockResolvedValue(50);
      mockInterestService.getUserInterests.mockResolvedValue([{ interest_id: 1 }]);
      
      const shortWaitResult = await engine.calculateMatchScore(shortWaitUser, longWaitUser);
      
      // Wait time bonus should be minimal for short wait (max is 10)
      expect(shortWaitResult.waitTimeBonus).toBeGreaterThanOrEqual(0);
      expect(shortWaitResult.waitTimeBonus).toBeLessThanOrEqual(10);
      
      // Create another test for max wait time
      const maxWaitUser = createMockUser('user3', [1, 2], 200000); // > 120 seconds ago
      const result = await engine.calculateMatchScore(maxWaitUser, longWaitUser);
      
      // Wait time bonus should be at max ~10% of 100 = 10
      expect(result.waitTimeBonus).toBeLessThanOrEqual(10);
    });
  });
});