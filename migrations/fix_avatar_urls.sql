-- Fix avatar URLs - remove local domain and keep only relative path
-- This fixes Mixed Content errors in production

-- Update avatar_url to remove http://127.0.0.1:3001 and http://localhost:3001
UPDATE users 
SET avatar_url = REGEXP_REPLACE(avatar_url, '^https?://(127\.0\.0\.1|localhost)(:\d+)?', '', 'g')
WHERE avatar_url LIKE 'http://127.0.0.1%' 
   OR avatar_url LIKE 'http://localhost%';

-- Show updated records
SELECT user_id, username, avatar_url 
FROM users 
WHERE avatar_url IS NOT NULL 
  AND avatar_url != '';
