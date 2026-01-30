-- Migration: Accounting Tables
-- Purpose: Create journal entries and chart of accounts tables for accounting integration
-- Created: 2026-01-26

-- Chart of Accounts table
CREATE TABLE IF NOT EXISTS chart_of_accounts (
    id TEXT PRIMARY KEY,
    account_number TEXT NOT NULL,
    account_name TEXT NOT NULL,
    account_type TEXT NOT NULL, -- 'asset', 'liability', 'equity', 'revenue', 'expense'
    parent_account TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    tenant_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(account_number, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_coa_tenant ON chart_of_accounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_coa_account_number ON chart_of_accounts(account_number);
CREATE INDEX IF NOT EXISTS idx_coa_type ON chart_of_accounts(account_type);

-- Journal Entries table
CREATE TABLE IF NOT EXISTS journal_entries (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    entry_date TEXT NOT NULL,
    description TEXT,
    total_debits REAL NOT NULL DEFAULT 0.0,
    total_credits REAL NOT NULL DEFAULT 0.0,
    status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'posted', 'void'
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    created_by TEXT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_journal_entries_tenant ON journal_entries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_journal_entries_status ON journal_entries(status);

-- Journal Entry Lines table
CREATE TABLE IF NOT EXISTS journal_entry_lines (
    id TEXT PRIMARY KEY,
    entry_id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    account TEXT NOT NULL,
    debit REAL NOT NULL DEFAULT 0.0,
    credit REAL NOT NULL DEFAULT 0.0,
    description TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (entry_id) REFERENCES journal_entries(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_journal_lines_entry ON journal_entry_lines(entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_tenant ON journal_entry_lines(tenant_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_account ON journal_entry_lines(account);
