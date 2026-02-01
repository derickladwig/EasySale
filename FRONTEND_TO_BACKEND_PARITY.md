# Frontend-Backend Settings API Parity Analysis

## Overview
Analysis of frontend API client compatibility with backend settings endpoints, including base URLs, authentication, and schema alignment.

## Frontend API Client Analysis

### Base Configuration (`frontend/src/services/settingsApi.ts`)

#### API Base URL Configuration
```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8923';
```
- **Status**: ✅ **CORRECT** - Uses environment variable with fallback
- **Default Port**: 8923 (matches backend default)
- **Environment Variable**: `VITE_API_URL` for production override

#### Authentication Setup
```typescript
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```
- **Status**: ✅ **CORRECT** - JWT Bearer token authentication
- **Token Storage**: localStorage (standard approach)
- **Header Format**: `Bearer {token}` (matches backend expectation)

### API Endpoint Mapping

#### User Preferences Endpoints
| Frontend Call | Backend Endpoint | Status |
|---------------|------------------|---------|
| `getPreferences()` | `GET /api/settings/preferences` | ✅ **MAPPED** |
| `updatePreferences()` | `PUT /api/settings/preferences` | ✅ **MAPPED** |

#### Localization Settings Endpoints
| Frontend Call | Backend Endpoint | Status |
|---------------|------------------|---------|
| `getLocalization()` | `GET /api/settings/localization` | ✅ **MAPPED** |
| `updateLocalization()` | `PUT /api/settings/localization` | ✅ **MAPPED** |

#### Network Settings Endpoints
| Frontend Call | Backend Endpoint | Status |
|---------------|------------------|---------|
| `getNetwork()` | `GET /api/settings/network` | ✅ **MAPPED** |
| `updateNetwork()` | `PUT /api/settings/network` | ✅ **MAPPED** |

#### Performance Settings Endpoints
| Frontend Call | Backend Endpoint | Status |
|---------------|------------------|---------|
| `getPerformance()` | `GET /api/settings/performance` | ✅ **MAPPED** |
| `updatePerformance()` | `PUT /api/settings/performance` | ✅ **MAPPED** |

## Schema Compatibility Analysis

### User Preferences Schema
#### Frontend TypeScript Interface
```typescript
export interface UserPreferences {
  user_id: string;
  display_name?: string;
  email?: string;
  theme: string;
  email_notifications: boolean;
  desktop_notifications: boolean;
  tenant_id: string;
}
```

#### Backend Rust Struct
```rust
pub struct UserPreferences {
    pub user_id: String,
    pub display_name: Option<String>,
    pub email: Option<String>,
    pub theme: String,
    pub email_notifications: bool,
    pub desktop_notifications: bool,
    pub tenant_id: String,
}
```
- **Status**: ✅ **FULLY COMPATIBLE**
- **Field Mapping**: 1:1 exact match
- **Optional Fields**: Correctly mapped with `Option<T>` ↔ `?`

### Localization Settings Schema
#### Frontend TypeScript Interface
```typescript
export interface LocalizationSettings {
  tenant_id: string;
  language: string;
  currency: string;
  currency_symbol: string;
  currency_position: string;
  decimal_places: number;
  tax_enabled: boolean;
  tax_rate: number;
  tax_name: string;
  date_format: string;
  time_format: string;
  timezone: string;
}
```

#### Backend Rust Struct
```rust
pub struct LocalizationSettings {
    pub tenant_id: String,
    pub language: String,
    pub currency: String,
    pub currency_symbol: String,
    pub currency_position: String,
    pub decimal_places: i32,
    pub tax_enabled: bool,
    pub tax_rate: f64,
    pub tax_name: String,
    pub date_format: String,
    pub time_format: String,
    pub timezone: String,
}
```
- **Status**: ✅ **FULLY COMPATIBLE**
- **Type Mapping**: `number` ↔ `i32`/`f64`, `boolean` ↔ `bool`, `string` ↔ `String`

### Network Settings Schema
#### Frontend TypeScript Interface
```typescript
export interface NetworkSettings {
  tenant_id: string;
  sync_enabled: boolean;
  sync_interval: number;
  auto_resolve_conflicts: boolean;
  offline_mode_enabled: boolean;
  max_queue_size: number;
}
```

#### Backend Rust Struct
```rust
pub struct NetworkSettings {
    pub tenant_id: String,
    pub sync_enabled: bool,
    pub sync_interval: i32,
    pub auto_resolve_conflicts: bool,
    pub offline_mode_enabled: bool,
    pub max_queue_size: i32,
}
```
- **Status**: ✅ **FULLY COMPATIBLE**

