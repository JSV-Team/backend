/* =====================================================
   HỆ THỐNG KẾT NỐI SỞ THÍCH & HOẠT ĐỘNG NHÓM
   DATABASE – SQL SERVER (FULL & FINAL)
   ===================================================== */

USE master;
GO

IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'SoThichDB')
    CREATE DATABASE SoThichDB COLLATE Vietnamese_CI_AS;
GO

USE SoThichDB;
GO


-- =====================================================
-- 1. USERS – Tài khoản người dùng & admin
-- =====================================================
CREATE TABLE Users (
    user_id          INT           IDENTITY(1,1) PRIMARY KEY,
    username         NVARCHAR(50)  NOT NULL,
    email            NVARCHAR(255) NOT NULL,
    email_verified   BIT           NOT NULL CONSTRAINT DF_Users_EmailVerified DEFAULT 0,
    password_hash    NVARCHAR(255) NOT NULL,
    full_name        NVARCHAR(100) NULL,
    avatar_url       NVARCHAR(500) NULL,
    bio              NVARCHAR(MAX) NULL,
    location         NVARCHAR(100) NULL,

    reputation_score INT           NOT NULL CONSTRAINT DF_Users_Reputation   DEFAULT 100,

    -- active | banned
    status           NVARCHAR(20)  NOT NULL CONSTRAINT DF_Users_Status       DEFAULT 'active',
    ban_until        DATETIME2     NULL,
    is_locked        BIT           NOT NULL CONSTRAINT DF_Users_IsLocked     DEFAULT 0,

    -- user | admin
    role             NVARCHAR(20)  NOT NULL CONSTRAINT DF_Users_Role         DEFAULT 'user',

    created_at       DATETIME2     NOT NULL CONSTRAINT DF_Users_CreatedAt    DEFAULT SYSDATETIME(),

    CONSTRAINT UQ_Users_Username UNIQUE (username),
    CONSTRAINT UQ_Users_Email    UNIQUE (email),
    CONSTRAINT CHK_Users_Status  CHECK  (status IN ('active', 'banned')),
    CONSTRAINT CHK_Users_Role    CHECK  (role   IN ('user', 'admin'))
);
GO


-- =====================================================
-- 2. DAILY STATUS – Trạng thái hàng ngày
-- =====================================================
CREATE TABLE DailyStatus (
    status_id  INT           IDENTITY(1,1) PRIMARY KEY,
    user_id    INT           NOT NULL,
    content    NVARCHAR(500) NULL,
    image_url  NVARCHAR(500) NULL,
    created_at DATETIME2     NOT NULL CONSTRAINT DF_DailyStatus_CreatedAt DEFAULT SYSDATETIME(),
    expires_at DATETIME2     NOT NULL,   -- app layer set = created_at + 1 ngày

    CONSTRAINT FK_DailyStatus_User FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);
GO


-- =====================================================
-- 3. INTERESTS – Danh mục sở thích / Tag
-- =====================================================
CREATE TABLE Interests (
    interest_id INT          IDENTITY(1,1) PRIMARY KEY,
    name        NVARCHAR(50) NOT NULL,

    CONSTRAINT UQ_Interests_Name UNIQUE (name)
);
GO

CREATE TABLE UserInterests (
    user_id     INT NOT NULL,
    interest_id INT NOT NULL,

    CONSTRAINT PK_UserInterests          PRIMARY KEY (user_id, interest_id),
    CONSTRAINT FK_UserInterests_User     FOREIGN KEY (user_id)     REFERENCES Users(user_id)     ON DELETE CASCADE,
    CONSTRAINT FK_UserInterests_Interest FOREIGN KEY (interest_id) REFERENCES Interests(interest_id) ON DELETE CASCADE
);
GO


-- =====================================================
-- 4. ACTIVITIES – Bài đăng hoạt động
-- =====================================================
CREATE TABLE Activities (
    activity_id      INT           IDENTITY(1,1) PRIMARY KEY,
    creator_id       INT           NOT NULL,
    title            NVARCHAR(200) NOT NULL,
    description      NVARCHAR(MAX) NULL,
    location         NVARCHAR(100) NULL,
    duration_minutes INT           NULL,
    max_participants INT           NULL,   -- NULL = không giới hạn

    -- active | deleted
    status           NVARCHAR(20)  NOT NULL CONSTRAINT DF_Activities_Status    DEFAULT 'active',
    created_at       DATETIME2     NOT NULL CONSTRAINT DF_Activities_CreatedAt DEFAULT SYSDATETIME(),

    CONSTRAINT FK_Activities_Creator  FOREIGN KEY (creator_id) REFERENCES Users(user_id),
    CONSTRAINT CHK_Activities_Status  CHECK (status IN ('active', 'deleted')),
    CONSTRAINT CHK_Activities_MaxPart CHECK (max_participants IS NULL OR max_participants > 0)
);
GO

-- Ảnh đính kèm bài đăng (nhiều ảnh / bài)
CREATE TABLE ActivityImages (
    image_id     INT           IDENTITY(1,1) PRIMARY KEY,
    activity_id  INT           NOT NULL,
    image_url    NVARCHAR(500) NOT NULL,
    sort_order   INT           NOT NULL CONSTRAINT DF_ActivityImages_SortOrder  DEFAULT 0,
    is_thumbnail BIT           NOT NULL CONSTRAINT DF_ActivityImages_Thumbnail  DEFAULT 0,
    created_at   DATETIME2     NOT NULL CONSTRAINT DF_ActivityImages_CreatedAt  DEFAULT SYSDATETIME(),

    CONSTRAINT FK_ActivityImages_Activity FOREIGN KEY (activity_id) REFERENCES Activities(activity_id) ON DELETE CASCADE
);
GO

-- Tag sở thích của bài đăng
CREATE TABLE ActivityTags (
    activity_id INT NOT NULL,
    interest_id INT NOT NULL,

    CONSTRAINT PK_ActivityTags          PRIMARY KEY (activity_id, interest_id),
    CONSTRAINT FK_ActivityTags_Activity FOREIGN KEY (activity_id) REFERENCES Activities(activity_id) ON DELETE CASCADE,
    CONSTRAINT FK_ActivityTags_Interest FOREIGN KEY (interest_id) REFERENCES Interests(interest_id)
);
GO

-- Yêu cầu tham gia hoạt động
CREATE TABLE ActivityRequests (
    request_id   INT          IDENTITY(1,1) PRIMARY KEY,
    activity_id  INT          NOT NULL,
    requester_id INT          NOT NULL,

    -- pending | accepted | rejected
    status       NVARCHAR(20) NOT NULL CONSTRAINT DF_ActivityRequests_Status    DEFAULT 'pending',
    created_at   DATETIME2    NOT NULL CONSTRAINT DF_ActivityRequests_CreatedAt DEFAULT SYSDATETIME(),

    CONSTRAINT UQ_ActivityRequests          UNIQUE      (activity_id, requester_id),
    CONSTRAINT FK_ActivityRequests_Activity FOREIGN KEY (activity_id)  REFERENCES Activities(activity_id) ON DELETE CASCADE,
    CONSTRAINT FK_ActivityRequests_User     FOREIGN KEY (requester_id) REFERENCES Users(user_id),
    CONSTRAINT CHK_ActivityRequests_Status  CHECK       (status IN ('pending', 'accepted', 'rejected'))
);
GO


-- =====================================================
-- 5. FOLLOW SYSTEM
-- =====================================================
CREATE TABLE Follows (
    follower_id  INT       NOT NULL,
    following_id INT       NOT NULL,
    created_at   DATETIME2 NOT NULL CONSTRAINT DF_Follows_CreatedAt DEFAULT SYSDATETIME(),

    CONSTRAINT PK_Follows           PRIMARY KEY (follower_id, following_id),
    CONSTRAINT FK_Follows_Follower  FOREIGN KEY (follower_id)  REFERENCES Users(user_id),
    CONSTRAINT FK_Follows_Following FOREIGN KEY (following_id) REFERENCES Users(user_id),
    CONSTRAINT CHK_Follow_NotSelf   CHECK (follower_id <> following_id)
);
GO


-- =====================================================
-- 6. MATCH SYSTEM – Ghép đôi
-- =====================================================
-- Quy ước: app layer luôn INSERT với user_one = MIN(a,b), user_two = MAX(a,b)
-- CHECK user_one < user_two + UNIQUE(user_one, user_two) đảm bảo không trùng cặp
CREATE TABLE MatchSessions (
    match_id     INT          IDENTITY(1,1) PRIMARY KEY,
    user_one     INT          NOT NULL,
    user_two     INT          NOT NULL,
    match_type   NVARCHAR(20) NOT NULL,   -- random | selective
    requested_by INT          NULL,       -- người khởi tạo (dùng cho selective)

    -- pending | active | rejected | ended
    status       NVARCHAR(20) NOT NULL CONSTRAINT DF_Match_Status    DEFAULT 'pending',
    created_at   DATETIME2    NOT NULL CONSTRAINT DF_Match_CreatedAt DEFAULT SYSDATETIME(),

    CONSTRAINT UQ_Match           UNIQUE (user_one, user_two),
    CONSTRAINT CHK_Match_Order    CHECK  (user_one < user_two),
    CONSTRAINT CHK_Match_Type     CHECK  (match_type IN ('random', 'selective')),
    CONSTRAINT CHK_Match_Status   CHECK  (status     IN ('pending', 'active', 'rejected', 'ended')),

    CONSTRAINT FK_Match_UserOne   FOREIGN KEY (user_one)     REFERENCES Users(user_id),
    CONSTRAINT FK_Match_UserTwo   FOREIGN KEY (user_two)     REFERENCES Users(user_id),
    CONSTRAINT FK_Match_Requester FOREIGN KEY (requested_by) REFERENCES Users(user_id)
);
GO


