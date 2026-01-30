# Settings API Integration - In Progress

**Date:** 2026-01-12  
**Status:** Backend Implementation Complete, Testing Pending

## Completed Work

### 1. Backend Models ✅
**File:** `backend/rust/src/models/settings.rs`

Created comprehensive settings models:
- `UserPreferences` - User-specific settings
- `LocalizationSettings` - Language, currency, tax, date/time
- `NetworkSettings` - Sync and offline configuration
- `PerformanceSettings` - Monitoring configuration
- Request DTOs for all update operations

### 2. API Handlers ✅
**File:** `backend/rust/src/handlers/settings.rs`

Implemented 8 REST endpoints:
- `GET /api/settings/preferences` - Get user preferences
- `PUT /api/settings/preferences` - Update user preferences
- `GET /api/settings/localization` - Get localization settings
- `PUT /api/settings/localization` - Update localization settings
- `GET /api/settings/network` - Get network settings
- `PUT /api/settings/network` - Update network settings
- `GET /api/settings/performance` - Get performance settings
- `PUT /api/settings/performance` - Update performance settings

**Features:**
- Tenant isolation (all queries filtered by tenant_id)
- User context extraction from JWT
- Validation for all inputs (tax rate, sync interval, etc.)
- Default values when settings don't exist
- UPSERT operations (INSERT OR UPDATE)
- Proper error handling with ApiError

### 3. Database Migration ✅
**File:** `backend/rust/migrations/009_create_settings_tables.sql`

Created 4 settings tables:
- `user_preferences` - Per user, per tenant
- `localization_settings` - Per tenant
- `network_settings` - Per tenant
- `performance_settings` - Per tenant

**Features:**
- Proper indexes for performance
- Foreign key constraints
- Default values
- Timestamps (created_at, updated_at)
- Initial data for 'caps-automotive' tenant

### 4. Route Registration ✅
**File:** `backend/rust/src/main.rs`

Registered settings routes with:
- Permission protection (manage_settings)
- Proper scope configuration
- Integration with existing middleware

## Validation Rules

### Localization Settings
- Tax rate: 0-100%
- Decimal places: 0-4
- Valid language codes: en, fr, es
- Valid currencies: CAD, USD, EUR, GBP

### Network Settings
- Sync interval: 60-3600 seconds (1 min to 1 hour)
- Max queue size: 100-100,000 operations

### Performance Settings
- Monitoring URL: Optional, must be valid URL
- Sentry DSN: Optional, must be valid DSN format

## Next Steps

### 1. Frontend Integration (2-3 hours)
- [ ] Create API service layer
- [ ] Connect settings pages to endpoints
- [ ] Add React Query for data fetching
- [ ] Implement form validation with Zod
- [ ] Add loading states
- [ ] Add error handling

### 2. Testing (1-2 hours)
- [ ] Unit tests for API handlers
- [ ] Integration tests for endpoints
- [ ] Test validation rules
- [ ] Test tenant isolation
- [ ] Test default values

### 3. Documentation (30 minutes)
- [ ] API documentation
- [ ] User guide updates
- [ ] Admin guide for settings

## API Examples

### Get User Preferences
```bash
GET /api/settings/preferences
Authorization: Bearer <token>

Response:
{
  "user_id": "user-123",
  "display_name": "John Doe",
  "email": "john@example.com",
  "theme": "dark",
  "email_notifications": true,
  "desktop_notifications": true,
  "tenant_id": "caps-automotive"
}
```

### Update Localization Settings
```bash
PUT /api/settings/localization
Authorization: Bearer <token>
Content-Type: application/json

{
  "language": "en",
  "currency": "CAD",
  "tax_rate": 13.0,
  "timezone": "America/Toronto"
}

Response:
{
  "message": "Localization settings updated successfully"
}
```

### Get Network Settings
```bash
GET /api/settings/network
Authorization: Bearer <token>

Response:
{
  "tenant_id": "caps-automotive",
  "sync_enabled": true,
  "sync_interval": 300,
  "auto_resolve_conflicts": true,
  "offline_mode_enabled": true,
  "max_queue_size": 10000
}
```

## Database Schema

### user_preferences
```sql
CREATE TABLE user_preferences (
    user_id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    display_name TEXT,
    email TEXT,
    theme TEXT NOT NULL DEFAULT 'dark',
    email_notifications INTEGER NOT NULL DEFAULT 1,
    desktop_notifications INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, tenant_id)
);
```

### localization_settings
```sql
CREATE TABLE localization_settings (
    tenant_id TEXT PRIMARY KEY NOT NULL,
    language TEXT NOT NULL DEFAULT 'en',
    currency TEXT NOT NULL DEFAULT 'CAD',
    currency_symbol TEXT NOT NULL DEFAULT '$',
    currency_position TEXT NOT NULL DEFAULT 'before',
    decimal_places INTEGER NOT NULL DEFAULT 2,
    tax_enabled INTEGER NOT NULL DEFAULT 1,
    tax_rate REAL NOT NULL DEFAULT 13.0,
    tax_name TEXT NOT NULL DEFAULT 'HST',
    date_format TEXT NOT NULL DEFAULT 'YYYY-MM-DD',
    time_format TEXT NOT NULL DEFAULT '24h',
    timezone TEXT NOT NULL DEFAULT 'America/Toronto',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

## Security Considerations

1. **Authentication Required:** All endpoints require valid JWT token
2. **Permission Check:** All endpoints protected with `manage_settings` permission
3. **Tenant Isolation:** All queries filtered by tenant_id from JWT
4. **Input Validation:** All inputs validated before database operations
5. **SQL Injection Prevention:** Using parameterized queries
6. **Sensitive Data:** Credentials (Sentry DSN, monitoring URL) stored securely

## Performance Considerations

1. **Indexes:** All tenant_id columns indexed for fast lookups
2. **UPSERT:** Using INSERT OR UPDATE for efficient updates
3. **Default Values:** Returning defaults without database hit when possible
4. **Connection Pooling:** Using Mutex<Connection> for thread safety

## Known Limitations

1. **No OAuth Flows:** Integration credentials stored as plain text (encryption needed)
2. **No Settings History:** No audit trail for settings changes (can add later)
3. **No Settings Validation UI:** Frontend validation not yet implemented
4. **No Settings Export/Import:** Bulk operations not yet supported

## Completion Status

- **Backend Models:** 100% ✅
- **API Handlers:** 100% ✅
- **Database Migration:** 100% ✅
- **Route Registration:** 100% ✅
- **Frontend Integration:** 0% ⬜
- **Testing:** 0% ⬜
- **Documentation:** 50% 🟡

**Overall Backend:** 100% Complete ✅  
**Overall Project:** 50% Complete (Backend done, Frontend pending)
