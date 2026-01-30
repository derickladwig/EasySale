/**
 * Deprecation Warnings for Old Patterns
 * 
 * Provides console warnings in development mode to help developers
 * identify and migrate away from deprecated patterns.
 */

const isDevelopment = import.meta.env.DEV;
const warnedPatterns = new Set<string>();

/**
 * Warn once about a deprecated pattern
 */
function warnOnce(key: string, message: string): void {
  if (!isDevelopment || warnedPatterns.has(key)) {
    return;
  }
  
  warnedPatterns.add(key);
  console.warn(`[Deprecation Warning] ${message}`);
}

/**
 * Check for deprecated CSS classes in the DOM
 */
export function checkDeprecatedClasses(): void {
  if (!isDevelopment) return;
  
  // Deprecated class patterns
  const deprecatedClasses = [
    { pattern: /\bcustom-button\b/, message: 'Use <Button> component instead of .custom-button class' },
    { pattern: /\bcustom-input\b/, message: 'Use <Input> component instead of .custom-input class' },
    { pattern: /\bcustom-card\b/, message: 'Use <Card> component instead of .custom-card class' },
    { pattern: /\bold-layout\b/, message: 'Use Stack/Inline/Grid components instead of .old-layout class' },
  ];
  
  // Check all elements
  const allElements = document.querySelectorAll('[class]');
  allElements.forEach((element) => {
    const className = element.className;
    if (typeof className !== 'string') return;
    
    deprecatedClasses.forEach(({ pattern, message }) => {
      if (pattern.test(className)) {
        warnOnce(`class-${pattern.source}`, message);
      }
    });
  });
}

/**
 * Check for hard-coded colors in inline styles
 */
export function checkHardcodedColors(): void {
  if (!isDevelopment) return;
  
  const colorPattern = /#[0-9a-fA-F]{3,6}|rgb\(|rgba\(/;
  
  const allElements = document.querySelectorAll('[style]');
  allElements.forEach((element) => {
    const style = element.getAttribute('style');
    if (!style) return;
    
    if (colorPattern.test(style)) {
      warnOnce(
        'hardcoded-colors',
        'Hard-coded colors detected in inline styles. Use design tokens instead (e.g., var(--color-text-primary))'
      );
    }
  });
}

/**
 * Check for deprecated component usage
 */
export function warnDeprecatedComponent(
  componentName: string,
  replacement: string
): void {
  warnOnce(
    `component-${componentName}`,
    `${componentName} is deprecated. Use ${replacement} instead.`
  );
}

/**
 * Check for deprecated prop usage
 */
export function warnDeprecatedProp(
  componentName: string,
  propName: string,
  replacement: string
): void {
  warnOnce(
    `prop-${componentName}-${propName}`,
    `${componentName}.${propName} is deprecated. Use ${replacement} instead.`
  );
}

/**
 * Initialize deprecation checks
 * Call this once when the app starts
 */
export function initDeprecationChecks(): void {
  if (!isDevelopment) return;
  
  // Run checks after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runChecks);
  } else {
    runChecks();
  }
  
  // Run checks periodically (every 5 seconds)
  setInterval(runChecks, 5000);
}

function runChecks(): void {
  checkDeprecatedClasses();
  checkHardcodedColors();
}

/**
 * Warn about deprecated CSS custom properties
 */
export function warnDeprecatedCSSVariable(
  oldVar: string,
  newVar: string
): void {
  warnOnce(
    `css-var-${oldVar}`,
    `CSS variable ${oldVar} is deprecated. Use ${newVar} instead.`
  );
}

/**
 * Check if element uses fixed positioning (not allowed outside AppShell)
 */
export function checkFixedPositioning(): void {
  if (!isDevelopment) return;
  
  const allElements = document.querySelectorAll('*');
  allElements.forEach((element) => {
    const style = window.getComputedStyle(element);
    
    if (style.position === 'fixed') {
      // Check if it's inside AppShell or a modal/toast
      const isAllowed =
        element.closest('[data-appshell]') ||
        element.closest('[role="dialog"]') ||
        element.closest('[data-toast]');
      
      if (!isAllowed) {
        warnOnce(
          'fixed-positioning',
          'Fixed positioning detected outside of AppShell/Modal/Toast. Use AppShell for layout instead.'
        );
      }
    }
  });
}

/**
 * Check for arbitrary z-index values
 */
export function checkArbitraryZIndex(): void {
  if (!isDevelopment) return;
  
  const allowedZIndexValues = [1, 800, 900, 1000, 2000, 3000];
  
  const allElements = document.querySelectorAll('*');
  allElements.forEach((element) => {
    const style = window.getComputedStyle(element);
    const zIndex = parseInt(style.zIndex, 10);
    
    if (!isNaN(zIndex) && !allowedZIndexValues.includes(zIndex)) {
      warnOnce(
        'arbitrary-z-index',
        `Arbitrary z-index value detected (${zIndex}). Use design token z-index values (--z-sidebar, --z-modal, etc.)`
      );
    }
  });
}

// Export all checks for manual use
export const deprecationChecks = {
  checkDeprecatedClasses,
  checkHardcodedColors,
  checkFixedPositioning,
  checkArbitraryZIndex,
};
