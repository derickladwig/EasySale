/**
 * Performance Monitoring Hook
 *
 * Tracks render performance, frame rates, and automatically enables low-power mode
 * when performance degrades.
 *
 * Validates Requirements 11.1, 11.2, 11.4, 11.5, 11.6
 */

import { useEffect, useRef, useState, useCallback } from 'react';

// ============================================================================
// Types
// ============================================================================

interface PerformanceMetrics {
  renderTime: number;
  frameRate: number;
  isLowPowerMode: boolean;
  averageFrameRate: number;
}

interface PerformanceMonitoringOptions {
  /**
   * Whether performance monitoring is enabled
   */
  enabled?: boolean;

  /**
   * Target frame rate (default: 60fps)
   */
  targetFrameRate?: number;

  /**
   * Threshold for enabling low-power mode (default: 30fps)
   */
  lowPowerThreshold?: number;

  /**
   * Duration of poor performance before enabling low-power mode (default: 3000ms)
   */
  lowPowerDuration?: number;

  /**
   * Callback when low-power mode is toggled
   */
  onLowPowerModeChange?: (enabled: boolean) => void;

  /**
   * Callback when metrics are updated
   */
  onMetricsUpdate?: (metrics: PerformanceMetrics) => void;
}

// ============================================================================
// Hook
// ============================================================================

export function usePerformanceMonitoring({
  enabled = true,
  lowPowerThreshold = 30,
  lowPowerDuration = 3000,
  onLowPowerModeChange,
  onMetricsUpdate,
}: PerformanceMonitoringOptions = {}) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    frameRate: 60,
    isLowPowerMode: false,
    averageFrameRate: 60,
  });

  const frameTimesRef = useRef<number[]>([]);
  const lastFrameTimeRef = useRef<number>(performance.now());
  const animationFrameRef = useRef<number | null>(null);
  const poorPerformanceStartRef = useRef<number | null>(null);
  const renderStartTimeRef = useRef<number | null>(null);

  /**
   * Measure frame rate
   */
  const measureFrameRate = useCallback(() => {
    if (!enabled) {
      return;
    }

    const now = performance.now();
    const deltaTime = now - lastFrameTimeRef.current;
    lastFrameTimeRef.current = now;

    // Calculate instantaneous frame rate
    const instantFrameRate = deltaTime > 0 ? 1000 / deltaTime : 60;

    // Store frame time for averaging
    frameTimesRef.current.push(instantFrameRate);

    // Keep only last 60 frames (1 second at 60fps)
    if (frameTimesRef.current.length > 60) {
      frameTimesRef.current.shift();
    }

    // Calculate average frame rate
    const averageFrameRate =
      frameTimesRef.current.reduce((sum, fps) => sum + fps, 0) / frameTimesRef.current.length;

    // Check if we should enable low-power mode
    let shouldEnableLowPower = metrics.isLowPowerMode;

    if (averageFrameRate < lowPowerThreshold) {
      // Performance is poor
      if (poorPerformanceStartRef.current === null) {
        poorPerformanceStartRef.current = now;
      } else if (now - poorPerformanceStartRef.current >= lowPowerDuration) {
        // Poor performance for long enough, enable low-power mode
        if (!shouldEnableLowPower) {
          shouldEnableLowPower = true;
          console.warn(
            `Performance degraded (${averageFrameRate.toFixed(1)}fps < ${lowPowerThreshold}fps for ${lowPowerDuration}ms). Enabling low-power mode.`
          );
          onLowPowerModeChange?.(true);
        }
      }
    } else {
      // Performance is good, reset poor performance timer
      poorPerformanceStartRef.current = null;
    }

    // Update metrics
    const newMetrics: PerformanceMetrics = {
      renderTime: renderStartTimeRef.current ? now - renderStartTimeRef.current : 0,
      frameRate: instantFrameRate,
      isLowPowerMode: shouldEnableLowPower,
      averageFrameRate,
    };

    setMetrics(newMetrics);
    onMetricsUpdate?.(newMetrics);

    // Continue measuring
    animationFrameRef.current = requestAnimationFrame(measureFrameRate);
  }, [
    enabled,
    lowPowerThreshold,
    lowPowerDuration,
    metrics.isLowPowerMode,
    onLowPowerModeChange,
    onMetricsUpdate,
  ]);

  /**
   * Start render time measurement
   */
  const startRenderMeasurement = useCallback(() => {
    if (!enabled) {
      return;
    }
    renderStartTimeRef.current = performance.now();
  }, [enabled]);

  /**
   * End render time measurement
   */
  const endRenderMeasurement = useCallback(() => {
    if (!enabled || renderStartTimeRef.current === null) {
      return;
    }

    const renderTime = performance.now() - renderStartTimeRef.current;
    renderStartTimeRef.current = null;

    // Log slow renders
    if (renderTime > 16.67) {
      // Slower than 60fps
      console.warn(`Slow render detected: ${renderTime.toFixed(2)}ms`);
    }
  }, [enabled]);

  /**
   * Manually toggle low-power mode
   */
  const toggleLowPowerMode = useCallback(() => {
    const newValue = !metrics.isLowPowerMode;
    setMetrics((prev) => ({
      ...prev,
      isLowPowerMode: newValue,
    }));
    onLowPowerModeChange?.(newValue);
  }, [metrics.isLowPowerMode, onLowPowerModeChange]);

  /**
   * Reset performance metrics
   */
  const resetMetrics = useCallback(() => {
    frameTimesRef.current = [];
    poorPerformanceStartRef.current = null;
    setMetrics({
      renderTime: 0,
      frameRate: 60,
      isLowPowerMode: false,
      averageFrameRate: 60,
    });
  }, []);

  /**
   * Start monitoring
   */
  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Start frame rate monitoring
    animationFrameRef.current = requestAnimationFrame(measureFrameRate);

    // Cleanup
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [enabled, measureFrameRate]);

  return {
    metrics,
    startRenderMeasurement,
    endRenderMeasurement,
    toggleLowPowerMode,
    resetMetrics,
  };
}

// ============================================================================
// Exports
// ============================================================================

export type { PerformanceMetrics, PerformanceMonitoringOptions };
