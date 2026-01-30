# Design Document

## Overview

This design consolidates and upgrades the Settings module for the CAPS POS system. Rather than rebuilding from scratch, we're taking what exists (user/role models, permission system, basic UI components) and making it coherent, consistent, and professional.

The approach follows three principles:
1. **Audit first**: Understand what exists and identify gaps
2. **Consolidate patterns**: Create reusable components for common Settings UI patterns
3. **Upgrade incrementally**: Improve UX without breaking existing functionality

This design supports the CAPS principle of "structure prevents chaos" by establishing clear patterns for Settings pages, consistent validation, and predictable permission enforcement.

## Architecture

### Settings Module Structure

```
frontend/src/features/admin/
├── components/
│   ├── SettingsPageShell.tsx       # Standard page layout
│   ├── SettingsTable.tsx           # Standard table with filters
│   ├── BulkActionsBar.tsx          # Bulk operation controls
│   ├── EntityEditorModal.tsx       # Base modal for editing
│   ├── SettingsSearch.tsx          # Global settings search
│   ├── EffectiveSettingsView.tsx   # Resolved settings display
│   ├── InlineWarningBanner.tsx     # Warning indicators
│   ├── FixIssuesWizard.tsx         # Guided issue resolution
│   └── PermissionMatrix.tsx        # Role × permission grid
├── pages/
│   ├── SettingsPage.tsx            # Main settings container
│   ├── MyPreferencesPage.tsx       # User preferences
│   ├── CompanyStoresPage.tsx       # Company & store config
│   ├── UsersRolesPage.tsx          # User & role management
│   ├── NetworkPage.tsx             # Network & sync settings
│   ├── ProductConfigPage.tsx       # Product configuration
│   ├── DataManagementPage.tsx      # Backup/export/import
│   ├── TaxRulesPage.tsx            # Tax configuration
│   ├── IntegrationsPage.tsx        # External integrations
│   ├── HardwarePage.tsx            # Hardware configuration
│   ├── FeatureFlagsPage.tsx        # Feature toggles
│   ├── LocalizationPage.tsx        # Language/currency/tax
│   ├── PerformancePage.tsx         # Performance monitoring
│   └── AuditLogPage.tsx            # Audit trail viewer
├── hooks/
│   ├── useUsers.ts                 # User CRUD operations
│   ├── useRoles.ts                 # Role management
│   ├── useStores.ts                # Store management
│   ├── useSettings.ts              # Settings CRUD
│   ├── useAuditLog.ts              # Audit log queries
│   └── useBulkActions.ts           # Bulk operation logic
└── types.ts                        # Settings-specific types
```

### Backend Structure

```
backend/rust/src/
├── handlers/
│   ├── settings.rs                 # Settings CRUD endpoints
│   ├── users.rs                    # User management endpoints
│   ├── roles.rs                    # Role management endpoints
│   ├── stores.rs                   # Store management endpoints
│   ├── audit.rs                    # Audit log endpoints
│   └── context.rs                  # Context resolution
├── models/
│   ├── settings.rs                 # Settings models
│   ├── store.rs                    # Store model
│   ├── station.rs                  # Station model
│   ├── audit_log.rs                # Audit log model
│   └── context.rs                  # User context model
├── services/
│   ├── settings_resolver.rs        # Effective settings resolution
│   ├── permission_checker.rs       # Permission enforcement
│   ├── context_provider.rs         # Context extraction
│   └── audit_logger.rs             # Audit logging (already exists)
└── middleware/
    ├── auth.rs                     # Authentication middleware
    ├── permissions.rs              # Permission checking middleware
    └── context.rs                  # Context injection middleware
```

## Components and Interfaces

### 1. SettingsPageShell Component

Standard layout for all Settings pages:

