/**
 * Low Power Mode Component
 *
 * Disables expensive visual effects when performance degrades.
 * Automatically activates when frame rate drops below 30fps for 3 seconds.
 *
 * Validates Requirements 11.4
 */

import { createContext, useContext, ReactNode } from 'react';
import { usePerformanceMonitoring, PerformanceMetrics } from './usePerformanceMonitoring';

// ============================================================================
// Context Types
// ============================================================================

interface LowPowerModeContextValue {
  isLowPowerMode: boolean;
  metrics: PerformanceMetrics;
  toggleLowPowerMode: () => void;
}

// ============================================================================
// Context
// ============================================================================

const LowPowerModeContext = createContext<LowPowerModeContextValue | null>(null);

// ============================================================================
// Provider Props
// ============================================================================

interface LowPowerModeProviderProps {
  children: ReactNode;
  enabled?: boolean;
  onLowPowerModeChange?: (enabled: boolean) => void;
}

// ============================================================================
// Provider Component
// ============================================================================

export function LowPowerModeProvider({
  children,
  enabled = true,
  onLowPowerModeChange,
}: LowPowerModeProviderProps) {
  const { metrics, toggleLowPowerMode } = usePerformanceMonitoring({
    enabled,
    targetFrameRate: 60,
    lowPowerThreshold: 30,
    lowPowerDuration: 3000,
    onLowPowerModeChange,
  });

  const value: LowPowerModeContextValue = {
    isLowPowerMode: metrics.isLowPowerMode,
    metrics,
    toggleLowPowerMode,
  };

  return <LowPowerModeContext.Provider value={value}>{children}</LowPowerModeContext.Provider>;
}

// ============================================================================
// Hook
// ============================================================================

export function useLowPowerMode(): LowPowerModeContextValue {
  const context = useContext(LowPowerModeContext);

  if (!context) {
    throw new Error('useLowPowerMode must be used within a LowPowerModeProvider');
  }

  return context;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get CSS styles for low-power mode
 */
export function getLowPowerStyles(isLowPowerMode: boolean): React.CSSProperties {
  if (!isLowPowerMode) {
    return {};
  }

  return {
    // Disable blur effects
    backdropFilter: 'none',
    filter: 'none',

    // Disable shadows
    boxShadow: 'none',
    textShadow: 'none',

    // Disable transitions and animations
    transition: 'none',
    animation: 'none',
  };
}

/**
 * Check if an effect should be disabled in low-power mode
 */
export function shouldDisableEffect(
  _effectType: 'blur' | 'shadow' | 'animation' | 'particle',
  isLowPowerMode: boolean
): boolean {
  return isLowPowerMode;
}

// ============================================================================
// Exports
// ============================================================================

export { LowPowerModeContext };
export type { LowPowerModeContextValue, LowPowerModeProviderProps };
