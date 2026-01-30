-- OAuth State Storage for CSRF Protection
-- Task 19.3: OAuth state validation
-- Requirement: 10.5 (security)

CREATE TABLE IF NOT EXISTS oauth_states (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    platform TEXT NOT NULL,
    state TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_oauth_states_state ON oauth_states(state);
CREATE INDEX idx_oauth_states_expires ON oauth_states(expires_at);
CREATE INDEX idx_oauth_states_tenant ON oauth_states(tenant_id);

-- Clean up expired states (run periodically)
-- DELETE FROM oauth_states WHERE datetime(expires_at) < datetime('now');
