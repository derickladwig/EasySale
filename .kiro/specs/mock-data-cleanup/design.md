# Mock Data Cleanup - Design

## Architecture

### Data Flow
```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  package.json   │────▶│  Vite Build      │────▶│  VITE_APP_*     │
│  (version)      │     │  (inject vars)   │     │  env vars       │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                          │
┌─────────────────┐     ┌──────────────────┐              ▼
│  Backend APIs   │────▶│  React Query     │────▶┌─────────────────┐
│  /api/health    │     │  Hooks           │     │  useAppInfo()   │
│  /api/caps      │     │                  │     │  Hook           │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                          │
┌─────────────────┐     ┌──────────────────┐              ▼
│  configs/*.json │────▶│  ConfigProvider  │────▶┌─────────────────┐
│  (branding)     │     │  Context         │     │  Components     │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

## Implementation Design

### 1. Create `useAppInfo` Hook
**File:** `frontend/src/common/hooks/useAppInfo.ts`

```typescript
export function useAppInfo() {
  const { data: capabilities } = useCapabilities();
  const { branding } = useConfig();
  
  return {
    version: capabilities?.version ?? import.meta.env.VITE_APP_VERSION ?? '0.1.0',
    buildHash: capabilities?.build_hash ?? import.meta.env.VITE_BUILD_HASH ?? 'dev',
    buildDate: import.meta.env.VITE_BUILD_DATE ?? null,
    companyName: branding?.company?.name ?? 'EasySale',
    copyright: `© ${new Date().getFullYear()} ${branding?.company?.name ?? 'EasySale'}. All rights reserved.`,
  };
}
```

### 2. Create `useSystemStatus` Hook
**File:** `frontend/src/common/hooks/useSystemStatus.ts`

```typescript
export function useSystemStatus() {
  const { data: health, isLoading, error } = useQuery({
    queryKey: ['health-status'],
    queryFn: () => fetch('/api/health/status').then(r => r.json()),
    refetchInterval: 30000, // Poll every 30s
  });
  
  const { branding } = useConfig();
  
  return {
    database: health?.components?.database?.status === 'up' ? 'connected' : 'disconnected',
    sync: health?.components?.sync?.status ?? 'unknown',
    lastSyncTime: health?.components?.sync?.lastSync ? new Date(health.components.sync.lastSync) : null,
    storeName: branding?.store?.name ?? 'Unknown Store',
    stationId: branding?.store?.station ?? 'Unknown',
    isLoading,
    error,
  };
}
```

### 3. Update Vite Config
**File:** `frontend/vite.config.ts`

```typescript
export default defineConfig({
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(process.env.npm_package_version),
    'import.meta.env.VITE_BUILD_HASH': JSON.stringify(process.env.BUILD_HASH || 'dev'),
    'import.meta.env.VITE_BUILD_DATE': JSON.stringify(new Date().toISOString().split('T')[0]),
  },
});
```

### 4. Fix LogoBadge Component
**Current (broken):**
```tsx
<div className="bg-gradient-to-br from-blue-500 to-blue-600">
  <img src={logo} />
</div>
```

**Fixed:**
```tsx
function LogoBadge({ logo, favicon, shortName }: Props) {
  const src = favicon || logo;
  
  if (src) {
    return (
      <div className="w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center">
        <img src={src} alt="Logo" className="w-full h-full object-contain" />
      </div>
    );
  }
  
  // Fallback to initials with theme accent
  return (
    <div className="w-16 h-16 rounded-2xl bg-primary-500 flex items-center justify-center">
      <span className="text-white font-bold text-2xl">{shortName}</span>
    </div>
  );
}
```

### 5. Fix Header Logo
**Current (broken):**
```tsx
{branding.company.logo ? (
  <img src={branding.company.logo} />
) : (
  <div className="bg-gradient-to-br from-blue-500 to-blue-600">
    {shortName}
  </div>
)}
```

**Fixed:**
```tsx
const logoSrc = branding.company.logoDark || branding.company.logo;
{logoSrc ? (
  <img src={logoSrc} alt={branding.company.name} className="h-8 w-auto" />
) : (
  <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center">
    <span className="text-white font-bold text-sm">{shortName}</span>
  </div>
)}
```

### 6. Fix Footer
**Current (broken):**
```tsx
<div>v1.0.0 • 2023-04-15-abc123</div>
<div>© 2024 EasySale. All rights reserved.</div>
```

**Fixed:**
```tsx
const { version, buildHash, copyright } = useAppInfo();

<div>v{version} • {buildHash}</div>
<div>{copyright}</div>
```

## Files to Modify

| File | Changes |
|------|---------|
| `frontend/vite.config.ts` | Add build-time env vars |
| `frontend/src/common/hooks/useAppInfo.ts` | Create new hook |
| `frontend/src/common/hooks/useSystemStatus.ts` | Create new hook |
| `frontend/src/features/auth/pages/LoginPageV2.tsx` | Use hooks, fix logo |
| `frontend/src/features/auth/pages/LoginPage.tsx` | Use hooks, fix footer |
| `frontend/src/features/auth/components/FooterSlot.tsx` | Accept dynamic props |

## API Dependencies

| Endpoint | Purpose | Fallback |
|----------|---------|----------|
| `GET /api/capabilities` | Version, build hash | Vite env vars |
| `GET /api/health/status` | Database, sync status | Show "Checking..." |
| `GET /api/config` | Branding, store info | Default config |
