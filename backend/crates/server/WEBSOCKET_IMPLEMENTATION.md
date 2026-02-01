# WebSocket Notification System Implementation

## Overview

This document describes the WebSocket notification system implemented for configuration hot-reload in the EasySale backend.

## Architecture

The WebSocket system consists of three main components:

### 1. WebSocket Server (`src/websocket/server.rs`)

The `WsServer` actor manages all connected WebSocket clients and handles message broadcasting.

**Key Features:**
- Maintains a registry of connected clients with their tenant IDs
- Broadcasts messages to all clients of a specific tenant (tenant isolation)
- Handles client connection and disconnection lifecycle
- Gracefully handles failed message sends without crashing

**Message Types:**
- `ConfigChanged`: Notifies clients when configuration changes
- `Ping/Pong`: Keepalive messages

### 2. WebSocket Session (`src/websocket/session.rs`)

The `WsSession` actor represents a single client connection.

**Key Features:**
- Heartbeat mechanism (5-second interval, 10-second timeout)
- Automatic disconnection on client timeout
- Handles incoming WebSocket messages from clients
- Forwards server messages to the client

### 3. Configuration Notifier (`src/websocket/config_notifier.rs`)

The `ConfigNotifier` bridges configuration file watcher events to WebSocket broadcasts.

**Key Features:**
- Listens to configuration change events from file watcher
- Filters events by tenant ID
- Broadcasts configuration changes to connected WebSocket clients
- Handles broadcast errors gracefully

## Integration Points

### File Watcher Integration

The configuration file watcher (`src/config/file_watcher.rs`) was updated to support multiple event subscribers:

- **Reload Channel**: For configuration reload handler
- **WebSocket Channel**: For WebSocket notification broadcaster

This allows the same file system event to trigger both configuration reload and WebSocket notifications.

### HTTP Server Integration

The WebSocket server is initialized in `main.rs` and integrated into the Actix-web application:

1. WebSocket server actor is started on application startup
2. Server address is added to app data for handler access
3. WebSocket endpoint `/ws` is registered (public, requires `tenant_id` query parameter)

## WebSocket Endpoint

**URL:** `ws://localhost:7945/ws?tenant_id=<tenant-id>`

**Query Parameters:**
- `tenant_id` (required): Tenant ID for filtering notifications

**Connection Flow:**
1. Client connects with tenant ID in query string
2. Server validates tenant ID is not empty
3. WebSocket session is created and registered with server
4. Client receives configuration change notifications for their tenant only

**Message Format:**
```json
{
  "ConfigChanged": {
    "tenant_id": "my-tenant",
    "change_type": "modified"
  }
}
```

## Tenant Isolation

The system enforces strict tenant isolation:

- Clients must provide their tenant ID when connecting
- Configuration change events include tenant ID
- Broadcasts are filtered to only send to clients of the affected tenant
- No cross-tenant data leakage

## Error Handling

The system handles errors gracefully:

- Failed message sends are logged but don't crash the server
- Client disconnections are handled cleanly
- Invalid tenant IDs are rejected with 400 Bad Request
- WebSocket protocol errors trigger session termination

## Testing

Unit tests are included for:

- WebSocket server creation and lifecycle
- Session creation and heartbeat constants
- Configuration notifier event handling
- Endpoint validation (missing/empty tenant ID)

## Dependencies Added

- `actix = "0.13"` - Actor framework for WebSocket server
- `actix-web-actors = "4.3"` - WebSocket support for Actix-web

## Files Created

- `backend/crates/server/src/websocket/mod.rs` - Module exports
- `backend/crates/server/src/websocket/server.rs` - WebSocket server actor
- `backend/crates/server/src/websocket/session.rs` - WebSocket session actor
- `backend/crates/server/src/websocket/config_notifier.rs` - Configuration notifier
- `backend/crates/server/src/handlers/websocket.rs` - HTTP endpoint handler

## Files Modified

- `backend/Cargo.toml` - Added workspace dependencies
- `backend/crates/server/Cargo.toml` - Added actix dependencies
- `backend/crates/server/src/lib.rs` - Declared websocket module
- `backend/crates/server/src/main.rs` - Integrated WebSocket server
- `backend/crates/server/src/handlers/mod.rs` - Registered websocket handler
- `backend/crates/server/src/config/file_watcher.rs` - Multi-subscriber support

## Usage Example

### Frontend Connection

```typescript
const tenantId = 'my-tenant';
const ws = new WebSocket(`ws://localhost:7945/ws?tenant_id=${tenantId}`);

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  if (message.ConfigChanged) {
    console.log('Configuration changed:', message.ConfigChanged.change_type);
    // Reload configuration from API
    reloadConfiguration();
  }
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

ws.onclose = () => {
  console.log('WebSocket connection closed');
  // Implement reconnection logic
};
```

## Next Steps

Task 3.1.4 will implement the frontend configuration update handler to:
1. Connect to the WebSocket endpoint on application load
2. Listen for configuration change notifications
3. Reload configuration from the API when notified
4. Update the UI without requiring a page refresh

## Performance Considerations

- Heartbeat interval: 5 seconds
- Client timeout: 10 seconds
- Broadcasts are non-blocking (fire-and-forget)
- Failed sends don't block other clients
- Minimal memory overhead per connection

## Security Considerations

- Tenant ID validation prevents empty/missing values
- Tenant isolation enforced at broadcast level
- No authentication required (configuration is public data)
- WebSocket endpoint is public but requires valid tenant ID
- Future enhancement: Add JWT authentication for sensitive notifications