```typescript
interface SettingsPageShellProps {
  title: string;
  subtitle?: string;
  scope?: 'global' | 'store' | 'station' | 'user';
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  filters?: FilterChip[];
  problemCount?: number;
  primaryAction?: {
    label: string;
    onClick: () => void;
    icon?: React.ComponentType;
  };
  children: React.ReactNode;
}

// Usage:
<SettingsPageShell
  title="Users & Roles"
  subtitle="Manage user accounts and permissions"
  scope="global"
  searchPlaceholder="Search users..."
  onSearch={handleSearch}
  filters={[
    { label: 'Active', active: true, onClick: () => {} },
    { label: 'Unassigned Store', active: false, onClick: () => {} },
  ]}
  problemCount={6}
  primaryAction={{
    label: 'Add User',
    onClick: handleAddUser,
    icon: PlusIcon,
  }}
>
  {/* Page content */}
</SettingsPageShell>
```

### 2. SettingsTable Component

Standard table with sorting, filtering, bulk selection:

```typescript
interface SettingsTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  onRowClick?: (row: T) => void;
  bulkActions?: BulkAction[];
  emptyState?: {
    title: string;
    description: string;
    action?: { label: string; onClick: () => void };
  };
  isLoading?: boolean;
  virtualized?: boolean;
}

interface BulkAction {
  label: string;
  icon?: React.ComponentType;
  onClick: (selectedIds: string[]) => void;
  variant?: 'default' | 'danger';
  requiresConfirmation?: boolean;
}
```

### 3. EntityEditorModal Component

Base modal for editing entities (users, stores, roles, etc.):

```typescript
interface EntityEditorModalProps<T> {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  entity?: T;
  sections: EditorSection[];
  onSave: (data: T) => Promise<void>;
  validationSchema: z.ZodSchema<T>;
}

interface EditorSection {
  title: string;
  description?: string;
  fields: EditorField[];
}

interface EditorField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'select' | 'multiselect' | 'toggle' | 'radio';
  placeholder?: string;
  options?: { value: string; label: string }[];
  validation?: z.ZodSchema;
  helpText?: string;
  disabled?: boolean;
}
```

### 4. User Context Model

Defines the current user's operational context:

```typescript
interface UserContext {
  user: {
    id: string;
    username: string;
    role: string;
    permissions: string[];
  };
  store?: {
    id: string;
    name: string;
  };
  station?: {
    id: string;
    name: string;
  };
  effectivePermissions: string[];
}

// Backend (Rust)
pub struct UserContext {
    pub user_id: String,
    pub username: String,
    pub role: String,
    pub store_id: Option<String>,
    pub station_id: Option<String>,
}

impl UserContext {
    pub fn from_token(token: &str) -> Result<Self, AuthError> {
        // Extract from JWT claims
    }
    
    pub fn requires_store(&self) -> bool {
        // Check if user's role requires store assignment
        matches!(self.role.as_str(), "cashier" | "manager" | "parts_specialist" | "paint_tech" | "service_tech")
    }
    
    pub fn requires_station(&self) -> bool {
        // Check if user's role requires station assignment
        matches!(self.role.as_str(), "cashier")
    }
}
```

### 5. Settings Scope Hierarchy

Settings resolution follows a hierarchy:

```
User Settings (highest priority)
    ↓
Station Settings
    ↓
Store Settings
    ↓
Global Settings (lowest priority)
```

```typescript
interface Setting {
  key: string;
  value: any;
  scope: 'global' | 'store' | 'station' | 'user';
  scopeId?: string; // store_id, station_id, or user_id
  description: string;
  dataType: 'string' | 'number' | 'boolean' | 'json';
  category: string;
  isEditable: boolean;
  requiresRestart?: boolean;
}

interface EffectiveSetting extends Setting {
  source: 'global' | 'store' | 'station' | 'user';
  sourceId?: string;
  isOverridden: boolean;
}
```

### 6. Permission Enforcement Middleware

```rust
// middleware/permissions.rs
use actix_web::{dev::ServiceRequest, Error, HttpMessage};
use crate::models::context::UserContext;

pub async fn check_permission(
    req: ServiceRequest,
    required_permission: &str,
) -> Result<ServiceRequest, Error> {
    let context = req.extensions().get::<UserContext>()
        .ok_or_else(|| AuthError::MissingContext)?;
    
    let permissions = get_permissions_for_role(&context.role);
    
    if !permissions.contains(&required_permission.to_string()) {
        return Err(AuthError::Forbidden.into());
    }
    
    Ok(req)
}

// Usage in handlers
#[post("/api/users")]
#[has_permission("manage_users")]
async fn create_user(
    user_data: web::Json<CreateUserRequest>,
    context: web::ReqData<UserContext>,
) -> Result<HttpResponse, Error> {
    // Handler logic
}
```

