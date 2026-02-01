# Configuration Hot-Reload

## Overview

The Configuration Hot-Reload feature enables real-time configuration updates without requiring a page refresh. When configuration files are modified on the server, connected clients are automatically notified via WebSocket and reload their configuration.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Configuration Flow                       │
└─────────────────────────────────────────────────────────────┘

1. File System Change
   └─> File Watcher (backend)
       └─> Configuration Loader (backend)
           └─> WebSocket Server (backend)
               └─> WebSocket Client (frontend)
                   └─> ConfigProvider.reloadConfig()
                       └─> UI Updates

┌─────────────────────────────────────────────────────────────┐
│                     Component Diagram                        │
└─────────────────────────────────────────────────────────────┘

Backend:
  - FileWatcher: Monitors config directory for changes
  - ConfigLoader: Reloads configuration when files change
  - ConfigNotifier: Bridges file watcher to WebSocket
  - WsServer: Manages WebSocket connections
  - WsSession: Individual client connection handler

Frontend:
  - useConfigWebSocket: Hook for WebSocket connection
  - ConfigProvider: Manages configuration state
  - ConfigUpdateIndicator: Visual status indicator
```

## Backend Components

### File Watcher

**Location:** `backend/crates/server/src/config/file_watcher.rs`

Monitors the configuration directory for file changes using the `notify` crate.

**Events:**
- `Created`: New configuration file created
- `Modified`: Existing configuration file modified
- `Deleted`: Configuration file deleted

### Configuration Notifier

**Location:** `backend/crates/server/src/websocket/config_notifier.rs`

Bridges file watcher events to WebSocket broadcasts.

**Behavior:**
- Only broadcasts events for tenant-specific configurations
- Skips non-tenant files (schema.json, defaults, etc.)
- Logs all broadcast attempts

### WebSocket Server

**Location:** `backend/crates/server/src/websocket/server.rs`

Manages WebSocket connections and message broadcasting.

**Features:**
- Tenant isolation (clients only receive notifications for their tenant)
- Connection lifecycle management
- Heartbeat/keepalive support

### WebSocket Endpoint

**Location:** `backend/crates/server/src/handlers/websocket.rs`

HTTP endpoint for establishing WebSocket connections.

**Endpoint:** `GET /ws?tenant_id={tenant_id}`

**Example:**
```
ws://localhost:7945/ws?tenant_id=my-tenant
```

## Frontend Components

### useConfigWebSocket Hook

**Location:** `frontend/src/hooks/useConfigWebSocket.ts`

React hook for managing WebSocket connection to receive configuration change notifications.

**Usage:**
```typescript
import { useConfigWebSocket } from '../hooks/useConfigWebSocket';

const { status, error } = useConfigWebSocket({
  tenantId: 'my-tenant',
  onConfigChange: (changeType) => {
    console.log('Config changed:', changeType);
    reloadConfig();
  },
  onStatusChange: (status) => {
    console.log('WebSocket status:', status);
  },
  autoReconnect: true,
  maxReconnectAttempts: 5,
  reconnectDelay: 1000,
});
```

**Options:**
- `tenantId`: Tenant ID for filtering notifications (required)
- `wsUrl`: Custom WebSocket URL (optional, auto-detected by default)
- `onConfigChange`: Callback when configuration changes
- `onStatusChange`: Callback when connection status changes
- `autoReconnect`: Enable automatic reconnection (default: true)
- `maxReconnectAttempts`: Maximum reconnection attempts (default: 5)
- `reconnectDelay`: Initial reconnection delay in ms (default: 1000)

**Return Value:**
```typescript
{
  status: 'connecting' | 'connected' | 'disconnected' | 'error',
  error: string | null,
  reconnectAttempts: number,
  isReconnecting: boolean,
}
```

### ConfigProvider Integration

**Location:** `frontend/src/config/ConfigProvider.tsx`

The ConfigProvider automatically establishes a WebSocket connection and reloads configuration when notified.

**Behavior:**
- WebSocket enabled by default in dev/demo modes
- WebSocket disabled by default in production mode
- Can be explicitly enabled/disabled via `enableWebSocket` prop
- Automatically reloads configuration when changes are detected
- Updates React Query cache to trigger UI re-renders

**Props:**
```typescript
interface ConfigProviderProps {
  children: ReactNode;
  configPath?: string;
  initialConfig?: TenantConfig;
  config?: TenantConfig;
  enableWebSocket?: boolean; // Default: true in dev/demo, false in prod
}
```

### ConfigUpdateIndicator Component

**Location:** `frontend/src/components/ConfigUpdateIndicator.tsx`

Visual indicator showing WebSocket connection status.

**Usage:**
```typescript
import { ConfigUpdateIndicator } from '../components/ConfigUpdateIndicator';

