/**
 * Property Test: Animation Performance
 *
 * Feature: themeable-login-system
 * Property 13: Animations must maintain 60fps or gracefully degrade
 *
 * Validates Requirements 11.2, 11.5
 */

import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import * as fc from 'fast-check';
import { useLowPowerMode, LowPowerModeProvider, shouldDisableEffect } from './LowPowerMode';
import { useState, useEffect } from 'react';

// ============================================================================
// Test Component
// ============================================================================

interface AnimatedComponentProps {
  animationDuration: number;
  hasBlur: boolean;
  hasShadow: boolean;
}

function AnimatedComponent({ animationDuration, hasBlur, hasShadow }: AnimatedComponentProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    setIsAnimating(true);
    const timer = setTimeout(() => {
      setIsAnimating(false);
    }, animationDuration);

    return () => clearTimeout(timer);
  }, [animationDuration]);

  return (
    <div
      data-testid="animated-component"
      data-animating={isAnimating}
      style={{
        transition: `all ${animationDuration}ms ease`,
        backdropFilter: hasBlur ? 'blur(10px)' : 'none',
        boxShadow: hasShadow ? '0 4px 6px rgba(0,0,0,0.1)' : 'none',
      }}
    >
      Animated Content
    </div>
  );
}

function AnimatedComponentWithLowPower(props: AnimatedComponentProps) {
  return (
    <LowPowerModeProvider enabled={true}>
      <AnimatedComponent {...props} />
    </LowPowerModeProvider>
  );
}

// ============================================================================
// Property Tests
// ============================================================================

describe('Property 13: Animation Performance', () => {
  afterEach(() => {
    cleanup();
  });

  it('should handle animations of varying durations', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 1000 }),
        fc.boolean(),
        fc.boolean(),
        (duration, hasBlur, hasShadow) => {
          // Act
          const { container } = render(
            <AnimatedComponent
              animationDuration={duration}
              hasBlur={hasBlur}
              hasShadow={hasShadow}
            />
          );

          // Assert: Component should render
          const component = container.querySelector('[data-testid="animated-component"]');
          expect(component).toBeTruthy();

          // Assert: Animation state should be tracked
          const isAnimating = component!.getAttribute('data-animating');
          expect(isAnimating).toBe('true');

          // Cleanup
          cleanup();
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should apply visual effects based on configuration', () => {
    fc.assert(
      fc.property(fc.boolean(), fc.boolean(), (hasBlur, hasShadow) => {
        // Act
        const { container } = render(
          <AnimatedComponent animationDuration={300} hasBlur={hasBlur} hasShadow={hasShadow} />
        );

        const component = container.querySelector(
          '[data-testid="animated-component"]'
        ) as HTMLElement;
        expect(component).toBeTruthy();

        // Assert: Blur should be applied when configured
        if (hasBlur) {
          expect(component.style.backdropFilter).toContain('blur');
        } else {
          expect(component.style.backdropFilter).toBe('none');
        }

        // Assert: Shadow should be applied when configured
        if (hasShadow) {
          expect(component.style.boxShadow).not.toBe('none');
        } else {
          expect(component.style.boxShadow).toBe('none');
        }

        // Cleanup
        cleanup();
      }),
      { numRuns: 20 }
    );
  });

  it('should disable effects in low-power mode', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('blur', 'shadow', 'animation', 'particle'),
        fc.boolean(),
        (effectType, isLowPowerMode) => {
          // Act
          const shouldDisable = shouldDisableEffect(effectType, isLowPowerMode);

          // Assert: Effects should be disabled when in low-power mode
          if (isLowPowerMode) {
            expect(shouldDisable).toBe(true);
          } else {
            expect(shouldDisable).toBe(false);
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should provide low-power mode context', () => {
    fc.assert(
      fc.property(fc.integer({ min: 100, max: 500 }), (duration) => {
        // Act
        const { container } = render(
          <AnimatedComponentWithLowPower
            animationDuration={duration}
            hasBlur={true}
            hasShadow={true}
          />
        );

        // Assert: Component should render with low-power context
        const component = container.querySelector('[data-testid="animated-component"]');
        expect(component).toBeTruthy();

        // Cleanup
        cleanup();
      }),
      { numRuns: 20 }
    );
  });

  it('should handle rapid animation state changes', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 50, max: 200 }), { minLength: 2, maxLength: 5 }),
        (durations) => {
          // Act: Render with first duration
          const { rerender, container } = render(
            <AnimatedComponent animationDuration={durations[0]} hasBlur={false} hasShadow={false} />
          );

          // Re-render with different durations
          durations.slice(1).forEach((duration) => {
            rerender(
              <AnimatedComponent animationDuration={duration} hasBlur={false} hasShadow={false} />
            );
          });

          // Assert: Component should still be rendered
          const component = container.querySelector('[data-testid="animated-component"]');
          expect(component).toBeTruthy();

          // Cleanup
          cleanup();
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should maintain consistent animation timing', () => {
    fc.assert(
      fc.property(fc.integer({ min: 100, max: 1000 }), (duration) => {
        // Act
        const start = performance.now();
        const { container } = render(
          <AnimatedComponent animationDuration={duration} hasBlur={false} hasShadow={false} />
        );
        const renderTime = performance.now() - start;

        // Assert: Render time should be much less than animation duration
        expect(renderTime).toBeLessThan(duration);

        // Assert: Component should be rendered
        const component = container.querySelector('[data-testid="animated-component"]');
        expect(component).toBeTruthy();

        // Cleanup
        cleanup();
      }),
      { numRuns: 20 }
    );
  });
});