-- =====================================================
-- 7. CHAT SYSTEM – Hội thoại & Tin nhắn
-- =====================================================
CREATE TABLE Conversations (
    conversation_id   INT          IDENTITY(1,1) PRIMARY KEY,

    -- direct | group | activity | private
    conversation_type NVARCHAR(20) NOT NULL,

    -- temporary | permanent
    group_lifetime    NVARCHAR(20) NOT NULL CONSTRAINT DF_Conv_Lifetime  DEFAULT 'permanent',

    activity_id       INT          NULL,   -- chỉ có giá trị khi type = 'activity'
    expires_at        DATETIME2    NULL,
    created_at        DATETIME2    NOT NULL CONSTRAINT DF_Conv_CreatedAt DEFAULT SYSDATETIME(),

    CONSTRAINT FK_Conversations_Activity FOREIGN KEY (activity_id) REFERENCES Activities(activity_id) ON DELETE SET NULL,
    CONSTRAINT CHK_Conversation_Type     CHECK (conversation_type IN ('direct', 'group', 'activity', 'private')),
    CONSTRAINT CHK_Group_Lifetime        CHECK (group_lifetime     IN ('temporary', 'permanent'))
);
GO

CREATE TABLE ConversationMembers (
    conversation_id INT          NOT NULL,
    user_id         INT          NOT NULL,

    -- host | member
    role            NVARCHAR(20) NOT NULL CONSTRAINT DF_CM_Role     DEFAULT 'member',
    joined_at       DATETIME2    NOT NULL CONSTRAINT DF_CM_JoinedAt DEFAULT SYSDATETIME(),
    left_at         DATETIME2    NULL,

    CONSTRAINT PK_ConversationMembers PRIMARY KEY (conversation_id, user_id),
    CONSTRAINT FK_CM_Conversation     FOREIGN KEY (conversation_id) REFERENCES Conversations(conversation_id) ON DELETE CASCADE,
    CONSTRAINT FK_CM_User             FOREIGN KEY (user_id)         REFERENCES Users(user_id),
    CONSTRAINT CHK_CM_Role            CHECK (role IN ('host', 'member'))
);
GO

CREATE TABLE Messages (
    message_id      BIGINT        IDENTITY(1,1) PRIMARY KEY,
    conversation_id INT           NOT NULL,
    sender_id       INT           NOT NULL,
    content         NVARCHAR(MAX) NULL,
    image_url       NVARCHAR(500) NULL,
    -- msg_type = 'image'  → content = image_url
    -- msg_type = 'system' → content = nội dung hệ thống tự sinh

    -- text | image | system
    msg_type        NVARCHAR(20)  NOT NULL CONSTRAINT DF_Messages_Type      DEFAULT 'text',
    created_at      DATETIME2     NOT NULL CONSTRAINT DF_Messages_CreatedAt DEFAULT SYSDATETIME(),

    CONSTRAINT FK_Messages_Conversation FOREIGN KEY (conversation_id) REFERENCES Conversations(conversation_id) ON DELETE CASCADE,
    CONSTRAINT FK_Messages_Sender       FOREIGN KEY (sender_id)       REFERENCES Users(user_id),
    CONSTRAINT CHK_Messages_Type        CHECK (msg_type IN ('text', 'image', 'system'))
);
GO


-- =====================================================
-- 8. NOTIFICATIONS – Thông báo
-- =====================================================
CREATE TABLE Notifications (
    notification_id INT           IDENTITY(1,1) PRIMARY KEY,
    user_id         INT           NOT NULL,

    -- Loại: activity_request | match_request | match_accepted
    --        message | follow | system | report_resolved
    type            NVARCHAR(50)  NOT NULL,

    ref_id          INT           NULL,   -- ID tham chiếu tuỳ theo type
    content         NVARCHAR(500) NULL,
    is_read         BIT           NOT NULL CONSTRAINT DF_Notif_IsRead    DEFAULT 0,
    created_at      DATETIME2     NOT NULL CONSTRAINT DF_Notif_CreatedAt DEFAULT SYSDATETIME(),

    CONSTRAINT FK_Notif_User FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);
GO


-- =====================================================
-- 9. REPORTS – Báo cáo vi phạm
-- =====================================================
CREATE TABLE Reports (
    report_id            INT           IDENTITY(1,1) PRIMARY KEY,
    reporter_id          INT           NOT NULL,
    reported_user_id     INT           NULL,   -- báo cáo user
    reported_activity_id INT           NULL,   -- báo cáo bài đăng

    reason               NVARCHAR(MAX) NULL,

    -- pending | resolved | dismissed
    status               NVARCHAR(20)  NOT NULL CONSTRAINT DF_Reports_Status    DEFAULT 'pending',

    resolved_by          INT           NULL,   -- admin xử lý
    resolved_at          DATETIME2     NULL,
    created_at           DATETIME2     NOT NULL CONSTRAINT DF_Reports_CreatedAt DEFAULT SYSDATETIME(),

    -- Bắt buộc phải báo cáo ít nhất 1 trong 2 đối tượng
    CONSTRAINT CHK_Report_Target       CHECK (reported_user_id IS NOT NULL OR reported_activity_id IS NOT NULL),
    CONSTRAINT CHK_Report_Status       CHECK (status IN ('pending', 'resolved', 'dismissed')),

    CONSTRAINT FK_Reports_Reporter         FOREIGN KEY (reporter_id)          REFERENCES Users(user_id),
    CONSTRAINT FK_Reports_ReportedUser     FOREIGN KEY (reported_user_id)     REFERENCES Users(user_id),
    CONSTRAINT FK_Reports_ReportedActivity FOREIGN KEY (reported_activity_id) REFERENCES Activities(activity_id) ON DELETE SET NULL,
    CONSTRAINT FK_Reports_ResolvedBy       FOREIGN KEY (resolved_by)          REFERENCES Users(user_id)
);
GO


-- =====================================================
-- 10. REPUTATION LOGS – Lịch sử điểm uy tín
-- =====================================================
CREATE TABLE ReputationLogs (
    log_id     INT           IDENTITY(1,1) PRIMARY KEY,
    user_id    INT           NOT NULL,
    delta      INT           NOT NULL,   -- dương: cộng | âm: trừ
    reason     NVARCHAR(200) NULL,
    ref_type   NVARCHAR(50)  NULL,       -- 'activity' | 'report' | 'match' | 'system'
    ref_id     INT           NULL,
    created_at DATETIME2     NOT NULL CONSTRAINT DF_RepLog_CreatedAt DEFAULT SYSDATETIME(),

    CONSTRAINT FK_RepLog_User FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);
GO


-- =====================================================
-- 11. ADMIN – Từ khóa cấm & Cấu hình hệ thống
-- =====================================================
CREATE TABLE BannedKeywords (
    keyword_id INT           IDENTITY(1,1) PRIMARY KEY,
    keyword    NVARCHAR(100) NOT NULL,
    created_by INT           NULL,
    created_at DATETIME2     NOT NULL CONSTRAINT DF_BannedKeywords_CreatedAt DEFAULT SYSDATETIME(),

    CONSTRAINT UQ_BannedKeywords_Keyword UNIQUE (keyword),
    CONSTRAINT FK_BannedKeywords_Admin   FOREIGN KEY (created_by) REFERENCES Users(user_id) ON DELETE SET NULL
);
GO

CREATE TABLE SystemConfig (
    config_id    INT           IDENTITY(1,1) PRIMARY KEY,
    config_key   NVARCHAR(100) NOT NULL,
    config_value NVARCHAR(MAX) NULL,
    updated_by   INT           NULL,
    updated_at   DATETIME2     NOT NULL CONSTRAINT DF_SystemConfig_UpdatedAt DEFAULT SYSDATETIME(),

    CONSTRAINT UQ_SystemConfig_Key   UNIQUE (config_key),
    CONSTRAINT FK_SystemConfig_Admin FOREIGN KEY (updated_by) REFERENCES Users(user_id) ON DELETE SET NULL
);
GO


/* =====================================================
   INDEX – Tối ưu truy vấn phổ biến
   ===================================================== */

CREATE INDEX IX_Activities_Creator    ON Activities       (creator_id);
CREATE INDEX IX_Activities_Status     ON Activities       (status);

CREATE INDEX IX_ActivityImages_Act    ON ActivityImages   (activity_id, sort_order);

CREATE INDEX IX_ActReq_Activity       ON ActivityRequests (activity_id);
CREATE INDEX IX_ActReq_Requester      ON ActivityRequests (requester_id);

CREATE INDEX IX_Follows_Following     ON Follows          (following_id);

CREATE INDEX IX_Match_UserOne         ON MatchSessions    (user_one);
CREATE INDEX IX_Match_UserTwo         ON MatchSessions    (user_two);

CREATE INDEX IX_Messages_Conv         ON Messages         (conversation_id, created_at);

CREATE INDEX IX_Notif_User_Unread     ON Notifications    (user_id, is_read, created_at);

CREATE INDEX IX_Reports_Status        ON Reports          (status);

CREATE INDEX IX_DailyStatus_User      ON DailyStatus      (user_id, expires_at);

CREATE INDEX IX_RepLog_User           ON ReputationLogs   (user_id, created_at);
GO


/* =====================================================
   TÓM TẮT 18 BẢNG
   =====================================================
   01. Users               – Tài khoản người dùng & admin
   02. DailyStatus         – Trạng thái hàng ngày (hỗ trợ ảnh)
   03. Interests           – Danh mục sở thích / tag
   04. UserInterests       – Sở thích của từng user
   05. Activities          – Bài đăng hoạt động
   06. ActivityImages      – Ảnh đính kèm bài đăng (nhiều ảnh/bài)
   07. ActivityTags        – Tag sở thích của bài đăng
   08. ActivityRequests    – Yêu cầu tham gia hoạt động
   09. Follows             – Theo dõi giữa users
   10. MatchSessions       – Phiên ghép đôi (random / selective)
   11. Conversations       – Hội thoại (direct / group / activity)
   12. ConversationMembers – Thành viên hội thoại
   13. Messages            – Tin nhắn (text / image / system)
   14. Notifications       – Thông báo realtime cho user
   15. Reports             – Báo cáo vi phạm (user & bài đăng)
   16. ReputationLogs      – Lịch sử cộng / trừ điểm uy tín
   17. BannedKeywords      – Từ khóa cấm (admin quản lý)
   18. SystemConfig        – Cấu hình hệ thống
   ===================================================== */



