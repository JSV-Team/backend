# 🚀 NÂNG CẤP HỆ THỐNG MATCHING - PHỄU 3 TẦNG

## 📋 Tổng quan

Hệ thống matching đã được nâng cấp từ chỉ dựa trên **Sở thích** sang mô hình **Phễu 3 Tầng** bao gồm:

1. **Tầng 0**: Lọc an toàn (SQL)
2. **Tầng 1**: Lọc vị trí (SQL)
3. **Tầng 2**: Điểm sở thích - 70% (Logic cũ được giữ nguyên)
4. **Tầng 3**: Điểm thần số học - 30% (Logic mới)

## 🏗️ Cấu trúc File

```
backend/src/services/
├── numerologyService.js          # Service tính toán thần số học
├── matchingService.js            # Service matching nâng cấp (Phễu 3 Tầng)
├── matchEngine.js                # Engine chính (đã cập nhật)
├── interestService.js            # Service sở thích (GIỮ NGUYÊN)
├── matchingService.test.js       # File test demo
└── MATCHING_UPGRADE_README.md    # File này
```

## 📊 Chi tiết từng tầng

### Tầng 0: Lọc an toàn (SQL Query)

```sql
WHERE 
  u.user_id != $1                    -- Bỏ qua chính mình
  AND u.status != 'banned'           -- Bỏ qua user bị banned
  AND NOT EXISTS (                   -- Bỏ qua user đã match
    SELECT 1 FROM match_sessions ms
    WHERE (ms.user_one = $1 AND ms.user_two = u.user_id)
       OR (ms.user_one = u.user_id AND ms.user_two = $1)
  )
```

### Tầng 1: Lọc vị trí (SQL Query)

```sql
AND u.location = $2  -- Chỉ lấy user cùng thành phố
```

### Tầng 2: Điểm sở thích (70%)

**LOGIC CŨ ĐƯỢC GIỮ NGUYÊN 100%**

```javascript
// Công thức cũ (từ interestService.js)
rawScore = (số sở thích chung / tổng sở thích unique) * 100

// Quy đổi về thang điểm 70
interestScore = (rawScore / 100) * 70
```

**Ví dụ:**
- User A: [Đọc sách, Leo núi, Âm nhạc]
- User B: [Đọc sách, Leo núi, Du lịch, Lập trình]
- Chung: 2 (Đọc sách, Leo núi)
- Unique: 5 (tất cả)
- Raw score: 2/5 * 100 = 40%
- Interest score: 40/100 * 70 = **28/70 điểm**

### Tầng 3: Điểm thần số học (30%)

#### Bước 1: Tính Life Path Number

```javascript
// Ví dụ: DOB = 1995-03-22
// Cộng tất cả chữ số: 1+9+9+5+0+3+2+2 = 31
// Rút gọn: 3+1 = 4
// Life Path Number = 4
```

#### Bước 2: Tính điểm tương thích

```javascript
function calculateNumerologyScore(numA, numB) {
  const isAEven = numA % 2 === 0;
  const isBEven = numB % 2 === 0;
  
  if (isAEven === isBEven) {
    // Cùng nhóm (cả hai chẵn hoặc cả hai lẻ)
    return 30;
  } else {
    // Khác nhóm
    return 15;
  }
}
```

**Nhóm chẵn:** 2, 4, 6, 8  
**Nhóm lẻ:** 1, 3, 5, 7, 9

**Ví dụ:**
- User A: Life Path = 4 (chẵn)
- User B: Life Path = 6 (chẵn)
- → Cùng nhóm → **30/30 điểm**

- User A: Life Path = 3 (lẻ)
- User B: Life Path = 8 (chẵn)
- → Khác nhóm → **15/30 điểm**

## 🔧 Cách sử dụng

### 1. Sử dụng matchingService trực tiếp

