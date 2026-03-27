# Nâng Cấp: Khoảng Cách Địa Lý Làm Tiêu Chí Ưu Tiên

## Tổng Quan

Theo yêu cầu của mentor, hệ thống ghép đôi đã được nâng cấp để thay đổi cách xử lý địa điểm:

### Trước đây (Hard Filter):
- Chỉ ghép đôi người dùng trong cùng thành phố
- Loại bỏ hoàn toàn những người ở thành phố khác
- Vấn đề: Người cùng thành phố có thể ở rất xa nhau (VD: Hà Nội rộng ~3000 km²)

### Bây giờ (Priority Criterion):
- Không loại bỏ người dùng dựa trên địa điểm
- Tính khoảng cách thực tế giữa 2 người (sử dụng tọa độ GPS)
- Khi 2 người có điểm phù hợp giống nhau → ưu tiên người gần hơn
- Mục tiêu: Ưu tiên người trong vòng 40km khi điểm số bằng nhau

## Thay Đổi Kỹ Thuật

### 1. Database Schema
**File:** `backend/migrations/add_coordinates_to_users.sql`

Thêm 2 trường mới vào bảng `users`:
```sql
ALTER TABLE users 
ADD COLUMN latitude DECIMAL(10, 8) NULL,
ADD COLUMN longitude DECIMAL(11, 8) NULL;
```

- `latitude`: Vĩ độ (-90 đến 90)
- `longitude`: Kinh độ (-180 đến 180)
- Cả 2 trường đều nullable (cho phép user chưa cung cấp vị trí)

### 2. Distance Calculator
**File:** `backend/src/utils/distanceCalculator.js`

Tạo utility mới để tính khoảng cách:
- `calculateDistance(lat1, lon1, lat2, lon2)`: Tính khoảng cách (km) bằng công thức Haversine
- `isWithinRadius(lat1, lon1, lat2, lon2, radiusKm)`: Kiểm tra trong bán kính

**Công thức Haversine:**
```
a = sin²(Δlat/2) + cos(lat1) × cos(lat2) × sin²(Δlon/2)
c = 2 × atan2(√a, √(1−a))
distance = R × c  (R = 6371 km - bán kính Trái Đất)
```

### 3. Matching Service
**File:** `backend/src/services/matchingService.js`

#### Thay đổi `getCandidateUsers()`:
- **Trước:** Lọc theo `location = $2` (cùng thành phố)
- **Sau:** Bỏ filter location, lấy tất cả user hợp lệ
- Thêm trường `latitude`, `longitude` vào SELECT

#### Thay đổi `calculateTotalMatchScore()`:
- Thêm 4 tham số: `lat1, lon1, lat2, lon2`
- Tính khoảng cách giữa 2 user
- Thêm `distance` vào kết quả trả về
- Thêm `distance` vào breakdown để hiển thị

#### Thay đổi `findBestMatchForUser()`:
- Lấy `latitude`, `longitude` của current user
- Truyền tọa độ vào `calculateTotalMatchScore()`
- **Sắp xếp mới:**
  1. Điểm tổng (totalScore) - giảm dần
  2. Khoảng cách (distance) - tăng dần (gần hơn = tốt hơn)
  3. Xử lý null distance (đặt cuối)

```javascript
matchResults.sort((a, b) => {
  // 1. So sánh điểm tổng
  if (b.totalScore !== a.totalScore) {
    return b.totalScore - a.totalScore;
  }
  
  // 2. Nếu điểm bằng nhau, ưu tiên người gần hơn
  if (a.distance === null && b.distance === null) return 0;
  if (a.distance === null) return 1;  // null ở cuối
  if (b.distance === null) return -1;
  
  return a.distance - b.distance;  // Gần hơn = tốt hơn
});
```

### 4. Match Engine
**File:** `backend/src/services/matchEngine.js`

#### Thay đổi `calculateMatchScore()`:
- Truyền thêm `latitude`, `longitude` vào `calculateTotalMatchScore()`
- Thêm `distance` vào kết quả trả về

