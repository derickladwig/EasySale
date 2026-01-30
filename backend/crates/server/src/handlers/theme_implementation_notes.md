# Theme Persistence Implementation Notes

## Status: Partially Complete

### What Was Implemented

1. **Migration File**: `migrations/040_theme_preferences.sql`
   - Creates indexes for theme-related queries
   - Inserts default theme settings (mode, accent, density, locks)
   - Migrates existing user_preferences.theme data to settings table
   - Uses the existing `settings` table for theme persistence

2. **Backend Handler**: `handlers/theme.rs`
   - GET `/theme` endpoint for retrieving theme with scope resolution
   - PUT `/theme` endpoint for saving theme preferences
   - Implements scope precedence (user > store > global)
   - Respects theme locks (lockMode, lockAccent, lockContrast)
   - Adds changes to sync_queue for offline-first operation

3. **Route Configuration**: Added to `main.rs`
   - Theme routes configured under `/api/theme`

### Known Issues

1. **Migration Conflicts**: The project has duplicate migration numbers (003, 009, 010, 011)
   - This prevents running migrations cleanly
   - The 040_theme_preferences.sql migration cannot be tested until this is resolved

2. **SQLX Offline Mode**: The build requires SQLX_OFFLINE=true but the query cache needs updating
   - Need to run `cargo sqlx prepare` after migrations are fixed
   - Or manually add query metadata to `.sqlx/` directory

3. **Compilation Errors**: The theme handler has compilation errors due to:
   - Missing database tables (migrations not run)
   - SQLX macro queries not in cache

### Next Steps to Complete

1. **Fix Migration Numbering**:
   ```bash
   # Rename duplicate migrations to sequential numbers
   # Then run: sqlx migrate run --source ./crates/server/migrations
   ```

2. **Update SQLX Cache**:
   ```bash
   export DATABASE_URL="sqlite:./data/pos.db"
   export SQLX_OFFLINE=false
   cargo sqlx prepare
   ```

3. **Test the Endpoints**:
   ```bash
   # Get theme
   curl "http://localhost:8080/api/theme?storeId=store-1&userId=user-1"
   
   # Set theme (user scope)
   curl -X PUT http://localhost:8080/api/theme \
     -H "Content-Type: application/json" \
     -d '{
       "scope": "user",
       "theme": {"mode": "dark", "accent": "green"},
       "storeId": "store-1",
       "userId": "user-1"
     }'
   ```

4. **Frontend Integration**:
   - The ConfigStore adapters are already implemented
   - ThemeEngine is already implemented
   - Just need to wire up the API calls to the backend endpoints

### Database Schema

Theme preferences are stored in the `settings` table with keys:
- `theme.mode` - 'light' | 'dark' | 'auto'
- `theme.accent` - JSON object with 500/600 color values
- `theme.density` - 'compact' | 'comfortable' | 'spacious'
- `theme.locks.lockMode` - boolean (store scope only)
- `theme.locks.lockAccent` - boolean (store scope only)
- `theme.locks.lockContrast` - boolean (store scope only)
- `theme.logo` - URL string (store scope only)
- `theme.companyName` - string (store scope only)

Scopes:
- `global` - Default values (scope_id = NULL)
- `store` - Store-level configuration (scope_id = store_id)
- `user` - User-level preferences (scope_id = user_id)

### Scope Resolution Logic

```
For each theme property:
  1. Check if user has a preference (scope='user', scope_id=user_id)
  2. If property is locked by store, use store value instead
  3. If no user preference, check store default (scope='store', scope_id=store_id)
  4. If no store default, use global default (scope='global', scope_id=NULL)
```

### Sync Queue Integration

When a theme preference is saved:
1. Write to `settings` table
2. Add entry to `sync_queue` table:
   - entity_type: 'theme_preference'
   - entity_id: scope_id (store_id or user_id)
   - operation: 'update'
   - data: JSON of the theme changes
3. Sync service will replicate to other locations

This ensures offline-first operation and multi-location synchronization.
