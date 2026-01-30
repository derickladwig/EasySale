/**
 * Photo Background Component
 *
 * Renders photo background with progressive image loading (placeholder → low-res → high-res).
 * Supports configurable blur and overlay for readability.
 *
 * Validates Requirements 4.4, 4.5
 */

import { useState, useEffect } from 'react';
import type { PhotoBackgroundConfig } from '../theme/types';

// ============================================================================
// Photo Background Component
// ============================================================================

interface PhotoBackgroundProps {
  config: PhotoBackgroundConfig;
}

type LoadingState = 'placeholder' | 'low-res' | 'high-res' | 'error';

export function PhotoBackground({ config }: PhotoBackgroundProps) {
  const { url, lowResUrl, placeholderColor, blur, overlay } = config;
  const [loadingState, setLoadingState] = useState<LoadingState>('placeholder');
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);

  useEffect(() => {
    // Reset to placeholder when config changes
    setLoadingState('placeholder');
    setCurrentImageUrl(null);

    // Load low-res image first if available
    if (lowResUrl) {
      const lowResImage = new Image();
      lowResImage.onload = () => {
        setCurrentImageUrl(lowResUrl);
        setLoadingState('low-res');

        // Then load high-res image
        loadHighResImage();
      };
      lowResImage.onerror = () => {
        // Skip to high-res if low-res fails
        loadHighResImage();
      };
      lowResImage.src = lowResUrl;
    } else {
      // Load high-res directly if no low-res available
      loadHighResImage();
    }

    function loadHighResImage() {
      const highResImage = new Image();
      highResImage.onload = () => {
        setCurrentImageUrl(url);
        setLoadingState('high-res');
      };
      highResImage.onerror = () => {
        setLoadingState('error');
      };
      highResImage.src = url;
    }
  }, [url, lowResUrl]);

  return (
    <div className="photo-background" data-testid="photo-background">
      {/* Placeholder layer */}
      {loadingState === 'placeholder' && (
        <div
          className="photo-background__placeholder"
          style={{ backgroundColor: placeholderColor }}
          data-testid="photo-placeholder"
        />
      )}

      {/* Image layer */}
      {currentImageUrl && loadingState !== 'error' && (
        <div
          className={`photo-background__image photo-background__image--${loadingState}`}
          style={{
            backgroundImage: `url(${currentImageUrl})`,
            filter: blur > 0 ? `blur(${blur}px)` : 'none',
          }}
          data-testid={`photo-image-${loadingState}`}
        />
      )}

      {/* Error fallback */}
      {loadingState === 'error' && (
        <div
          className="photo-background__error"
          style={{ backgroundColor: placeholderColor }}
          data-testid="photo-error"
        />
      )}

      {/* Overlay layer */}
      {overlay.enabled && (
        <div
          className="photo-background__overlay"
          style={{
            backgroundColor: overlay.color,
            opacity: overlay.opacity,
          }}
          data-testid="photo-overlay"
        />
      )}

      <style>{`
        .photo-background {
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
        }

        .photo-background__placeholder,
        .photo-background__image,
        .photo-background__error {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }

        .photo-background__image {
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          transition: opacity 0.5s ease-in-out;
        }

        .photo-background__image--low-res {
          opacity: 1;
        }

        .photo-background__image--high-res {
          opacity: 1;
        }

        .photo-background__overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          transition: opacity 0.3s ease;
        }

        .photo-background__error {
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(255, 255, 255, 0.5);
          font-size: 0.875rem;
        }

        /* Low-power mode: disable transitions */
        .background-container--low-power .photo-background__image {
          transition: none;
        }

        .background-container--low-power .photo-background__overlay {
          transition: none;
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// Exports
// ============================================================================

export type { PhotoBackgroundProps };
