/* =====================================================
   HỆ THỐNG KẾT NỐI SỞ THÍCH & HOẠT ĐỘNG NHÓM
   DATABASE – POSTGRESQL (FULL & FINAL)
   ===================================================== */

-- Tạo database (chạy ngoài nếu cần):
-- CREATE DATABASE "SoThichDB" ENCODING 'UTF8' LC_COLLATE 'vi_VN.UTF-8' LC_CTYPE 'vi_VN.UTF-8';
-- \c "SoThichDB"


-- =====================================================
-- 1. USERS – Tài khoản người dùng & admin
-- =====================================================
CREATE TABLE users (
    user_id          SERIAL        PRIMARY KEY,
    username         VARCHAR(50)   NOT NULL,
    email            VARCHAR(255)  NOT NULL,
    email_verified   BOOLEAN       NOT NULL DEFAULT FALSE,
    password_hash    VARCHAR(255)  NOT NULL,
    full_name        VARCHAR(100)  NULL,
    avatar_url       VARCHAR(500)  NULL,
    bio              TEXT          NULL,
    location         VARCHAR(100)  NULL,

    reputation_score INT           NOT NULL DEFAULT 100,

    -- active | banned
    status           VARCHAR(20)   NOT NULL DEFAULT 'active',
    ban_until        TIMESTAMPTZ   NULL,
    is_locked        BOOLEAN       NOT NULL DEFAULT FALSE,

    -- user | admin
    role             VARCHAR(20)   NOT NULL DEFAULT 'user',

    gender           VARCHAR(10)   NULL,
    dob              DATE          NULL,

    created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_users_username UNIQUE (username),
    CONSTRAINT uq_users_email    UNIQUE (email),
    CONSTRAINT chk_users_status  CHECK  (status IN ('active', 'banned')),
    CONSTRAINT chk_users_role    CHECK  (role   IN ('user', 'admin'))
);


-- =====================================================
-- 2. DAILY STATUS – Trạng thái hàng ngày
-- =====================================================
CREATE TABLE daily_status (
    status_id  SERIAL       PRIMARY KEY,
    user_id    INT          NOT NULL,
    content    VARCHAR(500) NULL,
    image_url  VARCHAR(500) NULL,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ  NOT NULL,   -- app layer set = created_at + 1 ngày

    CONSTRAINT fk_daily_status_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);


-- =====================================================
-- 3. INTERESTS – Danh mục sở thích / Tag
-- =====================================================
CREATE TABLE interests (
    interest_id SERIAL      PRIMARY KEY,
    name        VARCHAR(50) NOT NULL,

    CONSTRAINT uq_interests_name UNIQUE (name)
);

CREATE TABLE user_interests (
    user_id     INT NOT NULL,
    interest_id INT NOT NULL,

    CONSTRAINT pk_user_interests          PRIMARY KEY (user_id, interest_id),
    CONSTRAINT fk_user_interests_user     FOREIGN KEY (user_id)     REFERENCES users(user_id)     ON DELETE CASCADE,
    CONSTRAINT fk_user_interests_interest FOREIGN KEY (interest_id) REFERENCES interests(interest_id) ON DELETE CASCADE
);


-- =====================================================
-- 4. ACTIVITIES – Bài đăng hoạt động
-- =====================================================
CREATE TABLE activities (
    activity_id      SERIAL       PRIMARY KEY,
    creator_id       INT          NOT NULL,
    title            VARCHAR(200) NOT NULL,
    description      TEXT         NULL,
    location         VARCHAR(100) NULL,
    duration_minutes INT          NULL,
    max_participants INT          NULL,   -- NULL = không giới hạn

    -- active | deleted
    status           VARCHAR(20)  NOT NULL DEFAULT 'active',
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_activities_creator  FOREIGN KEY (creator_id) REFERENCES users(user_id),
    CONSTRAINT chk_activities_status  CHECK (status IN ('active', 'deleted')),
    CONSTRAINT chk_activities_maxpart CHECK (max_participants IS NULL OR max_participants > 0)
);

-- Ảnh đính kèm bài đăng (nhiều ảnh / bài)
CREATE TABLE activity_images (
    image_id     SERIAL       PRIMARY KEY,
    activity_id  INT          NOT NULL,
    image_url    VARCHAR(500) NOT NULL,
    sort_order   INT          NOT NULL DEFAULT 0,
    is_thumbnail BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_activity_images_activity FOREIGN KEY (activity_id) REFERENCES activities(activity_id) ON DELETE CASCADE
);

-- Tag sở thích của bài đăng
CREATE TABLE activity_tags (
    activity_id INT NOT NULL,
    interest_id INT NOT NULL,

    CONSTRAINT pk_activity_tags          PRIMARY KEY (activity_id, interest_id),
    CONSTRAINT fk_activity_tags_activity FOREIGN KEY (activity_id) REFERENCES activities(activity_id) ON DELETE CASCADE,
    CONSTRAINT fk_activity_tags_interest FOREIGN KEY (interest_id) REFERENCES interests(interest_id)
);

-- Yêu cầu tham gia hoạt động
CREATE TABLE activity_requests (
    request_id   SERIAL      PRIMARY KEY,
    activity_id  INT         NOT NULL,
    requester_id INT         NOT NULL,

    -- pending | accepted | rejected
    status       VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_activity_requests          UNIQUE      (activity_id, requester_id),
    CONSTRAINT fk_activity_requests_activity FOREIGN KEY (activity_id)  REFERENCES activities(activity_id) ON DELETE CASCADE,
    CONSTRAINT fk_activity_requests_user     FOREIGN KEY (requester_id) REFERENCES users(user_id),
    CONSTRAINT chk_activity_requests_status  CHECK       (status IN ('pending', 'accepted', 'rejected'))
);


