-- Migration: Add 'interest' to match_type constraint
-- Date: 2026-03-22
-- Description: Allow 'interest' as a valid match_type in match_sessions table

-- Drop the old constraint
ALTER TABLE match_sessions DROP CONSTRAINT IF EXISTS chk_match_type;

-- Add the new constraint with 'interest' included
ALTER TABLE match_sessions ADD CONSTRAINT chk_match_type 
    CHECK (match_type IN ('random', 'selective', 'interest'));

-- Verify the constraint was added
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conname = 'chk_match_type';
