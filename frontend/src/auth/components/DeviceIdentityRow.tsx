/**
 * Device Identity Row Component
 *
 * Displays device name and "remember station" checkbox.
 * Shows only when enabled in configuration.
 *
 * Validates Requirements 5.6
 */

// ============================================================================
// Device Identity Row Component
// ============================================================================

interface DeviceIdentityRowProps {
  deviceName?: string;
  rememberStation: boolean;
  onRememberStationChange: (remember: boolean) => void;
  disabled?: boolean;
}

export function DeviceIdentityRow({
  deviceName = 'Unknown Device',
  rememberStation,
  onRememberStationChange,
  disabled = false,
}: DeviceIdentityRowProps) {
  return (
    <div className="device-identity-row" data-testid="device-identity-row">
      <div className="device-identity-row__device">
        <span className="device-identity-row__label">Device:</span>
        <span className="device-identity-row__value" data-testid="device-name">
          {deviceName}
        </span>
      </div>

      <label className="device-identity-row__checkbox-label">
        <input
          type="checkbox"
          checked={rememberStation}
          onChange={(e) => onRememberStationChange(e.target.checked)}
          disabled={disabled}
          className="device-identity-row__checkbox"
          data-testid="remember-station-checkbox"
        />
        <span className="device-identity-row__checkbox-text">Remember this station</span>
      </label>

      <style>{`
        .device-identity-row {
          display: flex;
          flex-direction: column;
          gap: var(--login-space-sm, 0.5rem);
          padding: var(--login-space-md, 1rem);
          background-color: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--login-border-default, #334155);
          border-radius: var(--login-radius-input, 4px);
          margin-bottom: var(--login-space-md, 1rem);
        }

        .device-identity-row__device {
          display: flex;
          align-items: center;
          gap: var(--login-space-xs, 0.25rem);
        }

        .device-identity-row__label {
          font-size: var(--login-text-sm, 0.875rem);
          font-weight: var(--login-font-medium, 500);
          color: var(--login-text-secondary, #cbd5e1);
        }

        .device-identity-row__value {
          font-size: var(--login-text-sm, 0.875rem);
          font-weight: var(--login-font-semibold, 600);
          color: var(--login-text-primary, #f8fafc);
        }

        .device-identity-row__checkbox-label {
          display: flex;
          align-items: center;
          gap: var(--login-space-sm, 0.5rem);
          cursor: pointer;
          user-select: none;
        }

        .device-identity-row__checkbox {
          width: 16px;
          height: 16px;
          cursor: pointer;
          accent-color: var(--login-accent-primary, #14b8a6);
        }

        .device-identity-row__checkbox:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .device-identity-row__checkbox-text {
          font-size: var(--login-text-sm, 0.875rem);
          color: var(--login-text-secondary, #cbd5e1);
        }

        .device-identity-row__checkbox-label:has(input:disabled) {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .device-identity-row__checkbox:focus-visible {
          outline: 2px solid var(--login-border-focus, #60a5fa);
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// Exports
// ============================================================================

export type { DeviceIdentityRowProps };
