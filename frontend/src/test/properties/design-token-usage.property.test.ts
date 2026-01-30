/**
 * Property-Based Test: Design Token Usage
 *
 * Feature: navigation-consolidation
 * Property 5: Design Token Usage
 *
 * **Validates: Requirements 5.1, 5.2, 5.3**
 *
 * For any navigation styling property (background, text, border, spacing),
 * the value SHALL reference a design token variable, not a hardcoded color
 * or pixel value.
 *
 * This test ensures:
 * - Navigation styles use design tokens for colors (no hardcoded hex/rgb)
 * - Navigation styles use design tokens for spacing (no hardcoded px values)
 * - Navigation styles use design tokens for typography (no hardcoded font sizes)
 * - Navigation styles use design tokens for borders and radii
 * - Navigation styles use design tokens for transitions and durations
 *
 * Framework: Vitest with fast-check
 * Minimum iterations: 100 per property
 */

import * as fc from 'fast-check';
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ============================================================================
// Constants and Configuration
// ============================================================================

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test file is at: frontend/src/test/properties/design-token-usage.property.test.ts
// __dirname resolves to: frontend/src/test/properties
// ../../.. goes up to: frontend/
const FRONTEND_ROOT = path.resolve(__dirname, '../../..');

// Navigation CSS files to check (relative to frontend root)
// Note: AppLayout uses inline styles/Tailwind, so we only check Navigation.module.css
const NAVIGATION_CSS_FILES = [
  'src/common/components/Navigation.module.css',
];

// Design token patterns that are allowed
const DESIGN_TOKEN_PATTERNS = {
  color: /var\(--(?:color|theme)-[a-z-]+\)/,
  spacing: /var\(--space-\d+\)/,
  fontSize: /var\(--font-size-[a-z0-9]+\)/,
  fontWeight: /var\(--font-weight-[a-z]+\)/,
  lineHeight: /var\(--line-height-[a-z]+\)/,
  borderWidth: /var\(--border-\d+\)/,
  borderRadius: /var\(--radius-[a-z]+\)/,
  duration: /var\(--duration-\d+\)/,
  iconSize: /var\(--icon-size-[a-z]+\)/,
  ring: /var\(--ring-\d+\)/,
  focusOffset: /var\(--focus-offset\)/,
};

// Hardcoded value patterns that should NOT be used
const HARDCODED_PATTERNS = {
  hexColor: /#[0-9a-fA-F]{3,8}\b/,
  rgbColor: /rgba?\([^)]+\)/,
  hslColor: /hsla?\([^)]+\)/,
  pixelValue: /\b\d+px\b/,
  remValue: /\b\d+\.?\d*rem\b/,
  percentValue: /\b\d+%\b/,
};

// Exceptions: Values that are allowed to be hardcoded
const ALLOWED_HARDCODED_VALUES = [
  '0',           // Zero is always fine
  '0px',         // Zero with unit
  '100%',        // Full width/height
  'transparent', // Transparent color
  'inherit',     // Inherited values
  'auto',        // Auto values
  'none',        // None values
];

// CSS properties that should use design tokens
const TOKEN_REQUIRED_PROPERTIES = {
  color: ['color', 'background', 'background-color', 'border-color', 'border-left-color', 
          'border-right-color', 'border-top-color', 'border-bottom-color', 'outline-color'],
  spacing: ['padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
            'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
            'gap', 'row-gap', 'column-gap', 'top', 'right', 'bottom', 'left'],
  typography: ['font-size', 'font-weight', 'line-height'],
  border: ['border-width', 'border-left-width', 'border-right-width', 
           'border-top-width', 'border-bottom-width'],
  borderRadius: ['border-radius', 'border-top-left-radius', 'border-top-right-radius',
                 'border-bottom-left-radius', 'border-bottom-right-radius'],
  duration: ['transition-duration', 'animation-duration'],
  size: ['width', 'height', 'min-width', 'min-height', 'max-width', 'max-height'],
};

// ============================================================================
// Helper Functions
// ============================================================================

interface CSSRule {
  selector: string;
  property: string;
  value: string;
  lineNumber: number;
}