### 7. Audit Logging

```rust
// services/audit_logger.rs (extend existing)
pub struct AuditLogEntry {
    pub id: String,
    pub entity_type: String,  // "user", "role", "store", "setting"
    pub entity_id: String,
    pub action: String,       // "create", "update", "delete"
    pub user_id: String,
    pub username: String,
    pub store_id: Option<String>,
    pub station_id: Option<String>,
    pub before_value: Option<serde_json::Value>,
    pub after_value: Option<serde_json::Value>,
    pub timestamp: DateTime<Utc>,
}

impl AuditLogger {
    pub async fn log_settings_change(
        &self,
        entity_type: &str,
        entity_id: &str,
        action: &str,
        context: &UserContext,
        before: Option<serde_json::Value>,
        after: Option<serde_json::Value>,
    ) -> Result<(), Error> {
        // Log to audit_logs table
    }
}
```

## Data Models

### Store Model

```rust
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Store {
    pub id: String,
    pub name: String,
    pub address: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
    pub zip: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub timezone: String,
    pub currency: String,
    pub receipt_footer: Option<String>,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
}
```

### Station Model

```rust
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Station {
    pub id: String,
    pub store_id: String,
    pub name: String,
    pub device_id: Option<String>,
    pub ip_address: Option<String>,
    pub is_active: bool,
    pub offline_mode_enabled: bool,
    pub last_seen_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}
```

### Enhanced User Model

```rust
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct User {
    pub id: String,
    pub username: String,
    pub email: String,
    #[serde(skip_serializing)]
    pub password_hash: String,
    pub role: String,
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub store_id: Option<String>,          // NEW: Primary store
    pub station_policy: String,            // NEW: "any", "specific", "none"
    pub station_id: Option<String>,        // NEW: Specific station (if policy = "specific")
    pub is_active: bool,
    pub last_login_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}
```

### Settings Model

```rust
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Setting {
    pub id: String,
    pub key: String,
    pub value: String,  // JSON-encoded
    pub scope: String,  // "global", "store", "station", "user"
    pub scope_id: Option<String>,
    pub description: String,
    pub data_type: String,  // "string", "number", "boolean", "json"
    pub category: String,   // "hardware", "integration", "localization", "feature_flags", etc.
    pub is_editable: bool,
    pub requires_restart: bool,
    pub created_at: String,
    pub updated_at: String,
}
```

