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
