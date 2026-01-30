/**
 * Store and Station Picker Component
 *
 * Dropdown selectors for store and station selection.
 * Displays above credential inputs when enabled.
 * Fetches stores and stations from API.
 *
 * Validates Requirements 5.5
 */

import { useStores } from '../../admin/hooks/useStores';
import { useStations } from '../../admin/hooks/useStations';

// ============================================================================
// Store and Station Picker Component
// ============================================================================

interface StoreStationPickerProps {
  storeId: string;
  stationId: string;
  onStoreChange: (storeId: string) => void;
  onStationChange: (stationId: string) => void;
  disabled?: boolean;
  showStore?: boolean;
  showStation?: boolean;
}

export function StoreStationPicker({
  storeId,
  stationId,
  onStoreChange,
  onStationChange,
  disabled = false,
  showStore = true,
  showStation = true,
}: StoreStationPickerProps) {
  // Fetch stores and stations from API
  const { stores, isLoading: storesLoading } = useStores();
  const { stations, isLoading: stationsLoading } = useStations(storeId || undefined);

  // Don't render if both pickers are hidden
  if (!showStore && !showStation) {
    return null;
  }

  // Filter to only active stores and stations
  const activeStores = stores.filter((s) => s.is_active);
  const activeStations = stations.filter((s) => s.is_active);

  const isDisabled = disabled || storesLoading || stationsLoading;

  return (
    <div className="store-station-picker" data-testid="store-station-picker">
      {showStore && (
        <div className="store-station-picker__field">
          <label htmlFor="store-select" className="store-station-picker__label">
            Store
          </label>
          <select
            id="store-select"
            value={storeId}
            onChange={(e) => onStoreChange(e.target.value)}
            disabled={isDisabled}
            className="store-station-picker__select"
            data-testid="store-select"
          >
            <option value="">{storesLoading ? 'Loading stores...' : 'Select a store...'}</option>
            {activeStores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {showStation && (
        <div className="store-station-picker__field">
          <label htmlFor="station-select" className="store-station-picker__label">
            Station
          </label>
          <select
            id="station-select"
            value={stationId}
            onChange={(e) => onStationChange(e.target.value)}
            disabled={isDisabled || !storeId}
            className="store-station-picker__select"
            data-testid="station-select"
          >
            <option value="">
              {!storeId
                ? 'Select a store first...'
                : stationsLoading
                  ? 'Loading stations...'
                  : 'Select a station...'}
            </option>
            {activeStations.map((station) => (
              <option key={station.id} value={station.id}>
                {station.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <style>{`
        .store-station-picker {
          display: flex;
          flex-direction: column;
          gap: var(--login-space-md, 1rem);
          margin-bottom: var(--login-space-lg, 1.5rem);
        }

        .store-station-picker__field {
          display: flex;
          flex-direction: column;
        }

        .store-station-picker__label {
          display: block;
          font-size: var(--login-text-sm, 0.875rem);
          font-weight: var(--login-font-medium, 500);
          color: var(--login-text-secondary, #cbd5e1);
          margin-bottom: var(--login-space-xs, 0.25rem);
        }

        .store-station-picker__select {
          width: 100%;
          min-height: 48px;
          padding: var(--login-space-sm, 0.5rem) var(--login-space-md, 1rem);
          font-size: var(--login-text-base, 1rem);
          color: var(--login-text-primary, #f8fafc);
          background-color: var(--login-surface-secondary, #1e293b);
          border: 2px solid var(--login-border-default, #334155);
          border-radius: var(--login-radius-input, 4px);
          outline: none;
          cursor: pointer;
        }

        .store-station-picker__select:focus {
          border-color: var(--login-border-focus, #60a5fa);
        }

        .store-station-picker__select:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .store-station-picker__select option {
          background-color: var(--login-surface-secondary, #1e293b);
          color: var(--login-text-primary, #f8fafc);
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// Exports
// ============================================================================

export type { StoreStationPickerProps };
