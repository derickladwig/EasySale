# UI Gating Guide - Capabilities-Based Feature Display

## Overview

The frontend adapts its UI based on backend capabilities reported by the `/api/capabilities` endpoint. This allows the same frontend code to work with different backend build variants (Lite, Export, Full).

## Capabilities API

The backend exposes capabilities at `/api/capabilities`:

```json
{
  "accounting_mode": "disabled" | "export_only" | "sync",
  "features": {
    "export": false,
    "sync": false
  },
  "version": "0.1.0",
  "build_hash": "abc123..."
}
```

### Accounting Modes

- **disabled**: No accounting features available (Lite build)
- **export_only**: CSV export available, no sync (Export build)
- **sync**: Both export and sync available (Full build)

## Using Capabilities in Components

### 1. Using the Hook

```tsx
import { useCapabilities } from '@common/contexts';

function MyComponent() {
  const { capabilities, loading, error } = useCapabilities();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error loading capabilities</div>;

  return (
    <div>
      {capabilities.accounting_mode !== 'disabled' && (
        <AccountingSection />
      )}
    </div>
  );
}
```

### 2. Using Convenience Hooks

```tsx
import { 
  useHasAccountingFeatures,
  useHasExportFeatures,
  useHasSyncFeatures 
} from '@common/contexts';

function ToolbarButtons() {
  const hasExport = useHasExportFeatures();
  const hasSync = useHasSyncFeatures();

  return (
    <div>
      {hasExport && <button onClick={handleExport}>Export CSV</button>}
      {hasSync && <button onClick={handleSync}>Sync Now</button>}
    </div>
  );
}
```

### 3. Using CapabilityGate Component

```tsx
import { CapabilityGate } from '@common/components/CapabilityGate';

function SettingsPage() {
  return (
    <div>
      <h1>Settings</h1>
      
      {/* Only show if accounting features are available */}
      <CapabilityGate requireAccounting>
        <section>
          <h2>Accounting Settings</h2>
          <AccountingSettings />
        </section>
      </CapabilityGate>

      {/* Only show if export is available */}
      <CapabilityGate requireExport>
        <section>
          <h2>Export Settings</h2>
          <ExportSettings />
        </section>
      </CapabilityGate>

      {/* Only show if sync is available */}
      <CapabilityGate requireSync>
        <section>
          <h2>QuickBooks Sync</h2>
          <SyncSettings />
        </section>
      </CapabilityGate>
    </div>
  );
}
```

### 4. With Fallback Content

```tsx
<CapabilityGate 
  requireExport
  fallback={
    <div className="alert alert-info">
      Export feature not available. Upgrade to Export or Full build.
    </div>
  }
>
  <ExportPanel />
</CapabilityGate>
```

## Navigation Gating

### Conditional Routes

```tsx
import { useHasAccountingFeatures } from '@common/contexts';

function AppRoutes() {
  const hasAccounting = useHasAccountingFeatures();

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/sell" element={<SellPage />} />
      
      {/* Only register accounting routes if available */}
      {hasAccounting && (
        <>
          <Route path="/accounting" element={<AccountingPage />} />
          <Route path="/export" element={<ExportPage />} />
        </>
      )}
    </Routes>
  );
}
```

### Conditional Navigation Items

```tsx
import { useHasExportFeatures, useHasSyncFeatures } from '@common/contexts';

function NavigationMenu() {
  const hasExport = useHasExportFeatures();
  const hasSync = useHasSyncFeatures();

  return (
    <nav>
      <NavLink to="/">Home</NavLink>
      <NavLink to="/sell">Sell</NavLink>
      <NavLink to="/inventory">Inventory</NavLink>
      
      {hasExport && <NavLink to="/export">Export</NavLink>}
      {hasSync && <NavLink to="/sync">Sync</NavLink>}
    </nav>
  );
}
```

## Best Practices

### 1. Check Capabilities Early

Query capabilities on app startup (already done in `CapabilitiesProvider`):

```tsx
// In App.tsx
<CapabilitiesProvider>
  <YourApp />
</CapabilitiesProvider>
```

### 2. Cache Capabilities

Capabilities are cached for the session duration. They only change after:
- Backend upgrade
- Server restart
- Manual cache clear

### 3. Handle Loading State

Always handle the loading state when using capabilities:

```tsx
const { capabilities, loading } = useCapabilities();

if (loading) {
  return <LoadingSpinner />;
}
```

### 4. Graceful Degradation