-- =====================================================
-- 5. FOLLOW SYSTEM
-- =====================================================
CREATE TABLE follows (
    follower_id  INT         NOT NULL,
    following_id INT         NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_follows           PRIMARY KEY (follower_id, following_id),
    CONSTRAINT fk_follows_follower  FOREIGN KEY (follower_id)  REFERENCES users(user_id),
    CONSTRAINT fk_follows_following FOREIGN KEY (following_id) REFERENCES users(user_id),
    CONSTRAINT chk_follow_not_self  CHECK (follower_id <> following_id)
);


-- =====================================================
-- 6. MATCH SYSTEM – Ghép đôi
-- =====================================================
-- Quy ước: app layer luôn INSERT với user_one = MIN(a,b), user_two = MAX(a,b)
-- CHECK user_one < user_two + UNIQUE(user_one, user_two) đảm bảo không trùng cặp
CREATE TABLE match_sessions (
    match_id     SERIAL      PRIMARY KEY,
    user_one     INT         NOT NULL,
    user_two     INT         NOT NULL,
    match_type   VARCHAR(20) NOT NULL,   -- random | selective
    requested_by INT         NULL,       -- người khởi tạo (dùng cho selective)

    -- pending | active | rejected | ended
    status       VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_match           UNIQUE (user_one, user_two),
    CONSTRAINT chk_match_order    CHECK  (user_one < user_two),
    CONSTRAINT chk_match_type     CHECK  (match_type IN ('random', 'selective', 'interest')),
    CONSTRAINT chk_match_status   CHECK  (status     IN ('pending', 'active', 'rejected', 'ended')),

    CONSTRAINT fk_match_user_one   FOREIGN KEY (user_one)     REFERENCES users(user_id),
    CONSTRAINT fk_match_user_two   FOREIGN KEY (user_two)     REFERENCES users(user_id),
    CONSTRAINT fk_match_requester  FOREIGN KEY (requested_by) REFERENCES users(user_id)
);


-- =====================================================
-- 7. CHAT SYSTEM – Hội thoại & Tin nhắn
-- =====================================================
CREATE TABLE conversations (
    conversation_id   SERIAL      PRIMARY KEY,

    -- direct | group | activity | private
    conversation_type VARCHAR(20) NOT NULL,

    -- temporary | permanent
    group_lifetime    VARCHAR(20) NOT NULL DEFAULT 'permanent',

    activity_id       INT         NULL,   -- chỉ có giá trị khi type = 'activity'
    expires_at        TIMESTAMPTZ NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_conversations_activity FOREIGN KEY (activity_id) REFERENCES activities(activity_id) ON DELETE SET NULL,
    CONSTRAINT chk_conversation_type     CHECK (conversation_type IN ('direct', 'group', 'activity', 'private')),
    CONSTRAINT chk_group_lifetime        CHECK (group_lifetime     IN ('temporary', 'permanent'))
);

CREATE TABLE conversation_members (
    conversation_id INT         NOT NULL,
    user_id         INT         NOT NULL,

    -- host | member
    role            VARCHAR(20) NOT NULL DEFAULT 'member',
    joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    left_at         TIMESTAMPTZ NULL,

    CONSTRAINT pk_conversation_members PRIMARY KEY (conversation_id, user_id),
    CONSTRAINT fk_cm_conversation      FOREIGN KEY (conversation_id) REFERENCES conversations(conversation_id) ON DELETE CASCADE,
    CONSTRAINT fk_cm_user              FOREIGN KEY (user_id)         REFERENCES users(user_id),
    CONSTRAINT chk_cm_role             CHECK (role IN ('host', 'member'))
);

CREATE TABLE messages (
    message_id      BIGSERIAL    PRIMARY KEY,
    conversation_id INT          NOT NULL,
    sender_id       INT          NOT NULL,
    content         TEXT         NULL,
    image_url       VARCHAR(500) NULL,
    -- msg_type = 'image'  → content = image_url
    -- msg_type = 'system' → content = nội dung hệ thống tự sinh

    -- text | image | system | location
    msg_type        VARCHAR(20)  NOT NULL DEFAULT 'text',
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_messages_conversation FOREIGN KEY (conversation_id) REFERENCES conversations(conversation_id) ON DELETE CASCADE,
    CONSTRAINT fk_messages_sender       FOREIGN KEY (sender_id)       REFERENCES users(user_id),
    CONSTRAINT chk_messages_type        CHECK (msg_type IN ('text', 'image', 'system', 'location'))
);

-- =====================================================
-- 8. POST INTERACTIONS – Reactions, Comments, Shares
-- =====================================================

