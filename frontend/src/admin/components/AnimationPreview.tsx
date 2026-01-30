import React, { useState } from 'react';
import type { AnimationSpeed } from '@common/hooks/useDisplaySettings';
import { cn } from '@common/utils/classNames';

export interface AnimationPreviewProps {
  animationSpeed: AnimationSpeed;
  reducedMotion?: boolean;
  className?: string;
}

const ANIMATION_SPEED_MULTIPLIERS: Record<AnimationSpeed, number> = {
  none: 0,
  reduced: 0.5,
  normal: 1.0,
  enhanced: 1.5,
};

/**
 * AnimationPreview component showing sample animations
 *
 * Features:
 * - Shows fade, slide, and scale animations
 * - Applies animation speed multiplier
 * - Trigger button to replay animations
 * - Respects reduced motion preference
 */
export const AnimationPreview: React.FC<AnimationPreviewProps> = ({
  animationSpeed,
  reducedMotion = false,
  className = '',
}) => {
  const [trigger, setTrigger] = useState(0);
  const multiplier = ANIMATION_SPEED_MULTIPLIERS[animationSpeed];
  const duration = animationSpeed === 'none' || reducedMotion ? 0 : 300 / multiplier;

  const handleReplay = () => {
    setTrigger((prev) => prev + 1);
  };

  return (
    <div className={cn('p-6 bg-surface-base rounded-lg border border-border space-y-4', className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs text-text-tertiary">
          {animationSpeed === 'none' || reducedMotion
            ? 'Animations disabled'
            : `Animation duration: ${duration.toFixed(0)}ms`}
        </div>
        <button
          onClick={handleReplay}
          className="px-3 py-1 bg-primary-600 text-white text-xs rounded hover:bg-primary-700 transition-colors"
        >
          Replay
        </button>
      </div>

      {/* Fade Animation */}
      <div>
        <div className="text-sm font-medium text-text-secondary mb-2">Fade In</div>
        <div
          key={`fade-${trigger}`}
          className="h-16 bg-primary-600/20 border border-primary-600 rounded flex items-center justify-center text-primary-400 text-sm"
          style={{
            animation:
              animationSpeed === 'none' || reducedMotion ? 'none' : `fadeIn ${duration}ms ease-out`,
          }}
        >
          Fade Animation
        </div>
      </div>

      {/* Slide Animation */}
      <div>
        <div className="text-sm font-medium text-text-secondary mb-2">Slide In</div>
        <div
          key={`slide-${trigger}`}
          className="h-16 bg-success-600/20 border border-success-600 rounded flex items-center justify-center text-success-400 text-sm"
          style={{
            animation:
              animationSpeed === 'none' || reducedMotion
                ? 'none'
                : `slideInRight ${duration}ms ease-out`,
          }}
        >
          Slide Animation
        </div>
      </div>

      {/* Scale Animation */}
      <div>
        <div className="text-sm font-medium text-text-secondary mb-2">Scale In</div>
        <div
          key={`scale-${trigger}`}
          className="h-16 bg-warning-600/20 border border-warning-600 rounded flex items-center justify-center text-warning-400 text-sm"
          style={{
            animation:
              animationSpeed === 'none' || reducedMotion
                ? 'none'
                : `scaleIn ${duration}ms ease-out`,
          }}
        >
          Scale Animation
        </div>
      </div>

      {/* Info */}
      <div className="pt-4 border-t border-border">
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-text-tertiary">Speed multiplier:</span>
            <span className="text-text-secondary ml-2 font-mono">{multiplier}x</span>
          </div>
          <div>
            <span className="text-text-tertiary">Duration:</span>
            <span className="text-text-secondary ml-2 font-mono">{duration.toFixed(0)}ms</span>
          </div>
        </div>
      </div>

      {reducedMotion && (
        <div className="p-3 bg-info-500/10 border border-info-500/30 rounded text-xs text-info-400">
          Reduced motion is enabled. Animations are automatically disabled.
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes scaleIn {
          from {
            transform: scale(0.8);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};