/* =====================================================
   SEED DATA – HỆ THỐNG KẾT NỐI SỞ THÍCH & HOẠT ĐỘNG NHÓM
   Dữ liệu test đầy đủ, liên kết chặt chẽ giữa các bảng
   ===================================================== */

USE SoThichDB;
GO

-- =====================================================
-- 1. USERS (12 người dùng + 1 admin)
-- password_hash là bcrypt của "Password123!" cho tất cả
-- =====================================================
SET IDENTITY_INSERT Users ON;
INSERT INTO Users (user_id, username, email, email_verified, password_hash, full_name, avatar_url, bio, location, reputation_score, status, ban_until, is_locked, role, created_at)
VALUES
-- Admin
(1,  N'admin',       N'admin@sothich.vn',        1, '$2b$10$57dG/C9nZFCvC1lki1YUTKmvomEr3eQQVvLNkWupc8IdrldlwJr.SRgi.6MZtS', N'Quản Trị Viên',   N'https://i.pravatar.cc/150?img=1',  N'Admin hệ thống.',                        N'Hà Nội',     200, 'active', NULL, 1, 'admin', '2024-01-01 08:00:00'),
-- Users
(2,  N'minhkhoa98',  N'minhkhoa98@gmail.com',     1, '$2b$10$57dG/C9nZFCvC1lki1YUTKmvomEr3eQQVvLNkWupc8IdrldlwJr.SRgi.6MZtS', N'Nguyễn Minh Khoa', N'https://i.pravatar.cc/150?img=2',  N'Mình thích leo núi và chụp ảnh thiên nhiên. Ai cùng sở thích kết bạn nhé!', N'Hà Nội',     145, 'active', NULL, 0, 'user',  '2024-02-10 09:15:00'),
(3,  N'thuyhang_dn',  N'thuyhang@gmail.com',       1, '$2b$10$57dG/C9nZFCvC1lki1YUTKmvomEr3eQQVvLNkWupc8IdrldlwJr.SRgi.6MZtS', N'Trần Thúy Hằng',  N'https://i.pravatar.cc/150?img=3',  N'Yêu thích nấu ăn và khám phá ẩm thực các vùng miền.',                       N'Đà Nẵng',    130, 'active', NULL, 0, 'user',  '2024-02-15 10:30:00'),
(4,  N'baotran_hcm',  N'baotran@gmail.com',        1, '$2b$10$57dG/C9nZFCvC1lki1YUTKmvomEr3eQQVvLNkWupc8IdrldlwJr.SRgi.6MZtS', N'Trần Minh Bảo',   N'https://i.pravatar.cc/150?img=4',  N'Lập trình viên ban ngày, game thủ ban đêm. Tìm team chơi game cuối tuần.',   N'TP.HCM',     120, 'active', NULL, 0, 'user',  '2024-03-01 11:00:00'),
(5,  N'linhnguyen_hcm',N'linhnguyen@gmail.com',    1, '$2b$10$57dG/C9nZFCvC1lki1YUTKmvomEr3eQQVvLNkWupc8IdrldlwJr.SRgi.6MZtS', N'Nguyễn Phương Linh',N'https://i.pravatar.cc/150?img=5', N'Thích yoga, thiền định và chạy bộ buổi sáng. Sống lành mạnh mỗi ngày!',     N'TP.HCM',     160, 'active', NULL, 0, 'user',  '2024-03-10 07:00:00'),
(6,  N'ducpham_hn',   N'ducpham@gmail.com',        1, '$2b$10$57dG/C9nZFCvC1lki1YUTKmvomEr3eQQVvLNkWupc8IdrldlwJr.SRgi.6MZtS', N'Phạm Tiến Đức',   N'https://i.pravatar.cc/150?img=6',  N'Nhiếp ảnh gia nghiệp dư. Chuyên chụp ảnh đường phố và chân dung.',          N'Hà Nội',     115, 'active', NULL, 0, 'user',  '2024-03-20 14:00:00'),
(7,  N'mylinh_dn',    N'mylinh@gmail.com',         1, '$2b$10$57dG/C9nZFCvC1lki1YUTKmvomEr3eQQVvLNkWupc8IdrldlwJr.SRgi.6MZtS', N'Lê Mỹ Linh',      N'https://i.pravatar.cc/150?img=7',  N'Dancer nghiệp dư. Đam mê các thể loại nhảy từ hip-hop đến contemporary.',   N'Đà Nẵng',    135, 'active', NULL, 0, 'user',  '2024-04-01 16:00:00'),
(8,  N'hoanganh_ct',  N'hoanganh@gmail.com',       1, '$2b$10$57dG/C9nZFCvC1lki1YUTKmvomEr3eQQVvLNkWupc8IdrldlwJr.SRgi.6MZtS', N'Hoàng Anh',       N'https://i.pravatar.cc/150?img=8',  N'Sinh viên kinh tế, thích đọc sách và đầu tư chứng khoán.',                  N'Cần Thơ',     95, 'active', NULL, 0, 'user',  '2024-04-10 08:30:00'),
(9,  N'tuananh_hn',   N'tuananh@gmail.com',        0, '$2b$10$57dG/C9nZFCvC1lki1YUTKmvomEr3eQQVvLNkWupc8IdrldlwJr.SRgi.6MZtS', N'Nguyễn Tuấn Anh', N'https://i.pravatar.cc/150?img=9',  N'Yêu thích bóng đá và chạy bộ. Đang tìm nhóm tập thể thao cuối tuần.',      N'Hà Nội',     110, 'active', NULL, 0, 'user',  '2024-04-20 09:00:00'),
(10, N'camtu_hcm',    N'camtu@gmail.com',          1, '$2b$10$57dG/C9nZFCvC1lki1YUTKmvomEr3eQQVvLNkWupc8IdrldlwJr.SRgi.6MZtS', N'Ngô Cẩm Tú',      N'https://i.pravatar.cc/150?img=10', N'Blogger ẩm thực và travel. Instagram: @camtu.eats',                         N'TP.HCM',     175, 'active', NULL, 0, 'user',  '2024-05-01 10:00:00'),
(11, N'sonha_vt',     N'sonha@gmail.com',          1, '$2b$10$57dG/C9nZFCvC1lki1YUTKmvomEr3eQQVvLNkWupc8IdrldlwJr.SRgi.6MZtS', N'Sơn Hà',          N'https://i.pravatar.cc/150?img=11', N'Guitarist acoustic. Hay tổ chức buổi jam session nhỏ cuối tuần.',           N'Vũng Tàu',    90, 'active', NULL, 0, 'user',  '2024-05-15 11:00:00'),
(12, N'khanh_banned', N'khanh.vip@gmail.com',      1, '$2b$10$57dG/C9nZFCvC1lki1YUTKmvomEr3eQQVvLNkWupc8IdrldlwJr.SRgi.6MZtS', N'Trần Khánh',      N'https://i.pravatar.cc/150?img=12', N'.',                                                                          N'Hà Nội',      50, 'banned', '2025-03-01 00:00:00', 0, 'user',  '2024-06-01 12:00:00'),
(13, N'viet_new',     N'viet.trung@gmail.com',     0, '$2b$10$57dG/C9nZFCvC1lki1YUTKmvomEr3eQQVvLNkWupc8IdrldlwJr.SRgi.6MZtS', N'Việt Trung',      NULL,                                N'Mới tham gia, đang khám phá.',                                               N'Huế',        100, 'active', NULL, 0, 'user',  '2025-01-10 15:00:00');
SET IDENTITY_INSERT Users OFF;
GO


-- =====================================================
-- 2. DAILY STATUS
-- =====================================================
SET IDENTITY_INSERT DailyStatus ON;
INSERT INTO DailyStatus (status_id, user_id, content, image_url, created_at, expires_at)
VALUES
(1,  2,  N'Sáng nay leo Fansipan, view đỉnh lắm! 🏔️',        N'https://picsum.photos/seed/fansi/400/300',      '2025-01-20 06:30:00', '2025-01-21 06:30:00'),
(2,  3,  N'Vừa thử công thức mì Quảng mới, ngon xuất sắc 😍', N'https://picsum.photos/seed/miquang/400/300',    '2025-01-20 11:00:00', '2025-01-21 11:00:00'),
(3,  5,  N'Chạy bộ 10km buổi sáng xong rồi, ai cùng tập?',    NULL,                                             '2025-01-20 05:45:00', '2025-01-21 05:45:00'),
(4,  4,  N'Tìm team VALORANT rank Plat+, serious only!',        NULL,                                             '2025-01-20 20:00:00', '2025-01-21 20:00:00'),
(5,  6,  N'Golden hour hôm nay đẹp quá 📷',                    N'https://picsum.photos/seed/goldhour/400/300',   '2025-01-20 17:30:00', '2025-01-21 17:30:00'),
(6,  7,  N'Workshop nhảy contemporary tối nay còn 3 slot!',    N'https://picsum.photos/seed/dance/400/300',      '2025-01-20 08:00:00', '2025-01-21 08:00:00'),
(7,  10, N'Review quán cà phê rang xay mới ở Q1 👇',           N'https://picsum.photos/seed/cafe/400/300',       '2025-01-20 09:30:00', '2025-01-21 09:30:00'),
(8,  9,  N'Tìm đội bóng đá sân 7 khu vực Cầu Giấy cuối tuần', NULL,                                             '2025-01-20 12:00:00', '2025-01-21 12:00:00'),
(9,  11, N'Jam session tối thứ 7 tại nhà mình, ai muốn join?', NULL,                                             '2025-01-20 14:00:00', '2025-01-21 14:00:00'),
(10, 2,  N'Đang plan trip Tà Xùa tháng sau, ai đi cùng?',      N'https://picsum.photos/seed/taxua/400/300',      '2025-01-21 07:00:00', '2025-01-22 07:00:00');
SET IDENTITY_INSERT DailyStatus OFF;
GO