CREATE TABLE post_reactions (
    reaction_id SERIAL       PRIMARY KEY,
    post_id     INT          NOT NULL,
    user_id     INT          NOT NULL,
    emoji       VARCHAR(50)  NOT NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_post_reactions_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE post_comments (
    comment_id SERIAL       PRIMARY KEY,
    post_id    INT          NOT NULL,
    user_id    INT          NOT NULL,
    content    TEXT         NOT NULL,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_post_comments_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE post_shares (
    share_id   SERIAL       PRIMARY KEY,
    post_id    INT          NOT NULL,
    user_id    INT          NOT NULL,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_post_shares_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT uq_post_shares       UNIQUE (post_id, user_id)
);


-- =====================================================
-- 8. NOTIFICATIONS – Thông báo
-- =====================================================
CREATE TABLE notifications (
    notification_id INT         GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id         INT         NOT NULL,

    -- Loại: activity_request | match_request | match_accepted
    --        message | follow | system | report_resolved
    type            VARCHAR(50) NOT NULL,

    ref_id          INT         NULL,   -- ID tham chiếu tuỳ theo type
    content         VARCHAR(500) NULL,
    is_read         BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);


-- =====================================================
-- 9. REPORTS – Báo cáo vi phạm
-- =====================================================
CREATE TABLE reports (
    report_id            SERIAL      PRIMARY KEY,
    reporter_id          INT         NOT NULL,
    reported_user_id     INT         NULL,   -- báo cáo user
    reported_activity_id INT         NULL,   -- báo cáo bài đăng

    reason               TEXT        NULL,

    -- pending | resolved | dismissed
    status               VARCHAR(20) NOT NULL DEFAULT 'pending',

    resolved_by          INT         NULL,   -- admin xử lý
    resolved_at          TIMESTAMPTZ NULL,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Bắt buộc phải báo cáo ít nhất 1 trong 2 đối tượng
    CONSTRAINT chk_report_target       CHECK (reported_user_id IS NOT NULL OR reported_activity_id IS NOT NULL),
    CONSTRAINT chk_report_status       CHECK (status IN ('pending', 'resolved', 'dismissed')),

    CONSTRAINT fk_reports_reporter          FOREIGN KEY (reporter_id)          REFERENCES users(user_id),
    CONSTRAINT fk_reports_reported_user     FOREIGN KEY (reported_user_id)     REFERENCES users(user_id),
    CONSTRAINT fk_reports_reported_activity FOREIGN KEY (reported_activity_id) REFERENCES activities(activity_id) ON DELETE SET NULL,
    CONSTRAINT fk_reports_resolved_by       FOREIGN KEY (resolved_by)          REFERENCES users(user_id)
);


-- =====================================================
-- 10. REPUTATION LOGS – Lịch sử điểm uy tín
-- =====================================================
CREATE TABLE reputation_logs (
    log_id     SERIAL       PRIMARY KEY,
    user_id    INT          NOT NULL,
    delta      INT          NOT NULL,   -- dương: cộng | âm: trừ
    reason     VARCHAR(200) NULL,
    ref_type   VARCHAR(50)  NULL,       -- 'activity' | 'report' | 'match' | 'system'
    ref_id     INT          NULL,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_rep_log_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);


-- =====================================================
-- 11. ADMIN – Từ khóa cấm & Cấu hình hệ thống
-- =====================================================
CREATE TABLE banned_keywords (
    keyword_id SERIAL       PRIMARY KEY,
    keyword    VARCHAR(100) NOT NULL,
    created_by INT          NULL,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_banned_keywords_keyword UNIQUE (keyword),
    CONSTRAINT fk_banned_keywords_admin   FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE TABLE system_config (
    config_id    SERIAL       PRIMARY KEY,
    config_key   VARCHAR(100) NOT NULL,
    config_value TEXT         NULL,
    updated_by   INT          NULL,
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_system_config_key   UNIQUE (config_key),
    CONSTRAINT fk_system_config_admin FOREIGN KEY (updated_by) REFERENCES users(user_id) ON DELETE SET NULL
);


/* =====================================================
   INDEX – Tối ưu truy vấn phổ biến
   ===================================================== */

CREATE INDEX ix_activities_creator     ON activities       (creator_id);
CREATE INDEX ix_activities_status      ON activities       (status);

CREATE INDEX ix_activity_images_act    ON activity_images  (activity_id, sort_order);

CREATE INDEX ix_act_req_activity       ON activity_requests (activity_id);
CREATE INDEX ix_act_req_requester      ON activity_requests (requester_id);

CREATE INDEX ix_follows_following      ON follows           (following_id);

CREATE INDEX ix_match_user_one         ON match_sessions    (user_one);
CREATE INDEX ix_match_user_two         ON match_sessions    (user_two);

CREATE INDEX ix_messages_conv          ON messages          (conversation_id, created_at);

CREATE INDEX ix_notif_user_unread      ON notifications     (user_id, is_read, created_at);

CREATE INDEX ix_reports_status         ON reports           (status);

CREATE INDEX ix_daily_status_user      ON daily_status      (user_id, expires_at);

CREATE INDEX ix_rep_log_user           ON reputation_logs   (user_id, created_at);
/* =====================================================
   SEED DATA – DỮ LIỆU MẪU ĐỂ TEST
   HỆ THỐNG KẾT NỐI SỞ THÍCH & HOẠT ĐỘNG NHÓM
   ===================================================== */


-- =====================================================
-- 1. USERS (20 users: 1 admin + 19 user thường)
-- password_hash tương ứng plaintext: "Password@123"
-- =====================================================
INSERT INTO users (username, email, email_verified, password_hash, full_name, avatar_url, bio, location, reputation_score, status, is_locked, role, gender, dob) VALUES
('admin_antigravity', 'admin@sothich.vn',       TRUE,  '$2b$12$LXMBmKZ43J5E2ZNVQ7FXXOlat6lYPRoPJa9Smwd9hqvF5d6Cm0S4i', 'Quản Trị Viên',   'https://cdn.sothich.vn/avatars/admin.jpg',   'Tôi là admin hệ thống.',           'Hà Nội',        500, 'active', FALSE, 'admin',  'male',   '1990-01-15'),
('nguyen_minh',  'minh.nguyen@gmail.com',  TRUE,  '$2b$12$LXMBmKZ43J5E2ZNVQ7FXXOlat6lYPRoPJa9Smwd9hqvF5d6Cm0S4i', 'Nguyễn Văn Minh', 'https://cdn.sothich.vn/avatars/u2.jpg',      'Thích đọc sách và leo núi.',        'Hà Nội',        320, 'active', FALSE, 'user',   'male',   '1995-03-22'),
('tran_linh',    'linh.tran@gmail.com',    TRUE,  '$2b$12$LXMBmKZ43J5E2ZNVQ7FXXOlat6lYPRoPJa9Smwd9hqvF5d6Cm0S4i', 'Trần Thị Linh',   'https://cdn.sothich.vn/avatars/u3.jpg',      'Yêu âm nhạc, du lịch bụi.',        'TP. Hồ Chí Minh',280, 'active', FALSE, 'user',   'female', '1997-07-14'),
('le_duc_anh',   'ducanh.le@yahoo.com',    TRUE,  '$2b$12$LXMBmKZ43J5E2ZNVQ7FXXOlat6lYPRoPJa9Smwd9hqvF5d6Cm0S4i', 'Lê Đức Anh',      'https://cdn.sothich.vn/avatars/u4.jpg',      'Lập trình viên, mê game.',         'Đà Nẵng',       210, 'active', FALSE, 'user',   'male',   '1998-11-05'),
('pham_thu_ha',  'thuha.pham@outlook.com', TRUE,  '$2b$12$LXMBmKZ43J5E2ZNVQ7FXXOlat6lYPRoPJa9Smwd9hqvF5d6Cm0S4i', 'Phạm Thu Hà',     'https://cdn.sothich.vn/avatars/u5.jpg',      'Đầu bếp nghiệp dư, thích nấu ăn.','Hải Phòng',     190, 'active', FALSE, 'user',   'female', '1996-05-30'),
('hoang_tuan',   'tuan.hoang@gmail.com',   FALSE, '$2b$12$LXMBmKZ43J5E2ZNVQ7FXXOlat6lYPRoPJa9Smwd9hqvF5d6Cm0S4i', 'Hoàng Tuấn',      NULL,                                         'Mới tham gia, đang khám phá.',     'Cần Thơ',       100, 'active', FALSE, 'user',   'male',   '2000-09-18'),
('vo_bich_van',  'bichvan.vo@gmail.com',   TRUE,  '$2b$12$LXMBmKZ43J5E2ZNVQ7FXXOlat6lYPRoPJa9Smwd9hqvF5d6Cm0S4i', 'Võ Bích Vân',     'https://i.pravatar.cc/150?u=7',      'Yêu thể thao, chạy bộ mỗi sáng.', 'Hà Nội',        415, 'active', FALSE, 'user',   'female', '1994-12-01'),
('dang_quoc_bao','quocbao.dang@gmail.com', TRUE,  '$2b$12$LXMBmKZ43J5E2ZNVQ7FXXOlat6lYPRoPJa9Smwd9hqvF5d6Cm0S4i', 'Đặng Quốc Bảo',   'https://i.pravatar.cc/150?u=8',      'Nhiếp ảnh phong cảnh.',            'Đà Lạt',        370, 'active', FALSE, 'user',   'male',   '1993-04-25'),
('nguyen_khanh', 'khanh.ntt@gmail.com',    TRUE,  '$2b$12$LXMBmKZ43J5E2ZNVQ7FXXOlat6lYPRoPJa9Smwd9hqvF5d6Cm0S4i', 'Nguyễn Thị Khánh','https://i.pravatar.cc/150?u=9',      'Giáo viên, yêu văn học.',          'Huế',           255, 'active', FALSE, 'user',   'female', '1992-08-10'),
('bui_manh_hung','manhhung.bui@gmail.com', TRUE,  '$2b$12$LXMBmKZ43J5E2ZNVQ7FXXOlat6lYPRoPJa9Smwd9hqvF5d6Cm0S4i', 'Bùi Mạnh Hùng',   'https://i.pravatar.cc/150?u=10',     'Kỹ sư xây dựng, mê phượt.',       'Hà Nội',        300, 'active', FALSE, 'user',   'male',   '1991-02-28'),
('ly_tuyet_mai', 'tuyetmai.ly@gmail.com',  TRUE,  '$2b$12$LXMBmKZ43J5E2ZNVQ7FXXOlat6lYPRoPJa9Smwd9hqvF5d6Cm0S4i', 'Lý Tuyết Mai',    'https://i.pravatar.cc/150?u=11',     'Thiết kế đồ họa freelance.',       'TP. Hồ Chí Minh',340, 'active', FALSE, 'user',   'female', '1999-06-17'),
('tran_van_long','vanlong.tran@gmail.com', TRUE,  '$2b$12$LXMBmKZ43J5E2ZNVQ7FXXOlat6lYPRoPJa9Smwd9hqvF5d6Cm0S4i', 'Trần Văn Long',   'https://i.pravatar.cc/150?u=12',     'Chơi guitar, thích cafe sách.',    'Đà Nẵng',       180, 'active', FALSE, 'user',   'male',   '1996-10-03'),
('mai_hong_nhung','hongnhung.mai@gmail.com',TRUE, '$2b$12$LXMBmKZ43J5E2ZNVQ7FXXOlat6lYPRoPJa9Smwd9hqvF5d6Cm0S4i', 'Mai Hồng Nhung',  'https://i.pravatar.cc/150?u=13',     'Yêu yoga và thiền định.',          'Hà Nội',        290, 'active', FALSE, 'user',   'female', '1995-01-20'),
('phan_thanh_son','thanhson.phan@gmail.com',TRUE, '$2b$12$LXMBmKZ43J5E2ZNVQ7FXXOlat6lYPRoPJa9Smwd9hqvF5d6Cm0S4i', 'Phan Thành Sơn',  'https://i.pravatar.cc/150?u=14',     'Bóng đá và cà phê.',               'TP. Hồ Chí Minh',220, 'active', FALSE, 'user',   'male',   '1997-04-07'),
('dinh_thi_lan', 'thilan.dinh@gmail.com',  TRUE,  '$2b$12$LXMBmKZ43J5E2ZNVQ7FXXOlat6lYPRoPJa9Smwd9hqvF5d6Cm0S4i', 'Đinh Thị Lan',    'https://i.pravatar.cc/150?u=15',     'Bác sĩ, mê làm bánh.',             'Hải Phòng',     310, 'active', FALSE, 'user',   'female', '1990-07-22'),
('cao_minh_tri', 'minhtri.cao@gmail.com',  FALSE, '$2b$12$LXMBmKZ43J5E2ZNVQ7FXXOlat6lYPRoPJa9Smwd9hqvF5d6Cm0S4i', 'Cao Minh Trí',    NULL,                                         NULL,                               'Bình Dương',    100, 'active', FALSE, 'user',   'male',   '2001-03-11'),
('luu_thi_oanh', 'thioanh.luu@gmail.com',  TRUE,  '$2b$12$LXMBmKZ43J5E2ZNVQ7FXXOlat6lYPRoPJa9Smwd9hqvF5d6Cm0S4i', 'Lưu Thị Oanh',    'https://i.pravatar.cc/150?u=17',     'Kế toán, thích đọc truyện.',       'Cần Thơ',       160, 'active', FALSE, 'user',   'female', '1993-11-30'),
('ngo_xuan_bach','xuanbach.ngo@gmail.com', TRUE,  '$2b$12$LXMBmKZ43J5E2ZNVQ7FXXOlat6lYPRoPJa9Smwd9hqvF5d6Cm0S4i', 'Ngô Xuân Bách',   'https://i.pravatar.cc/150?u=18',     'Startup founder, mê công nghệ.',   'Hà Nội',        450, 'active', FALSE, 'user',   'male',   '1992-09-05'),
('trinh_cam_van','camvan.trinh@gmail.com', TRUE,  '$2b$12$LXMBmKZ43J5E2ZNVQ7FXXOlat6lYPRoPJa9Smwd9hqvF5d6Cm0S4i', 'Trịnh Cẩm Vân',   'https://i.pravatar.cc/150?u=19',     'Nghệ sĩ vẽ tranh, yêu thiên nhiên.','Đà Lạt',      385, 'active', FALSE, 'user',   'female', '1998-02-14'),
('vuong_the_vinh','thevinh.vuong@gmail.com',TRUE, '$2b$12$LXMBmKZ43J5E2ZNVQ7FXXOlat6lYPRoPJa9Smwd9hqvF5d6Cm0S4i', 'Vương Thế Vinh',  'https://i.pravatar.cc/150?u=20',     'Thích leo núi và cắm trại.',       'Quảng Nam',     270, 'banned', FALSE, 'user',   'male',   '1994-06-09');

-- =====================================================
-- 2. DAILY STATUS (15 status)
-- =====================================================
INSERT INTO daily_status (user_id, content, image_url, created_at, expires_at) VALUES
(2,  'Sáng nay trời đẹp quá, ai đi chạy bộ Hồ Tây không?',       'https://picsum.photos/seed/s1/800/600',  NOW() - INTERVAL '2 hours',  NOW() + INTERVAL '22 hours'),
(3,  'Vừa xem xong concert, tuyệt vời!',                          NULL,                                    NOW() - INTERVAL '3 hours',  NOW() + INTERVAL '21 hours'),
(4,  'Debug từ sáng đến giờ... cần nghỉ ngơi',                    NULL,                                    NOW() - INTERVAL '1 hour',   NOW() + INTERVAL '23 hours'),
(5,  'Vừa làm xong bánh croissant, thơm lắm!',                    'https://picsum.photos/seed/s2/800/600',  NOW() - INTERVAL '4 hours',  NOW() + INTERVAL '20 hours'),
(7,  'Chạy 10km sáng nay, cảm giác tuyệt!',                       'https://picsum.photos/seed/s3/800/600',  NOW() - INTERVAL '5 hours',  NOW() + INTERVAL '19 hours'),
(8,  'Anh bình minh ở Đà Lạt hôm nay',                            'https://picsum.photos/seed/s4/800/600',  NOW() - INTERVAL '6 hours',  NOW() + INTERVAL '18 hours'),
(9,  'Đang đọc Truyện Kiều lần thứ ba, mỗi lần một cảm xúc.',    NULL,                                    NOW() - INTERVAL '2 hours',  NOW() + INTERVAL '22 hours'),
(11, 'Vừa hoàn thành dự án thiết kế mới!',                        'https://picsum.photos/seed/s5/800/600',  NOW() - INTERVAL '1 hour',   NOW() + INTERVAL '23 hours'),
(12, 'Cafe sách chiều nay, ai muốn join?',                        NULL,                                    NOW() - INTERVAL '30 minutes', NOW() + INTERVAL '23 hours'),
(13, 'Buổi yoga sáng nay thư thái lắm',                           'https://picsum.photos/seed/s6/800/600',  NOW() - INTERVAL '3 hours',  NOW() + INTERVAL '21 hours'),
(14, 'Xem bóng đá cùng nhau',                                     NULL,                                    NOW() - INTERVAL '2 hours',  NOW() + INTERVAL '22 hours'),
(18, 'Vừa pitch xong cho investors, hồi hộp lắm!',                NULL,                                    NOW() - INTERVAL '1 hour',   NOW() + INTERVAL '23 hours'),
(19, 'Hoàn thành bức tranh sơn dầu sau 2 tuần.',                  'https://picsum.photos/seed/s7/800/600',  NOW() - INTERVAL '4 hours',  NOW() + INTERVAL '20 hours'),
(10, 'Lên kế hoạch phượt Hà Giang tháng sau!',                   'https://picsum.photos/seed/s8/800/600',  NOW() - INTERVAL '5 hours',  NOW() + INTERVAL '19 hours'),
(2,  'Vừa đọc xong Atomic Habits, hay thật sự.',                  NULL,                                    NOW() - INTERVAL '6 hours',  NOW() + INTERVAL '18 hours');


-- =====================================================
-- 3. INTERESTS (20 sở thích)
-- =====================================================
INSERT INTO interests (name) VALUES
('Đọc sách'),
('Leo núi'),
('Âm nhạc'),
('Du lịch'),
('Lập trình'),
('Nhiếp ảnh'),
('Nấu ăn'),
('Thể thao'),
('Yoga'),
('Thiết kế đồ họa'),
('Phượt'),
('Bóng đá'),
('Guitar'),
('Văn học'),
('Công nghệ'),
('Vẽ tranh'),
('Cắm trại'),
('Thiền định'),
('Làm bánh'),
('Game');


-- =====================================================
-- 4. USER INTERESTS
-- =====================================================
INSERT INTO user_interests (user_id, interest_id) VALUES
(2, 1),(2, 2),(2, 11),
(3, 3),(3, 4),(3, 13),
(4, 5),(4, 20),(4, 15),
(5, 7),(5, 19),(5, 1),
(6, 12),(6, 8),
(7, 8),(7, 9),(7, 18),
(8, 6),(8, 4),(8, 17),
(9, 14),(9, 1),(9, 3),
(10, 11),(10, 2),(10, 17),
(11, 10),(11, 16),(11, 3),
(12, 13),(12, 3),(12, 1),
(13, 9),(13, 18),(13, 1),
(14, 12),(14, 8),(14, 20),
(15, 19),(15, 7),(15, 9),
(16, 20),(16, 5),
(17, 1),(17, 3),
(18, 5),(18, 15),(18, 1),
(19, 16),(19, 10),(19, 6),
(20, 2),(20, 17),(20, 11);


-- =====================================================
-- 5. ACTIVITIES (15 bài đăng)
-- =====================================================
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


-- =====================================================
-- 6. ACTIVITY IMAGES
-- =====================================================
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


-- =====================================================
-- 7. ACTIVITY TAGS
-- =====================================================
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


-- =====================================================
-- 8. ACTIVITY REQUESTS
-- =====================================================
INSERT INTO activity_requests (activity_id, requester_id, status) VALUES
(1,  7,  'accepted'),
(1,  10, 'accepted'),
(1,  20, 'pending'),
(1,  8,  'pending'),
(2,  9,  'accepted'),
(2,  12, 'accepted'),
(2,  3,  'pending'),
(3,  15, 'accepted'),
(3,  13, 'accepted'),
(3,  9,  'rejected'),
(4,  2,  'accepted'),
(4,  9,  'accepted'),
(4,  13, 'accepted'),
(4,  6,  'pending'),
(5,  19, 'accepted'),
(5,  11, 'pending'),
(6,  2,  'accepted'),
(6,  12, 'accepted'),
(6,  17, 'pending'),
(7,  4,  'accepted'),
(7,  16, 'pending'),
(8,  2,  'accepted'),
(8,  3,  'accepted'),
(8,  7,  'pending'),
(9,  2,  'accepted'),
(9,  4,  'accepted'),
(9,  6,  'accepted'),
(10, 7,  'accepted'),
(10, 15, 'accepted'),
(11, 5,  'accepted'),
(12, 2,  'pending'),
(13, 4,  'accepted'),
(13, 16, 'accepted'),
(14, 3,  'accepted'),
(14, 9,  'pending'),
(15, 3,  'accepted'),
(15, 9,  'accepted');


-- =====================================================
-- 9. FOLLOWS
-- =====================================================
INSERT INTO follows (follower_id, following_id) VALUES
(2,  3),(2,  7),(2,  8),(2,  10),(2,  18),
(3,  2),(3,  11),(3,  12),(3,  9),
(4,  18),(4,  2),(4,  16),
(5,  15),(5,  13),(5,  9),
(6,  14),(6,  2),(6,  7),
(7,  2),(7,  13),(7,  10),(7,  4),
(8,  2),(8,  19),(8,  5),
(9,  2),(9,  3),(9,  12),(9,  17),
(10, 2),(10, 8),(10, 20),(10, 7),
(11, 3),(11, 19),(11, 8),
(12, 3),(12, 2),(12, 9),
(13, 7),(13, 9),(13, 15),
(14, 6),(14, 2),(14, 9),
(15, 5),(15, 13),(15, 9),
(16, 4),(16, 18),
(17, 9),(17, 3),
(18, 4),(18, 2),(18, 11),
(19, 8),(19, 11),(19, 3),
(20, 10),(20, 2),(20, 8);


-- =====================================================
-- 10. MATCH SESSIONS
-- =====================================================
INSERT INTO match_sessions (user_one, user_two, match_type, requested_by, status) VALUES
(2,  3,  'random',    NULL, 'active'),
(2,  7,  'selective', 2,    'active'),
(2,  9,  'random',    NULL, 'active'),
(3,  11, 'selective', 3,    'active'),
(3,  12, 'random',    NULL, 'active'),
(4,  16, 'random',    NULL, 'active'),
(4,  18, 'selective', 18,   'pending'),
(5,  15, 'selective', 5,    'active'),
(6,  14, 'random',    NULL, 'active'),
(7,  13, 'selective', 7,    'active'),
(8,  19, 'selective', 19,   'active'),
(9,  17, 'random',    NULL, 'active'),
(10, 20, 'selective', 10,   'rejected'),
(11, 19, 'random',    NULL, 'active'),
(12, 15, 'selective', 12,   'pending');


-- =====================================================
-- 11. CONVERSATIONS
-- =====================================================
INSERT INTO conversations (conversation_type, group_lifetime, activity_id, expires_at) VALUES
('direct',   'permanent', NULL, NULL),
('direct',   'permanent', NULL, NULL),
('direct',   'permanent', NULL, NULL),
('direct',   'permanent', NULL, NULL),
('direct',   'permanent', NULL, NULL),
('activity', 'temporary', 1,   NOW() + INTERVAL '30 days'),
('activity', 'temporary', 4,   NOW() + INTERVAL '7 days'),
('activity', 'temporary', 8,   NOW() + INTERVAL '30 days'),
('activity', 'temporary', 13,  NOW() + INTERVAL '14 days'),
('group',    'permanent', NULL, NULL),
('private',  'permanent', NULL, NULL);


-- =====================================================
-- 12. CONVERSATION MEMBERS
-- =====================================================
INSERT INTO conversation_members (conversation_id, user_id, role) VALUES
(1,  2,  'host'),  (1,  3,  'member'),
(2,  2,  'host'),  (2,  7,  'member'),
(3,  3,  'host'),  (3,  11, 'member'),
(4,  5,  'host'),  (4,  15, 'member'),
(5,  7,  'host'),  (5,  13, 'member'),
(6,  2,  'host'),  (6,  7,  'member'), (6,  10, 'member'),
(7,  7,  'host'),  (7,  2,  'member'), (7,  9,  'member'), (7,  13, 'member'),
(8,  10, 'host'),  (8,  2,  'member'), (8,  3,  'member'),
(9,  18, 'host'),  (9,  4,  'member'), (9,  16, 'member'),
(10, 2,  'host'),  (10, 7,  'member'), (10, 9,  'member'), (10, 13, 'member'), (10, 10, 'member'),
(11, 2,  'host'),  (11, 18, 'member');


-- =====================================================
-- 13. MESSAGES
-- =====================================================
INSERT INTO messages (conversation_id, sender_id, content, msg_type) VALUES
(1,  2,  'Chào Linh! Mình thấy bạn cũng thích âm nhạc nhỉ?',                                                      'text'),
(1,  3,  'Ừ, mình mê âm nhạc từ nhỏ. Bạn chơi nhạc cụ nào không?',                                               'text'),
(1,  2,  'Mình đang học guitar. Bạn có muốn join buổi jam session không?',                                         'text'),
(1,  3,  'Thích lắm! Khi nào vậy bạn?',                                                                           'text'),
(2,  7,  'Chào Minh, mình thấy bạn hay chạy bộ Hồ Tây không?',                                                   'text'),
(2,  2,  'Đúng rồi, hầu như sáng nào mình cũng chạy.',                                                           'text'),
(2,  7,  'Tuyệt! Sáng thứ 7 này join nhóm mình nhé!',                                                            'text'),
(5,  7,  'Nhung ơi, bạn dạy yoga không?',                                                                         'text'),
(5,  13, 'Mình không phải giáo viên chuyên nghiệp nhưng hay tập và biết hướng dẫn cơ bản. Bạn muốn học không?', 'text'),
(5,  7,  'Muốn lắm! Bạn có mở lớp không?',                                                                       'text'),
(5,  13, 'Đang có lớp yoga miễn phí đây, bạn đăng ký đi!',                                                       'text'),
(6,  2,  'Chào mọi người! Group leo Fansipan đây',                                                               'text'),
(6,  7,  'Mình sẵn sàng! Cần chuẩn bị gì vậy anh?',                                                             'text'),
(6,  10, 'Cần giày leo núi tốt, áo ấm và gậy leo núi.',                                                          'text'),
(6,  2,  'Đúng rồi, thời tiết trên đỉnh khá lạnh.',                                                              'text'),
(6,  7,  'https://cdn.sothich.vn/msg/fansi_map.jpg',                                                             'image'),
(6,  10, 'Cảm ơn bản đồ! Mình đã chuẩn bị xong rồi.',                                                           'text'),
(7,  7,  '6h sáng thứ 7 tại cổng chính Hồ Tây nhé mọi người!',                                                   'text'),
(7,  2,  'Mình sẽ có mặt!',                                                                                       'text'),
(7,  9,  'Mình đi lần đầu, chạy chậm thôi có được không?',                                                       'text'),
(7,  7,  'Được chứ, ai đi tốc độ của người đó',                                                                   'text'),
(7,  13, 'Mình cũng sẽ tham gia, hẹn gặp cuối tuần!',                                                            'text'),
(10, 2,  'Cả nhóm tụ tập cuối tuần này không?',                                                                   'text'),
(10, 7,  'Mình free chiều thứ 7!',                                                                                 'text'),
(10, 9,  'Sáng thứ 7 mình chạy bộ, chiều rảnh.',                                                                  'text'),
(10, 13, 'Mình cũng free chiều thứ 7.',                                                                            'text'),
(10, 10, 'Oke mình cũng được, đi cafe hay đi đâu?',                                                               'text'),
(10, 2,  'Đến cafe sách ở Tây Hồ, chill lắm!',                                                                    'text'),
(10, 7,  'https://cdn.sothich.vn/msg/cafe_sach.jpg',                                                              'image'),
(10, 9,  'Trông hay đấy! Đi thôi!',                                                                               'text'),
(11, 18, 'Minh ơi, bạn có muốn tham gia hackathon không?',                                                        'text'),
(11, 2,  'Mình không rành lắm về startup nhưng muốn thử',                                                         'text'),
(11, 18, 'Không sao, team mình cần người biết code. Bạn giỏi lập trình không?',                                   'text'),
(11, 2,  'Mình biết Python và JavaScript cơ bản.',                                                                'text'),
(11, 18, 'Vậy là ổn rồi! Mình sẽ add bạn vào nhóm.',                                                             'text');


-- =====================================================
-- 14. NOTIFICATIONS
-- =====================================================
INSERT INTO notifications (user_id, type, ref_id, content, is_read) VALUES
(2,  'match_request',    5,    'Võ Bích Vân muốn kết nối với bạn!',                     FALSE),
(2,  'activity_request', 1,    'Vương Thế Vinh đã gửi yêu cầu tham gia leo Fansipan.',  FALSE),
(2,  'follow',           10,   'Bùi Mạnh Hùng đã theo dõi bạn.',                        TRUE),
(2,  'message',          1,    'Trần Thị Linh: Thích lắm! Khi nào vậy bạn?',            FALSE),
(3,  'match_accepted',   1,    'Nguyễn Văn Minh đã chấp nhận kết nối với bạn!',         TRUE),
(3,  'activity_request', 2,    'Trần Thị Linh đã gửi yêu cầu tham gia jam session.',    FALSE),
(5,  'match_accepted',   4,    'Đinh Thị Lan đã chấp nhận kết nối!',                    FALSE),
(7,  'activity_request', 1,    'Yêu cầu tham gia leo Fansipan đã được chấp nhận!',      TRUE),
(7,  'follow',           6,    'Hoàng Tuấn đã theo dõi bạn.',                           FALSE),
(8,  'activity_request', 5,    'Lý Tuyết Mai muốn tham gia chụp ảnh bình minh.',        FALSE),
(9,  'activity_request', 6,    'CLB đọc sách: Nguyễn Văn Minh đã tham gia.',            TRUE),
(10, 'match_request',    13,   'Nguyễn Văn Minh muốn kết nối với bạn!',                 FALSE),
(13, 'activity_request', 10,   'Yêu cầu tham gia yoga đã được chấp nhận!',              TRUE),
(15, 'match_accepted',   8,    'Phạm Thu Hà đã chấp nhận kết nối!',                     FALSE),
(18, 'activity_request', 13,   'Lê Đức Anh đã tham gia Hackathon.',                     TRUE),
(18, 'follow',           4,    'Lê Đức Anh đã theo dõi bạn.',                           FALSE),
(1,  'report_resolved',  1,    'Báo cáo #1 đã được xử lý.',                             TRUE),
(2,  'system',           NULL, 'Hệ thống bảo trì lúc 2:00 - 4:00 AM ngày mai.',         FALSE),
(4,  'match_accepted',   6,    'Kết nối với Cao Minh Trí đã được thiết lập!',            TRUE),
(11, 'follow',           19,   'Trịnh Cẩm Vân đã theo dõi bạn.',                        FALSE);


-- =====================================================
-- 15. REPORTS
-- =====================================================
INSERT INTO reports (reporter_id, reported_user_id, reported_activity_id, reason, status, resolved_by, resolved_at) VALUES
(2,  20,   NULL, 'Người dùng có hành vi spam trong nhóm chat, liên tục gửi link quảng cáo.',         'resolved',  1, NOW() - INTERVAL '2 days'),
(9,  NULL, 14,   'Bài đăng xem bóng đá có ngôn ngữ không phù hợp trong phần mô tả.',                 'pending',   NULL, NULL),
(7,  16,   NULL, 'Tài khoản này có vẻ là bot, gửi yêu cầu kết nối hàng loạt.',                        'pending',   NULL, NULL),
(5,  NULL, 3,    'Bài đăng workshop làm bánh thu phí nhưng không ghi rõ, gây hiểu lầm.',              'dismissed', 1, NOW() - INTERVAL '1 day'),
(13, 20,   NULL, 'Người dùng Vương Thế Vinh đã gửi tin nhắn quấy rối.',                               'resolved',  1, NOW() - INTERVAL '3 days');


-- =====================================================
-- 16. REPUTATION LOGS
-- =====================================================
INSERT INTO reputation_logs (user_id, delta, reason, ref_type, ref_id) VALUES
(2,  50,  'Tổ chức hoạt động leo núi thành công',        'activity', 1),
(2,  20,  'Nhận được 5 đánh giá tốt từ thành viên',      'system',   NULL),
(3,  30,  'Tổ chức jam session thu hút nhiều người',      'activity', 2),
(5,  40,  'Workshop làm bánh được đánh giá cao',          'activity', 3),
(7,  50,  'Duy trì nhóm chạy bộ đều đặn 3 tháng',        'activity', 4),
(8,  35,  'Ảnh chụp được cộng đồng yêu thích',           'activity', 5),
(9,  25,  'Tổ chức CLB đọc sách tích cực',                'activity', 6),
(10, 30,  'Dẫn nhóm phượt an toàn, được khen ngợi',      'activity', 8),
(18, 60,  'Hackathon nhận được phản hồi tốt',             'activity', 13),
(20, -50, 'Vi phạm quy định: spam và quấy rối',           'report',   1),
(20, -30, 'Bị báo cáo nhiều lần trong tháng',             'report',   5),
(16, -10, 'Hủy tham gia hoạt động không báo trước',       'activity', 7),
(4,  15,  'Tham gia hackathon tích cực',                  'activity', 13),
(11, 20,  'Chia sẻ kiến thức thiết kế cho cộng đồng',    'activity', 7),
(19, 25,  'Tổ chức triển lãm tranh cộng đồng thành công', 'activity', 12);


-- =====================================================
-- 17. BANNED KEYWORDS
-- =====================================================
INSERT INTO banned_keywords (keyword, created_by) VALUES
('spam',       1),
('lua dao',    1),
('quang cao',  1),
('kiem tien',  1),
('click here', 1),
('free money', 1),
('ca do',      1),
('hack',       1),
('cheat',      1),
('scam',       1);


-- =====================================================
-- 18. SYSTEM CONFIG
-- =====================================================
INSERT INTO system_config (config_key, config_value, updated_by) VALUES
('max_activity_images',       '10',    1),
('daily_status_ttl_hours',    '24',    1),
('reputation_min_to_create',  '50',    1),
('match_request_expire_days', '7',     1),
('max_group_members',         '50',    1),
('report_auto_ban_threshold', '5',     1),
('app_version',               '1.0.0', 1),
('maintenance_mode',          'false', 1),
('max_messages_per_minute',   '20',    1),
('enable_random_match',       'true',  1);