/**
 * Parse CSS file and extract all rules
 */
function parseCSSFile(filePath: string): CSSRule[] {
  const fullPath = path.join(FRONTEND_ROOT, filePath);
  
  if (!fs.existsSync(fullPath)) {
    return [];
  }

  const content = fs.readFileSync(fullPath, 'utf-8');
  const lines = content.split('\n');
  const rules: CSSRule[] = [];
  
  let currentSelector = '';
  let inRule = false;
  let braceDepth = 0;

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    
    // Skip comments and empty lines
    if (trimmed.startsWith('/*') || trimmed.startsWith('*') || trimmed === '') {
      return;
    }

    // Track selector
    if (trimmed.includes('{')) {
      braceDepth++;
      if (braceDepth === 1) {
        currentSelector = trimmed.split('{')[0].trim();
        inRule = true;
      }
    }

    // Track closing braces
    if (trimmed.includes('}')) {
      braceDepth--;
      if (braceDepth === 0) {
        inRule = false;
        currentSelector = '';
      }
    }

    // Parse property: value pairs
    if (inRule && trimmed.includes(':') && !trimmed.includes('{')) {
      const colonIndex = trimmed.indexOf(':');
      const property = trimmed.substring(0, colonIndex).trim();
      let value = trimmed.substring(colonIndex + 1).trim();
      
      // Remove trailing semicolon
      if (value.endsWith(';')) {
        value = value.slice(0, -1).trim();
      }

      rules.push({
        selector: currentSelector,
        property,
        value,
        lineNumber: index + 1,
      });
    }
  });

  return rules;
}

/**
 * Check if a value is an allowed hardcoded value
 */
function isAllowedHardcodedValue(value: string): boolean {
  return ALLOWED_HARDCODED_VALUES.some(allowed => value === allowed);
}

/**
 * Check if a value uses a design token
 */
function usesDesignToken(value: string): boolean {
  return value.includes('var(--');
}

/**
 * Check if a value contains hardcoded colors
 */
