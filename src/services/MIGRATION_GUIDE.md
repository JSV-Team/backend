# 📘 HƯỚNG DẪN MIGRATION - Từ Matching Cũ sang Phễu 3 Tầng

## 🎯 Mục tiêu

Nâng cấp hệ thống matching từ:
- ❌ Chỉ dựa trên sở thích (Interest only)
- ✅ Sang Phễu 3 Tầng (Location + Interest 70% + Numerology 30%)

## 📋 Checklist Migration

- [x] Tạo `numerologyService.js` - Tính toán thần số học
- [x] Tạo `matchingService.js` - Service matching nâng cấp
- [x] Cập nhật `matchEngine.js` - Tích hợp Enhanced Matching
- [ ] Cập nhật database schema (nếu cần)
- [ ] Cập nhật API endpoints
- [ ] Test hệ thống mới
- [ ] Deploy lên production

## 🗄️ Bước 1: Kiểm tra Database Schema

### Yêu cầu

Bảng `users` cần có các cột sau:

```sql
CREATE TABLE users (
    user_id      SERIAL PRIMARY KEY,
    username     VARCHAR(50) NOT NULL,
    location     VARCHAR(100) NULL,  -- ✅ CẦN CÓT NÀY
    dob          DATE NULL,          -- ✅ CẦN CỘT NÀY
    status       VARCHAR(20) NOT NULL DEFAULT 'active',
    -- ... các cột khác
);
```

### Nếu chưa có cột `location` hoặc `dob`

```sql
-- Thêm cột location
ALTER TABLE users ADD COLUMN location VARCHAR(100) NULL;

-- Thêm cột dob (date of birth)
ALTER TABLE users ADD COLUMN dob DATE NULL;

-- (Optional) Tạo index cho location để tăng tốc query
CREATE INDEX idx_users_location ON users(location);
```

### Kiểm tra dữ liệu

```sql
-- Kiểm tra có bao nhiêu user có location
SELECT COUNT(*) as users_with_location 
FROM users 
WHERE location IS NOT NULL;

-- Kiểm tra có bao nhiêu user có dob
SELECT COUNT(*) as users_with_dob 
FROM users 
WHERE dob IS NOT NULL;

-- Xem phân bố location
SELECT location, COUNT(*) as count 
FROM users 
WHERE location IS NOT NULL 
GROUP BY location 
ORDER BY count DESC;
```

## 🔧 Bước 2: Cập nhật Code

### 2.1. Nếu bạn đang dùng `matchEngine.js` trực tiếp

**Code CŨ:**
```javascript
const MatchingEngine = require('./services/matchEngine');

const engine = new MatchingEngine({
  minScoreThreshold: 20,
  waitTimeBonusWeight: 0.1
});

const result = await engine.calculateMatchScore(user1, user2);
// result.score chỉ dựa trên interest
```

**Code MỚI (Tự động dùng Enhanced Matching):**
```javascript
const MatchingEngine = require('./services/matchEngine');

const engine = new MatchingEngine({
  minScoreThreshold: 20,
  waitTimeBonusWeight: 0.1,
  useEnhancedMatching: true  // Mặc định là true
});

const result = await engine.calculateMatchScore(user1, user2);
// result.score bao gồm: interest (70%) + numerology (30%)
// result.matchingType = 'enhanced'
```

**Nếu muốn giữ logic cũ (Backward Compatible):**
```javascript
const engine = new MatchingEngine({
  minScoreThreshold: 20,
  waitTimeBonusWeight: 0.1,
  useEnhancedMatching: false  // Tắt Enhanced Matching
});

const result = await engine.calculateMatchScore(user1, user2);
// result.matchingType = 'legacy'
```

### 2.2. Nếu bạn muốn dùng `matchingService` trực tiếp

