# Configuration Profiles

This directory contains configuration profile templates for different runtime environments.

## Overview

EasySale uses explicit runtime profiles to control system behavior and validation strictness:

- **dev**: Development profile with relaxed validation and dev tools enabled
- **demo**: Demo profile with preset packs and demo indicators
- **prod**: Production profile with strict validation and no unsafe defaults

## Profile Selection

The runtime profile is determined by the `RUNTIME_PROFILE` environment variable:

```bash
# Development
export RUNTIME_PROFILE=dev

# Demo
export RUNTIME_PROFILE=demo

# Production
export RUNTIME_PROFILE=prod
```

Or via CLI argument:

```bash
./EasySale-server --profile prod
```

## Configuration Precedence

Configuration values are loaded with the following precedence (highest to lowest):

1. **CLI arguments** (`--config`, `--profile`, `--port`, `--host`)
2. **Environment variables** (`DATABASE_PATH`, `JWT_SECRET`, etc.)
3. **Tenant config file** (if `--config` provided)
4. **Profile defaults** (from `configs/profiles/{profile}.toml`)
5. **Built-in defaults** (dev/demo only, prod forbids unsafe defaults)

## Profile Characteristics

### Development Profile (`dev.toml`)

**Purpose**: Local development and testing

**Characteristics**:
- Relaxed validation (allows placeholder secrets)
- Dev endpoints enabled (`/api/debug`, `/api/sync/dry-run`)
- Localhost OAuth acceptable
- Debug logging enabled
- Safe defaults for convenience

**Database**: `./data/pos.db` (local file)

**Use Cases**:
- Local development
- Unit testing
- Integration testing
- Feature development

### Demo Profile (`demo.toml`)

**Purpose**: Product demonstrations and training

**Characteristics**:
- Moderate validation (warns about placeholders)
- Demo mode enabled (shows demo indicator)
- Preset packs loaded (demo data)
- Dev endpoints can be enabled
- Localhost OAuth acceptable

**Database**: `./data/demo-pos.db` (separate from dev)

**Use Cases**:
- Product demonstrations
- Sales presentations
- Training sessions
- Evaluation installations

### Production Profile (`prod.toml`)

**Purpose**: Production deployments

**Characteristics**:
- Strict validation (rejects placeholder secrets)
- No dev endpoints
- No demo mode
- No preset packs
- Localhost OAuth rejected (when integrations enabled)
- All required fields must be explicitly set
- No unsafe defaults

**Database**: Must be explicitly configured (e.g., `C:\ProgramData\EasySale\data\EasySale.db`)

**Use Cases**:
- Production deployments
- Customer installations
- Live retail operations

## Required Configuration (Production)

When using the production profile, the following environment variables **must** be set:

### Required
- `DATABASE_PATH` - Path to SQLite database file
- `API_HOST` - Server bind address (e.g., `0.0.0.0` or `127.0.0.1`)
- `API_PORT` - Server port (e.g., `8080`)
- `PUBLIC_BASE_URL` - Public URL for OAuth callbacks (e.g., `https://your-domain.com`)
- `JWT_SECRET` - Strong random secret (minimum 32 characters)
- `STORE_ID` - Unique store identifier (UUID)
- `TENANT_ID` - Tenant identifier
- `LOG_PATH` - Path to log file

### Required if Integrations Enabled
- `QUICKBOOKS_REDIRECT_URI` - QuickBooks OAuth callback URL
- `GOOGLE_DRIVE_REDIRECT_URI` - Google Drive OAuth callback URL

### Optional
- `STORE_NAME` - Human-readable store name
- `JWT_EXPIRATION_HOURS` - JWT token expiration (default: 8)
- `INTEGRATIONS_ENABLED` - Enable/disable integrations (default: false)
- `BACKUP_PATH` - Backup directory path
- `BACKUP_ENABLED` - Enable/disable backups (default: true)

## Validation Rules

### Production Profile Validation

The production profile enforces strict validation rules:

1. **Placeholder Secret Rejection**: Rejects secrets containing:
   - `CHANGE_ME`
   - `secret123`
   - `password123`
   - `test-secret`
   - `your-secret-key`
   - `change-in-production`