-- =====================================================
-- 3. INTERESTS
-- =====================================================
SET IDENTITY_INSERT Interests ON;
INSERT INTO Interests (interest_id, name) VALUES
(1,  N'Leo núi'),
(2,  N'Nhiếp ảnh'),
(3,  N'Nấu ăn'),
(4,  N'Gaming'),
(5,  N'Thể thao'),
(6,  N'Yoga & Thiền'),
(7,  N'Nhảy múa'),
(8,  N'Âm nhạc'),
(9,  N'Đọc sách'),
(10, N'Du lịch'),
(11, N'Ẩm thực'),
(12, N'Chạy bộ'),
(13, N'Bóng đá'),
(14, N'Lập trình'),
(15, N'Đầu tư tài chính');
SET IDENTITY_INSERT Interests OFF;
GO


-- =====================================================
-- 4. USER INTERESTS
-- =====================================================
INSERT INTO UserInterests (user_id, interest_id) VALUES
-- Minh Khoa: Leo núi, Nhiếp ảnh, Du lịch
(2, 1), (2, 2), (2, 10),
-- Thúy Hằng: Nấu ăn, Ẩm thực, Du lịch
(3, 3), (3, 11), (3, 10),
-- Bảo Trần: Gaming, Lập trình, Âm nhạc
(4, 4), (4, 14), (4, 8),
-- Phương Linh: Yoga, Chạy bộ, Thể thao
(5, 6), (5, 12), (5, 5),
-- Tiến Đức: Nhiếp ảnh, Du lịch, Leo núi
(6, 2), (6, 10), (6, 1),
-- Mỹ Linh: Nhảy múa, Âm nhạc, Thể thao
(7, 7), (7, 8), (7, 5),
-- Hoàng Anh: Đọc sách, Đầu tư, Lập trình
(8, 9), (8, 15), (8, 14),
-- Tuấn Anh: Bóng đá, Chạy bộ, Thể thao
(9, 13), (9, 12), (9, 5),
-- Cẩm Tú: Ẩm thực, Du lịch, Nhiếp ảnh
(10, 11), (10, 10), (10, 2),
-- Sơn Hà: Âm nhạc, Nhảy múa, Du lịch
(11, 8), (11, 7), (11, 10),
-- Việt Trung: Đọc sách, Du lịch
(13, 9), (13, 10);
GO


-- =====================================================
-- 5. ACTIVITIES (10 bài đăng)
-- =====================================================
SET IDENTITY_INSERT Activities ON;
INSERT INTO Activities (activity_id, creator_id, title, description, location, duration_minutes, max_participants, status, created_at)
VALUES
(1,  2,  N'Cùng leo Fansipan dịp 30/4',
         N'Tổ chức chuyến leo Fansipan 3 ngày 2 đêm. Xuất phát từ Hà Nội, đi theo đường trek. Chi phí chia đều, khoảng 2-3 triệu/người. Ai có kinh nghiệm leo núi thì ưu tiên.',
         N'Sa Pa, Lào Cai', 4320, 8, 'approved', '2025-01-05 09:00:00'),

(2,  3,  N'Workshop nấu ăn: Ẩm thực miền Trung',
         N'Cùng học nấu các món đặc trưng miền Trung: mì Quảng, bánh xèo, bún bò Huế. Mình sẽ hướng dẫn từ A-Z. Mang tạp dề và nhiệt huyết nhé!',
         N'Đà Nẵng', 180, 10, 'approved', '2025-01-08 10:00:00'),

(3,  5,  N'Chạy bộ sáng – Công viên Tao Đàn',
         N'Nhóm chạy bộ sáng định kỳ mỗi thứ 7, bắt đầu 6h sáng. Tốc độ 6-7 phút/km, phù hợp cả người mới. Sau chạy có thể cùng ăn sáng.',
         N'Công viên Tao Đàn, TP.HCM', 90, 20, 'approved', '2025-01-10 07:00:00'),

(4,  4,  N'Tìm team VALORANT – rank từ Gold trở lên',
         N'Cần thêm 2-3 thành viên để lập team ranked VALORANT. Chơi nghiêm túc, không toxic. Online tối thứ 2 đến thứ 6, 9pm-12pm.',
         N'Online', 180, 5, 'approved', '2025-01-12 20:00:00'),

(5,  7,  N'Lớp nhảy Contemporary miễn phí',
         N'Mình tổ chức buổi workshop nhảy contemporary miễn phí cho người mới bắt đầu. Địa điểm tại studio của mình. Mang giày nhảy hoặc đi chân trần.',
         N'Đà Nẵng', 120, 15, 'approved', '2025-01-15 08:00:00'),

(6,  10, N'Food tour Sài Gòn – Khám phá ẩm thực Quận 4',
         N'Dẫn tour ẩm thực đường phố Quận 4, đi bộ khám phá các quán ngon ít người biết. Thử khoảng 8-10 món. Phù hợp nhóm 6-8 người.',
         N'Quận 4, TP.HCM', 150, 8, 'approved', '2025-01-18 17:00:00'),

(7,  11, N'Jam Session Acoustic – Cuối tuần tại Vũng Tàu',
         N'Tổ chức buổi jam session âm nhạc acoustic tại nhà mình ở Vũng Tàu. Mang nhạc cụ của bạn, hoặc chỉ cần đến lắng nghe cũng được. Có BBQ nhẹ.',
         N'Vũng Tàu', 240, 12, 'approved', '2025-01-20 14:00:00'),

(8,  9,  N'Đá bóng sân 7 – Cầu Giấy – Chủ nhật',
         N'Tìm thêm 4-5 người đá bóng sân 7 khu vực Cầu Giấy. Trình độ phong trào, vui vẻ là chính. Phí sân chia đều.',
         N'Cầu Giấy, Hà Nội', 90, 14, 'approved', '2025-01-22 08:00:00'),

(9,  6,  N'Photo Walk – Phố cổ Hà Nội',
         N'Cùng đi chụp ảnh đường phố khu phố cổ Hà Nội. Trao đổi kỹ thuật, góc chụp, hậu kỳ. Mang máy ảnh hoặc điện thoại đều được.',
         N'Phố cổ Hà Nội', 180, 10, 'pending', '2025-01-23 09:00:00'),

(10, 8,  N'Câu lạc bộ đọc sách tháng 2',
         N'Tháng này đọc cuốn "Sapiens – Lược sử loài người". Gặp mặt cuối tháng để thảo luận. Đặt câu hỏi thú vị và chia sẻ góc nhìn của bạn.',
         N'Cần Thơ', 120, 15, 'pending', '2025-01-25 10:00:00');
SET IDENTITY_INSERT Activities OFF;
GO


-- =====================================================
-- 6. ACTIVITY IMAGES
-- =====================================================
SET IDENTITY_INSERT ActivityImages ON;
INSERT INTO ActivityImages (image_id, activity_id, image_url, sort_order, is_thumbnail, created_at)
VALUES
-- Fansipan trip (activity 1)
(1,  1, N'https://picsum.photos/seed/fansipan1/800/600', 0, 1, '2025-01-05 09:00:00'),
(2,  1, N'https://picsum.photos/seed/fansipan2/800/600', 1, 0, '2025-01-05 09:01:00'),
(3,  1, N'https://picsum.photos/seed/fansipan3/800/600', 2, 0, '2025-01-05 09:02:00'),
-- Workshop nấu ăn (activity 2)
(4,  2, N'https://picsum.photos/seed/cooking1/800/600',  0, 1, '2025-01-08 10:00:00'),
(5,  2, N'https://picsum.photos/seed/cooking2/800/600',  1, 0, '2025-01-08 10:01:00'),
-- Chạy bộ (activity 3)
(6,  3, N'https://picsum.photos/seed/running1/800/600',  0, 1, '2025-01-10 07:00:00'),
-- Gaming (activity 4)
(7,  4, N'https://picsum.photos/seed/gaming1/800/600',   0, 1, '2025-01-12 20:00:00'),
-- Workshop nhảy (activity 5)
(8,  5, N'https://picsum.photos/seed/dance1/800/600',    0, 1, '2025-01-15 08:00:00'),
(9,  5, N'https://picsum.photos/seed/dance2/800/600',    1, 0, '2025-01-15 08:01:00'),
-- Food tour (activity 6)
(10, 6, N'https://picsum.photos/seed/food1/800/600',     0, 1, '2025-01-18 17:00:00'),
(11, 6, N'https://picsum.photos/seed/food2/800/600',     1, 0, '2025-01-18 17:01:00'),
(12, 6, N'https://picsum.photos/seed/food3/800/600',     2, 0, '2025-01-18 17:02:00'),
-- Jam session (activity 7)
(13, 7, N'https://picsum.photos/seed/jam1/800/600',      0, 1, '2025-01-20 14:00:00'),
(14, 7, N'https://picsum.photos/seed/jam2/800/600',      1, 0, '2025-01-20 14:01:00'),
-- Đá bóng (activity 8)
(15, 8, N'https://picsum.photos/seed/soccer1/800/600',   0, 1, '2025-01-22 08:00:00'),
-- Photo walk (activity 9)
(16, 9, N'https://picsum.photos/seed/photo1/800/600',    0, 1, '2025-01-23 09:00:00'),
(17, 9, N'https://picsum.photos/seed/photo2/800/600',    1, 0, '2025-01-23 09:01:00'),
-- CLB đọc sách (activity 10)
(18, 10,N'https://picsum.photos/seed/book1/800/600',     0, 1, '2025-01-25 10:00:00');
SET IDENTITY_INSERT ActivityImages OFF;
GO