// Show in corner (always visible)
<ConfigUpdateIndicator position="bottom-right" />

// Show only when there's an error
<ConfigUpdateIndicator showOnlyOnError />

// Compact version (icon only)
<ConfigUpdateIndicatorCompact position="bottom-right" />
```

**Features:**
- Only visible in dev/demo modes (hidden in production)
- Shows connection status with icon and label
- Color-coded by status (success, warning, error)
- Optional compact mode (icon only)
- Configurable position

## Message Protocol

### WebSocket Messages

**Configuration Changed:**
```json
{
  "ConfigChanged": {
    "tenant_id": "my-tenant",
    "change_type": "modified"
  }
}
```

**Ping/Pong:**
```json
"Ping"
"Pong"
```

### Change Types

- `created`: New configuration file created
- `modified`: Existing configuration file modified
- `deleted`: Configuration file deleted

## Connection Management

### Heartbeat

The WebSocket connection uses a heartbeat mechanism to detect disconnections:

- **Heartbeat Interval:** 5 seconds
- **Client Timeout:** 10 seconds
- **Behavior:** Server sends ping every 5 seconds, expects pong within 10 seconds

### Reconnection

The frontend automatically attempts to reconnect on disconnection:

- **Initial Delay:** 1 second
- **Backoff Strategy:** Exponential (doubles each attempt, max 30 seconds)
- **Max Attempts:** 5 (configurable)
- **Behavior:** After max attempts, connection enters error state

### Error Handling

**Connection Errors:**
- Network failures
- Server unavailable
- Invalid tenant ID
- Authentication failures (future)

**Recovery:**
- Automatic reconnection with exponential backoff
- Fallback to polling (future enhancement)
- User notification via ConfigUpdateIndicator

## Configuration

### Backend Configuration

**Environment Variables:**
```bash
# WebSocket server is automatically started with the backend
# No additional configuration required
```

**File Watcher Settings:**
```rust
// Configured in main.rs
let watcher_config = FileWatcherConfig {
    watch_path: config_dir.clone(),
    debounce_duration: Duration::from_millis(500),
};
```

### Frontend Configuration

**Enable/Disable WebSocket:**
```typescript
// Explicitly enable in production
<ConfigProvider enableWebSocket={true}>
  {children}
</ConfigProvider>

// Explicitly disable in development
<ConfigProvider enableWebSocket={false}>
  {children}
</ConfigProvider>

// Auto-detect (default)
<ConfigProvider>
  {children}
</ConfigProvider>
```

**Custom WebSocket URL:**
```typescript
const { status } = useConfigWebSocket({
  tenantId: 'my-tenant',
  wsUrl: 'wss://custom-server.com/ws',
  onConfigChange: reloadConfig,
});
```

## Testing

### Unit Tests

**Backend:**
```bash
cd backend/crates/server
cargo test websocket
cargo test config_notifier
```

**Frontend:**
```bash
cd frontend
npm test useConfigWebSocket
```

### Integration Tests

**Test WebSocket Connection:**
```bash
# Start backend
cd backend/crates/server
cargo run