### Hardware Configuration Model

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HardwareConfig {
    pub station_id: String,
    pub receipt_printer: PrinterConfig,
    pub label_printer: PrinterConfig,
    pub barcode_scanner: ScannerConfig,
    pub cash_drawer: CashDrawerConfig,
    pub payment_terminal: PaymentTerminalConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrinterConfig {
    pub enabled: bool,
    pub printer_type: String,  // "ESC_POS", "ZEBRA_ZPL", "BROTHER_QL"
    pub connection_type: String,  // "USB", "NETWORK", "SERIAL"
    pub port_or_ip: String,
    pub width: Option<i32>,  // For receipt printers
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScannerConfig {
    pub enabled: bool,
    pub scanner_type: String,  // "USB_HID", "SERIAL"
    pub prefix: Option<String>,
    pub suffix: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CashDrawerConfig {
    pub enabled: bool,
    pub drawer_type: String,  // "RJ11_VIA_PRINTER", "USB"
    pub open_code: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentTerminalConfig {
    pub enabled: bool,
    pub terminal_type: String,  // "STRIPE_TERMINAL", "SQUARE", "PAX", "INGENICO"
    pub api_key: Option<String>,
    pub location_id: Option<String>,
}
```

### Integration Configuration Model

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IntegrationConfig {
    pub integration_type: String,  // "quickbooks", "woocommerce", "stripe", "square", "paint_system"
    pub enabled: bool,
    pub credentials: serde_json::Value,  // Encrypted credentials
    pub settings: serde_json::Value,  // Integration-specific settings
    pub last_sync_at: Option<String>,
    pub sync_status: String,  // "success", "error", "pending"
    pub error_message: Option<String>,
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

**Property 1: Permission Enforcement Consistency**
*For any* protected API endpoint, attempting to access it without the required permission should return 403 Forbidden, regardless of UI state.
**Validates: Requirements 5.1, 5.2, 5.3**

**Property 2: Store Assignment Requirement**
*For any* user with a POS-related role (cashier, manager, parts_specialist, paint_tech, service_tech), attempting to perform a POS operation without store assignment should fail with a clear error.
**Validates: Requirements 2.7, 6.1, 6.3**

**Property 3: Station Policy Enforcement**
*For any* user with station_policy="specific", attempting to log in from a different station should fail with a clear error.
**Validates: Requirements 2.8, 6.2, 6.4**

**Property 4: Settings Scope Resolution**
*For any* setting key, the effective value should be resolved by checking User → Station → Store → Global in that order, returning the first non-null value.
**Validates: Requirements 1.5, 11.2, 11.3**

**Property 5: Validation Consistency**
*For any* form submission, if frontend validation passes but backend validation fails, the backend should return structured field-level errors that the frontend can display inline.
**Validates: Requirements 3.3, 3.4, 7.2, 7.3**

**Property 6: Audit Log Completeness**
*For any* change to users, roles, stores, stations, or settings, an audit log entry should be created with complete before/after values and context.
**Validates: Requirements 8.1, 8.2**

**Property 7: Bulk Operation Atomicity**
*For any* bulk operation, either all selected items should be updated successfully, or none should be updated (all-or-nothing).
**Validates: Requirements 9.7**

**Property 8: Context Derivation Consistency**
*For any* authenticated request, the user context (user, store, station) should be derived from the JWT token claims, not from request parameters.
**Validates: Requirements 5.4, 6.7**

## Error Handling

### Frontend Error Handling

```typescript
// Validation errors
interface ValidationError {
  field: string;
  message: string;
  code: string;
}

interface ApiError {
  status: number;
  message: string;
  errors?: ValidationError[];
}

// Error display
function FormField({ name, error }: { name: string; error?: ValidationError }) {
  return (
    <div>
      <Input name={name} />
      {error && (
        <p className="text-sm text-error-600 mt-1">
          {error.message}
        </p>
      )}
    </div>
  );
}
```

### Backend Error Handling

```rust
#[derive(Debug, Serialize)]
pub struct ApiError {
    pub status: u16,
    pub message: String,
    pub errors: Option<Vec<ValidationError>>,
}

#[derive(Debug, Serialize)]
pub struct ValidationError {
    pub field: String,
    pub message: String,
    pub code: String,
}

impl ResponseError for ApiError {
    fn error_response(&self) -> HttpResponse {
        HttpResponse::build(StatusCode::from_u16(self.status).unwrap())
            .json(self)
    }
}
```

## Testing Strategy

### Unit Tests

**Frontend:**
- Test SettingsPageShell renders correctly with all props
- Test SettingsTable handles sorting, filtering, bulk selection
- Test EntityEditorModal validates and saves correctly
- Test validation schemas catch invalid inputs
- Test permission checks hide/show UI elements correctly

**Backend:**
- Test permission middleware blocks unauthorized requests
- Test context extraction from JWT tokens
- Test settings resolution follows scope hierarchy
- Test audit logging captures all required fields
- Test bulk operations are atomic

### Integration Tests

- Test complete user creation flow (UI → API → DB → Audit)
- Test bulk user assignment updates all selected users
- Test settings search finds and navigates to correct setting
- Test effective settings view shows correct resolved values
- Test permission enforcement across all protected endpoints

### Property-Based Tests

**Test 1: Permission enforcement**
- Generate random user contexts and API requests
- Verify unauthorized requests always return 403

**Test 2: Settings resolution**
- Generate random setting hierarchies
- Verify effective value always comes from highest priority scope

**Test 3: Validation consistency**
- Generate random form data
- Verify frontend and backend validation agree

### Testing Configuration

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
});
```

## Implementation Notes

### Phase 1: Foundation (Low Risk)

1. **Create shared components**
   - SettingsPageShell
   - SettingsTable
   - EntityEditorModal
   - BulkActionsBar

2. **Add sub-tabs to Users & Roles**
   - Users tab
   - Roles tab
   - Audit Log tab (stub)

3. **Enhance User model**
   - Add store_id, station_policy, station_id fields
   - Create migration
   - Update API endpoints

4. **Add filters and bulk actions to Users page**
   - Filter chips
   - Bulk selection
   - Bulk actions bar

### Phase 2: Data Correctness (Medium Risk)

1. **Enforce store/station requirements**
   - Update permission checks
   - Add validation rules
   - Display clear errors

2. **Standardize permission enforcement**
   - Create permission middleware
   - Apply to all protected routes
   - Add server-side checks

3. **Implement context provider**
   - Extract context from JWT
   - Inject into request handlers
   - Use for permission checks

4. **Add audit logging**
   - Log all settings changes
   - Create audit log page
   - Add filtering and export

### Phase 3: UX Polish (Low Risk)

1. **Add Settings Search**
   - Index all settings
   - Implement search UI
   - Add navigation

2. **Add Effective Settings view**
   - Implement resolution logic
   - Create display UI
   - Add export

3. **Add "Fix Issues" wizard**
   - Detect common problems
   - Guide bulk resolution
   - Show progress

4. **Implement remaining Settings pages**
   - Company & Stores
   - Network
   - Product Config
   - Data Management
   - Tax Rules
   - Integrations

### Development Workflow

```bash
# Start with Phase 1
cd frontend
npm run dev

# Create shared components
# Test in Storybook
npm run storybook

# Implement Users page enhancements
# Test manually and with unit tests
npm test

# Move to backend
cd ../backend/rust
cargo watch -x run

# Add new models and migrations
sqlx migrate add enhance_user_model

# Implement new endpoints
# Test with integration tests
cargo test
```

### Performance Considerations

- **Virtualize large tables**: Use react-virtual for 1000+ rows
- **Debounce search**: 300ms delay to avoid excessive API calls
- **Cache settings**: 5-minute cache for frequently accessed settings
- **Paginate results**: 100 items per page for large datasets
- **Index database**: Add indexes on frequently queried columns
- **Lazy load tabs**: Only load tab content when activated

### Security Considerations

- **Server-side permission checks**: Never trust UI-only checks
- **Validate all inputs**: Both frontend and backend
- **Audit sensitive operations**: Log all user/role/settings changes
- **Secure credentials**: Encrypt integration credentials at rest
- **Rate limit APIs**: Prevent brute force attacks
- **CSRF protection**: Use CSRF tokens for state-changing operations

## Success Criteria

### Technical Metrics

1. **Consistency**: All Settings pages use SettingsPageShell and SettingsTable
2. **Performance**: Settings pages load in < 500ms
3. **Test Coverage**: > 80% coverage for Settings module
4. **Permission Enforcement**: 100% of protected routes have server-side checks
5. **Audit Coverage**: 100% of settings changes are logged

### User Experience Metrics

1. **Reduced Clicks**: Common tasks (e.g., assign store to user) take < 3 clicks
2. **Clear Errors**: All validation errors display inline with clear messages
3. **Bulk Efficiency**: Bulk operations work on 100+ items without timeout
4. **Search Speed**: Settings search returns results in < 200ms
5. **Zero Confusion**: No "Unassigned" warnings for properly configured users

### Maintainability Metrics

1. **Pattern Reuse**: New Settings pages reuse existing components
2. **Validation Consistency**: Frontend and backend validation share schemas
3. **Code Duplication**: < 5% duplicated code across Settings pages
4. **Documentation**: All Settings components have Storybook stories
