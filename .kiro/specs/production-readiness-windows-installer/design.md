# Design Document: Production Readiness, White-Label, and Windows Installer (Non-Docker)

## Goal

Make EasySale production-ready as a **white-label POS**, ensuring:

- **No hardcoded demo/mock data** in any **production route**
- **No customer-specific remnants** (CAPS, caps-pos.local, etc.) in core runtime
- **No automotive/vehicle/VIN concepts** required for core operation (optional pack only)
- **Explicit runtime profiles** (dev/demo/prod) with strict validation in prod
- **Windows portable distribution** with install/uninstall/upgrade + **preflight readiness checks**
- **No deletion policy**: all removals are archival moves with mapping logs

## Repo Reality Assumptions (must remain true after implementation)

- Frontend: `frontend/` (React + TS + Vite)
- Backend: Rust workspace under `backend/` with server crate (e.g. `backend/crates/server`)
- Configs: `configs/private/{tenant}.json` and `configs/examples/{tenant}.json`
- Installer: `installer/` already exists (PowerShell-first approach)

If legacy `backend/rust` path references still exist anywhere (scripts/workflows/docs), they must be removed or mapped.

---

## Architecture Overview

### Runtime profiles

**Single canonical profile switch**:

- `RUNTIME_PROFILE=dev|demo|prod`

Profile effects:

- **prod**: strict validation, no demo, no dev endpoints, no placeholder secrets, no localhost OAuth (unless integration disabled + policy)
- **demo**: loads preset pack(s), shows demo indicator, demo data allowed ONLY from preset packs
- **dev**: relaxed validation, optional dev endpoints/tools

### Config sources & precedence

Highest wins:

1. CLI args (installer overrides)
2. Environment variables (server.env / client.env)
3. Tenant config JSON (`configs/private/{tenant}.json`)
4. Example config JSON (`configs/examples/{tenant}.json`)
5. Built-in defaults (**dev/demo only**, prod forbids unsafe defaults)

### Branding / White-label

All visible branding must come from resolved config:

- company/store name
- logo + alt text
- terminology map (Item vs Product, Client vs Customer, etc.)
- optional vertical pack toggles (e.g. automotive)

**Rule**: production routes must not contain "CAPS", "caps-pos", "VIN", "vehicle_*" tokens unless explicitly in:

- `configs/examples/` or preset packs
- `archive/`
- tests/fixtures
- optional vertical pack modules disabled by default

### Demo/preset packs

Demo data must be stored as files:

- `configs/presets/*.json` (or `configs/examples/presets/*.json`)

and only loaded if:

- `RUNTIME_PROFILE=demo`
- `PRESET_PACK_PATH` set (or tenant config points to one)

No demo credentials hardcoded in UI.

---

## Production Route Safety Model

### "Production route" definition

Anything reachable via:

- React Router mount in `frontend/src/App.tsx`
- Backend route registration in server startup

### Core enforcement

**Readiness Gate** must fail builds if forbidden patterns exist in **core runtime paths**.

Include scan paths (example):

- `frontend/src/**` (excluding tests, fixtures, archive, preset files)
- `backend/crates/server/src/**` (excluding tests, fixtures, archive)

Exclude:

- `archive/**`
- `**/*test*`, `**/tests/**`, `**/fixtures/**`
- `configs/examples/**` and preset packs (allowed to contain demo tokens)

Forbidden pattern classes:

- Demo creds/strings: `admin/admin123`, `cashier/cashier123`, `demo@`, `password123`, etc.
- Mock arrays: `mockProducts|mockCustomers|mockUsers|mockMetrics|mockErrors|mockTaxRules|mockIntegrations|mockRemoteStores`
- Branding tokens: `CAPS`, `caps-pos`, `caps-pos.local`, `security@caps-pos.local`
- Automotive tokens in core: `VIN`, `/api/vin`, `vehicle_fitment` (allowed only in optional pack)

---

## Backend Design Changes

### 1) Profile manager + config validator (server-side)

Add:

- `RuntimeProfile` enum
- `ConfigValidator` with profile-specific rules
- "prod startup gate": if violations exist, fail startup with one aggregated error report

Key prod checks:

- placeholder secrets (JWT_SECRET etc.)
- localhost OAuth redirect if integrations enabled
- demo mode enabled
- dev endpoints enabled

**Implementation**:

```rust
// backend/crates/server/src/config/profile.rs

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum RuntimeProfile {
    Dev,
    Demo,
    Prod,
}

pub struct ProfileManager {
    profile: RuntimeProfile,
    config: Config,
}

impl ProfileManager {
    pub fn load(profile: RuntimeProfile) -> Result<Self, ConfigError> {
        let config = Self::load_config(&profile)?;
        let manager = Self { profile, config };
        manager.validate()?;
        Ok(manager)
    }
    
    fn load_config(profile: &RuntimeProfile) -> Result<Config, ConfigError> {
        // Precedence: CLI args > env vars > tenant config > example config > defaults
        let mut config = Config::default_for_profile(profile)?;
        
        // IMPORTANT: In production installs, config files are in ProgramData, not repo paths
        // The backend should accept --config flag to specify config file location
        
        // Load from config file (if --config flag provided)
        if let Some(config_path) = std::env::args().find(|arg| arg.starts_with("--config=")) {
            let path = config_path.strip_prefix("--config=").unwrap();
            if let Ok(file_config) = Config::from_file(path) {
                config.merge(file_config);
            }
        }
        
        // Override with environment variables
        config.apply_env_overrides();
        
        Ok(config)
    }
    
    fn validate(&self) -> Result<(), ValidationError> {
        let validator = ConfigValidator::new(&self.profile);
        validator.validate(&self.config)
    }
}

pub struct ConfigValidator {
    profile: RuntimeProfile,
}

impl ConfigValidator {
    pub fn validate(&self, config: &Config) -> Result<(), ValidationError> {
        let mut errors = Vec::new();
        
        if self.profile == RuntimeProfile::Prod {
            // Check for placeholder secrets
            if config.security.jwt_secret.contains("CHANGE_ME") 
                || config.security.jwt_secret.contains("secret123") {
                errors.push("JWT_SECRET contains placeholder value".to_string());
            }
            
            // Check for localhost OAuth redirect
            if let Some(oauth) = &config.oauth {
                if oauth.redirect_uri.contains("localhost") && config.integrations_enabled() {
                    errors.push("OAuth redirect URI contains localhost in prod profile".to_string());
                }
            }
            
            // Check for demo mode
            if config.profile.enable_demo {
                errors.push("Demo mode enabled in prod profile".to_string());
            }
            
            // Check for dev endpoints
            if config.server.enable_dev_endpoints {
                errors.push("Dev endpoints enabled in prod profile".to_string());
            }
            
            // Check for required fields
            if config.database.path.as_os_str().is_empty() {
                errors.push("DATABASE_PATH is required in prod profile".to_string());
            }
        }
        
        if errors.is_empty() {
            Ok(())
        } else {
            Err(ValidationError::Multiple(errors))
        }
    }
}
```

**Configuration Schema**:

```toml
[profile]
name = "prod"
strict_validation = true
enable_demo = false

[database]
# Canonical key: DATABASE_PATH (not DATABASE_URL)
path = "C:\\ProgramData\\EasySale\\data\\EasySale.db"

[server]
host = "127.0.0.1"
port = 8080
public_base_url = "${PUBLIC_BASE_URL}"
enable_dev_endpoints = false

[security]
require_secrets = true
reject_placeholder_secrets = true
jwt_secret = "${JWT_SECRET}"

[oauth]
redirect_uri = "${OAUTH_REDIRECT_URI}"
reject_localhost_in_prod = true

[branding]
source = "runtime"
tenant_id = "${TENANT_ID}"

[integrations]
quickbooks_enabled = false
woocommerce_enabled = false
supabase_enabled = false
```

### 2) Route gating by profile

Dev-only endpoints must not be reachable in prod:

- `/api/sync/dry-run`
- `/api/settings/sandbox` (GET/POST)
- any `/test/*` endpoints (QBO test, Woo test) unless explicitly internal-only

Implementation options (choose one, consistent):

A) Don't register in prod profile
B) Register but require internal permission + audit log + policy flag

**Implementation**:

```rust
// backend/crates/server/src/routes/mod.rs

pub fn configure_routes(cfg: &mut web::ServiceConfig, profile: &RuntimeProfile) {
    // Core routes (always available)
    cfg.service(
        web::scope("/api")
            .service(auth_routes())
            .service(products_routes())
            .service(sales_routes())
            .service(customers_routes())
            .service(reporting_routes())
    );
    
    // Dev-only routes
    if matches!(profile, RuntimeProfile::Dev) {
        cfg.service(
            web::scope("/api/debug")
                .service(debug_routes())
        );
        cfg.service(
            web::scope("/api/sync")
                .route("/dry-run", web::post().to(sync_dry_run))
        );
    }
    
    // Setup routes (only if DB is empty and not prod)
    if is_fresh_install() && !matches!(profile, RuntimeProfile::Prod) {
        cfg.service(
            web::scope("/setup")
                .service(setup_routes())
        );
    }
}
```

### 3) Security hardening

- QuickBooks query building: implement safe escaping for QBO query language values
- Dynamic SQL: ensure identifiers come from allowlists or enums; never accept user-provided table/column names
- OAuth redirect URI: remove hardcoded source strings; read from config/env; enforce prod policies

**QuickBooks Query Sanitization**:

```rust
// backend/crates/server/src/security/qbo_sanitizer.rs

pub fn sanitize_qbo_query_value(value: &str) -> String {
    // Escape single quotes by doubling them (QBO query language standard)
    value.replace("'", "''")
}

pub fn build_qbo_query(entity: &str, field: &str, value: &str) -> String {
    let sanitized_value = sanitize_qbo_query_value(value);
    format!("SELECT * FROM {} WHERE {} = '{}'", entity, field, sanitized_value)
}
```

**SQL Allowlists**:

```rust
// backend/crates/server/src/security/sql_allowlist.rs

pub const ALLOWED_TABLES: &[&str] = &[
    "products",
    "sales",
    "customers",
    "inventory",
    "users",
    "stores",
];

pub const ALLOWED_COLUMNS: &[&str] = &[
    "id",
    "name",
    "sku",
    "price",
    "quantity",
    "created_at",
    "updated_at",
];

pub fn validate_table_name(name: &str) -> Result<(), SecurityError> {
    if ALLOWED_TABLES.contains(&name) {
        Ok(())
    } else {
        Err(SecurityError::InvalidTableName(name.to_string()))
    }
}

pub fn validate_column_name(name: &str) -> Result<(), SecurityError> {
    if ALLOWED_COLUMNS.contains(&name) {
        Ok(())
    } else {
        Err(SecurityError::InvalidColumnName(name.to_string()))
    }
}
```

### 4) DATABASE_PATH contract

Unify on `DATABASE_PATH` as the canonical key (installer templates + backend config loader + docs).

If code currently uses `DATABASE_URL` anywhere:

- either map it internally (compat layer) or eliminate it (preferred)

**Implementation**:

```rust
// backend/crates/server/src/config/database.rs

pub struct DatabaseConfig {
    path: PathBuf,
}

impl DatabaseConfig {
    pub fn from_env() -> Result<Self, ConfigError> {
        // Canonical key: DATABASE_PATH
        let path = env::var("DATABASE_PATH")
            .map_err(|_| ConfigError::MissingRequired("DATABASE_PATH".to_string()))?;
        
        Ok(Self {
            path: PathBuf::from(path),
        })
    }
    
    pub fn to_url(&self) -> String {
        format!("sqlite://{}?mode=rwc", self.path.display())
    }
}
```

---

## Frontend Design Changes

### 1) Remove mock/demo content from routed pages

Any routed page must:

- fetch real data from API OR show empty-state
- never render demo/mock arrays in prod

Known hotspots to enforce:

- `/login` (demo creds, CAPS alt text)
- `/reporting` (hardcoded metrics/categories)
- `/lookup` (CAPS-branded filters)
- `/admin` (hardcoded feature flags list)

Plus any other pages still using `mock*` arrays (sell/customers/settings pages, etc.)

**Implementation Pattern**:

```typescript
// BEFORE (hardcoded demo content)
const DEMO_USERS = [
  { email: "demo@caps.com", password: "demo123" }
];

// AFTER (runtime-driven)
const LoginPage = () => {
  const { config } = useConfig();
  const demoUsers = config.profile === "demo" 
    ? config.presetPack?.users || []
    : [];
  
  return (
    <div>
      {/* Real login form */}
      {config.profile === "demo" && (
        <DemoCredentialsHelper users={demoUsers} />
      )}
    </div>
  );
};
```

### 2) Demo mode UI indicator

- Show a clear banner/indicator only if `RUNTIME_PROFILE=demo`
- "Load demo pack" action only available in demo profile (or internal dev)

**Implementation**:

```typescript
// frontend/src/components/DemoModeIndicator.tsx

export const DemoModeIndicator = () => {
  const { config } = useConfig();
  
  if (config.profile !== "demo") {
    return null;
  }
  
  return (
    <div className="demo-banner">
      <AlertIcon />
      <span>Demo Mode Active - Data is for demonstration purposes only</span>
    </div>
  );
};
```

### 3) Branding provider (client-side)

Create a single `BrandingProvider`:

- loads brand config after tenant resolution
- exposes `companyName`, `logoAltText`, `terminology`, etc.
- replaces all hardcoded strings

**Implementation**:

```typescript
// frontend/src/config/brandingProvider.ts

export interface BrandingConfig {
  companyName: string;
  logoUrl?: string;
  logoAltText: string;
  primaryColor: string;
  secondaryColor: string;
  terminology: {
    product: string;
    customer: string;
    sale: string;
    skuLabel: string;
  };
  receipt: {
    header: string;
    footer: string;
  };
  verticalPack?: {
    enabled: boolean;
    packName: string;
  };
}

export const useBranding = () => {
  const [branding, setBranding] = useState<BrandingConfig | null>(null);
  
  useEffect(() => {
    fetch('/api/config/brand')
      .then(res => res.json())
      .then(setBranding);
  }, []);
  
  return branding;
};
```

---

## Windows Non-Docker Distribution

### Packaging target

Portable ZIP(s), consistent naming:

- `EasySale-windows-server-vX.Y.Z.zip`
- `EasySale-windows-client-vX.Y.Z.zip` (optional if separate)
- or `EasySale-windows-bundle-vX.Y.Z.zip`

Recommended layout:

**Program Files** for binaries/static assets:

- `C:\Program Files\EasySale\server\EasySale-server.exe`
- `C:\Program Files\EasySale\client\dist\...` (if not embedded)

**ProgramData** for mutable state:

- `C:\ProgramData\EasySale\config\server.env`
- `C:\ProgramData\EasySale\config\client.env`
- `C:\ProgramData\EasySale\data\pos.db`
- `C:\ProgramData\EasySale\logs\`

### Installer scripts (PowerShell)

- `installer/windows/install.ps1`
- `installer/windows/uninstall.ps1`
- `installer/windows/upgrade.ps1`
- `installer/windows/preflight.ps1` (readiness checker)

**Windows Service Strategy**:

The installer must choose ONE of these approaches:

**Option A (Recommended): WinSW Wrapper**
- Ship WinSW (Windows Service Wrapper) in the package
- WinSW runs `EasySale-server.exe` as a Windows Service
- No code changes required to backend
- Configuration via `EasySale-service.xml`

**Option B: Native Windows Service**
- Implement Windows Service in Rust using `windows-service` crate
- Backend must handle SCM (Service Control Manager) messages
- More complex but no external dependencies

**This design uses Option A (WinSW) for simplicity and reliability.**

**WinSW Configuration**:

```xml
<!-- installer/windows/templates/EasySale-service.xml -->
<service>
  <id>EasySale</id>
  <name>EasySale Server</name>
  <description>EasySale Point of Sale Backend</description>
  <executable>C:\Program Files\EasySale\server\EasySale-server.exe</executable>
  <arguments>--config C:\ProgramData\EasySale\config\config.toml</arguments>
  <logpath>C:\ProgramData\EasySale\logs</logpath>
  <log mode="roll-by-size">
    <sizeThreshold>10240</sizeThreshold>
    <keepFiles>8</keepFiles>
  </log>
  <env name="RUNTIME_PROFILE" value="prod"/>
  <env name="DATABASE_PATH" value="C:\ProgramData\EasySale\data\pos.db"/>
</service>
```

**Install Script Structure**:

```powershell
# installer/windows/install.ps1

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("prod", "demo")]
    [string]$Mode,
    
    [string]$InstallPath = "C:\Program Files\EasySale",
    [string]$DataPath = "C:\ProgramData\EasySale",
    [string]$ServiceName = "EasySale",
    [int]$Port = 8080
)

# 1. Check administrator privileges
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw "This script must be run as Administrator"
}

# 2. Run preflight checker
Write-Host "Running preflight checks..."
$preflightResult = & "$PSScriptRoot\preflight.ps1" -Mode $Mode -ConfigPath "$DataPath\config\server.env"
if ($preflightResult.ExitCode -eq 2) {
    throw "Preflight checks failed. Installation blocked."
}

# 3. Extract artifacts
Write-Host "Extracting server artifacts..."
Expand-Archive -Path "EasySale-windows-server.zip" -DestinationPath "$InstallPath\server" -Force

# 4. Create ProgramData structure
Write-Host "Creating data directories..."
New-Item -ItemType Directory -Path "$DataPath\config" -Force
New-Item -ItemType Directory -Path "$DataPath\data" -Force
New-Item -ItemType Directory -Path "$DataPath\logs" -Force

# 5. Generate configuration from templates
Write-Host "Generating configuration..."
$envTemplate = Get-Content "$PSScriptRoot\templates\server.env.template"
$envContent = $envTemplate -replace '\$\{RUNTIME_PROFILE\}', $Mode
$envContent = $envContent -replace '\$\{DATABASE_PATH\}', "$DataPath\data\pos.db"
$envContent | Set-Content "$DataPath\config\server.env"

# 6. Install Windows Service (using WinSW)
Write-Host "Installing Windows Service..."

# Copy WinSW executable
Copy-Item "$PSScriptRoot\winsw.exe" "$InstallPath\server\EasySale-service.exe"

# Generate WinSW config from template
$serviceXmlTemplate = Get-Content "$PSScriptRoot\templates\EasySale-service.xml.template"
$serviceXml = $serviceXmlTemplate -replace '\$\{INSTALL_PATH\}', $InstallPath
$serviceXml = $serviceXml -replace '\$\{DATA_PATH\}', $DataPath
$serviceXml = $serviceXml -replace '\$\{RUNTIME_PROFILE\}', $Mode
$serviceXml | Set-Content "$InstallPath\server\EasySale-service.xml"

# Install service using WinSW
& "$InstallPath\server\EasySale-service.exe" install

# 7. Start service
Write-Host "Starting service..."
& "$InstallPath\server\EasySale-service.exe" start

# 8. Validate health endpoint
Write-Host "Validating health endpoint..."
Start-Sleep -Seconds 5
$health = Invoke-WebRequest -Uri "http://localhost:$Port/health" -TimeoutSec 30
if ($health.StatusCode -ne 200) {
    throw "Health check failed"
}

Write-Host "Installation complete!"
```

### Preflight checker

Runs before prod install proceeds.

Outputs:

- JSON report (deterministic location)
- human summary
- exit code: 0 OK, 1 WARN, 2 BLOCK

Also performs "production readiness checks":

- config presence + secrets non-placeholder
- ports available
- directories writable
- backend can start + migrations succeed
- health endpoint responds
- dist assets exist / static serving reachable
- forbidden patterns scan (policy-driven warn/block)

**Preflight Script Structure**:

```powershell
# installer/windows/preflight.ps1

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("prod", "demo")]
    [string]$Mode,
    
    [Parameter(Mandatory=$true)]
    [string]$ConfigPath,
    
    [Parameter(Mandatory=$true)]
    [string]$DataPath,
    
    [string]$PolicyPath = "$PSScriptRoot\policies\preflight-policy.json",
    [string]$ReportPath = "$DataPath\logs\preflight-report.json"
)

