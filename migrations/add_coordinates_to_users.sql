-- Migration: Thêm tọa độ (latitude, longitude) vào bảng users
-- Mục đích: Hỗ trợ tính khoảng cách thực tế thay vì lọc theo tên thành phố

ALTER TABLE users 
ADD COLUMN latitude DECIMAL(10, 8) NULL,
ADD COLUMN longitude DECIMAL(11, 8) NULL;

-- Thêm index để tối ưu query theo tọa độ
CREATE INDEX ix_users_coordinates ON users(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Comment giải thích
COMMENT ON COLUMN users.latitude IS 'Vĩ độ của người dùng (dùng để tính khoảng cách)';
COMMENT ON COLUMN users.longitude IS 'Kinh độ của người dùng (dùng để tính khoảng cách)';

-- Dữ liệu mẫu: Cập nhật tọa độ cho các thành phố phổ biến ở Việt Nam
-- (Trong thực tế, người dùng sẽ cung cấp tọa độ qua GPS hoặc chọn địa điểm)

UPDATE users SET latitude = 21.0285, longitude = 105.8542 WHERE location = 'Hà Nội';
UPDATE users SET latitude = 10.8231, longitude = 106.6297 WHERE location LIKE '%TP%Hồ Chí Minh%' OR location LIKE '%TP.HCM%' OR location LIKE '%Sài Gòn%';
UPDATE users SET latitude = 16.0544, longitude = 108.2022 WHERE location LIKE '%Đà Nẵng%';
UPDATE users SET latitude = 20.8449, longitude = 106.6881 WHERE location LIKE '%Hải Phòng%';
UPDATE users SET latitude = 10.0452, longitude = 105.7469 WHERE location LIKE '%Cần Thơ%';
UPDATE users SET latitude = 11.9404, longitude = 108.4583 WHERE location LIKE '%Đà Lạt%';
UPDATE users SET latitude = 16.4637, longitude = 107.5909 WHERE location LIKE '%Huế%';
UPDATE users SET latitude = 10.9804, longitude = 106.6750 WHERE location LIKE '%Bình Dương%';
UPDATE users SET latitude = 15.1214, longitude = 108.8044 WHERE location LIKE '%Quảng Nam%';
UPDATE users SET latitude = 22.8026, longitude = 104.9784 WHERE location LIKE '%Hà Giang%';

-- Cập nhật tọa độ cho các quận/huyện cụ thể (nếu có)
UPDATE users SET latitude = 21.0245, longitude = 105.8412 WHERE location LIKE '%Cầu Giấy%';
UPDATE users SET latitude = 21.0583, longitude = 105.8233 WHERE location LIKE '%Tây Hồ%';
UPDATE users SET latitude = 21.0278, longitude = 105.8342 WHERE location LIKE '%Đống Đa%';
UPDATE users SET latitude = 10.7769, longitude = 106.7009 WHERE location LIKE '%Quận 1%';
UPDATE users SET latitude = 10.7860, longitude = 106.6953 WHERE location LIKE '%Quận 3%';
UPDATE users SET latitude = 16.0678, longitude = 108.2208 WHERE location LIKE '%Hải Châu%';
UPDATE users SET latitude = 20.8625, longitude = 106.6832 WHERE location LIKE '%Lê Chân%';
