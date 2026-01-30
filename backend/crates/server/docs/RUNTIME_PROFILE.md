# Runtime Profile System

## Overview

The Runtime Profile system provides explicit control over system behavior for development, demo, and production environments. It implements strict validation rules and configuration precedence to ensure production safety.

## Profiles

### Dev (Development)
- **Purpose**: Local development and testing
- **Validation**: Minimal - allows all defaults and placeholders
- **Dev Endpoints**: Enabled
- **Demo Content**: Allowed
- **Placeholder Secrets**: Allowed

### Demo
- **Purpose**: Demonstrations and training
- **Validation**: Moderate - warns about placeholders
- **Dev Endpoints**: Disabled
- **Demo Content**: Loaded from preset packs
- **Placeholder Secrets**: Allowed with warnings

### Prod (Production)
- **Purpose**: Production deployments
- **Validation**: Strict - rejects placeholders and missing required fields
- **Dev Endpoints**: Disabled
- **Demo Content**: Blocked
- **Placeholder Secrets**: Rejected

## Configuration Precedence

Configuration values are loaded in the following order (highest priority first):

1. **CLI Arguments**: `--profile`, `--config`, `--host`, `--port`
2. **Environment Variables**: `RUNTIME_PROFILE`, `DATABASE_PATH`, `JWT_SECRET`, etc.
3. **Tenant Config File**: Specified via `--config` flag
4. **Example Config File**: Fallback for development
5. **Built-in Defaults**: Dev/Demo only (Prod forbids unsafe defaults)

## Usage

### Setting the Profile

#### Via Environment Variable (Recommended)
```bash
export RUNTIME_PROFILE=prod
./EasySale-server
```

#### Via CLI Argument
```bash
./EasySale-server --profile=prod
```

#### Via Windows Environment
```powershell
$env:RUNTIME_PROFILE="prod"
.\EasySale-server.exe
```

### Configuration File

Specify a configuration file path (typically in ProgramData for Windows installs):

```bash
./EasySale-server --config=/path/to/config.toml --profile=prod
```

### Required Environment Variables

#### Production Profile
The following environment variables are **required** in production:

- `DATABASE_PATH`: Path to SQLite database file
- `STORE_ID`: Unique store identifier
- `JWT_SECRET`: Secure random secret for JWT signing (no placeholders)

#### Optional Environment Variables
- `API_HOST`: Server bind address (default: 127.0.0.1)
- `API_PORT`: Server port (default: 8923)
- `STORE_NAME`: Human-readable store name
- `JWT_EXPIRATION_HOURS`: JWT token expiration (default: 8)

## Validation Rules

### Production Profile Validation

The system performs the following checks in production:

1. **DATABASE_PATH**: Must be set and non-empty
2. **STORE_ID**: Must be set and non-empty
3. **JWT_SECRET**: Must be set and cannot contain placeholder values:
   - `CHANGE_ME`
   - `secret123`
   - `password123`
   - `test-secret`
   - `your-secret-key`
   - `change-in-production`

If any validation fails, the server will **refuse to start** and display all validation errors.

### Demo Profile Validation

- Allows placeholder secrets with warnings
- Logs warnings for insecure configurations
- Suitable for demonstrations and training

### Dev Profile Validation

- No validation - allows all defaults
- Suitable for local development only

## Examples

### Development Setup
```bash
# Use defaults for development
export RUNTIME_PROFILE=dev
./EasySale-server
```

### Demo Setup
```bash
# Load demo preset pack
export RUNTIME_PROFILE=demo
export DATABASE_PATH=./data/demo.db
./EasySale-server
```

### Production Setup
```bash
# Strict validation, secure configuration
export RUNTIME_PROFILE=prod
export DATABASE_PATH=/var/lib/EasySale/pos.db
export STORE_ID=store-001
export JWT_SECRET=$(openssl rand -base64 32)
./EasySale-server --config=/etc/EasySale/config.toml
```

### Windows Production Install
```powershell
# Set environment variables
$env:RUNTIME_PROFILE="prod"
$env:DATABASE_PATH="C:\ProgramData\EasySale\data\pos.db"
$env:STORE_ID="store-001"
$env:JWT_SECRET="<secure-random-secret>"

# Start server with config file
.\EasySale-server.exe --config="C:\ProgramData\EasySale\config\config.toml"
```

## Integration with Handlers

Handlers can access the runtime profile via app state:

```rust
use actix_web::{web, HttpResponse};
use crate::config::RuntimeProfile;

async fn my_handler(
    profile: web::Data<RuntimeProfile>,
) -> HttpResponse {
    if profile.is_prod() {
        // Production-only behavior
    } else if profile.is_dev() {
        // Development-only behavior
    }
    
    HttpResponse::Ok().finish()
}
```

## Logging

The server logs the active profile on startup:

```
INFO Starting EasySale API server [profile: prod] for store: Main Store (store-001)
INFO Configuration loaded from: /etc/EasySale/config.toml
```

## Error Messages

### Missing Required Field
```
Configuration validation failed for profile 'prod':
  - DATABASE_PATH is required in prod profile
  - STORE_ID is required in prod profile
  - JWT_SECRET is required in prod profile
```

### Placeholder Secret
```
Configuration validation failed for profile 'prod':
  - JWT_SECRET contains placeholder value 'your-secret-key-change-in-production' in prod profile
```

### Invalid Profile
```
Invalid runtime profile 'production-mode'. Valid options: dev, demo, prod
```

## Migration from Old System

### Before (app_config.rs only)
```rust
let config = Config::from_env()?;
```

### After (with ProfileManager)
```rust
let profile_manager = ProfileManager::load()?;
let profile = profile_manager.profile();
let config = profile_manager.config().clone();
```

## Testing

The profile system includes comprehensive unit tests:

```bash
cargo test --lib config::profile::tests
```

Tests cover:
- Profile parsing from strings
- Profile display formatting
- Profile type checks (is_prod, is_dev, is_demo)
- Placeholder secret detection
- Configuration validation for each profile

## Future Enhancements

Planned enhancements for the profile system:

1. **Tenant Config Integration**: Load tenant-specific configuration from JSON files
2. **OAuth Validation**: Reject localhost OAuth redirects in production
3. **Demo Mode Indicators**: UI indicators when running in demo mode
4. **Preset Pack Loading**: Automatic loading of demo data in demo profile
5. **Dev Endpoint Gating**: Automatic disabling of dev endpoints in production

## See Also

- [Configuration System](./CONFIGURATION.md)
- [Production Readiness Spec](../../../.kiro/specs/production-readiness-windows-installer/)
- [Windows Installer](./WINDOWS_INSTALLER.md)