-- =====================================================
-- 7. ACTIVITY TAGS
-- =====================================================
INSERT INTO ActivityTags (activity_id, interest_id) VALUES
-- Fansipan: Leo núi, Du lịch, Nhiếp ảnh
(1, 1), (1, 10), (1, 2),
-- Workshop nấu ăn: Nấu ăn, Ẩm thực
(2, 3), (2, 11),
-- Chạy bộ: Chạy bộ, Thể thao
(3, 12), (3, 5),
-- Gaming: Gaming
(4, 4),
-- Workshop nhảy: Nhảy múa, Thể thao
(5, 7), (5, 5),
-- Food tour: Ẩm thực, Du lịch
(6, 11), (6, 10),
-- Jam session: Âm nhạc
(7, 8),
-- Đá bóng: Bóng đá, Thể thao
(8, 13), (8, 5),
-- Photo walk: Nhiếp ảnh, Du lịch
(9, 2), (9, 10),
-- CLB sách: Đọc sách
(10, 9);
GO


-- =====================================================
-- 8. ACTIVITY REQUESTS
-- =====================================================
SET IDENTITY_INSERT ActivityRequests ON;
INSERT INTO ActivityRequests (request_id, activity_id, requester_id, status, created_at)
VALUES
-- Fansipan (act 1): nhiều người muốn tham gia
(1,  1, 6,  'accepted', '2025-01-06 08:00:00'),
(2,  1, 10, 'accepted', '2025-01-06 10:00:00'),
(3,  1, 5,  'accepted', '2025-01-07 09:00:00'),
(4,  1, 9,  'pending',  '2025-01-08 11:00:00'),
(5,  1, 8,  'rejected', '2025-01-09 14:00:00'),
-- Workshop nấu ăn (act 2)
(6,  2, 10, 'accepted', '2025-01-09 09:00:00'),
(7,  2, 5,  'accepted', '2025-01-09 10:00:00'),
(8,  2, 7,  'pending',  '2025-01-10 11:00:00'),
-- Chạy bộ (act 3)
(9,  3, 2,  'accepted', '2025-01-11 07:00:00'),
(10, 3, 9,  'accepted', '2025-01-11 08:00:00'),
(11, 3, 8,  'accepted', '2025-01-11 09:00:00'),
-- Gaming (act 4)
(12, 4, 13, 'accepted', '2025-01-13 20:00:00'),
(13, 4, 8,  'rejected', '2025-01-13 21:00:00'),
-- Workshop nhảy (act 5)
(14, 5, 10, 'accepted', '2025-01-16 08:00:00'),
(15, 5, 3,  'accepted', '2025-01-16 09:00:00'),
(16, 5, 2,  'pending',  '2025-01-16 10:00:00'),
-- Food tour (act 6)
(17, 6, 3,  'accepted', '2025-01-19 16:00:00'),
(18, 6, 6,  'accepted', '2025-01-19 17:00:00'),
(19, 6, 2,  'accepted', '2025-01-19 18:00:00'),
-- Jam session (act 7)
(20, 7, 7,  'accepted', '2025-01-21 10:00:00'),
(21, 7, 4,  'accepted', '2025-01-21 11:00:00'),
(22, 7, 10, 'pending',  '2025-01-21 12:00:00'),
-- Đá bóng (act 8)
(23, 8, 2,  'accepted', '2025-01-23 07:00:00'),
(24, 8, 6,  'accepted', '2025-01-23 08:00:00'),
(25, 8, 4,  'pending',  '2025-01-23 09:00:00'),
-- Photo walk (act 9)
(26, 9, 10, 'pending',  '2025-01-24 09:00:00'),
(27, 9, 5,  'pending',  '2025-01-24 10:00:00'),
-- CLB sách (act 10)
(28, 10, 9,  'pending', '2025-01-26 09:00:00'),
(29, 10, 13, 'pending', '2025-01-26 10:00:00');
SET IDENTITY_INSERT ActivityRequests OFF;
GO


-- =====================================================
-- 9. FOLLOWS
-- =====================================================
INSERT INTO Follows (follower_id, following_id, created_at) VALUES
(2,  5,  '2025-01-10 08:00:00'),
(2,  6,  '2025-01-10 08:05:00'),
(2,  10, '2025-01-11 09:00:00'),
(3,  10, '2025-01-12 10:00:00'),
(3,  5,  '2025-01-12 10:05:00'),
(4,  9,  '2025-01-13 11:00:00'),
(5,  2,  '2025-01-10 09:00:00'),
(5,  7,  '2025-01-14 12:00:00'),
(5,  10, '2025-01-14 12:05:00'),
(6,  2,  '2025-01-15 08:00:00'),
(6,  10, '2025-01-15 08:10:00'),
(7,  5,  '2025-01-16 13:00:00'),
(7,  11, '2025-01-16 13:05:00'),
(8,  10, '2025-01-17 14:00:00'),
(9,  2,  '2025-01-18 07:00:00'),
(9,  5,  '2025-01-18 07:05:00'),
(10, 3,  '2025-01-19 15:00:00'),
(10, 6,  '2025-01-19 15:10:00'),
(11, 7,  '2025-01-20 16:00:00'),
(13, 2,  '2025-01-26 09:00:00');
GO


-- =====================================================
-- 10. MATCH SESSIONS
-- user_one < user_two (bắt buộc theo constraint)
-- =====================================================
SET IDENTITY_INSERT MatchSessions ON;
INSERT INTO MatchSessions (match_id, user_one, user_two, match_type, requested_by, status, created_at)
VALUES
(1,  2, 5,  'random',    NULL, 'active',   '2025-01-12 10:00:00'),  -- Minh Khoa & Phương Linh
(2,  2, 6,  'selective', 2,    'active',   '2025-01-13 11:00:00'),  -- Minh Khoa & Tiến Đức (cùng thích nhiếp ảnh)
(3,  3, 10, 'random',    NULL, 'active',   '2025-01-14 12:00:00'),  -- Thúy Hằng & Cẩm Tú (cùng thích ẩm thực)
(4,  4, 8,  'selective', 4,    'rejected', '2025-01-15 09:00:00'),  -- Bảo Trần & Hoàng Anh
(5,  5, 9,  'random',    NULL, 'active',   '2025-01-16 07:00:00'),  -- Phương Linh & Tuấn Anh (cùng thích thể thao)
(6,  7, 11, 'selective', 7,    'active',   '2025-01-17 15:00:00'),  -- Mỹ Linh & Sơn Hà (cùng thích âm nhạc)
(7,  2, 9,  'random',    NULL, 'active',   '2025-01-18 08:00:00'),  -- Minh Khoa & Tuấn Anh
(8,  6, 10, 'selective', 10,   'pending',  '2025-01-19 16:00:00'),  -- Tiến Đức & Cẩm Tú (cùng thích nhiếp ảnh, du lịch)
(9,  3, 5,  'random',    NULL, 'ended',    '2025-01-10 10:00:00'),  -- Thúy Hằng & Phương Linh (đã kết thúc)
(10, 4, 13, 'selective', 4,    'active',   '2025-01-20 20:00:00');  -- Bảo Trần & Việt Trung
SET IDENTITY_INSERT MatchSessions OFF;
GO


-- =====================================================
-- 11. CONVERSATIONS
-- =====================================================
SET IDENTITY_INSERT Conversations ON;
INSERT INTO Conversations (conversation_id, conversation_type, group_lifetime, activity_id, expires_at, created_at)
VALUES
-- Direct chat từ match
(1,  'direct',   'permanent', NULL, NULL, '2025-01-12 10:05:00'),  -- Minh Khoa & Phương Linh
(2,  'direct',   'permanent', NULL, NULL, '2025-01-13 11:05:00'),  -- Minh Khoa & Tiến Đức
(3,  'direct',   'permanent', NULL, NULL, '2025-01-14 12:05:00'),  -- Thúy Hằng & Cẩm Tú
(4,  'direct',   'permanent', NULL, NULL, '2025-01-16 07:05:00'),  -- Phương Linh & Tuấn Anh
(5,  'direct',   'permanent', NULL, NULL, '2025-01-17 15:05:00'),  -- Mỹ Linh & Sơn Hà
-- Group chat hoạt động
(6,  'activity', 'permanent', 1,    NULL, '2025-01-05 09:10:00'),  -- Group Fansipan
(7,  'activity', 'temporary', 2,    '2025-02-28 23:59:00', '2025-01-08 10:10:00'), -- Group Workshop nấu ăn (tạm thời)
(8,  'activity', 'permanent', 3,    NULL, '2025-01-10 07:10:00'),  -- Group Chạy bộ
(9,  'activity', 'permanent', 7,    NULL, '2025-01-20 14:10:00'),  -- Group Jam Session
-- Group chat thông thường
(10, 'group',    'permanent', NULL, NULL, '2025-01-15 16:00:00'),  -- Nhóm ảnh Hà Nội
(11, 'group',    'temporary', NULL, '2025-02-15 23:59:00', '2025-01-20 10:00:00'); -- Nhóm tạm thời plan trip
SET IDENTITY_INSERT Conversations OFF;
GO


