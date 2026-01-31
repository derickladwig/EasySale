-- Migration: Add last_login_at column to users table
-- This tracks when users last logged in for filtering and analytics

-- Add last_login_at column to users table
ALTER TABLE users ADD COLUMN last_login_at TEXT;

-- Create index for filtering users who have never logged in
CREATE INDEX IF NOT EXISTS idx_users_last_login_at ON users(last_login_at);