# Helper function to parse .env files
function Parse-EnvFile {
    param([string]$Path)
    
    $config = @{}
    if (Test-Path $Path) {
        Get-Content $Path | ForEach-Object {
            $line = $_.Trim()
            # Skip comments and empty lines
            if ($line -and -not $line.StartsWith("#")) {
                if ($line -match '^([^=]+)=(.*)$') {
                    $key = $matches[1].Trim()
                    $value = $matches[2].Trim()
                    # Remove quotes if present
                    $value = $value -replace '^["'']|["'']$', ''
                    $config[$key] = $value
                }
            }
        }
    }
    return $config
}

$timestamp = Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ"
$checks = @{
    blocking = @()
    policy = @()
}

# Blocking checks
Write-Host "Running blocking checks..."

# Check: Required configuration present
if (-not (Test-Path $ConfigPath)) {
    $checks.blocking += @{
        name = "required_config"
        status = "FAIL"
        message = "Configuration file not found: $ConfigPath"
    }
} else {
    $checks.blocking += @{
        name = "required_config"
        status = "PASS"
        message = "Configuration file found"
    }
}

# Check: Required secrets present
if (Test-Path $ConfigPath) {
    $config = Parse-EnvFile -Path $ConfigPath
    if ($config.JWT_SECRET -match "CHANGE_ME|secret123|password123") {
        $checks.blocking += @{
            name = "required_secrets"
            status = "FAIL"
            message = "Placeholder secret detected: JWT_SECRET"
        }
    } else {
        $checks.blocking += @{
            name = "required_secrets"
            status = "PASS"
            message = "All required secrets present"
        }
    }
}

# Check: Directories writable
$testFile = "$DataPath\test-write.tmp"
try {
    New-Item -ItemType File -Path $testFile -Force | Out-Null
    Remove-Item $testFile -Force
    $checks.blocking += @{
        name = "directories_writable"
        status = "PASS"
        message = "Data directory is writable"
    }
} catch {
    $checks.blocking += @{
        name = "directories_writable"
        status = "FAIL"
        message = "Data directory is not writable: $DataPath"
    }
}

# Check: Ports available
$portInUse = Get-NetTCPConnection -LocalPort 8080 -ErrorAction SilentlyContinue
if ($portInUse) {
    $checks.blocking += @{
        name = "ports_available"
        status = "FAIL"
        message = "Port 8080 is already in use"
    }
} else {
    $checks.blocking += @{
        name = "ports_available"
        status = "PASS"
        message = "Required ports are available"
    }
}

# Policy checks
Write-Host "Running policy checks..."

$policy = Get-Content $PolicyPath | ConvertFrom-Json

# Check: Demo mode in prod
if ($Mode -eq "prod" -and $config.RUNTIME_PROFILE -eq "demo") {
    $checks.policy += @{
        name = "demo_mode_check"
        status = "WARN"
        policy = $policy.demo_in_prod
        message = "Demo mode enabled in prod profile"
    }
}

# Determine overall status
$blockingFailures = ($checks.blocking | Where-Object { $_.status -eq "FAIL" }).Count
$policyBlocks = ($checks.policy | Where-Object { $_.policy -eq "block" -and $_.status -eq "WARN" }).Count

if ($blockingFailures -gt 0 -or $policyBlocks -gt 0) {
    $status = "BLOCK"
    $exitCode = 2
    $summary = "Installation blocked: $blockingFailures blocking check(s) failed, $policyBlocks policy violation(s)"
} elseif (($checks.policy | Where-Object { $_.status -eq "WARN" }).Count -gt 0) {
    $status = "WARN"
    $exitCode = 1
    $summary = "Installation allowed with warnings"
} else {
    $status = "OK"
    $exitCode = 0
    $summary = "All checks passed"
}

# Generate report
$report = @{
    timestamp = $timestamp
    profile = $config.RUNTIME_PROFILE
    mode = $Mode
    status = $status
    checks = $checks
    summary = $summary
    exit_code = $exitCode
}

$report | ConvertTo-Json -Depth 10 | Set-Content $ReportPath

Write-Host $summary
exit $exitCode
```

---

## Archiving (No Deletes)

All removals are moves to:

- `archive/code/...` (code)
- `archive/docs/...` (superseded docs)

Every move must update mapping log:

- `audit/CHANGELOG_AUDIT.md` (or `archive/MAPPING.md`)

Mapping format:

| Old Path | New Path | Reason | Evidence |

**Archive Script**:

```powershell
# ci/archive-code.ps1

param(
    [Parameter(Mandatory=$true)]
    [string]$SourcePath,
    
    [Parameter(Mandatory=$true)]
    [string]$Reason,
    
    [Parameter(Mandatory=$true)]
    [string]$Evidence
)

$timestamp = Get-Date -Format "yyyy-MM-dd"
$archivePath = "archive/code/$timestamp/$SourcePath"

# Move file/directory
Move-Item -Path $SourcePath -Destination $archivePath -Force

# Update mapping log
$mappingEntry = "| $SourcePath | $archivePath | $Reason | $Evidence |"
Add-Content -Path "archive/MAPPING.md" -Value $mappingEntry