-- =====================================================
-- 12. CONVERSATION MEMBERS
-- =====================================================
INSERT INTO ConversationMembers (conversation_id, user_id, role, joined_at, left_at)
VALUES
-- Conv 1: Minh Khoa & Phương Linh (direct)
(1, 2, 'host',   '2025-01-12 10:05:00', NULL),
(1, 5, 'member', '2025-01-12 10:05:00', NULL),
-- Conv 2: Minh Khoa & Tiến Đức (direct)
(2, 2, 'host',   '2025-01-13 11:05:00', NULL),
(2, 6, 'member', '2025-01-13 11:05:00', NULL),
-- Conv 3: Thúy Hằng & Cẩm Tú (direct)
(3, 3, 'host',   '2025-01-14 12:05:00', NULL),
(3, 10,'member', '2025-01-14 12:05:00', NULL),
-- Conv 4: Phương Linh & Tuấn Anh (direct)
(4, 5, 'host',   '2025-01-16 07:05:00', NULL),
(4, 9, 'member', '2025-01-16 07:05:00', NULL),
-- Conv 5: Mỹ Linh & Sơn Hà (direct)
(5, 7, 'host',   '2025-01-17 15:05:00', NULL),
(5, 11,'member', '2025-01-17 15:05:00', NULL),
-- Conv 6: Group Fansipan (act 1)
(6, 2, 'host',   '2025-01-05 09:10:00', NULL),
(6, 6, 'member', '2025-01-06 08:05:00', NULL),
(6, 10,'member', '2025-01-06 10:05:00', NULL),
(6, 5, 'member', '2025-01-07 09:05:00', NULL),
-- Conv 7: Group Workshop nấu ăn (act 2)
(7, 3, 'host',   '2025-01-08 10:10:00', NULL),
(7, 10,'member', '2025-01-09 09:05:00', NULL),
(7, 5, 'member', '2025-01-09 10:05:00', NULL),
-- Conv 8: Group Chạy bộ (act 3)
(8, 5, 'host',   '2025-01-10 07:10:00', NULL),
(8, 2, 'member', '2025-01-11 07:05:00', NULL),
(8, 9, 'member', '2025-01-11 08:05:00', NULL),
(8, 8, 'member', '2025-01-11 09:05:00', NULL),
-- Conv 9: Group Jam Session (act 7)
(9, 11,'host',   '2025-01-20 14:10:00', NULL),
(9, 7, 'member', '2025-01-21 10:05:00', NULL),
(9, 4, 'member', '2025-01-21 11:05:00', NULL),
-- Conv 10: Nhóm ảnh Hà Nội
(10,6, 'host',   '2025-01-15 16:00:00', NULL),
(10,2, 'member', '2025-01-15 16:05:00', NULL),
(10,9, 'member', '2025-01-15 16:10:00', NULL),
-- Conv 11: Nhóm plan trip
(11,2, 'host',   '2025-01-20 10:00:00', NULL),
(11,10,'member', '2025-01-20 10:05:00', NULL),
(11,6, 'member', '2025-01-20 10:10:00', NULL),
(11,5, 'member', '2025-01-20 10:15:00', NULL),
-- Người đã rời nhóm
(8, 3, 'member', '2025-01-11 10:00:00', '2025-01-13 09:00:00');
GO


-- =====================================================
-- 13. MESSAGES
-- =====================================================
SET IDENTITY_INSERT Messages ON;
INSERT INTO Messages (message_id, conversation_id, sender_id, content, msg_type, created_at)
VALUES
-- Conv 1: Minh Khoa & Phương Linh
(1,  1, 2,  N'Chào Linh! Mình thấy bạn cũng thích chạy bộ, mình hay chạy ở hồ Tây mỗi sáng.',                    'text',   '2025-01-12 10:10:00'),
(2,  1, 5,  N'Ồ hay ghê! Mình hay chạy ở Tao Đàn, mai bạn có chạy không? Mình rủ nhóm luôn.',                    'text',   '2025-01-12 10:15:00'),
(3,  1, 2,  N'Được chứ! Mấy giờ xuất phát?',                                                                       'text',   '2025-01-12 10:16:00'),
(4,  1, 5,  N'6h sáng nhé! Đây là ảnh tụi mình hôm qua.',                                                         'text',   '2025-01-12 10:17:00'),
(5,  1, 5,  N'https://picsum.photos/seed/run_group/400/300',                                                        'image',  '2025-01-12 10:17:30'),

-- Conv 2: Minh Khoa & Tiến Đức
(6,  2, 2,  N'Đức ơi! Thấy bạn chụp ảnh đẹp lắm. Mình đang plan photo walk phố cổ, bạn có tham gia không?',      'text',   '2025-01-13 11:10:00'),
(7,  2, 6,  N'Hay đó! Mình đang cần địa điểm chụp mới. Khi nào đi?',                                              'text',   '2025-01-13 11:20:00'),
(8,  2, 2,  N'Mình đang lên kế hoạch cuối tháng này. Mình sẽ đăng bài lên app sau.',                               'text',   '2025-01-13 11:25:00'),
(9,  2, 6,  N'Oke! Đây là một số ảnh mình chụp gần đây để bạn tham khảo phong cách.',                             'text',   '2025-01-13 14:00:00'),
(10, 2, 6,  N'https://picsum.photos/seed/street_photo/400/300',                                                     'image',  '2025-01-13 14:00:30'),

-- Conv 3: Thúy Hằng & Cẩm Tú
(11, 3, 3,  N'Cẩm Tú! Mình cũng là food blogger luôn! Cùng collab review quán không?',                            'text',   '2025-01-14 12:10:00'),
(12, 3, 10, N'Waooo! Tuyệt vời! Mình đang cần partner đi review cùng. Bạn ở đâu?',                                'text',   '2025-01-14 12:15:00'),
(13, 3, 3,  N'Mình ở Đà Nẵng, bạn TP.HCM phải không? Hay mình review 2 thành phố đi!',                           'text',   '2025-01-14 12:20:00'),
(14, 3, 10, N'Hay ghê! Deal! Đây là Instagram của mình để bạn xem content.',                                       'text',   '2025-01-14 12:25:00'),

-- Conv 4: Phương Linh & Tuấn Anh
(15, 4, 5,  N'Tuấn Anh ơi, thấy bạn đang tìm nhóm tập thể thao. Nhóm chạy bộ của mình đang mở thêm chỗ!',       'text',   '2025-01-16 07:10:00'),
(16, 4, 9,  N'Ôi hay quá! Chạy bộ hay tập gym hả bạn? Mình thích cả 2.',                                          'text',   '2025-01-16 07:20:00'),
(17, 4, 5,  N'Chạy bộ và yoga. Thứ 7 nào cũng chạy ở Tao Đàn. Bạn join nhóm app để xem lịch nhé.',               'text',   '2025-01-16 07:25:00'),

-- Conv 5: Mỹ Linh & Sơn Hà
(18, 5, 7,  N'Sơn Hà ơi, nghe nói bạn chơi guitar acoustic? Mình nhảy contemporary, mình đang cần nhạc sống!',   'text',   '2025-01-17 15:10:00'),
(19, 5, 11, N'Thật sao! Mình cũng đang muốn kết hợp nhảy với nhạc sống từ lâu rồi. Bạn ở Đà Nẵng à?',            'text',   '2025-01-17 15:20:00'),
(20, 5, 7,  N'Đúng rồi! Mình hay tổ chức workshop ở Đà Nẵng. Khi nào Sơn Hà vào đây thì mình kết hợp nhé!',      'text',   '2025-01-17 15:25:00'),
(21, 5, 11, N'Tháng 3 mình có kế hoạch vào ĐN! Book trước nhé bạn.',                                              'text',   '2025-01-17 15:30:00'),

-- Conv 6: Group Fansipan
(22, 6, 2,  N'Chào mọi người! Group chuyến Fansipan 30/4 đây. Mình sẽ update lịch trình chi tiết sớm.',           'text',   '2025-01-05 09:15:00'),
(23, 6, 2,  N'https://picsum.photos/seed/fansipan_route/800/400',                                                   'image',  '2025-01-05 09:16:00'),
(24, 6, 6,  N'Tuyệt! Bạn có thể share bản đồ trek không? Mình muốn chuẩn bị giày phù hợp.',                      'text',   '2025-01-06 08:10:00'),
(25, 6, 10, N'Mình chưa leo Fansipan bao giờ, cần chuẩn bị gì hả mọi người?',                                     'text',   '2025-01-06 10:10:00'),
(26, 6, 2,  N'Cẩm Tú đừng lo, mình sẽ gửi checklist chuẩn bị chi tiết sau. Chủ yếu cần giày trek và áo gió.',    'text',   '2025-01-06 10:20:00'),
(27, 6, 5,  N'Mình đã leo 3 lần rồi. Quan trọng nhất là luyện thể lực trước 1 tháng. Chạy bộ mỗi ngày là được!', 'text',   '2025-01-07 09:10:00'),

-- Conv 7: Group Workshop nấu ăn
(28, 7, 3,  N'Chào mọi người! Workshop nấu ẩm thực miền Trung sẽ diễn ra ngày 8/2. Địa chỉ mình sẽ gửi sau.',    'text',   '2025-01-08 10:15:00'),
(29, 7, 10, N'Mình rất mong chờ! Bạn sẽ dạy mì Quảng không? Đó là món mình thích nhất.',                          'text',   '2025-01-09 09:10:00'),
(30, 7, 3,  N'Có chứ! Menu: mì Quảng, bánh xèo, và bún bò Huế. Mỗi người mang theo tạp dề nhé!',                 'text',   '2025-01-09 09:20:00'),
(31, 7, 5,  N'Ôi ngon quá! Mình ăn chay được không bạn Hằng?',                                                    'text',   '2025-01-09 10:10:00'),
(32, 7, 3,  N'Được bạn ơi! Mình sẽ có phần nguyên liệu chay riêng cho bạn.',                                      'text',   '2025-01-09 10:15:00'),

-- Conv 8: Group Chạy bộ
(33, 8, 5,  N'Nhóm mình chạy thứ 7 hàng tuần, 6h sáng tại Tao Đàn. Ai muốn join thì nhắn mình!',                 'text',   '2025-01-10 07:15:00'),
(34, 8, 2,  N'Mình đến từ Hà Nội nhưng thứ 7 này mình có xuống HCM. Mình join được không?',                       'text',   '2025-01-11 07:10:00'),
(35, 8, 5,  N'Tất nhiên rồi! Cứ tới điểm hẹn là được, không cần đăng ký trước.',                                  'text',   '2025-01-11 07:15:00'),
(36, 8, 9,  N'Mình mới chạy được 3km thôi, có sao không?',                                                         'text',   '2025-01-11 08:10:00'),
(37, 8, 5,  N'Không sao hết! Nhóm mình chạy theo khả năng từng người, không ép.',                                  'text',   '2025-01-11 08:15:00'),
(38, 8, 8,  N'Cảm ơn Linh nhé. Mình sẽ cố gắng dậy sớm thứ 7 này 😄',                                            'text',   '2025-01-11 09:10:00'),