**Code MỚI:**
```javascript
const matchingService = require('./services/matchingService');

// Tìm người phù hợp nhất cho user
const bestMatch = await matchingService.findBestMatchForUser(userId);

console.log(bestMatch);
// {
//   totalScore: 73.5,
//   interestScore: 45.5,      // Điểm sở thích (max 70)
//   numerologyScore: 30,       // Điểm thần số học (max 30)
//   lifePathNum1: 4,
//   lifePathNum2: 6,
//   commonInterests: [...],
//   candidateInfo: {...}
// }
```

### 2.3. Cập nhật Queue System

**Code CŨ:**
```javascript
// matchingEngineLoop.js
const bestMatch = await matchingEngine.findBestMatch(usersForMatching);

if (bestMatch) {
  console.log(`Score: ${bestMatch.score}%`);
  console.log(`Common interests: ${bestMatch.commonInterests?.length}`);
}
```

**Code MỚI (Không cần thay đổi gì!):**
```javascript
// matchingEngineLoop.js
const bestMatch = await matchingEngine.findBestMatch(usersForMatching);

if (bestMatch) {
  console.log(`Score: ${bestMatch.score}%`);
  console.log(`Interest: ${bestMatch.interestScore}/70`);
  console.log(`Numerology: ${bestMatch.numerologyScore}/30`);
  console.log(`Common interests: ${bestMatch.commonInterests?.length}`);
  console.log(`Matching type: ${bestMatch.matchingType}`);
}
```

## 🌐 Bước 3: Cập nhật API Response

### 3.1. Response cũ

```json
{
  "success": true,
  "data": {
    "matchedUser": {...},
    "score": 65.5,
    "interestScore": 65.5,
    "commonInterests": [...]
  }
}
```

### 3.2. Response mới (Enhanced)

```json
{
  "success": true,
  "data": {
    "matchedUser": {...},
    "matchScore": {
      "total": 73.5,
      "interest": 43.5,
      "numerology": 30
    },
    "commonInterests": [...],
    "lifePathNumbers": {
      "yours": 4,
      "theirs": 6
    },
    "breakdown": {
      "interest": {
        "score": 43.5,
        "weight": "70%",
        "rawScore": 62.14
      },
      "numerology": {
        "score": 30,
        "weight": "30%",
        "lifePathNumbers": [4, 6]
      }
    }
  }
}
```

### 3.3. Cập nhật Controller

**Ví dụ:**
```javascript
// controllers/match.controller.js

// CŨ
async function findMatch(req, res) {
  const userId = req.user.userId;
  const bestMatch = await matchingEngine.findBestMatch([...]);
  
  return res.json({
    success: true,
    data: {
      matchedUser: {...},
      score: bestMatch.score,
      interestScore: bestMatch.interestScore,
      commonInterests: bestMatch.commonInterests
    }
  });
}

// MỚI
async function findMatch(req, res) {
  const userId = req.user.userId;
  const bestMatch = await matchingService.findBestMatchForUser(userId);
  
  if (!bestMatch) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy người phù hợp'
    });
  }
  
  return res.json({
    success: true,
    data: {
      matchedUser: bestMatch.candidateInfo,
      matchScore: {
        total: bestMatch.totalScore,
        interest: bestMatch.interestScore,
        numerology: bestMatch.numerologyScore
      },
      commonInterests: bestMatch.commonInterests,
      lifePathNumbers: {
        yours: bestMatch.lifePathNum1,
        theirs: bestMatch.lifePathNum2
      },
      breakdown: bestMatch.breakdown
    }
  });
}
```

## 🧪 Bước 4: Testing

### 4.1. Test Service mới

```bash
# Chạy test demo
node backend/src/services/matchingService.test.js
```

### 4.2. Test API Endpoints

```bash
# Test tìm người phù hợp nhất
curl -X GET http://localhost:5000/api/match/find-best \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test tính điểm với user cụ thể
curl -X POST http://localhost:5000/api/match/calculate-score \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"targetUserId": 7}'
```

### 4.3. Test Cases cần kiểm tra