#### Thay đổi `_getUserFullData()`:
- Lấy thêm `latitude`, `longitude` từ database
- Kiểm tra đầy đủ các trường trước khi query

#### Thay đổi `findBestMatch()`:
- Cập nhật logic sắp xếp để sử dụng distance làm tie-breaker
- Chỉ áp dụng cho enhanced matching (có distance)

## Cách Sử Dụng

### 1. Chạy Migration
```bash
psql -U postgres -d SoThichDB -f backend/migrations/add_coordinates_to_users.sql
```

### 2. Cập Nhật Tọa Độ User
Có 3 cách:

**A. Tự động từ GPS (Khuyến nghị):**
```javascript
// Frontend gửi tọa độ khi user cho phép
navigator.geolocation.getCurrentPosition((position) => {
  const { latitude, longitude } = position.coords;
  // Gửi lên server để update
});
```

**B. Chọn từ bản đồ:**
```javascript
// Sử dụng Google Maps / Leaflet
map.on('click', (e) => {
  const { lat, lng } = e.latlng;
  // Update user location
});
```

**C. Tự động từ tên thành phố (Geocoding):**
```javascript
// Sử dụng Geocoding API
const coords = await geocodeCity(user.location);
await updateUserCoordinates(userId, coords.lat, coords.lng);
```

### 3. Test Matching
```javascript
const matchingService = require('./services/matchingService');

// Tìm match tốt nhất cho user
const bestMatch = await matchingService.findBestMatchForUser(userId);

console.log(`Best match: ${bestMatch.candidateInfo.username}`);
console.log(`Score: ${bestMatch.totalScore}/100`);
console.log(`Distance: ${bestMatch.distance} km`);
```

## Ví Dụ Kết Quả

### Trường hợp 1: Điểm khác nhau
```
User A <-> User B: Score 85, Distance 50km
User A <-> User C: Score 90, Distance 5km
→ Chọn User C (điểm cao hơn)
```

### Trường hợp 2: Điểm giống nhau (Tie-breaker)
```
User A <-> User B: Score 85, Distance 50km
User A <-> User C: Score 85, Distance 5km
→ Chọn User C (gần hơn khi điểm bằng nhau)
```

### Trường hợp 3: Không có tọa độ
```
User A <-> User B: Score 85, Distance null
User A <-> User C: Score 85, Distance 5km
→ Chọn User C (có distance > null distance)
```

## Lợi Ích

1. **Linh hoạt hơn:** Không bỏ lỡ người phù hợp chỉ vì khác thành phố
2. **Chính xác hơn:** Dùng khoảng cách thực tế thay vì ranh giới hành chính
3. **Công bằng hơn:** Điểm số vẫn là yếu tố chính, distance chỉ là tie-breaker
4. **Mở rộng được:** Có thể thêm filter "trong vòng X km" sau này nếu cần

## Lưu Ý

1. **Privacy:** Cần xin phép user trước khi lấy GPS
2. **Accuracy:** GPS có thể sai số 10-50m, chấp nhận được cho matching
3. **Null handling:** Hệ thống vẫn hoạt động nếu user không cung cấp tọa độ
4. **Performance:** Index đã được thêm cho `(latitude, longitude)`

## Tương Lai

Có thể mở rộng thêm:
- Filter "chỉ tìm trong vòng X km"
- Hiển thị khoảng cách cho user trước khi match
- Tính điểm bonus cho người gần (không chỉ tie-breaker)
- Sử dụng location history để dự đoán vị trí thường xuyên

## Migration Checklist

- [x] Thêm trường `latitude`, `longitude` vào database
- [x] Tạo utility `distanceCalculator.js`
- [x] Cập nhật `matchingService.js`
- [x] Cập nhật `matchEngine.js`
- [ ] Chạy migration SQL
- [ ] Cập nhật tọa độ cho user hiện có
- [ ] Test matching với dữ liệu thực
- [ ] Cập nhật API để nhận tọa độ từ frontend
- [ ] Cập nhật frontend để gửi tọa độ
