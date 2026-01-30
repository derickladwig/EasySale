/**
 * Waves Background Component
 *
 * Renders animated SVG wave shapes with optional dot-grid texture overlay.
 * Wave intensity is configurable via tokens.
 *
 * Validates Requirements 4.3, 4.6
 */

import type { WavesBackgroundConfig } from '../theme/types';

// ============================================================================
// Waves Background Component
// ============================================================================

interface WavesBackgroundProps {
  config: WavesBackgroundConfig;
}

export function WavesBackground({ config }: WavesBackgroundProps) {
  const { baseColor, waveColor, intensity, showDotGrid, dotGridOpacity } = config;

  // Calculate wave amplitude based on intensity (0-1)
  const amplitude = 100 * intensity;

  return (
    <div className="waves-background" data-testid="waves-background">
      {/* Base color layer */}
      <div className="waves-background__base" style={{ backgroundColor: baseColor }} />

      {/* SVG wave layers */}
      <svg
        className="waves-background__svg"
        viewBox="0 0 1440 800"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Wave 1 - Bottom layer */}
        <path
          className="waves-background__wave waves-background__wave--1"
          d={`M0,${400 + amplitude} C360,${400 + amplitude * 0.8} 720,${400 + amplitude * 1.2} 1440,${400 + amplitude} L1440,800 L0,800 Z`}
          fill={waveColor}
          opacity="0.3"
        />

        {/* Wave 2 - Middle layer */}
        <path
          className="waves-background__wave waves-background__wave--2"
          d={`M0,${450 + amplitude * 0.8} C360,${450 + amplitude * 1.1} 720,${450 + amplitude * 0.6} 1440,${450 + amplitude * 0.8} L1440,800 L0,800 Z`}
          fill={waveColor}
          opacity="0.2"
        />

        {/* Wave 3 - Top layer */}
        <path
          className="waves-background__wave waves-background__wave--3"
          d={`M0,${500 + amplitude * 0.6} C360,${500 + amplitude * 0.9} 720,${500 + amplitude * 0.4} 1440,${500 + amplitude * 0.6} L1440,800 L0,800 Z`}
          fill={waveColor}
          opacity="0.15"
        />
      </svg>

      {/* Dot grid overlay */}
      {showDotGrid && (
        <div
          className="waves-background__dot-grid"
          style={{ opacity: dotGridOpacity }}
          data-testid="waves-dot-grid"
        />
      )}

      <style>{`
        .waves-background {
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
        }

        .waves-background__base {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }

        .waves-background__svg {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }

        .waves-background__wave {
          animation: wave-motion 20s ease-in-out infinite;
        }

        .waves-background__wave--1 {
          animation-duration: 25s;
          animation-delay: 0s;
        }

        .waves-background__wave--2 {
          animation-duration: 20s;
          animation-delay: -5s;
        }

        .waves-background__wave--3 {
          animation-duration: 30s;
          animation-delay: -10s;
        }

        @keyframes wave-motion {
          0%, 100% {
            transform: translateX(0) translateY(0);
          }
          25% {
            transform: translateX(-5%) translateY(-2%);
          }
          50% {
            transform: translateX(0) translateY(0);
          }
          75% {
            transform: translateX(5%) translateY(2%);
          }
        }

        .waves-background__dot-grid {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-image: radial-gradient(circle, rgba(255, 255, 255, 0.1) 1px, transparent 1px);
          background-size: 20px 20px;
          pointer-events: none;
        }

        /* Low-power mode: disable animations */
        .background-container--low-power .waves-background__wave {
          animation: none;
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// Exports
// ============================================================================

export type { WavesBackgroundProps };