# In another terminal, test WebSocket
wscat -c "ws://localhost:7945/ws?tenant_id=test-tenant"
```

**Test Configuration Hot-Reload:**
1. Start backend and frontend
2. Open browser to application
3. Open browser console to see WebSocket logs
4. Modify a configuration file in `configs/private/`
5. Observe automatic reload in browser console
6. Verify UI updates without page refresh

### Manual Testing

**Verify Connection Status:**
1. Add `<ConfigUpdateIndicator />` to your app
2. Observe connection status indicator
3. Stop backend server
4. Observe disconnection and reconnection attempts
5. Restart backend server
6. Observe successful reconnection

## Performance Considerations

### Network Traffic

- **Heartbeat:** ~10 bytes every 5 seconds
- **Config Change:** ~100 bytes per notification
- **Total:** Minimal overhead (~2 bytes/second average)

### Memory Usage

- **Backend:** ~1KB per connected client
- **Frontend:** ~5KB for WebSocket connection and state

### CPU Usage

- **Backend:** Negligible (event-driven)
- **Frontend:** Negligible (event-driven)

## Security Considerations

### Tenant Isolation

- Clients only receive notifications for their tenant
- Tenant ID validated on connection
- No cross-tenant data leakage

### Authentication

**Current:** Tenant ID in query parameter (no authentication)

**Future Enhancement:**
- JWT token authentication
- Session-based authentication
- Role-based access control

### Rate Limiting

**Current:** No rate limiting

**Future Enhancement:**
- Connection rate limiting
- Message rate limiting
- Per-tenant connection limits

## Troubleshooting

### WebSocket Connection Fails

**Symptoms:**
- Status shows "error" or "disconnected"
- ConfigUpdateIndicator shows red icon

**Solutions:**
1. Check backend is running
2. Verify tenant ID is correct
3. Check browser console for errors
4. Verify WebSocket endpoint is accessible
5. Check firewall/proxy settings

### Configuration Not Reloading

**Symptoms:**
- WebSocket connected but UI not updating
- Changes to config files not reflected

**Solutions:**
1. Check file watcher is running (backend logs)
2. Verify configuration file is in correct directory
3. Check tenant ID matches configuration file
4. Verify `onConfigChange` callback is firing
5. Check browser console for errors

### Frequent Reconnections

**Symptoms:**
- Connection status flapping between connected/disconnected
- High reconnection attempt count

**Solutions:**
1. Check network stability
2. Verify backend is stable (not crashing)
3. Check backend logs for errors
4. Increase heartbeat timeout
5. Check for proxy/load balancer issues

## Future Enhancements

### Planned Features

1. **Selective Reload:** Only reload changed configuration sections
2. **Diff Notifications:** Send configuration diff instead of full reload
3. **Batch Updates:** Batch multiple rapid changes into single notification
4. **Fallback Polling:** Automatic fallback to polling if WebSocket unavailable
5. **Authentication:** JWT token authentication for WebSocket connections
6. **Compression:** Compress large configuration payloads
7. **Metrics:** Track connection health and reload frequency

### Potential Improvements

1. **Service Worker Integration:** Use service worker for offline support
2. **Optimistic Updates:** Apply changes optimistically before server confirmation
3. **Conflict Resolution:** Handle concurrent configuration changes
4. **Version Control:** Track configuration versions and allow rollback
5. **Audit Trail:** Log all configuration changes with timestamps

## References

- [WebSocket API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [Actix WebSocket Documentation](https://actix.rs/docs/websockets/)
- [React Query Documentation](https://tanstack.com/query/latest)
- [Notify Crate (File Watcher)](https://docs.rs/notify/latest/notify/)

## Related Documentation

- [Configuration System](./configuration-system.md)
- [Theme System](./theme-system.md)
- [WebSocket Architecture](../architecture/websocket.md)
- [Testing Guide](../testing/integration-tests.md)