- [ ] User không có location → Không tìm thấy match
- [ ] User không có dob → Dùng giá trị mặc định (Life Path = 5)
- [ ] User cùng location → Tìm thấy match
- [ ] User khác location → Không tìm thấy match
- [ ] Điểm sở thích tính đúng (max 70)
- [ ] Điểm thần số học tính đúng (15 hoặc 30)
- [ ] Tổng điểm = Interest + Numerology
- [ ] User đã match trước đó → Không xuất hiện trong candidates

## 📊 Bước 5: Monitoring & Logging

### 5.1. Thêm logging

```javascript
// Trong matchingService.js
console.log(`\n🔍 [MatchingService] Finding best match for User ${userId}`);
console.log(`   Location filter: ${location}`);
console.log(`   Candidates found: ${candidates.length}`);
console.log(`   Best match: User ${bestMatch.userId} (Score: ${bestMatch.totalScore})`);
```

### 5.2. Metrics cần theo dõi

- Số lượng candidates trung bình mỗi user
- Phân bố điểm matching (0-100)
- Tỷ lệ match thành công
- Thời gian xử lý trung bình
- Phân bố Life Path Numbers

## 🚀 Bước 6: Deployment

### 6.1. Staging Environment

1. Deploy code mới lên staging
2. Chạy test suite đầy đủ
3. Kiểm tra performance
4. Kiểm tra logs

### 6.2. Production Deployment

**Option 1: Gradual Rollout (Khuyến nghị)**

```javascript
// Bật Enhanced Matching cho 10% users
const useEnhanced = Math.random() < 0.1;

const engine = new MatchingEngine({
  useEnhancedMatching: useEnhanced
});
```

**Option 2: Feature Flag**

```javascript
// Dùng feature flag service (LaunchDarkly, etc.)
const useEnhanced = await featureFlags.isEnabled('enhanced-matching', userId);

const engine = new MatchingEngine({
  useEnhancedMatching: useEnhanced
});
```

**Option 3: Full Rollout**

```javascript
// Bật cho tất cả users
const engine = new MatchingEngine({
  useEnhancedMatching: true
});
```

## ⚠️ Rollback Plan

Nếu có vấn đề, rollback bằng cách:

```javascript
// Tắt Enhanced Matching
const engine = new MatchingEngine({
  useEnhancedMatching: false  // Quay về logic cũ
});
```

Hoặc rollback code về version trước (không có breaking changes).

## 📈 Bước 7: Optimization (Optional)

### 7.1. Cache Life Path Numbers

```javascript
// Tính Life Path Number 1 lần, lưu vào database
ALTER TABLE users ADD COLUMN life_path_number INT NULL;

// Update existing users
UPDATE users 
SET life_path_number = calculate_life_path(dob) 
WHERE dob IS NOT NULL;
```

### 7.2. Index Optimization

```sql
-- Index cho location filter
CREATE INDEX idx_users_location_status ON users(location, status);

-- Index cho match_sessions
CREATE INDEX idx_match_sessions_users ON match_sessions(user_one, user_two);
```

## ✅ Checklist Hoàn thành

- [ ] Database schema đã có `location` và `dob`
- [ ] Code mới đã được test kỹ
- [ ] API response đã được cập nhật
- [ ] Frontend đã được cập nhật (nếu cần)
- [ ] Logging và monitoring đã được setup
- [ ] Staging environment đã test thành công
- [ ] Production deployment plan đã sẵn sàng
- [ ] Rollback plan đã được chuẩn bị
- [ ] Documentation đã được cập nhật

## 🎉 Kết luận

Migration hoàn tất! Hệ thống matching của bạn giờ đã:
- ✅ Lọc theo vị trí (cùng thành phố)
- ✅ Tính điểm sở thích (70%)
- ✅ Tính điểm thần số học (30%)
- ✅ Backward compatible (có thể tắt Enhanced Matching)
- ✅ Dễ maintain và mở rộng

**Chúc mừng! 🎊**
