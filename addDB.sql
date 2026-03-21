
USE SoThichDB;
GO
IF NOT EXISTS(SELECT * FROM sys.columns WHERE Name = N'image_url' AND Object_ID = Object_ID(N'Messages'))
BEGIN
    ALTER TABLE Messages ADD image_url NVARCHAR(500) NULL;
END
GO