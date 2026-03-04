SET ANSI_NULLS ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET QUOTED_IDENTIFIER ON;
SET NUMERIC_ROUNDABORT OFF;
GO

IF EXISTS (SELECT name FROM sys.indexes WHERE name = N'UQ_Conversations_Activity')
    DROP INDEX UQ_Conversations_Activity ON Conversations;
GO

CREATE UNIQUE NONCLUSTERED INDEX UQ_Conversations_Activity 
ON Conversations(activity_id) 
WHERE activity_id IS NOT NULL;
GO

IF COL_LENGTH('ConversationMembers', 'last_read_message_id') IS NULL
BEGIN
    ALTER TABLE ConversationMembers ADD last_read_message_id BIGINT NULL;
END
GO

IF COL_LENGTH('Messages', 'read_by_users') IS NULL
BEGIN
    ALTER TABLE Messages ADD read_by_users NVARCHAR(MAX) NULL;
END
GO