function containsHardcodedColor(value: string): boolean {
  if (isAllowedHardcodedValue(value)) return false;
  
  // Trim the value to handle whitespace
  const trimmedValue = value.trim();
  
  // Check for valid hex colors (not just # followed by spaces)
  const hexMatch = trimmedValue.match(/#[0-9a-fA-F]{3,8}\b/);
  if (hexMatch) return true;
  
  // Check for rgb/rgba colors
  if (HARDCODED_PATTERNS.rgbColor.test(trimmedValue)) return true;
  
  // Check for hsl/hsla colors
  if (HARDCODED_PATTERNS.hslColor.test(trimmedValue)) return true;
  
  return false;
}

/**
 * Check if a value contains hardcoded spacing/sizing
 */
function containsHardcodedSpacing(value: string): boolean {
  if (isAllowedHardcodedValue(value)) return false;
  
  // Check for pixel values that aren't in var()
  const pixelMatches = value.match(/\b\d+px\b/g);
  if (!pixelMatches) return false;
  
  // Allow if it's inside a var() call
  return pixelMatches.some(match => {
    const index = value.indexOf(match);
    const before = value.substring(0, index);
    const openParens = (before.match(/var\(/g) || []).length;
    const closeParens = (before.match(/\)/g) || []).length;
    return openParens === closeParens; // Not inside var()
  });
}

/**
 * Get the category of a CSS property
 */
function getPropertyCategory(property: string): keyof typeof TOKEN_REQUIRED_PROPERTIES | null {
  for (const [category, properties] of Object.entries(TOKEN_REQUIRED_PROPERTIES)) {
    if (properties.includes(property)) {
      return category as keyof typeof TOKEN_REQUIRED_PROPERTIES;
    }
  }
  return null;
}

/**
 * Check if a property value should use design tokens
 */
function shouldUseDesignToken(property: string, value: string): boolean {
  const category = getPropertyCategory(property);
  if (!category) return false;
  
  // If value is allowed hardcoded, it's fine
  if (isAllowedHardcodedValue(value)) return false;
  
  return true;
}

/**
 * Validate that a rule uses design tokens appropriately
 */
function validateRule(rule: CSSRule): { valid: boolean; reason?: string } {
  const { property, value } = rule;
  
  // Check if this property should use design tokens
  if (!shouldUseDesignToken(property, value)) {
    return { valid: true };
  }

  // Check for hardcoded colors
  if (TOKEN_REQUIRED_PROPERTIES.color.includes(property)) {
    if (containsHardcodedColor(value)) {
      return {
        valid: false,
        reason: `Hardcoded color value "${value}" should use design token (e.g., var(--color-accent))`,
      };
    }
  }

  // Check for hardcoded spacing
  if (TOKEN_REQUIRED_PROPERTIES.spacing.includes(property)) {
    if (containsHardcodedSpacing(value)) {
      return {
        valid: false,
        reason: `Hardcoded spacing value "${value}" should use design token (e.g., var(--space-4))`,
      };
    }
  }

  // Check for hardcoded typography
  if (TOKEN_REQUIRED_PROPERTIES.typography.includes(property)) {
    if (property === 'font-size' && HARDCODED_PATTERNS.remValue.test(value) && !usesDesignToken(value)) {
      return {
        valid: false,
        reason: `Hardcoded font-size "${value}" should use design token (e.g., var(--font-size-base))`,
      };
    }
    if (property === 'font-weight' && /^\d+$/.test(value) && !usesDesignToken(value)) {
      return {
        valid: false,
        reason: `Hardcoded font-weight "${value}" should use design token (e.g., var(--font-weight-medium))`,
      };
    }
  }

  // Check for hardcoded border radius
  if (TOKEN_REQUIRED_PROPERTIES.borderRadius.includes(property)) {
    if (containsHardcodedSpacing(value)) {
      return {
        valid: false,
        reason: `Hardcoded border-radius "${value}" should use design token (e.g., var(--radius-md))`,
      };
    }
  }

  // Check for hardcoded durations
  if (TOKEN_REQUIRED_PROPERTIES.duration.includes(property)) {
    if (/\d+m?s/.test(value) && !usesDesignToken(value) && !isAllowedHardcodedValue(value)) {
      return {
        valid: false,
        reason: `Hardcoded duration "${value}" should use design token (e.g., var(--duration-1))`,
      };
    }
  }

  return { valid: true };
}

/**
 * Scan all navigation CSS files for design token usage
 */
function scanNavigationCSS(): {
  totalRules: number;
  violations: Array<CSSRule & { reason: string; file: string }>;
} {
  const violations: Array<CSSRule & { reason: string; file: string }> = [];
  let totalRules = 0;

  for (const cssFile of NAVIGATION_CSS_FILES) {
    const rules = parseCSSFile(cssFile);
    totalRules += rules.length;

    for (const rule of rules) {
      const validation = validateRule(rule);
      if (!validation.valid && validation.reason) {
        violations.push({
          ...rule,
          reason: validation.reason,
          file: cssFile,
        });
      }
    }
  }

  return { totalRules, violations };
}

// ============================================================================
// Property Tests
// ============================================================================

describe('Feature: navigation-consolidation, Property 5: Design Token Usage', () => {
  describe('Core Property: Navigation styles use design tokens', () => {
    it('should have zero hardcoded color values in navigation CSS', () => {
      const { violations } = scanNavigationCSS();
      
      const colorViolations = violations.filter(v => 
        TOKEN_REQUIRED_PROPERTIES.color.includes(v.property)
      );

      if (colorViolations.length > 0) {
        const details = colorViolations.map(v => 
          `  ${v.file}:${v.lineNumber} - ${v.selector} { ${v.property}: ${v.value}; }\n    → ${v.reason}`
        ).join('\n');
        
        expect.fail(
          `Found ${colorViolations.length} hardcoded color value(s) in navigation CSS:\n${details}`
        );
      }

      expect(colorViolations).toHaveLength(0);
    });

    it('should have zero hardcoded spacing values in navigation CSS', () => {
      const { violations } = scanNavigationCSS();
      
      const spacingViolations = violations.filter(v => 
        TOKEN_REQUIRED_PROPERTIES.spacing.includes(v.property)
      );

      if (spacingViolations.length > 0) {
        const details = spacingViolations.map(v => 
          `  ${v.file}:${v.lineNumber} - ${v.selector} { ${v.property}: ${v.value}; }\n    → ${v.reason}`
        ).join('\n');
        
        expect.fail(
          `Found ${spacingViolations.length} hardcoded spacing value(s) in navigation CSS:\n${details}`
        );
      }

      expect(spacingViolations).toHaveLength(0);
    });

    it('should have zero hardcoded typography values in navigation CSS', () => {
      const { violations } = scanNavigationCSS();
      
      const typographyViolations = violations.filter(v => 
        TOKEN_REQUIRED_PROPERTIES.typography.includes(v.property)
      );

      if (typographyViolations.length > 0) {
        const details = typographyViolations.map(v => 
          `  ${v.file}:${v.lineNumber} - ${v.selector} { ${v.property}: ${v.value}; }\n    → ${v.reason}`
        ).join('\n');
        
        expect.fail(
          `Found ${typographyViolations.length} hardcoded typography value(s) in navigation CSS:\n${details}`
        );
      }

      expect(typographyViolations).toHaveLength(0);
    });

    it('should have zero hardcoded border/radius values in navigation CSS', () => {
      const { violations } = scanNavigationCSS();
      
      const borderViolations = violations.filter(v => 
        [...TOKEN_REQUIRED_PROPERTIES.border, ...TOKEN_REQUIRED_PROPERTIES.borderRadius].includes(v.property)
      );

      if (borderViolations.length > 0) {
        const details = borderViolations.map(v => 
          `  ${v.file}:${v.lineNumber} - ${v.selector} { ${v.property}: ${v.value}; }\n    → ${v.reason}`
        ).join('\n');
        
        expect.fail(
          `Found ${borderViolations.length} hardcoded border/radius value(s) in navigation CSS:\n${details}`
        );
      }

      expect(borderViolations).toHaveLength(0);
    });

    it('should have zero hardcoded duration values in navigation CSS', () => {
      const { violations } = scanNavigationCSS();
      
      const durationViolations = violations.filter(v => 
        TOKEN_REQUIRED_PROPERTIES.duration.includes(v.property)
      );

      if (durationViolations.length > 0) {
        const details = durationViolations.map(v => 
          `  ${v.file}:${v.lineNumber} - ${v.selector} { ${v.property}: ${v.value}; }\n    → ${v.reason}`
        ).join('\n');
        
        expect.fail(
          `Found ${durationViolations.length} hardcoded duration value(s) in navigation CSS:\n${details}`
        );
      }

      expect(durationViolations).toHaveLength(0);
    });
  });

  describe('Property-based validation: Token usage patterns', () => {
    // Arbitrary for generating CSS property names
    const cssPropertyArbitrary = fc.constantFrom(
      ...Object.values(TOKEN_REQUIRED_PROPERTIES).flat()
    );

    // Arbitrary for generating design token values
    const designTokenValueArbitrary = fc.oneof(
      fc.constantFrom(
        'var(--color-accent)',
        'var(--color-text-primary)',
        'var(--color-bg-primary)',
        'var(--space-4)',
        'var(--font-size-base)',
        'var(--radius-md)',
        'var(--duration-1)'
      ),
      fc.constantFrom(...ALLOWED_HARDCODED_VALUES)
    );

    // Arbitrary for generating hardcoded values (violations)
    const hardcodedValueArbitrary = fc.oneof(
      // Valid hex colors only (3 or 6 hex digits)
      fc.array(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'), { minLength: 6, maxLength: 6 })
        .map(arr => `#${arr.join('')}`),
      fc.array(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'), { minLength: 3, maxLength: 3 })
        .map(arr => `#${arr.join('')}`),
      fc.tuple(fc.integer({ min: 0, max: 255 }), fc.integer({ min: 0, max: 255 }), fc.integer({ min: 0, max: 255 }))
        .map(([r, g, b]) => `rgb(${r}, ${g}, ${b})`),
      fc.integer({ min: 1, max: 64 }).map(n => `${n}px`),
      fc.double({ min: 0.5, max: 3, noDefaultInfinity: true }).map(n => `${n.toFixed(2)}rem`)
    );

    it('should accept valid design token values', () => {
      fc.assert(
        fc.property(
          cssPropertyArbitrary,
          designTokenValueArbitrary,
          (property, value) => {
            const rule: CSSRule = {
              selector: '.test',
              property,
              value,
              lineNumber: 1,
            };

            const validation = validateRule(rule);

            // Property: Valid token values should pass validation
            expect(validation.valid).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject hardcoded color values for color properties', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...TOKEN_REQUIRED_PROPERTIES.color),
          hardcodedValueArbitrary.filter(v => 
            v.startsWith('#') || v.startsWith('rgb')
          ),
          (property, value) => {
            const rule: CSSRule = {
              selector: '.test',
              property,
              value,
              lineNumber: 1,
            };

            const validation = validateRule(rule);

            // Property: Hardcoded colors should fail validation
            expect(validation.valid).toBe(false);
            expect(validation.reason).toBeDefined();
            expect(validation.reason).toContain('design token');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject hardcoded spacing values for spacing properties', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...TOKEN_REQUIRED_PROPERTIES.spacing),
          hardcodedValueArbitrary.filter(v => 
            v.endsWith('px') && v !== '0px'
          ),
          (property, value) => {
            const rule: CSSRule = {
              selector: '.test',
              property,
              value,
              lineNumber: 1,
            };

            const validation = validateRule(rule);

            // Property: Hardcoded spacing should fail validation
            expect(validation.valid).toBe(false);
            expect(validation.reason).toBeDefined();
            expect(validation.reason).toContain('design token');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain consistency across multiple validations', () => {
      fc.assert(
        fc.property(
          cssPropertyArbitrary,
          fc.oneof(designTokenValueArbitrary, hardcodedValueArbitrary),
          (property, value) => {
            const rule: CSSRule = {
              selector: '.test',
              property,
              value,
              lineNumber: 1,
            };

            const validation1 = validateRule(rule);
            const validation2 = validateRule(rule);
            const validation3 = validateRule(rule);

            // Property: Validation should be deterministic
            expect(validation1.valid).toBe(validation2.valid);
            expect(validation2.valid).toBe(validation3.valid);
            expect(validation1.reason).toBe(validation2.reason);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Integration: Real navigation CSS files', () => {
    it('should have navigation CSS files present', () => {
      const existingFiles = NAVIGATION_CSS_FILES.filter(file => {
        const fullPath = path.join(FRONTEND_ROOT, file);
        return fs.existsSync(fullPath);
      });

      expect(existingFiles.length).toBeGreaterThan(0);
    });

    it('should have parseable CSS in navigation files', () => {
      for (const cssFile of NAVIGATION_CSS_FILES) {
        const fullPath = path.join(FRONTEND_ROOT, cssFile);
        
        if (!fs.existsSync(fullPath)) {
          continue;
        }

        const rules = parseCSSFile(cssFile);
        
        // Should have at least some rules
        expect(rules.length).toBeGreaterThan(0);
        
        // Each rule should have required fields
        rules.forEach(rule => {
          expect(rule.selector).toBeDefined();
          expect(rule.property).toBeDefined();
          expect(rule.value).toBeDefined();
          expect(rule.lineNumber).toBeGreaterThan(0);
        });
      }
    });

    it('should report comprehensive scan results', () => {
      const { totalRules, violations } = scanNavigationCSS();

      // Log summary for visibility
      console.log(`\n📊 Design Token Usage Scan Results:`);
      console.log(`   Total CSS rules scanned: ${totalRules}`);
      console.log(`   Violations found: ${violations.length}`);
      
      if (violations.length > 0) {
        console.log(`\n❌ Violations by category:`);
        const byCategory = violations.reduce((acc, v) => {
          const category = getPropertyCategory(v.property) || 'other';
          acc[category] = (acc[category] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        Object.entries(byCategory).forEach(([category, count]) => {
          console.log(`   ${category}: ${count}`);
        });
      } else {
        console.log(`   ✅ All navigation styles use design tokens correctly!`);
      }

      // Property: Should have zero violations
      expect(violations).toHaveLength(0);
    });
  });
});