-- Conv 9: Group Jam Session
(39, 9, 11, N'Mọi người ơi, jam session tối thứ 7 tại nhà mình nhé. Địa chỉ: 12 Trần Phú, Vũng Tàu.',            'text',   '2025-01-20 14:15:00'),
(40, 9, 7,  N'Tuyệt! Mình sẽ mang cajon. Có BBQ không Hà ơi?',                                                    'text',   '2025-01-21 10:10:00'),
(41, 9, 11, N'Có chứ! Mình chuẩn bị BBQ và đồ nhắm. Mọi người chỉ cần mang nhạc cụ.',                             'text',   '2025-01-21 10:20:00'),
(42, 9, 4,  N'Mình không biết chơi nhạc cụ nhưng mình sẽ mang theo loa bluetooth được không? 😂',                 'text',   '2025-01-21 11:10:00'),
(43, 9, 11, N'Haha được chứ! Mình thiếu loa rồi, bạn Bảo mang giúp nhé.',                                         'text',   '2025-01-21 11:15:00'),

-- Conv 10: Nhóm ảnh Hà Nội
(44, 10,6,  N'Chào mọi người! Group này cho những ai yêu nhiếp ảnh và thường xuyên đi chụp ở Hà Nội.',            'text',   '2025-01-15 16:05:00'),
(45, 10,2,  N'Hay quá! Mình đang có ảnh phố cổ mới chụp, share cho mọi người xem.',                               'text',   '2025-01-15 16:30:00'),
(46, 10,2,  N'https://picsum.photos/seed/hanoi_street/800/400',                                                     'image',  '2025-01-15 16:30:30'),
(47, 10,6,  N'Đẹp quá bạn ơi! Chụp bằng máy gì vậy? Màu film rất đẹp.',                                           'text',   '2025-01-15 16:45:00'),
(48, 10,9,  N'Mình cũng muốn học chụp ảnh đường phố, mọi người cho mình vài tip được không?',                     'text',   '2025-01-15 17:00:00'),

-- Conv 11: Nhóm plan trip
(49, 11,2,  N'Mọi người ơi! Mình đang plan trip Tà Xùa tháng sau, ai muốn đi cùng không?',                        'text',   '2025-01-20 10:05:00'),
(50, 11,10, N'Ôi Tà Xùa! Mình muốn đi lắm. Đi tháng mấy bạn ơi?',                                                'text',   '2025-01-20 10:10:00'),
(51, 11,2,  N'Dự kiến 15-17/2. Đi 3 ngày 2 đêm. Chi phí khoảng 2-2.5 triệu/người.',                               'text',   '2025-01-20 10:15:00'),
(52, 11,6,  N'Mình đi! Lần trước mình lên đó chụp ảnh đẹp lắm.',                                                  'text',   '2025-01-20 10:20:00'),
(53, 11,6,  N'https://picsum.photos/seed/taxua_cloud/800/400',                                                      'image',  '2025-01-20 10:20:30'),
(54, 11,5,  N'Tháng 2 mình còn lịch, mình cũng đăng ký nhé!',                                                     'text',   '2025-01-20 10:25:00'),

-- Tin nhắn hệ thống
(55, 6, 1,  N'Minh Khoa đã tạo nhóm "Cùng leo Fansipan dịp 30/4".',                                               'system', '2025-01-05 09:10:00'),
(56, 8, 1,  N'Phương Linh đã tạo nhóm "Chạy bộ sáng – Công viên Tao Đàn".',                                       'system', '2025-01-10 07:10:00'),
(57, 9, 1,  N'Sơn Hà đã tạo nhóm "Jam Session Acoustic – Cuối tuần tại Vũng Tàu".',                               'system', '2025-01-20 14:10:00');
SET IDENTITY_INSERT Messages OFF;
GO


-- =====================================================
-- 14. NOTIFICATIONS
-- =====================================================
SET IDENTITY_INSERT Notifications ON;
INSERT INTO Notifications (notification_id, user_id, type, ref_id, content, is_read, created_at)
VALUES
-- Thông báo yêu cầu tham gia hoạt động
(1,  2,  'activity_request', 1,  N'Tiến Đức đã gửi yêu cầu tham gia "Cùng leo Fansipan dịp 30/4".',        1, '2025-01-06 08:00:00'),
(2,  2,  'activity_request', 1,  N'Cẩm Tú đã gửi yêu cầu tham gia "Cùng leo Fansipan dịp 30/4".',          1, '2025-01-06 10:00:00'),
(3,  2,  'activity_request', 1,  N'Phương Linh đã gửi yêu cầu tham gia "Cùng leo Fansipan dịp 30/4".',      1, '2025-01-07 09:00:00'),
(4,  2,  'activity_request', 1,  N'Tuấn Anh đã gửi yêu cầu tham gia "Cùng leo Fansipan dịp 30/4".',        0, '2025-01-08 11:00:00'),
-- Thông báo chấp nhận yêu cầu
(5,  6,  'activity_request', 1,  N'Yêu cầu tham gia "Cùng leo Fansipan" của bạn đã được chấp nhận!',        1, '2025-01-06 08:30:00'),
(6,  10, 'activity_request', 1,  N'Yêu cầu tham gia "Cùng leo Fansipan" của bạn đã được chấp nhận!',        1, '2025-01-06 10:30:00'),
(7,  5,  'activity_request', 1,  N'Yêu cầu tham gia "Cùng leo Fansipan" của bạn đã được chấp nhận!',        1, '2025-01-07 09:30:00'),
-- Thông báo match
(8,  2,  'match_accepted',   1,  N'Bạn và Phương Linh đã được ghép thành công! Hãy bắt đầu trò chuyện.',    1, '2025-01-12 10:05:00'),
(9,  5,  'match_accepted',   1,  N'Bạn và Minh Khoa đã được ghép thành công! Hãy bắt đầu trò chuyện.',      1, '2025-01-12 10:05:00'),
(10, 2,  'match_accepted',   2,  N'Bạn và Tiến Đức đã được ghép thành công!',                                1, '2025-01-13 11:05:00'),
(11, 3,  'match_accepted',   3,  N'Bạn và Cẩm Tú đã được ghép thành công!',                                  1, '2025-01-14 12:05:00'),
(12, 7,  'match_accepted',   6,  N'Bạn và Sơn Hà đã được ghép thành công! Cùng nhau tạo ra âm nhạc nhé.',   0, '2025-01-17 15:05:00'),
-- Thông báo match request (selective)
(13, 6,  'match_request',    8,  N'Cẩm Tú muốn kết nối với bạn vì cùng yêu thích nhiếp ảnh và du lịch.',   0, '2025-01-19 16:00:00'),
-- Thông báo follow
(14, 2,  'follow',           NULL, N'Phương Linh đã bắt đầu theo dõi bạn.',                                   1, '2025-01-10 09:00:00'),
(15, 2,  'follow',           NULL, N'Tiến Đức đã bắt đầu theo dõi bạn.',                                      1, '2025-01-15 08:00:00'),
(16, 5,  'follow',           NULL, N'Minh Khoa đã bắt đầu theo dõi bạn.',                                     1, '2025-01-10 08:00:00'),
(17, 10, 'follow',           NULL, N'Thúy Hằng đã bắt đầu theo dõi bạn.',                                     0, '2025-01-12 10:00:00'),
-- Thông báo tin nhắn mới
(18, 5,  'message',          1,  N'Minh Khoa: "Chào Linh! Mình thấy bạn cũng thích chạy bộ..."',             1, '2025-01-12 10:10:00'),
(19, 6,  'message',          2,  N'Minh Khoa: "Đức ơi! Thấy bạn chụp ảnh đẹp lắm..."',                      1, '2025-01-13 11:10:00'),
(20, 9,  'message',          4,  N'Phương Linh: "Tuấn Anh ơi, thấy bạn đang tìm nhóm tập thể thao..."',     0, '2025-01-16 07:10:00'),
-- Thông báo hệ thống / admin
(21, 3,  'system',           NULL, N'Bài đăng "Workshop nấu ăn: Ẩm thực miền Trung" đã được duyệt!',          1, '2025-01-08 10:00:00'),
(22, 5,  'system',           NULL, N'Bài đăng "Chạy bộ sáng – Công viên Tao Đàn" đã được duyệt!',            1, '2025-01-10 07:00:00'),
(23, 6,  'system',           NULL, N'Bài đăng "Photo Walk – Phố cổ Hà Nội" đang chờ duyệt.',                  0, '2025-01-23 09:00:00'),
(24, 12, 'system',           NULL, N'Tài khoản của bạn đã bị tạm khóa đến ngày 01/03/2025 do vi phạm nội quy.', 1, '2025-01-25 09:00:00'),
-- Thông báo report được xử lý
(25, 5,  'report_resolved',  1,  N'Báo cáo của bạn đã được xử lý. Cảm ơn bạn đã giúp cộng đồng an toàn hơn.', 1, '2025-01-26 10:00:00');
SET IDENTITY_INSERT Notifications OFF;
GO


-- =====================================================
-- 15. REPORTS
-- =====================================================
SET IDENTITY_INSERT Reports ON;
INSERT INTO Reports (report_id, reporter_id, reported_user_id, reported_activity_id, reason, status, resolved_by, resolved_at, created_at)
VALUES
-- Report user vi phạm → đã resolved → dẫn đến ban user 12
(1, 5,  12, NULL, N'User này nhắn tin spam và có ngôn từ xúc phạm trong nhóm chat. Mình đã chụp màn hình lại.',                              'resolved',  1, '2025-01-25 08:00:00', '2025-01-24 15:00:00'),
(2, 2,  12, NULL, N'Tài khoản này liên tục gửi link quảng cáo và nội dung không liên quan vào nhiều nhóm chat.',                             'resolved',  1, '2025-01-25 08:30:00', '2025-01-24 16:00:00'),
-- Report bài đăng spam
(3, 9,  NULL, 4,  N'Bài đăng này dùng tiêu đề gây hiểu lầm. Nội dung thực tế là quảng cáo phần mềm, không liên quan đến gaming.',           'dismissed', 1, '2025-01-22 10:00:00', '2025-01-20 21:00:00'),
-- Report đang chờ xử lý
(4, 3,  NULL, 10, N'Bài đăng CLB sách này copy nguyên nội dung từ group Facebook khác, không phải tự tổ chức.',                              'pending',   NULL, NULL,                 '2025-01-26 09:00:00'),
(5, 10, 9,  NULL, N'User này đã hủy tham gia hoạt động vào phút chót và không thông báo trước, gây ảnh hưởng đến nhóm.',                     'pending',   NULL, NULL,                 '2025-01-27 10:00:00');
SET IDENTITY_INSERT Reports OFF;
GO