2. **Demo Mode Rejection**: Fails if `ENABLE_DEMO=true`

3. **Dev Endpoints Rejection**: Fails if `ENABLE_DEV_ENDPOINTS=true`

4. **Localhost OAuth Rejection**: Fails if OAuth redirect URIs contain `localhost` or `127.0.0.1` when integrations are enabled

5. **Required Fields**: Fails if any required field is missing or empty

### Error Aggregation

All validation errors are collected and reported together in a single startup failure message, making it easy to identify and fix all configuration issues at once.

## Example Usage

### Development

```bash
# Use dev profile with defaults
export RUNTIME_PROFILE=dev
./EasySale-server

# Override specific settings
export RUNTIME_PROFILE=dev
export DATABASE_PATH=./data/my-dev.db
export API_PORT=9000
./EasySale-server
```

### Demo

```bash
# Use demo profile with preset pack
export RUNTIME_PROFILE=demo
export DATABASE_PATH=./data/demo.db
./EasySale-server

# Demo mode indicator will be shown in UI
# Demo data will be loaded from preset pack
```

### Production

```bash
# Production requires all settings to be explicitly configured
export RUNTIME_PROFILE=prod
export DATABASE_PATH=/var/lib/EasySale/pos.db
export API_HOST=0.0.0.0
export API_PORT=8080
export PUBLIC_BASE_URL=https://pos.example.com
export JWT_SECRET=$(openssl rand -base64 48)
export STORE_ID=$(uuidgen)
export TENANT_ID=my-tenant
export LOG_PATH=/var/log/EasySale/EasySale.log
./EasySale-server

# Or use a config file
./EasySale-server --profile prod --config /etc/EasySale/config.toml
```

## Windows Installer Integration

The Windows installer uses these templates to generate production configurations:

1. **Installer prompts** for required values (store ID, tenant ID, etc.)
2. **Preflight checker** validates configuration before installation
3. **Template substitution** generates final config files
4. **Service installation** uses generated configuration

See `installer/windows/templates/` for installer-specific templates.

## Canonical Configuration Keys

### DATABASE_PATH (Canonical)

The canonical key for database configuration is `DATABASE_PATH`, not `DATABASE_URL`.

**Supported formats**:
- File path: `./data/pos.db` or `C:\ProgramData\EasySale\data\EasySale.db`
- SQLite URL: `sqlite:./data/pos.db?mode=rwc`
- In-memory: `:memory:`

**Backward compatibility**: `DATABASE_URL` is still supported with a deprecation warning.

### Other Canonical Keys

- `API_HOST` (not `HOST` or `SERVER_HOST`)
- `API_PORT` (not `PORT` or `SERVER_PORT`)
- `JWT_SECRET` (not `SECRET` or `JWT_KEY`)
- `STORE_ID` (not `SHOP_ID` or `LOCATION_ID`)
- `TENANT_ID` (not `CUSTOMER_ID` or `ACCOUNT_ID`)

## Troubleshooting

### "DATABASE_PATH is required in prod profile"

**Solution**: Set the `DATABASE_PATH` environment variable or provide it in a config file.

```bash
export DATABASE_PATH=/var/lib/EasySale/pos.db
```

### "JWT_SECRET contains placeholder value"

**Solution**: Generate a strong random secret:

```bash
# Linux/Mac
export JWT_SECRET=$(openssl rand -base64 48)

# PowerShell
$env:JWT_SECRET = [Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

### "Demo mode is not allowed in prod profile"

**Solution**: Ensure `ENABLE_DEMO` is set to `false` or not set at all:

```bash
export ENABLE_DEMO=false
```

### "OAuth redirect URI contains localhost in prod profile"

**Solution**: Use a real domain for OAuth callbacks:

```bash
export QUICKBOOKS_REDIRECT_URI=https://pos.example.com/api/integrations/quickbooks/callback
```

Or disable integrations if not needed:

```bash
export INTEGRATIONS_ENABLED=false
```

## See Also

- [Installation Guide](../../installer/docs/INSTALLATION_GUIDE.md)
- [Configuration Schema](../schema.json)
- [Windows Installer Templates](../../installer/windows/templates/)
- [Production Readiness Spec](.kiro/specs/production-readiness-windows-installer/)
