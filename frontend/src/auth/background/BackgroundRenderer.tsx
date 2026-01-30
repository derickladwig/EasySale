/**
 * Background Renderer Component
 *
 * Renders different background types (solid, gradient, waves, photo) with overlay and blur effects.
 * Supports low-power mode for performance optimization.
 *
 * Validates Requirements 4.1, 4.7
 */

import { useState, useEffect } from 'react';
import { useLoginTheme } from '../theme/LoginThemeProvider';
import { GradientBackground } from './GradientBackground';
import { WavesBackground } from './WavesBackground';
import { PhotoBackground } from './PhotoBackground';

// ============================================================================
// Background Renderer Component
// ============================================================================

interface BackgroundRendererProps {
  lowPowerMode?: boolean;
}

export function BackgroundRenderer({ lowPowerMode = false }: BackgroundRendererProps) {
  const { config } = useLoginTheme();
  const { background } = config;
  const [hasError, setHasError] = useState(false);

  // Reset error state when background config changes
  useEffect(() => {
    if (hasError) {
      setHasError(false);
    }
  }, [background.type, hasError]);

  // Handle rendering errors by falling back to solid dark background
  const handleError = () => {
    console.error('Background rendering error, falling back to solid dark background');
    setHasError(true);
  };

  // Fallback to solid dark background on error
  if (hasError) {
    return (
      <div
        className="background-renderer background-renderer--solid background-renderer--fallback"
        style={{ backgroundColor: 'var(--color-bg-primary, #0f172a)' }}
        data-testid="background-fallback"
      />
    );
  }

  // Render appropriate background based on type
  const renderBackground = () => {
    switch (background.type) {
      case 'solid':
        return (
          <div
            className="background-renderer background-renderer--solid"
            style={{ backgroundColor: background.solid?.color || 'var(--color-bg-primary, #000)' }}
            data-testid="background-solid"
          />
        );

      case 'gradient':
        if (!background.gradient) {
          handleError();
          return null;
        }
        return (
          <div
            className="background-renderer background-renderer--gradient"
            data-testid="background-gradient"
          >
            <GradientBackground config={background.gradient} />
          </div>
        );

      case 'waves':
        if (!background.waves) {
          handleError();
          return null;
        }
        return (
          <div
            className="background-renderer background-renderer--waves"
            data-testid="background-waves"
          >
            <WavesBackground config={background.waves} />
          </div>
        );

      case 'photo':
        if (!background.photo) {
          handleError();
          return null;
        }
        return (
          <div
            className="background-renderer background-renderer--photo"
            data-testid="background-photo"
          >
            <PhotoBackground config={background.photo} />
          </div>
        );

      default:
        // Fallback to solid if unknown type
        return (
          <div
            className="background-renderer background-renderer--solid"
            style={{ backgroundColor: 'var(--color-bg-primary, #000)' }}
            data-testid="background-solid"
          />
        );
    }
  };

  return (
    <div
      className={`background-container ${lowPowerMode ? 'background-container--low-power' : ''}`}
    >
      {renderBackground()}

      <style>{`
        .background-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 0;
          overflow: hidden;
        }

        .background-renderer {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }

        .background-renderer--solid {
          transition: background-color 0.3s ease;
        }

        .background-renderer--fallback {
          background-color: #0f172a !important;
        }

        /* Low-power mode: disable animations and effects */
        .background-container--low-power .background-renderer {
          transition: none;
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// Exports
// ============================================================================

export type { BackgroundRendererProps };
