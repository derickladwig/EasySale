# UI Polish and Demo Mode Fix

**Date:** 2026-01-29

## Summary

Fixed critical production bug where "Demo Store" branding appeared in production builds, and removed hardcoded demo data from authentication components.

## Changes Made

### 1. Demo Mode Detection Fix (ConfigProvider.tsx)

**Problem:** Production builds showed "Demo Store" branding instead of tenant branding because `ConfigProvider` initialized the profile state as `'dev'` instead of detecting the actual runtime profile.

**Solution:** Import and use `getRuntimeProfile()` from `demoMode.ts` as the initial state value:

```typescript
// Before
const [profile, setProfile] = useState<'dev' | 'demo' | 'prod'>('dev');

// After
const [profile, setProfile] = useState<'dev' | 'demo' | 'prod'>(getRuntimeProfile);
```

### 2. StoreStationPicker - API Integration

**Problem:** Hardcoded store and station lists in the login flow:
- "Main Store", "Downtown Branch", "Airport Location"
- "Register 1", "Register 2", "Register 3", "Back Office"

**Solution:** Replaced with API hooks:
- `useStores()` - fetches stores from `/api/stores`
- `useStations(storeId)` - fetches stations from `/api/stations`
- Added loading states and proper filtering for active stores/stations
- Station dropdown now requires store selection first

### 3. AuthCard - Dynamic Device Name

**Problem:** Hardcoded `deviceName="Register 1 - Main Store"` in DeviceIdentityRow.

**Solution:** Derive device name from selected store and station:
```typescript
const deviceName = useMemo(() => {
  const selectedStore = stores.find((s) => s.id === credentials.storeId);
  const selectedStation = stations.find((s) => s.id === credentials.stationId);
  
  if (selectedStation && selectedStore) {
    return `${selectedStation.name} - ${selectedStore.name}`;
  }
  // ... fallback logic
}, [stores, stations, credentials.storeId, credentials.stationId]);
```

### 4. AdminPage - Store Info Section

**Problem:** Hardcoded `store-001` and placeholder address/phone/email values.

**Solution:** 
- Use first store from `useStores()` hook
- Show empty state when no stores configured
- Populate form fields from actual store data

## Files Modified

- `frontend/src/config/ConfigProvider.tsx`
- `frontend/src/auth/components/StoreStationPicker.tsx`
- `frontend/src/auth/components/StoreStationPicker.test.tsx`
- `frontend/src/auth/components/AuthCard.tsx`
- `frontend/src/admin/pages/AdminPage.tsx`

## Test Results

- All 11 StoreStationPicker tests pass
- All 26 AuthCard tests pass
- No TypeScript errors

## Not Changed (Acceptable)

- `WarehousePage.tsx` mock barcode generation - This is a legitimate scanner simulation feature for testing, not production data leakage
- `ImportWizard.tsx` sample CSV data - Acceptable for showing users the expected format
