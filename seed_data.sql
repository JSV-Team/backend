USE SoThichDB;
GO

-- 1. Xóa dữ liệu cũ cẩn thận (tùy chọn, ở đây tôi chỉ thêm mới để tránh làm mất dữ liệu hiện tại của bạn)
-- Nếu bạn muốn xóa hết sạch dữ liệu cũ để chạy mới, hãy bỏ comment các dòng TRUNCATE/DELETE bên dưới:
/*
DELETE FROM Messages;
DELETE FROM ConversationMembers;
DELETE FROM Conversations;
DELETE FROM MatchSessions;
DELETE FROM ActivityRequests;
DELETE FROM ActivityTags;
DELETE FROM ActivityImages;
DELETE FROM Activities;
DELETE FROM UserInterests;
DELETE FROM Interests;
DELETE FROM DailyStatus;
DELETE FROM Notifications;
DELETE FROM Reports;
DELETE FROM ReputationLogs;
DELETE FROM BannedKeywords;
DELETE FROM SystemConfig;
DELETE FROM Users WHERE role <> 'admin';
*/

-- 2. Chèn USER (Thêm một số user cho năm 2025 và 2026)
INSERT INTO Users (username, email, password_hash, full_name, role, created_at, status) VALUES 
('nguyenvana', 'ana@example.com', '$2b$10$xyz', N'Nguyễn Văn A', 'user', '2025-10-15 10:00:00', 'active'),
('lethib', 'thib@example.com', '$2b$10$xyz', N'Lê Thị B', 'user', '2025-11-20 14:30:00', 'active'),
('tranvanc', 'vanc@example.com', '$2b$10$xyz', N'Trần Văn C', 'user', '2025-12-05 09:15:00', 'active'),
('phamthid', 'thid@example.com', '$2b$10$xyz', N'Phạm Thị D', 'user', '2026-01-12 16:45:00', 'active'),
('hoangvane', 'vane@example.com', '$2b$10$xyz', N'Hoàng Văn E', 'user', '2026-02-18 20:00:00', 'active'),
('vuthif', 'thif@example.com', '$2b$10$xyz', N'Vũ Thị F', 'user', '2026-03-01 11:20:00', 'active'),
('dangvang', 'vang@example.com', '$2b$10$xyz', N'Đặng Văn G', 'user', '2026-03-10 15:30:00', 'active');

-- 3. Chèn INTERESTS (Sở thích)
INSERT INTO Interests (name) VALUES 
(N'Bóng đá'), (N'Cầu lông'), (N'Xem phim'), (N'Đọc sách'), 
(N'Du lịch'), (N'Nấu ăn'), (N'Nhiếp ảnh'), (N'Lập trình');

-- 4. Chèn ACTIVITIES (Bài đăng)
DECLARE @UserA INT = (SELECT user_id FROM Users WHERE username = 'nguyenvana');
DECLARE @UserB INT = (SELECT user_id FROM Users WHERE username = 'lethib');

INSERT INTO Activities (creator_id, title, description, location, status, created_at) VALUES 
(@UserA, N'Tìm bạn đá bóng cuối tuần', N'Cần tìm 2-3 bạn đá sân cỏ nhân tạo quận 7', N'Quận 7, HCM', 'active', '2026-02-25 08:00:00'),
(@UserB, N'Lập nhóm leo núi Bà Đen', N'Dự kiến leo vào cuối tuần sau, ai đi cùng không?', N'Tây Ninh', 'active', '2026-03-05 10:00:00'),
(@UserA, N'Hợp tác dự án ReactJS', N'Mình đang làm dự án cá nhân, cần tìm bạn code cùng', N'Online', 'active', '2026-03-12 14:00:00');

-- 5. Chèn TAGS cho bài đăng
DECLARE @Act1 INT = (SELECT TOP 1 activity_id FROM Activities WHERE title LIKE N'%đá bóng%');
DECLARE @Act2 INT = (SELECT TOP 1 activity_id FROM Activities WHERE title LIKE N'%leo núi%');
DECLARE @InterestBD INT = (SELECT interest_id FROM Interests WHERE name = N'Bóng đá');
DECLARE @InterestDL INT = (SELECT interest_id FROM Interests WHERE name = N'Du lịch');

INSERT INTO ActivityTags (activity_id, interest_id) VALUES 
(@Act1, @InterestBD),
(@Act2, @InterestDL),
(@Act2, @InterestBD); -- Ví dụ leo núi cũng là thể thao

-- 6. Chèn MATCH SESSIONS (Ghép đôi) - Tạo dữ liệu cho 6 tháng gần nhất
DECLARE @U1 INT = (SELECT user_id FROM Users WHERE username = 'nguyenvana');
DECLARE @U2 INT = (SELECT user_id FROM Users WHERE username = 'lethib');
DECLARE @U3 INT = (SELECT user_id FROM Users WHERE username = 'tranvanc');
DECLARE @U4 INT = (SELECT user_id FROM Users WHERE username = 'phamthid');

INSERT INTO MatchSessions (user_one, user_two, match_type, status, created_at) VALUES 
(@U1, @U2, 'random', 'active', '2025-10-10 10:00:00'),
(@U2, @U3, 'selective', 'ended', '2025-11-15 11:00:00'),
(@U3, @U4, 'random', 'active', '2025-12-20 12:00:00'),
(@U1, @U3, 'selective', 'active', '2026-01-25 13:00:00'),
(@U2, @U4, 'random', 'active', '2026-02-10 14:00:00'),
(@U1, @U4, 'random', 'pending', '2026-03-05 15:00:00'),
(@U3, @U2, 'selective', 'active', '2026-03-15 16:00:00');

-- 7. Chèn REPORTS (Báo cáo)
DECLARE @Reporter INT = (SELECT user_id FROM Users WHERE username = 'hoangvane');
DECLARE @TargetUser INT = (SELECT user_id FROM Users WHERE username = 'nguyenvana');

INSERT INTO Reports (reporter_id, reported_user_id, reason, status, created_at, severity) VALUES 
(@Reporter, @TargetUser, N'Người dùng này có thái độ không đúng mực trong chat', 'pending', '2026-03-16 09:00:00', N'Trung bình'),
(@UserB, @TargetUser, N'Spam quảng cáo trong bài đăng', 'pending', '2026-03-17 10:00:00', N'Cao');

-- 8. Chèn DAILY STATUS
INSERT INTO DailyStatus (user_id, content, expires_at, created_at) VALUES 
(@UserA, N'Hôm nay thật là một ngày đẹp trời!', DATEADD(day, 1, GETDATE()), GETDATE());

GO