-- =====================================================
-- 16. REPUTATION LOGS
-- =====================================================
SET IDENTITY_INSERT ReputationLogs ON;
INSERT INTO ReputationLogs (log_id, user_id, delta, reason, ref_type, ref_id, created_at)
VALUES
-- Cộng điểm khi được chấp nhận vào hoạt động
(1,  6,  10,  N'Được chấp nhận tham gia hoạt động',               'activity', 1,  '2025-01-06 08:30:00'),
(2,  10, 10,  N'Được chấp nhận tham gia hoạt động',               'activity', 1,  '2025-01-06 10:30:00'),
(3,  5,  10,  N'Được chấp nhận tham gia hoạt động',               'activity', 1,  '2025-01-07 09:30:00'),
(4,  10, 10,  N'Được chấp nhận tham gia hoạt động nấu ăn',        'activity', 2,  '2025-01-09 09:30:00'),
(5,  5,  10,  N'Được chấp nhận tham gia hoạt động nấu ăn',        'activity', 2,  '2025-01-09 10:30:00'),
(6,  2,  10,  N'Được chấp nhận tham gia nhóm chạy bộ',            'activity', 3,  '2025-01-11 07:30:00'),
(7,  9,  10,  N'Được chấp nhận tham gia nhóm chạy bộ',            'activity', 3,  '2025-01-11 08:30:00'),
(8,  8,  10,  N'Được chấp nhận tham gia nhóm chạy bộ',            'activity', 3,  '2025-01-11 09:30:00'),
-- Cộng điểm khi tổ chức hoạt động được duyệt
(9,  2,  20,  N'Bài đăng hoạt động được admin duyệt',             'activity', 1,  '2025-01-05 09:00:00'),
(10, 3,  20,  N'Bài đăng hoạt động được admin duyệt',             'activity', 2,  '2025-01-08 10:00:00'),
(11, 5,  20,  N'Bài đăng hoạt động được admin duyệt',             'activity', 3,  '2025-01-10 07:00:00'),
(12, 4,  20,  N'Bài đăng hoạt động được admin duyệt',             'activity', 4,  '2025-01-12 20:00:00'),
(13, 7,  20,  N'Bài đăng hoạt động được admin duyệt',             'activity', 5,  '2025-01-15 08:00:00'),
(14, 10, 20,  N'Bài đăng hoạt động được admin duyệt',             'activity', 6,  '2025-01-18 17:00:00'),
(15, 11, 20,  N'Bài đăng hoạt động được admin duyệt',             'activity', 7,  '2025-01-20 14:00:00'),
(16, 9,  20,  N'Bài đăng hoạt động được admin duyệt',             'activity', 8,  '2025-01-22 08:00:00'),
-- Cộng điểm khi được match thành công
(17, 2,  5,   N'Match thành công với người dùng khác',            'match',    1,  '2025-01-12 10:05:00'),
(18, 5,  5,   N'Match thành công với người dùng khác',            'match',    1,  '2025-01-12 10:05:00'),
(19, 3,  5,   N'Match thành công với người dùng khác',            'match',    3,  '2025-01-14 12:05:00'),
(20, 10, 5,   N'Match thành công với người dùng khác',            'match',    3,  '2025-01-14 12:05:00'),
-- Trừ điểm do bị report
(21, 12, -30, N'Bị report vi phạm: spam và ngôn từ xúc phạm',    'report',   1,  '2025-01-25 08:00:00'),
(22, 12, -20, N'Bị report vi phạm lần 2: spam link',              'report',   2,  '2025-01-25 08:30:00'),
-- Cộng điểm khởi tạo
(23, 13, 0,   N'Khởi tạo điểm uy tín mặc định khi đăng ký',      'system',   NULL,'2025-01-10 15:00:00');
SET IDENTITY_INSERT ReputationLogs OFF;
GO


-- =====================================================
-- 17. BANNED KEYWORDS
-- =====================================================
SET IDENTITY_INSERT BannedKeywords ON;
INSERT INTO BannedKeywords (keyword_id, keyword, created_by, created_at)
VALUES
(1,  N'cờ bạc',        1, '2024-01-15 09:00:00'),
(2,  N'cá độ',         1, '2024-01-15 09:00:00'),
(3,  N'lô đề',         1, '2024-01-15 09:00:00'),
(4,  N'ma túy',        1, '2024-01-15 09:00:00'),
(5,  N'cho vay nặng lãi', 1, '2024-02-01 10:00:00'),
(6,  N'tín dụng đen',  1, '2024-02-01 10:00:00'),
(7,  N'hack',          1, '2024-03-01 11:00:00'),
(8,  N'lừa đảo',       1, '2024-03-01 11:00:00'),
(9,  N'kiếm tiền nhanh', 1, '2024-03-15 09:00:00'),
(10, N'đa cấp',        1, '2024-03-15 09:00:00');
SET IDENTITY_INSERT BannedKeywords OFF;
GO


-- =====================================================
-- 18. SYSTEM CONFIG
-- =====================================================
SET IDENTITY_INSERT SystemConfig ON;
INSERT INTO SystemConfig (config_id, config_key, config_value, updated_by, updated_at)
VALUES
(1,  N'app_name',                    N'SoThich - Kết Nối Sở Thích',       1, '2024-01-01 08:00:00'),
(2,  N'app_version',                 N'1.0.0',                             1, '2024-01-01 08:00:00'),
(3,  N'max_activities_per_user',     N'10',                                1, '2024-01-01 08:00:00'),
(4,  N'max_images_per_activity',     N'10',                                1, '2024-01-01 08:00:00'),
(5,  N'daily_status_duration_hours', N'24',                                1, '2024-01-01 08:00:00'),
(6,  N'reputation_new_activity',     N'20',                                1, '2024-01-01 08:00:00'),
(7,  N'reputation_join_activity',    N'10',                                1, '2024-01-01 08:00:00'),
(8,  N'reputation_match_success',    N'5',                                 1, '2024-01-01 08:00:00'),
(9,  N'reputation_report_penalty',   N'-30',                               1, '2024-01-01 08:00:00'),
(10, N'min_reputation_to_post',      N'50',                                1, '2024-01-01 08:00:00'),
(11, N'ban_threshold_reports',       N'3',                                 1, '2024-02-01 09:00:00'),
(12, N'default_ban_duration_days',   N'30',                                1, '2024-02-01 09:00:00'),
(13, N'max_group_members',           N'50',                                1, '2024-03-01 10:00:00'),
(14, N'allow_anonymous_browse',      N'false',                             1, '2024-03-01 10:00:00'),
(15, N'maintenance_mode',            N'false',                             1, '2025-01-01 08:00:00');
SET IDENTITY_INSERT SystemConfig OFF;
GO


/* =====================================================
   VERIFY – Kiểm tra số lượng dữ liệu đã insert
   ===================================================== */
SELECT 'Users'              AS [Table], COUNT(*) AS [Rows] FROM Users
UNION ALL
SELECT 'DailyStatus',                   COUNT(*)           FROM DailyStatus
UNION ALL
SELECT 'Interests',                     COUNT(*)           FROM Interests
UNION ALL
SELECT 'UserInterests',                 COUNT(*)           FROM UserInterests
UNION ALL
SELECT 'Activities',                    COUNT(*)           FROM Activities
UNION ALL
SELECT 'ActivityImages',                COUNT(*)           FROM ActivityImages
UNION ALL
SELECT 'ActivityTags',                  COUNT(*)           FROM ActivityTags
UNION ALL
SELECT 'ActivityRequests',              COUNT(*)           FROM ActivityRequests
UNION ALL
SELECT 'Follows',                       COUNT(*)           FROM Follows
UNION ALL
SELECT 'MatchSessions',                 COUNT(*)           FROM MatchSessions
UNION ALL
SELECT 'Conversations',                 COUNT(*)           FROM Conversations
UNION ALL
SELECT 'ConversationMembers',           COUNT(*)           FROM ConversationMembers
UNION ALL
SELECT 'Messages',                      COUNT(*)           FROM Messages
UNION ALL
SELECT 'Notifications',                 COUNT(*)           FROM Notifications
UNION ALL
SELECT 'Reports',                       COUNT(*)           FROM Reports
UNION ALL
SELECT 'ReputationLogs',                COUNT(*)           FROM ReputationLogs
UNION ALL
SELECT 'BannedKeywords',                COUNT(*)           FROM BannedKeywords
UNION ALL
SELECT 'SystemConfig',                  COUNT(*)           FROM SystemConfig;
GO

-- Thêm cột 'gender' (Giới tính) nếu chưa tồn tại
IF NOT EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'Users' AND COLUMN_NAME = 'gender'
)
BEGIN
    ALTER TABLE Users ADD gender NVARCHAR(10);
    PRINT 'Da them cot gender vao bang Users.';
END
ELSE
BEGIN
    PRINT 'Cot gender da ton tai.';
END
GO

-- Thêm cột 'dob' (Ngày sinh) nếu chưa tồn tại
IF NOT EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'Users' AND COLUMN_NAME = 'dob'
)
BEGIN
    ALTER TABLE Users ADD dob DATE;
    PRINT 'Da them cot dob vao bang Users.';
END
ELSE
BEGIN
    PRINT 'Cot dob da ton tai.';
END
GO