```javascript
const matchingService = require('./services/matchingService');

// Tìm người phù hợp nhất cho user
const bestMatch = await matchingService.findBestMatchForUser(userId);

console.log(bestMatch);
// {
//   totalScore: 73.5,
//   interestScore: 45.5,
//   numerologyScore: 30,
//   lifePathNum1: 4,
//   lifePathNum2: 6,
//   commonInterests: [...],
//   candidateInfo: {...}
// }
```

### 2. Sử dụng matchEngine (Tích hợp sẵn)

```javascript
const MatchingEngine = require('./services/matchEngine');

// Khởi tạo với Enhanced Matching (mặc định)
const engine = new MatchingEngine({
  minScoreThreshold: 20,
  useEnhancedMatching: true  // Bật Phễu 3 Tầng
});

// Tính điểm giữa 2 user
const result = await engine.calculateMatchScore(user1, user2);

console.log(result);
// {
//   score: 75.2,
//   interestScore: 45.2,
//   numerologyScore: 30,
//   waitTimeBonus: 0,
//   lifePathNumbers: { user1: 4, user2: 6 },
//   matchingType: 'enhanced'
// }
```

### 3. Tắt Enhanced Matching (dùng logic cũ)

```javascript
const engine = new MatchingEngine({
  useEnhancedMatching: false  // Tắt Phễu 3 Tầng, dùng logic cũ
});

const result = await engine.calculateMatchScore(user1, user2);
// Sẽ chỉ tính điểm sở thích như trước
```

## 🧪 Chạy Test

```bash
# Chạy test demo
node backend/src/services/matchingService.test.js
```

Test sẽ:
1. Tìm người phù hợp nhất cho User 2 (Nguyễn Văn Minh)
2. Tính điểm trực tiếp giữa User 2 và User 7
3. Hiển thị chi tiết điểm số và breakdown

## 📈 Ví dụ Output

```
🎯 TOTAL MATCH SCORE: 73.50/100
   - Interest (70%): 43.50
   - Numerology (30%): 30
   - Common interests: 3

📊 BREAKDOWN:
   💝 Interest Score:
      - Raw score: 62.14%
      - Weighted score: 43.50/70
      - Common: [Đọc sách, Leo núi, Phượt]
   
   🔮 Numerology Score:
      - User 1 Life Path: 4 (chẵn)
      - User 2 Life Path: 6 (chẵn)
      - Same parity: 30/30
```

## ⚠️ Lưu ý quan trọng

1. **Logic sở thích cũ KHÔNG bị thay đổi** - Chỉ quy đổi về thang điểm 70
2. **Database cần có cột `location` và `dob`** trong bảng `users`
3. **Tầng 0 và Tầng 1 chạy trong SQL** - Hiệu suất cao
4. **Tầng 2 và Tầng 3 chạy trong Node.js** - Logic tính toán
5. **Backward compatible** - Có thể tắt Enhanced Matching để dùng logic cũ

## 🔄 Migration từ hệ thống cũ

Không cần migration! Hệ thống mới:
- ✅ Giữ nguyên logic cũ
- ✅ Thêm tính năng mới
- ✅ Có thể bật/tắt Enhanced Matching
- ✅ Không breaking changes

## 📞 API Integration

Nếu bạn muốn expose qua API:

```javascript
// routes/match.routes.js
router.get('/match/find-best', async (req, res) => {
  const userId = req.user.userId;
  const bestMatch = await matchingService.findBestMatchForUser(userId);
  
  res.json({
    success: true,
    data: bestMatch
  });
});
```

## 🎯 Kết luận

Hệ thống matching đã được nâng cấp thành công với:
- ✅ Lọc vị trí (cùng thành phố)
- ✅ Điểm sở thích 70% (logic cũ giữ nguyên)
- ✅ Điểm thần số học 30% (logic mới)
- ✅ Tổng điểm = Interest + Numerology
- ✅ Backward compatible
- ✅ Code rõ ràng, dễ maintain

**Tác giả:** Senior Fullstack Developer  
**Ngày:** 2024  
**Version:** 2.0 - Enhanced Matching
