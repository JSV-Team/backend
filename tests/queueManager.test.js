const MatchQueue = require('../src/services/queueManager');

describe('MatchQueue', () => {
  let queue;

  beforeEach(() => {
    queue = new MatchQueue();
  });

  describe('addUser', () => {
    const validUser = {
      userId: 'user1',
      interests: ['music', 'sports'],
      socketId: 'socket1',
      userInfo: { name: 'John' }
    };

    test('should add valid user to queue', () => {
      const result = queue.addUser(validUser);
      
      expect(result).toBe(true);
      expect(queue.getSize()).toBe(1);
      expect(queue.hasUser('user1')).toBe(true);
    });

    test('should add user with default values', () => {
      queue.addUser({ userId: 'user1' });
      
      const user = queue.getUser('user1');
      expect(user.joinedAt).toBeInstanceOf(Date);
      expect(user.status).toBe('waiting');
    });

    test('should reject duplicate user (uniqueness invariant)', () => {
      queue.addUser(validUser);
      const result = queue.addUser(validUser);
      
      expect(result).toBe(false);
      expect(queue.getSize()).toBe(1);
    });

    test('should reject invalid user (null)', () => {
      const result = queue.addUser(null);
      
      expect(result).toBe(false);
      expect(queue.getSize()).toBe(0);
    });

    test('should reject invalid user (undefined)', () => {
      const result = queue.addUser(undefined);
      
      expect(result).toBe(false);
      expect(queue.getSize()).toBe(0);
    });

    test('should reject user without userId', () => {
      const result = queue.addUser({ interests: ['music'] });
      
      expect(result).toBe(false);
      expect(queue.getSize()).toBe(0);
    });

    test('should reject user with empty userId', () => {
      const result = queue.addUser({ userId: '' });
      
      expect(result).toBe(false);
      expect(queue.getSize()).toBe(0);
    });
  });

  describe('removeUser', () => {
    const validUser = {
      userId: 'user1',
      interests: ['music']
    };

    test('should remove existing user from queue', () => {
      queue.addUser(validUser);
      expect(queue.getSize()).toBe(1);
      
      const result = queue.removeUser('user1');
      
      expect(result).toBe(true);
      expect(queue.getSize()).toBe(0);
      expect(queue.hasUser('user1')).toBe(false);
    });

    test('should return false for non-existing user', () => {
      const result = queue.removeUser('nonexistent');
      
      expect(result).toBe(false);
      expect(queue.getSize()).toBe(0);
    });

    test('should remove only the specified user', () => {
      queue.addUser({ userId: 'user1', interests: ['music'] });
      queue.addUser({ userId: 'user2', interests: ['sports'] });
      expect(queue.getSize()).toBe(2);
      
      queue.removeUser('user1');
      
      expect(queue.getSize()).toBe(1);
      expect(queue.hasUser('user1')).toBe(false);
      expect(queue.hasUser('user2')).toBe(true);
    });
  });

  describe('getUsers', () => {
    test('should return empty array for empty queue', () => {
      const users = queue.getUsers();
      
      expect(users).toEqual([]);
      expect(Array.isArray(users)).toBe(true);
    });

    test('should return all users in queue', () => {
      const user1 = { userId: 'user1', interests: ['music'] };
      const user2 = { userId: 'user2', interests: ['sports'] };
      queue.addUser(user1);
      queue.addUser(user2);
      
      const users = queue.getUsers();
      
      expect(users).toHaveLength(2);
      expect(users.map(u => u.userId)).toContain('user1');
      expect(users.map(u => u.userId)).toContain('user2');
    });

    test('should return copy of users (not reference)', () => {
      queue.addUser({ userId: 'user1', interests: ['music'] });
      
      const users = queue.getUsers();
      users[0].userId = 'modified';
      
      expect(queue.hasUser('user1')).toBe(true);
      expect(queue.hasUser('modified')).toBe(false);
    });
  });

  describe('getSize', () => {
    test('should return 0 for empty queue', () => {
      expect(queue.getSize()).toBe(0);
    });

    test('should return correct size after adding users', () => {
      queue.addUser({ userId: 'user1', interests: ['music'] });
      queue.addUser({ userId: 'user2', interests: ['sports'] });
      queue.addUser({ userId: 'user3', interests: ['gaming'] });
      
      expect(queue.getSize()).toBe(3);
    });

    test('should return correct size after removing users', () => {
      queue.addUser({ userId: 'user1', interests: ['music'] });
      queue.addUser({ userId: 'user2', interests: ['sports'] });
      queue.removeUser('user1');
      
      expect(queue.getSize()).toBe(1);
    });

    test('should not change size when removing non-existing user', () => {
      queue.addUser({ userId: 'user1', interests: ['music'] });
      queue.removeUser('nonexistent');
      
      expect(queue.getSize()).toBe(1);
    });
  });

  describe('hasUser', () => {
    const validUser = {
      userId: 'user1',
      interests: ['music']
    };

    test('should return true for existing user', () => {
      queue.addUser(validUser);
      
      expect(queue.hasUser('user1')).toBe(true);
    });

    test('should return false for non-existing user', () => {
      expect(queue.hasUser('nonexistent')).toBe(false);
    });

    test('should return false after user is removed', () => {
      queue.addUser(validUser);
      queue.removeUser('user1');
      
      expect(queue.hasUser('user1')).toBe(false);
    });
  });

  describe('resetTimeout', () => {
    const validUser = {
      userId: 'user1',
      interests: ['music']
    };

    test('should reset timeout for existing user', () => {
      queue.addUser(validUser);
      const originalUser = queue.getUser('user1');
      const originalJoinedAt = originalUser.joinedAt.getTime();
      
      // Wait a small amount to ensure time difference
      const originalDate = originalUser.joinedAt;
      
      const result = queue.resetTimeout('user1');
      
      expect(result).toBe(true);
      const updatedUser = queue.getUser('user1');
      expect(updatedUser.joinedAt.getTime()).toBeGreaterThanOrEqual(originalDate.getTime());
    });

    test('should return false for non-existing user', () => {
      const result = queue.resetTimeout('nonexistent');
      
      expect(result).toBe(false);
    });

    test('should update joinedAt timestamp', () => {
      queue.addUser(validUser);
      const beforeReset = queue.getUser('user1').joinedAt;
      
      // Wait a bit to ensure time passes
      const waitStart = Date.now();
      while (Date.now() - waitStart < 50) {
        // Busy wait for 50ms
      }
      
      queue.resetTimeout('user1');
      
      const afterReset = queue.getUser('user1').joinedAt;
      // The new timestamp should be different (updated to current time)
      expect(afterReset.getTime()).not.toBe(beforeReset.getTime());
    });
  });

  describe('getUser', () => {
    const validUser = {
      userId: 'user1',
      interests: ['music', 'sports'],
      socketId: 'socket1',
      userInfo: { name: 'John', age: 25 }
    };

    test('should return user info for existing user', () => {
      queue.addUser(validUser);
      
      const user = queue.getUser('user1');
      
      expect(user).not.toBeNull();
      expect(user.userId).toBe('user1');
      expect(user.interests).toEqual(['music', 'sports']);
      expect(user.socketId).toBe('socket1');
      expect(user.userInfo).toEqual({ name: 'John', age: 25 });
    });

    test('should return null for non-existing user', () => {
      const user = queue.getUser('nonexistent');
      
      expect(user).toBeNull();
    });

    test('should return user with default values', () => {
      queue.addUser({ userId: 'user1' });
      
      const user = queue.getUser('user1');
      
      expect(user.joinedAt).toBeInstanceOf(Date);
      expect(user.status).toBe('waiting');
    });
  });

  describe('uniqueness invariant', () => {
    test('user can only appear once in the queue', () => {
      const user1 = { userId: 'user1', interests: ['music'] };
      const user2 = { userId: 'user1', interests: ['sports'] }; // Same userId
      
      queue.addUser(user1);
      const result = queue.addUser(user2);
      
      expect(result).toBe(false);
      expect(queue.getSize()).toBe(1);
      
      // Original user data should be preserved
      const user = queue.getUser('user1');
      expect(user.interests).toEqual(['music']);
    });

    test('different users can coexist in queue', () => {
      queue.addUser({ userId: 'user1', interests: ['music'] });
      queue.addUser({ userId: 'user2', interests: ['sports'] });
      queue.addUser({ userId: 'user3', interests: ['gaming'] });
      
      expect(queue.getSize()).toBe(3);
      expect(queue.getUsers()).toHaveLength(3);
    });
  });
});