-- TRUNCATE existing to restart IDs
TRUNCATE activities RESTART IDENTITY CASCADE;
TRUNCATE activity_images RESTART IDENTITY CASCADE;
TRUNCATE activity_tags RESTART IDENTITY CASCADE;

-- 5. ACTIVITIES (15 bài đăng)
INSERT INTO activities (creator_id, title, description, location, duration_minutes, max_participants, status) VALUES
(2,  'Đi leo Fansipan cuối tuần này',        'Mình dự định leo Fansipan ngày 25-26 tháng này. Ai muốn tham gia cùng thì inbox nhé, mình có kinh nghiệm leo núi 5 năm.',  'Sa Pa, Lào Cai',         2880, 10,   'active'),
(3,  'Jam session guitar acoustic',          'Tổ chức buổi chơi guitar acoustic tại nhà mình. Mọi trình độ đều được chào đón, mang theo nhạc cụ nếu có!',              'Quận 3, TP.HCM',         180,  8,    'active'),
(5,  'Workshop làm bánh mì sourdough',       'Hướng dẫn làm bánh mì sourdough từ đầu, bao gồm nuôi men, nhào bột và nướng bánh. Mang tạp dề nhé!',                    'Cầu Giấy, Hà Nội',       240,  6,    'active'),
(7,  'Chạy bộ buổi sáng quanh Hồ Tây',      'Hàng tuần vào sáng thứ 7, chạy cùng nhau khoảng 5-7km quanh Hồ Tây. Tập hợp lúc 6h sáng tại cổng chính.',               'Hồ Tây, Hà Nội',         90,   20,   'active'),
(8,  'Chụp ảnh bình minh Đà Lạt',           'Rủ nhau dậy sớm lên đồi Mộng Mơ chụp ảnh bình minh. Mình có máy ảnh chuyên nghiệp, sẵn sàng hướng dẫn góc chụp đẹp.',  'Đà Lạt, Lâm Đồng',       120,  5,    'active'),
(9,  'CLB đọc sách tháng 10',               'Tháng này đọc Sapiens của Yuval Harari. Gặp nhau thảo luận, chia sẻ cảm nhận. Ai chưa đọc cũng được, mình sẽ tóm tắt.', 'Hoàn Kiếm, Hà Nội',      150,  12,   'active'),
(11, 'Workshop Figma cơ bản đến nâng cao',  'Học thiết kế UI/UX với Figma. Từ wireframe đến prototype hoàn chỉnh. Mang laptop, cài sẵn Figma trước nhé!',              'Quận 1, TP.HCM',          360,  15,   'active'),
(10, 'Phượt Hà Giang 4 ngày 3 đêm',        'Cung đường Hà Giang loop huyền thoại. Cần có bằng lái xe máy, thể lực tốt. Chi phí ước tính 3-4 triệu/người.',            'Hà Giang',               5760, 6,    'active'),
(14, 'Xem bóng đá cùng nhau',              'Xem trận Việt Nam vs Thái Lan tại quán café có màn chiếu lớn. Hô hào cổ vũ cho đội nhà!',                                 'Đống Đa, Hà Nội',         150,  NULL, 'active'),
(13, 'Lớp yoga miễn phí cho người mới',    'Dành cho người chưa từng tập yoga. Mình sẽ hướng dẫn các tư thế cơ bản, tập trung vào hơi thở và thư giãn.',              'Tây Hồ, Hà Nội',          90,   10,   'active'),
(15, 'Lớp học làm bánh cupcake',           'Làm 12 chiếc cupcake đẹp mắt và ngon miệng. Nguyên liệu mình chuẩn bị sẵn, bạn chỉ cần mang nhiệt huyết!',               'Lê Chân, Hải Phòng',      180,  8,    'active'),
(19, 'Triển lãm tranh cộng đồng',          'Mỗi người mang 1-2 bức tranh (bất kỳ chất liệu) để trưng bày và giao lưu. Không cần là nghệ sĩ chuyên nghiệp.',           'Đà Lạt, Lâm Đồng',        240,  30,   'active'),
(18, 'Hackathon 24h - Giải pháp xanh',     'Xây dựng sản phẩm công nghệ giải quyết vấn đề môi trường trong 24h. Làm việc nhóm, mentor hỗ trợ, giải thưởng hấp dẫn.', 'Cầu Giấy, Hà Nội',       1440, 40,   'active'),
(4,  'LAN party cuối tuần',                'Mang PC/laptop đến cùng chơi game. Có Counter-Strike, Dota 2, Valorant. Kéo dài từ 14h đến 22h.',                         'Hải Châu, Đà Nẵng',       480,  16,   'active'),
(12, 'Buổi chiều cafe và acoustic',        'Ngồi cafe nghe nhạc acoustic live, ai biết chơi nhạc cụ thì cùng biểu diễn cho vui. Không áp lực gì cả!',                 'Quận Hải Châu, Đà Nẵng',  180,  NULL, 'active');

-- 6. ACTIVITY IMAGES
INSERT INTO activity_images (activity_id, image_url, sort_order, is_thumbnail) VALUES
(1,  'https://cdn.sothich.vn/act/a1_1.jpg',  0, TRUE),
(1,  'https://cdn.sothich.vn/act/a1_2.jpg',  1, FALSE),
(2,  'https://cdn.sothich.vn/act/a2_1.jpg',  0, TRUE),
(3,  'https://cdn.sothich.vn/act/a3_1.jpg',  0, TRUE),
(3,  'https://cdn.sothich.vn/act/a3_2.jpg',  1, FALSE),
(4,  'https://cdn.sothich.vn/act/a4_1.jpg',  0, TRUE),
(5,  'https://cdn.sothich.vn/act/a5_1.jpg',  0, TRUE),
(5,  'https://cdn.sothich.vn/act/a5_2.jpg',  1, FALSE),
(5,  'https://cdn.sothich.vn/act/a5_3.jpg',  2, FALSE),
(6,  'https://cdn.sothich.vn/act/a6_1.jpg',  0, TRUE),
(7,  'https://cdn.sothich.vn/act/a7_1.jpg',  0, TRUE),
(8,  'https://cdn.sothich.vn/act/a8_1.jpg',  0, TRUE),
(8,  'https://cdn.sothich.vn/act/a8_2.jpg',  1, FALSE),
(12, 'https://cdn.sothich.vn/act/a12_1.jpg', 0, TRUE),
(13, 'https://cdn.sothich.vn/act/a13_1.jpg', 0, TRUE);

-- 7. ACTIVITY TAGS
INSERT INTO activity_tags (activity_id, interest_id) VALUES
(1,  2),(1,  11),(1,  17),
(2,  13),(2,  3),
(3,  19),(3,  7),
(4,  8),(4,  11),
(5,  6),(5,  4),
(6,  1),(6,  14),
(7,  10),(7,  5),
(8,  11),(8,  2),(8,  17),
(9,  12),(9,  8),
(10, 9),(10, 18),
(11, 19),(11, 7),
(12, 16),(12, 6),
(13, 5),(13, 15),
(14, 20),
(15, 13),(15, 3);
