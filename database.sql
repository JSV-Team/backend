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

    -- pending | approved | rejected | deleted
    status           NVARCHAR(20)  NOT NULL CONSTRAINT DF_Activities_Status    DEFAULT 'pending',
    created_at       DATETIME2     NOT NULL CONSTRAINT DF_Activities_CreatedAt DEFAULT SYSDATETIME(),

    CONSTRAINT FK_Activities_Creator  FOREIGN KEY (creator_id) REFERENCES Users(user_id),
    CONSTRAINT CHK_Activities_Status  CHECK (status IN ('pending', 'approved', 'rejected', 'deleted')),
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

    -- direct | group | activity
    conversation_type NVARCHAR(20) NOT NULL,

    -- temporary | permanent
    group_lifetime    NVARCHAR(20) NOT NULL CONSTRAINT DF_Conv_Lifetime  DEFAULT 'permanent',

    activity_id       INT          NULL,   -- chỉ có giá trị khi type = 'activity'
    expires_at        DATETIME2    NULL,
    created_at        DATETIME2    NOT NULL CONSTRAINT DF_Conv_CreatedAt DEFAULT SYSDATETIME(),

    CONSTRAINT FK_Conversations_Activity FOREIGN KEY (activity_id) REFERENCES Activities(activity_id) ON DELETE SET NULL,
    CONSTRAINT CHK_Conversation_Type     CHECK (conversation_type IN ('direct', 'group', 'activity')),
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


