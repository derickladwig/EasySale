-- Create backups table for tracking database backups
CREATE TABLE IF NOT EXISTS backups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL CHECK(status IN ('success', 'failed', 'in_progress')),
    location TEXT NOT NULL CHECK(location IN ('local', 'cloud', 'both')),
    error_message TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX idx_backups_created_at ON backups(created_at DESC);
CREATE INDEX idx_backups_status ON backups(status);

-- Add archived columns to layaways table if it exists
-- This is safe to run even if columns already exist
ALTER TABLE layaways ADD COLUMN archived INTEGER NOT NULL DEFAULT 0;
ALTER TABLE layaways ADD COLUMN archived_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_layaways_archived ON layaways(archived, archived_at);