### Performance Settings Schema
#### Frontend TypeScript Interface
```typescript
export interface PerformanceSettings {
  tenant_id: string;
  monitoring_enabled: boolean;
  monitoring_url?: string;
  sentry_dsn?: string;
}
```

#### Backend Rust Struct
```rust
pub struct PerformanceSettings {
    pub tenant_id: String,
    pub monitoring_enabled: bool,
    pub monitoring_url: Option<String>,
    pub sentry_dsn: Option<String>,
}
```
- **Status**: ✅ **FULLY COMPATIBLE**

## Request/Response DTOs Compatibility

### Update Request Schemas
All update request interfaces in frontend match backend request structs:
- `UpdateUserPreferencesRequest` ✅
- `UpdateLocalizationRequest` ✅  
- `UpdateNetworkRequest` ✅
- `UpdatePerformanceRequest` ✅

## Missing Frontend API Clients

### Settings Resolution APIs
The following backend endpoints have **NO** frontend client implementation:

#### Effective Settings
- `GET /api/settings/effective` - Get all effective settings for current user context
- `GET /api/settings/effective/export` - Export effective settings to JSON/CSV

#### Generic Settings CRUD
- `GET /api/settings` - List all settings
- `GET /api/settings/{key}` - Get setting by key
- `POST /api/settings` - Create/update setting
- `DELETE /api/settings/{key}` - Delete setting

#### Settings Resolution
- `GET /api/settings/value/{tenant_id}/{key}` - Get resolved setting value
- `GET /api/settings/override/{tenant_id}/{key}` - Check if setting overridden
- `GET /api/settings/scopes/{tenant_id}/{key}` - Get setting scopes

#### Alternative User Endpoints
- `GET /api/users/me/preferences` - Alternative user preferences endpoint
- `PUT /api/users/me/preferences` - Alternative user preferences update
- `PUT /api/users/me/password` - Change password endpoint

## CORS Configuration Analysis

### Backend CORS Setup (`main.rs`)
```rust
let cors = Cors::default()
    .allowed_origin("http://localhost:3000") // Development fallback
    .allowed_origin("http://127.0.0.1:7945") // Development fallback
    .allowed_origin("http://127.0.0.1:7945") // Development fallback (duplicate)
    .allow_any_method()
    .allow_any_header()
    .supports_credentials()
    .max_age(3600);
```

### Issues Identified
- **⚠️ Duplicate Origin**: `http://127.0.0.1:7945` listed twice
- **⚠️ Missing Production Origins**: No production domain configuration
- **⚠️ Port Mismatch**: Frontend runs on 7945, but 3000 also allowed (legacy?)

### Recommendations
```rust
let cors = Cors::default()
    .allowed_origin("http://localhost:7945")    // Frontend dev server
    .allowed_origin("http://127.0.0.1:7945")   // Frontend dev server (IP)
    .allowed_origin(&config.frontend_url)      // Production frontend URL from config
    .allow_any_method()
    .allow_any_header()
    .supports_credentials()
    .max_age(3600);
```

## Error Handling Compatibility

### Frontend Error Handling
```typescript
// No explicit error handling in settingsApi.ts
// Relies on axios default error handling
```

### Backend Error Responses
```rust
// Returns structured ApiError responses
pub enum ApiError {
    ValidationError(String),
    NotFound(String),
    Unauthorized(String),
    InternalServerError(String),
}
```

### Recommendation
Add error handling to frontend API client:
```typescript
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle structured API errors
    if (error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }
    throw error;
  }
);
```

## Content-Type Headers

### Frontend
```typescript
headers: {
  'Content-Type': 'application/json',
}
```

### Backend
- Expects `application/json` for POST/PUT requests ✅
- Returns `application/json` responses ✅
- Export endpoints return `text/csv` or `application/json` based on format parameter

## Authentication Context

### Frontend Token Management
- Stores JWT in `localStorage` as `auth_token`
- Automatically adds `Authorization: Bearer {token}` header
- No token refresh logic implemented

### Backend Authentication
- Validates JWT tokens via `ContextExtractor` middleware
- Extracts `UserContext` from valid tokens
- Requires authentication for all settings endpoints except public ones

## Summary

### ✅ Working Correctly
- Base URL configuration with environment override
- JWT authentication setup
- Core settings endpoints (preferences, localization, network, performance)
- Schema compatibility (100% match)
- Request/response DTO compatibility

### ⚠️ Issues Found
- CORS configuration has duplicate origins and missing production setup
- No frontend clients for advanced settings features (resolution, CRUD, export)
- No error handling for structured API errors
- No token refresh mechanism

### 🔴 Missing Implementation
- Settings resolution API clients
- Generic settings CRUD API clients
- Effective settings and export API clients
- Password change API client
- Error handling interceptors
- Token refresh logic