Provide fallback content or messages when features are unavailable:

```tsx
<CapabilityGate 
  requireSync
  fallback={<p>Sync feature requires Full build</p>}
>
  <SyncPanel />
</CapabilityGate>
```

### 5. Don't Duplicate Logic

Use the provided hooks and components instead of checking capabilities manually:

```tsx
// ❌ Bad - duplicates logic
const hasExport = capabilities?.features.export ?? false;

// ✅ Good - uses provided hook
const hasExport = useHasExportFeatures();
```

## Testing

### Testing with Different Capabilities

Mock the capabilities context in tests:

```tsx
import { CapabilitiesProvider } from '@common/contexts';

const mockCapabilities = {
  accounting_mode: 'export_only',
  features: { export: true, sync: false },
  version: '0.1.0',
  build_hash: 'test',
};

// In your test
<CapabilitiesProvider value={{ capabilities: mockCapabilities, loading: false, error: null }}>
  <ComponentUnderTest />
</CapabilitiesProvider>
```

### Testing All Modes

Test your components with all three accounting modes:

1. **disabled** - No accounting features
2. **export_only** - Export available, no sync
3. **sync** - Both export and sync available

## Common Patterns

### Pattern 1: Feature-Specific Buttons

```tsx
function ActionBar() {
  const hasExport = useHasExportFeatures();
  const hasSync = useHasSyncFeatures();

  return (
    <div className="action-bar">
      <button onClick={handleSave}>Save</button>
      {hasExport && <button onClick={handleExport}>Export</button>}
      {hasSync && <button onClick={handleSync}>Sync</button>}
    </div>
  );
}
```

### Pattern 2: Conditional Settings Sections

```tsx
function SettingsPage() {
  return (
    <div>
      <GeneralSettings />
      
      <CapabilityGate requireAccounting>
        <AccountingSettings />
      </CapabilityGate>
      
      <CapabilityGate requireSync>
        <SyncSettings />
      </CapabilityGate>
    </div>
  );
}
```

### Pattern 3: Feature Availability Messages

```tsx
function ExportPage() {
  const hasExport = useHasExportFeatures();

  if (!hasExport) {
    return (
      <div className="feature-unavailable">
        <h2>Export Feature Not Available</h2>
        <p>This feature requires the Export or Full build variant.</p>
        <p>Contact your administrator to upgrade.</p>
      </div>
    );
  }

  return <ExportInterface />;
}
```

### Pattern 4: Progressive Enhancement

```tsx
function TransactionList() {
  const hasExport = useHasExportFeatures();
  const hasSync = useHasSyncFeatures();

  return (
    <div>
      <TransactionTable />
      
      {/* Basic features always available */}
      <button onClick={handlePrint}>Print</button>
      
      {/* Enhanced features when available */}
      {hasExport && <button onClick={handleExport}>Export CSV</button>}
      {hasSync && <button onClick={handleSync}>Sync to QuickBooks</button>}
    </div>
  );
}
```

## Troubleshooting

### Capabilities Not Loading

If capabilities are not loading:

1. Check backend is running: `curl http://localhost:8923/api/capabilities`
2. Check browser console for errors
3. Verify `CapabilitiesProvider` is wrapping your app
4. Check network tab for failed requests

### Features Not Showing

If features are not showing when they should:

1. Verify backend build variant: `curl http://localhost:8923/api/capabilities`
2. Check capabilities in React DevTools
3. Verify capability checks are correct
4. Clear capabilities cache: `clearCapabilitiesCache()`

### Stale Capabilities

If capabilities are stale after backend upgrade:

1. Refresh the page (capabilities are cached per session)
2. Or programmatically: `clearCapabilitiesCache()` then `fetchCapabilities()`

## API Reference

### Hooks

- `useCapabilities()` - Get capabilities, loading state, and error
- `useHasAccountingFeatures()` - Check if accounting is available
- `useHasExportFeatures()` - Check if export is available
- `useHasSyncFeatures()` - Check if sync is available

### Components

- `<CapabilityGate>` - Conditionally render based on capabilities

### Functions

- `fetchCapabilities()` - Fetch capabilities from backend
- `getCachedCapabilities()` - Get cached capabilities
- `clearCapabilitiesCache()` - Clear cached capabilities
- `hasAccountingFeatures(capabilities)` - Check accounting availability
- `hasExportFeatures(capabilities)` - Check export availability
- `hasSyncFeatures(capabilities)` - Check sync availability
