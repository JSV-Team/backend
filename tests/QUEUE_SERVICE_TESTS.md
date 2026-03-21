# Queue Service Unit Tests

## Overview
Comprehensive unit tests for `backend/src/services/queueService.js` covering all required functionality.

## Test Coverage

### 1. joinQueue(userId, userInfo)
Tests for adding users to the matching queue with validation.

**Test Cases:**
- ✅ **Valid User Join**: Successfully adds a valid user with interests to the queue
  - Verifies: success flag, queueSize, estimatedWaitTime, success message
  
- ✅ **User Without Interests**: Rejects users who have no interests
  - Error Code: `NO_INTERESTS`
  - Message: "Vui lòng thêm sở thích trước khi ghép đôi"
  
- ✅ **Banned User**: Rejects users with banned/inactive status
  - Error Code: `USER_BANNED`
  - Message: "Tài khoản của bạn đã bị khóa"
  
- ✅ **Non-existent User**: Rejects users that don't exist in database
  - Error Code: `USER_NOT_FOUND`
  
- ✅ **Duplicate User**: Prevents same user from joining queue twice
  - Error Code: `ALREADY_IN_QUEUE`
  - Message: "Bạn đang trong hàng đợi"
  
- ✅ **Full Queue**: Rejects join when queue reaches max capacity (1000 users)
  - Error Code: `QUEUE_FULL`
  - Message: "Hàng đợi đã đầy, vui lòng thử lại sau"

### 2. cancelQueue(userId)
Tests for removing users from the queue.

**Test Cases:**
- ✅ **Remove Existing User**: Successfully removes a user from the queue
  - Verifies: success flag, cancellation message
  - Confirms user is no longer in queue
  
- ✅ **Remove Non-existent User**: Fails gracefully when user not in queue
  - Error Code: `NOT_IN_QUEUE`
  - Message: "Bạn không có trong hàng đợi"

### 3. getQueueInfo()
Tests for retrieving queue information.

**Test Cases:**
- ✅ **Queue with Users**: Returns complete queue information
  - Verifies: size, maxSize, users array, timeout value
  - Confirms user data includes userId, username, joinedAt, waitTime, interests
  
- ✅ **Empty Queue**: Returns empty queue info
  - Verifies: size = 0, users = []

### 4. handleTimeout(io)
Tests for timeout handling of users waiting too long.

**Test Cases:**
- ✅ **Timeout Removal**: Removes users who exceed timeout threshold (120 seconds)
  - Verifies: user is removed from queue
  - Confirms timeout event would be emitted to user's socket
  
- ✅ **No Timeout**: Keeps users who haven't exceeded timeout
  - Verifies: user remains in queue
  - Confirms no timeout event is emitted

### 5. Helper Functions
Additional tests for utility functions.

**Test Cases:**
- ✅ **isUserInQueue**: Checks if user exists in queue
  - Returns true for users in queue
  - Returns false for users not in queue
  
- ✅ **getUserFromQueue**: Retrieves user data from queue
  - Returns user object with all properties for users in queue
  - Returns null for users not in queue
  
- ✅ **resetUserTimeout**: Resets user's timeout/heartbeat
  - Updates joinedAt timestamp for users in queue
  - Returns false for users not in queue

## Mock Setup

### Mocked Dependencies
1. **interestService**
   - `getUserInterests(userId)`: Returns array of user interests

2. **matchService**
   - `getUserInfo(userId)`: Returns user profile information

3. **Database (db config)**
   - `getPool().query()`: Mocked for user status checks

## Test Data

### Mock User Info
```javascript
{
  user_id: number,
  username: string,
  full_name: string,
  avatar_url: string,
  bio: string
}
```

### Mock Interests
```javascript
[
  { interest_id: number, name: string },
  ...
]
```

## Running Tests

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run queue service tests only
npm test -- tests/queueService.test.js

# Run with coverage
npm test -- --coverage

# Run in watch mode
npm run test:watch
```

## Test Statistics

- **Total Test Suites**: 1
- **Total Test Cases**: 15
- **Functions Tested**: 7
- **Coverage Target**: >80%

## Key Testing Patterns

1. **Queue Isolation**: Each test clears the queue before and after execution
2. **Mock Management**: Mocks are reset after each test to prevent cross-test contamination
3. **Async Handling**: Proper async/await usage for database operations
4. **Error Scenarios**: Comprehensive error case coverage
5. **State Verification**: Tests verify both return values and side effects (queue state changes)

## Notes

- Tests use Jest framework with Node.js test environment
- All database calls are mocked to avoid external dependencies
- Queue is implemented as in-memory Map for fast operations
- Timeout threshold is 120 seconds (QUEUE_TIMEOUT constant)
- Maximum queue size is 1000 users (MAX_QUEUE_SIZE constant)
