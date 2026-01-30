-- Migration: Add display_name to users table
-- Purpose: Add display_name column for user-friendly names
-- Created: 2026-01-18

-- Add display_name column to users table
ALTER TABLE users ADD COLUMN display_name TEXT;

-- Update existing users to have display_name based on first_name and last_name
UPDATE users 
SET display_name = COALESCE(
    CASE 
        WHEN first_name IS NOT NULL AND last_name IS NOT NULL THEN first_name || ' ' || last_name
        WHEN first_name IS NOT NULL THEN first_name
        WHEN last_name IS NOT NULL THEN last_name
        ELSE username
    END,
    username
)
WHERE display_name IS NULL;
