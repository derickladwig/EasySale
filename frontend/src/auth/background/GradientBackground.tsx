/**
 * Gradient Background Component
 *
 * Renders multi-stop gradient backgrounds from token configuration.
 * Validates Requirements 4.2
 */

import type { GradientBackgroundConfig } from '../theme/types';

// ============================================================================
// Gradient Background Component
// ============================================================================

interface GradientBackgroundProps {
  config: GradientBackgroundConfig;
}

export function GradientBackground({ config }: GradientBackgroundProps) {
  // Generate CSS gradient string from color stops
  const generateGradient = (): string => {
    // Validate config exists
    if (!config) {
      console.error('No gradient config provided');
      return 'linear-gradient(135deg, #1e1b4b 0%, #5b21b6 100%)'; // Fallback gradient
    }

    const { stops } = config;

    // Validate stops is an array
    if (!Array.isArray(stops) || stops.length === 0) {
      console.error('Invalid gradient stops (not an array or empty):', stops, 'Config:', config);
      return 'linear-gradient(135deg, #1e1b4b 0%, #5b21b6 100%)'; // Fallback gradient
    }

    // Validate each stop has required properties
    const validStops = stops.filter(
      (stop) => stop && typeof stop.color === 'string' && typeof stop.position === 'number'
    );

    if (validStops.length === 0) {
      console.error('No valid gradient stops found:', stops);
      return 'linear-gradient(135deg, #1e1b4b 0%, #5b21b6 100%)'; // Fallback gradient
    }

    // Sort stops by position to ensure correct gradient order
    const sortedStops = validStops.sort((a, b) => a.position - b.position);

    // Build gradient string
    const gradientStops = sortedStops.map((stop) => `${stop.color} ${stop.position}%`).join(', ');

    return `linear-gradient(135deg, ${gradientStops})`;
  };

  const gradientStyle = generateGradient();

  return (
    <div
      className="gradient-background"
      style={{ background: gradientStyle }}
      data-testid="gradient-background"
    >
      <style>{`
        .gradient-background {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          transition: background 0.5s ease;
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// Exports
// ============================================================================

export type { GradientBackgroundProps };
