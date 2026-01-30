-- Migration: Add download_tokens table for secure time-limited backup downloads
-- Description: Implements secure archive downloads with time-limited tokens

-- Download Tokens: Time-limited tokens for secure backup archive downloads
CREATE TABLE IF NOT EXISTS download_tokens (
    token TEXT PRIMARY KEY,
    backup_job_id TEXT NOT NULL,
    created_by TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    used BOOLEAN NOT NULL DEFAULT 0,
    used_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (backup_job_id) REFERENCES backup_jobs(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_download_tokens_backup ON download_tokens(backup_job_id);
CREATE INDEX IF NOT EXISTS idx_download_tokens_expires ON download_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_download_tokens_used ON download_tokens(used);