Write-Host "Archived: $SourcePath -> $archivePath"
```

---

## Deliverables

- Readiness Gate scanner + policy file
- Profile manager + validator
- Prod-safe frontend routes (no mocks)
- White-label branding provider (frontend + backend endpoints if needed)
- Route gating in backend
- Windows ZIP packaging script + installer suite + preflight checker
- Updated CI workflows to build + gate + package
- Mapping logs for all moved/archived items


---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Build System Properties

**Property 1: Stale Path Detection**
*For any* CI script or release script, scanning for stale path patterns (backend/rust, caps-pos-api) should find zero matches in Core_Runtime_Paths
**Validates: Requirements 1.4, 1.7, 1.8**

**Property 2: Archive Exclusion from Build**
*For any* build output or package artifact, the archive/ directory should not be present in the compiled or packaged contents
**Validates: Requirements 1.6, 9.4, 9.5**

### Demo Content Isolation Properties

**Property 3: Production Routes Free of Demo Content**
*For any* production route source file (/login, /reporting, /lookup, /admin), scanning for forbidden demo patterns (demo credentials, MOCK_, DEMO_DATA, hardcoded metrics) should find zero matches
**Validates: Requirements 2.1, 2.2, 2.3, 2.6, 2.7, 2.8, 2.9**

**Property 4: Demo Content from Preset Packs Only**
*For any* demo data displayed in the UI when profile is demo, the data source should be a Preset_Pack configuration file, not a hardcoded constant in source code
**Validates: Requirements 2.4**

### White-Label Properties

**Property 5: Core Runtime Paths Free of Branding Tokens**
*For any* file in Core_Runtime_Paths, scanning for forbidden branding tokens (CAPS, caps-pos, vehicle-specific terms) should find zero matches
**Validates: Requirements 3.2**

**Property 6: Branding Configuration Round Trip**
*For any* valid branding configuration (tenant or store level), loading the configuration and rendering UI components should produce output containing the configured company name, logo URL, and colors
**Validates: Requirements 3.1, 3.3, 3.4**

**Property 7: Automotive Features Optional**
*For any* system configuration with automotive modules disabled, the system should start successfully and handle core POS operations without requiring automotive-specific data or concepts
**Validates: Requirements 3.5**

### Runtime Profile Properties

**Property 8: Profile-Based Configuration Validation**
*For any* runtime profile (dev, demo, prod), loading configuration with missing required fields for that profile should fail with error messages listing all missing keys
**Validates: Requirements 4.2, 4.8**

**Property 9: Placeholder Secret Rejection in Prod**
*For any* configuration with placeholder secrets (CHANGE_ME, secret123, password123) when profile is prod, validation should reject the configuration and prevent startup
**Validates: Requirements 4.3**

**Property 10: Dev Endpoint Gating**
*For any* development-only endpoint when profile is prod, requests to that endpoint should return 404 or require explicit internal permission
**Validates: Requirements 4.4**

**Property 11: DATABASE_PATH Consistency**
*For any* configuration file, script, or code file that references database configuration, it should use the key DATABASE_PATH consistently (not DATABASE_URL or other variants)
**Validates: Requirements 4.7, 10.1**

### Security Properties

**Property 12: QuickBooks Input Sanitization**
*For any* user-provided input used in QuickBooks queries, special characters should be escaped or sanitized before query construction
**Validates: Requirements 5.1**

**Property 13: SQL Identifier Allowlisting**
*For any* dynamic SQL query construction, table and column names should only come from predefined allowlists, never from user input
**Validates: Requirements 5.2**

**Property 14: OAuth Configuration Source**
*For any* OAuth redirect URI in the system, it should be loaded from environment variables or configuration files, with zero hardcoded localhost URIs in source code
**Validates: Requirements 5.3**

**Property 15: Localhost OAuth Rejection in Prod**
*For any* OAuth configuration when profile is prod, if the redirect URI contains localhost, validation should reject the configuration unless integrations are disabled and policy allows warnings
**Validates: Requirements 5.4**

**Property 16: Parameterized Query Usage**
*For any* database query that includes user input, the query should use parameterized queries or prepared statements, with zero string concatenation of user inputs
**Validates: Requirements 5.5**

### Reporting Properties

**Property 17: Reporting Data from Backend**
*For any* reporting UI component, data should be fetched from backend API endpoints, not from hardcoded mock arrays
**Validates: Requirements 6.1**

**Property 18: Export Implementation or Hiding**
*For any* report type in prod profile, export functionality should either generate complete exports or be completely hidden/disabled (no stub buttons)
**Validates: Requirements 6.3, 6.4**

### Installer Properties

**Property 19: Windows Install Location Compliance**
*For any* file installed by the installer, binaries and static assets should be placed under Program Files, while mutable state (database, config, logs) should be placed under ProgramData
**Validates: Requirements 7.4**

### Preflight Validation Properties

**Property 20: Preflight Blocking Checks**
*For any* preflight check in the blocking category (missing config, missing secrets, unwritable directories, ports in use, migration failures, health failures, missing dist), if the check fails, the preflight checker should return exit code 2 (BLOCK) and prevent installation
**Validates: Requirements 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8**

**Property 21: Preflight Policy Checks**
*For any* preflight check in the policy category (demo in prod, forbidden tokens, localhost OAuth), the checker should enforce the configured policy (warn or block) and include the check result in the JSON report
**Validates: Requirements 8.9, 8.10, 8.11**

**Property 22: Preflight Report Format**
*For any* preflight checker execution, the output should include a JSON report at a deterministic ProgramData location, a human-readable summary, and an exit code (0=OK, 1=WARN, 2=BLOCK), with the JSON containing timestamp, profile, and installer mode
**Validates: Requirements 8.13, 8.14**

### Configuration Properties

**Property 23: Configuration Key Consistency**
*For any* configuration source (backend, frontend, installer templates), environment variable names should be consistent across all sources, with no conflicting or duplicate keys
**Validates: Requirements 10.2, 10.3**

**Property 24: Configuration Merge Precedence**
*For any* configuration key present in both environment variables and config files, the final value should follow clear precedence rules (environment variables override config files)
**Validates: Requirements 10.4**

**Property 25: Configuration Error Messages**
*For any* configuration validation error, the error message should clearly indicate the missing or invalid key name and the active runtime profile
**Validates: Requirements 10.5**

### Readiness Gate Properties

**Property 26: Readiness Gate Forbidden Pattern Detection**
*For any* production build, scanning Core_Runtime_Paths for forbidden patterns (demo credentials, mock arrays, branding tokens, localhost OAuth) should find zero matches, or the build should fail
**Validates: Requirements 11.1, 11.2, 11.3, 11.4**

**Property 27: Readiness Gate Scan Scope**
*For any* readiness gate scan, the scanner should only scan Core_Runtime_Paths and should exclude archive/, tests/, fixtures/, and configs/presets/ directories
**Validates: Requirements 11.6**

**Property 28: Readiness Gate Artifact Validation**
*For any* release artifact, the readiness gate should verify that excluded directories (archive/, tests/, fixtures/) are not present in the package, and should fail the build if they are
**Validates: Requirements 11.7**

### Test Policy Properties

**Property 29: Quarantined Test Exclusion**
*For any* CI build, quarantined tests should be skipped, while non-quarantined tests should be executed as part of validation
**Validates: Requirements 12.3, 12.4**

**Property 30: Test Code Exclusion from Packages**
*For any* production distribution package, test code (quarantined or not) should not be included in the package contents
**Validates: Requirements 12.5**

### Installer Mode Properties

**Property 31: Installer Mode Profile Enforcement**
*For any* installer execution, if Prod_Install_Mode is selected, the runtime profile should be set to prod with demo disabled, and if Demo_Install_Mode is selected, the runtime profile should be set to demo with preset pack loaded
**Validates: Requirements 13.2, 13.3**

**Property 32: Prod Install Demo Detection**
*For any* installer execution in Prod_Install_Mode, if demo configuration is detected, the preflight checker should BLOCK installation
**Validates: Requirements 13.4**

---

## Error Handling

### Build System Errors

**Compilation Failures**:
- **SQLx Offline Mode**: If `.sqlx/` metadata is missing or stale, provide clear error message with instructions to run `sqlx_prepare.ps1`
- **TypeScript Errors**: Report all TypeScript errors with file locations and line numbers
- **Stale Path Detection**: Fail fast with specific stale paths found and suggested corrections

**Readiness Gate Failures**:
- **Forbidden Pattern Found**: Report all matches with file paths, line numbers, and pattern matched
- **Artifact Validation**: Report which excluded directories were found in the package
- **Exit Code**: Non-zero exit code to fail CI pipeline

### Runtime Profile Errors

**Configuration Validation**:
- **Missing Required Fields**: List all missing fields in a single error message
- **Placeholder Secrets**: Identify which secrets are placeholders and need to be set
- **Invalid Profile**: Reject unknown profile names with list of valid options (dev, demo, prod)

**Startup Failures**:
- **Prod Profile Violations**: Fail startup immediately with clear error explaining the violation
- **Database Connection**: Provide clear error if DATABASE_PATH is invalid or database is inaccessible
- **Port Conflicts**: Report which port is in use and suggest alternatives

### Security Errors

**Input Validation**:
- **SQL Injection Attempt**: Log the attempt, reject the query, return generic error to user
- **Invalid Table/Column**: Reject with error indicating the identifier is not in the allowlist
- **OAuth Configuration**: Fail startup if OAuth config is invalid for the active profile

**Runtime Security**:
- **Unauthorized Access**: Return 403 with minimal information
- **Invalid Credentials**: Generic "authentication failed" message (no user enumeration)

### Installer Errors

**Preflight Failures**:
- **Blocking Checks**: Provide detailed error for each failed check with remediation steps
- **Policy Violations**: Clearly indicate whether the violation is a warning or blocking error
- **JSON Report**: Always write report even on failure for debugging

**Installation Failures**:
- **Service Installation**: Provide Windows error code and suggested fixes
- **File Extraction**: Report which files failed to extract and why
- **Health Check**: Report HTTP status code and response body from health endpoint

**Upgrade Failures**:
- **Rollback Triggered**: Clearly indicate rollback is in progress and provide rollback log
- **Migration Failure**: Report which migration failed and provide database backup location
- **Service Restart**: Report service status and provide manual restart instructions if needed

### Uninstall Errors

**Service Removal**:
- **Service Stop Failure**: Provide timeout duration and suggest manual stop
- **Service Delete Failure**: Provide Windows error code and manual removal instructions

**File Cleanup**:
- **Permission Denied**: Report which files couldn't be removed and suggest manual cleanup
- **ProgramData Preservation**: Clearly indicate what was preserved and where

---

## Testing Strategy

### Unit Testing

**Backend (Rust)**:
- **Configuration Loading**: Test profile loading with valid/invalid configs
- **Input Validation**: Test sanitization functions with malicious inputs
- **SQL Allowlists**: Test that only allowlisted identifiers are accepted
- **OAuth Validation**: Test localhost rejection in prod profile
- **Route Gating**: Test that dev endpoints are not registered in prod

**Frontend (TypeScript)**:
- **Branding Provider**: Test that branding loads from config
- **Demo Mode Indicator**: Test that indicator appears in demo mode
- **API Integration**: Test that components fetch from backend endpoints
- **Empty States**: Test that empty states appear when no data available

**Installer Scripts (PowerShell)**:
- **Preflight Checks**: Test each check individually with failing conditions
- **Service Management**: Test service install/start/stop/uninstall
- **File Operations**: Test extraction, config generation, cleanup
- **Error Handling**: Test error messages and exit codes

### Integration Testing

**Build Pipeline**:
- Test full build process from source to artifacts
- Test readiness gates with forbidden patterns present
- Test package creation and artifact validation
- Test SQLx offline mode compilation

**Installation Flow**:
- Test full installation in both prod and demo modes
- Test preflight checker with various failure scenarios
- Test service installation and health validation
- Test configuration generation from templates

**Upgrade Flow**:
- Test upgrade from previous version
- Test rollback on migration failure
- Test service restart and health validation
- Test configuration preservation

**Uninstall Flow**:
- Test complete uninstall with data preservation
- Test complete uninstall with data removal
- Test cleanup of all installed components
- Test service removal

### Property-Based Testing

**Configuration**: Minimum 100 iterations per property test

**Property Test 1: Stale Path Detection**
- Generate random CI scripts with mix of valid and stale paths
- Verify scanner detects all stale paths
- **Tag**: Feature: production-readiness-windows-installer, Property 1: Stale Path Detection

**Property Test 2: Archive Exclusion**
- Generate random build outputs with archive/ paths
- Verify build system excludes them
- **Tag**: Feature: production-readiness-windows-installer, Property 2: Archive Exclusion from Build

**Property Test 3: Demo Content Detection**
- Generate random production route files with demo patterns
- Verify scanner detects all forbidden patterns
- **Tag**: Feature: production-readiness-windows-installer, Property 3: Production Routes Free of Demo Content

**Property Test 4: Branding Configuration**
- Generate random branding configs
- Verify UI renders with configured values
- **Tag**: Feature: production-readiness-windows-installer, Property 6: Branding Configuration Round Trip

**Property Test 5: Profile Validation**
- Generate random configs with missing fields for each profile
- Verify validation catches all missing fields
- **Tag**: Feature: production-readiness-windows-installer, Property 8: Profile-Based Configuration Validation

**Property Test 6: Placeholder Secret Detection**
- Generate random configs with placeholder secrets
- Verify validation rejects them in prod profile
- **Tag**: Feature: production-readiness-windows-installer, Property 9: Placeholder Secret Rejection in Prod

**Property Test 7: SQL Input Sanitization**
- Generate random inputs with SQL injection attempts
- Verify all special characters are escaped
- **Tag**: Feature: production-readiness-windows-installer, Property 12: QuickBooks Input Sanitization

**Property Test 8: SQL Identifier Validation**
- Generate random table/column names (valid and invalid)
- Verify only allowlisted identifiers are accepted
- **Tag**: Feature: production-readiness-windows-installer, Property 13: SQL Identifier Allowlisting

**Property Test 9: Preflight Blocking Checks**
- Generate random preflight scenarios with failing checks
- Verify exit code is 2 (BLOCK) when blocking checks fail
- **Tag**: Feature: production-readiness-windows-installer, Property 20: Preflight Blocking Checks

**Property Test 10: Readiness Gate Pattern Detection**
- Generate random source files with forbidden patterns
- Verify readiness gate detects all patterns
- **Tag**: Feature: production-readiness-windows-installer, Property 26: Readiness Gate Forbidden Pattern Detection

### Manual Testing

**Windows Installation**:
- Test on clean Windows 10/11 systems
- Test with various permission levels
- Test with ports already in use
- Test with insufficient disk space
- Test with read-only directories

**Branding Customization**:
- Test with various tenant configurations
- Test with store-level overrides
- Test with missing branding assets
- Test with invalid color values

**Demo Mode**:
- Test demo installation and verify demo indicators
- Test that demo data loads from preset packs
- Test that prod installation rejects demo config
- Test demo mode UI banner visibility

**Upgrade Scenarios**:
- Test upgrade from version N to N+1
- Test upgrade with database schema changes
- Test rollback on failure
- Test configuration preservation

### Test Coverage Goals

- **Backend**: 80% code coverage for business logic
- **Frontend**: 70% code coverage for components
- **Installer Scripts**: 90% coverage for critical paths
- **Property Tests**: All 32 properties implemented
- **Integration Tests**: All major workflows covered

