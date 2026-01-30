/**
 * Animation Utilities
 *
 * Provides reusable animation helpers with reduced motion support
 */

/**
 * Animation duration tokens (in milliseconds)
 */
export const animationDurations = {
  instant: 0,
  fast: 150,
  normal: 300,
  slow: 500,
  slower: 700,
} as const;

/**
 * Easing function tokens
 */
export const easingFunctions = {
  linear: 'linear',
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  spring: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
} as const;

/**
 * Check if user prefers reduced motion
 */
export const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * Get animation duration respecting user preferences
 */
export const getAnimationDuration = (
  duration: keyof typeof animationDurations | number
): number => {
  if (prefersReducedMotion()) return 0;

  if (typeof duration === 'number') return duration;
  return animationDurations[duration];
};

/**
 * Get transition CSS string
 */
export const getTransition = (
  property: string | string[],
  duration: keyof typeof animationDurations | number = 'normal',
  easing: keyof typeof easingFunctions = 'easeInOut'
): string => {
  const durationMs = getAnimationDuration(duration);
  const easingFn = easingFunctions[easing];
  const properties = Array.isArray(property) ? property : [property];

  return properties.map((prop) => `${prop} ${durationMs}ms ${easingFn}`).join(', ');
};

/**
 * Slide-in animation classes
 */
export const slideInClasses = {
  fromTop: 'animate-slide-in-from-top',
  fromBottom: 'animate-slide-in-from-bottom',
  fromLeft: 'animate-slide-in-from-left',
  fromRight: 'animate-slide-in-from-right',
} as const;

/**
 * Fade-in animation classes
 */
export const fadeInClasses = {
  default: 'animate-fade-in',
  fast: 'animate-fade-in-fast',
  slow: 'animate-fade-in-slow',
} as const;

/**
 * Scale animation classes
 */
export const scaleClasses = {
  in: 'animate-scale-in',
  out: 'animate-scale-out',
  bounce: 'animate-scale-bounce',
} as const;

/**
 * Spin animation classes
 */
export const spinClasses = {
  default: 'animate-spin',
  slow: 'animate-spin-slow',
  fast: 'animate-spin-fast',
} as const;

/**
 * Pulse animation classes
 */
export const pulseClasses = {
  default: 'animate-pulse',
  slow: 'animate-pulse-slow',
  fast: 'animate-pulse-fast',
} as const;

/**
 * Create keyframe animation
 */
export const createKeyframeAnimation = (
  name: string,
  keyframes: Record<string, React.CSSProperties>
): string => {
  const keyframeString = Object.entries(keyframes)
    .map(([key, styles]) => {
      const styleString = Object.entries(styles)
        .map(([prop, value]) => {
          const cssProp = prop.replace(/([A-Z])/g, '-$1').toLowerCase();
          return `${cssProp}: ${value};`;
        })
        .join(' ');
      return `${key} { ${styleString} }`;
    })
    .join(' ');

  return `@keyframes ${name} { ${keyframeString} }`;
};

/**
 * Animation hook for React components
 */
export const useAnimation = (
  enabled: boolean = true
): {
  shouldAnimate: boolean;
  duration: number;
  getTransition: typeof getTransition;
} => {
  const shouldAnimate = enabled && !prefersReducedMotion();

  return {
    shouldAnimate,
    duration: shouldAnimate ? animationDurations.normal : 0,
    getTransition: (property, duration, easing) =>
      shouldAnimate ? getTransition(property, duration, easing) : 'none',
  };
};

/**
 * Delay execution respecting reduced motion
 */
export const animationDelay = (
  callback: () => void,
  duration: keyof typeof animationDurations | number = 'normal'
): ReturnType<typeof setTimeout> => {
  const durationMs = getAnimationDuration(duration);
  return setTimeout(callback, durationMs);
};

/**
 * Wait for animation to complete
 */
export const waitForAnimation = (
  duration: keyof typeof animationDurations | number = 'normal'
): Promise<void> => {
  const durationMs = getAnimationDuration(duration);
  return new Promise((resolve) => setTimeout(resolve, durationMs));
};
