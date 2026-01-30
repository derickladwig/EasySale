/**
 * Themeable Login System - Property-Based Tests
 * Feature: themeable-login-system, Property 1: Configuration Loading and Validation
 *
 * Property: For any JSON configuration file, when the Theme_Provider loads it,
 * the configuration should either pass schema validation and be applied,
 * or fail validation and trigger fallback to the default Minimal Dark Split preset.
 *
 * Validates: Requirements 1.1, 1.2, 1.3
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { validateLoginThemeConfigSafe } from './schema';
import type { LoginThemeConfig } from './types';

// ============================================================================
// Arbitraries (Generators)
// ============================================================================

const layoutTemplateArb = fc.constantFrom(
  'splitHeroCompactForm',
  'leftStatusRightAuthCard',
  'leftStatusRightAuthCardPhoto'
);

const slotConfigArb = fc.record({
  enabled: fc.boolean(),
  components: fc.array(fc.string(), { minLength: 0, maxLength: 5 }),
});

const leftSlotConfigArb = fc.record({
  variant: fc.constantFrom('marketing', 'status'),
});

const mainSlotConfigArb = fc.record({
  variant: fc.constantFrom('compact', 'card'),
});

const responsiveConfigArb = fc.record({
  breakpoints: fc.record({
    mobile: fc.integer({ min: 320, max: 768 }),
    tablet: fc.integer({ min: 768, max: 1024 }),
    desktop: fc.integer({ min: 1024, max: 1920 }),
    kiosk: fc.integer({ min: 1920, max: 3840 }),
  }),
  stackOnMobile: fc.boolean(),
});

const layoutConfigArb = fc.record({
  template: layoutTemplateArb,
  slots: fc.record({
    header: slotConfigArb,
    left: leftSlotConfigArb,
    main: mainSlotConfigArb,
    footer: slotConfigArb,
  }),
  responsive: responsiveConfigArb,
});

// Helper to generate hex color strings
const hexColorArb = fc
  .tuple(
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 })
  )
  .map(
    ([r, g, b]) =>
      `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
  );

const colorTokensArb = fc.record({
  surface: fc.record({
    primary: hexColorArb,
    secondary: hexColorArb,
    tertiary: hexColorArb,
  }),
  text: fc.record({
    primary: hexColorArb,
    secondary: hexColorArb,
    tertiary: hexColorArb,
    inverse: hexColorArb,
  }),
  border: fc.record({
    default: hexColorArb,
    focus: hexColorArb,
    error: hexColorArb,
  }),
  accent: fc.record({
    primary: hexColorArb,
    hover: hexColorArb,
    active: hexColorArb,
  }),
  status: fc.record({
    success: hexColorArb,
    warning: hexColorArb,
    error: hexColorArb,
    info: hexColorArb,
  }),
});

const typographyTokensArb = fc.record({
  fontFamily: fc.record({
    primary: fc.constantFrom('Inter, sans-serif', 'Roboto, sans-serif', 'Arial, sans-serif'),
    monospace: fc.constantFrom('Fira Code, monospace', 'Courier New, monospace'),
  }),
  fontSize: fc.record({
    xs: fc.constantFrom('0.75rem', '0.8rem'),
    sm: fc.constantFrom('0.875rem', '0.9rem'),
    base: fc.constantFrom('1rem', '1.1rem'),
    lg: fc.constantFrom('1.125rem', '1.2rem'),
    xl: fc.constantFrom('1.25rem', '1.3rem'),
    xxl: fc.constantFrom('1.5rem', '1.6rem'),
  }),
  fontWeight: fc.record({
    normal: fc.constantFrom(400),
    medium: fc.constantFrom(500),
    semibold: fc.constantFrom(600),
    bold: fc.constantFrom(700),
  }),
  lineHeight: fc.record({
    tight: fc.constantFrom(1.25, 1.3),
    normal: fc.constantFrom(1.5, 1.6),
    relaxed: fc.constantFrom(1.75, 1.8),
  }),
});

const spacingTokensArb = fc.record({
  scale: fc.record({
    xs: fc.constantFrom('0.25rem', '0.3rem'),
    sm: fc.constantFrom('0.5rem', '0.6rem'),
    md: fc.constantFrom('1rem', '1.1rem'),
    lg: fc.constantFrom('1.5rem', '1.6rem'),
    xl: fc.constantFrom('2rem', '2.2rem'),
    xxl: fc.constantFrom('3rem', '3.2rem'),
  }),
  density: fc.constantFrom('compact', 'comfortable', 'spacious'),
});

const shadowTokensArb = fc.record({
  elevation: fc.record({
    none: fc.constant('none'),
    sm: fc.constant('0 1px 2px rgba(0, 0, 0, 0.05)'),
    md: fc.constant('0 4px 6px rgba(0, 0, 0, 0.1)'),
    lg: fc.constant('0 10px 15px rgba(0, 0, 0, 0.1)'),
    xl: fc.constant('0 20px 25px rgba(0, 0, 0, 0.15)'),
  }),
});

const blurTokensArb = fc.record({
  backdrop: fc.record({
    none: fc.constant('none'),
    sm: fc.constant('blur(4px)'),
    md: fc.constant('blur(12px)'),
    lg: fc.constant('blur(16px)'),
  }),
  enabled: fc.boolean(),
});

const radiusTokensArb = fc.record({
  card: fc.constantFrom('4px', '8px', '12px', '16px'),
  input: fc.constantFrom('2px', '4px', '6px', '8px'),
  button: fc.constantFrom('2px', '4px', '6px', '8px'),
  pill: fc.constant('9999px'),
});

const tokenConfigArb = fc.record({
  colors: colorTokensArb,
  typography: typographyTokensArb,
  spacing: spacingTokensArb,
  shadows: shadowTokensArb,
  blur: blurTokensArb,
  radius: radiusTokensArb,
});

const authMethodArb = fc.constantFrom('pin', 'password', 'badge');

const authCardConfigArb = fc.record({
  methods: fc.array(authMethodArb, { minLength: 1, maxLength: 3 }),
  showStorePicker: fc.boolean(),
  showStationPicker: fc.boolean(),
  showDeviceIdentity: fc.boolean(),
  showDemoAccounts: fc.boolean(),
  glassmorphism: fc.boolean(),
  elevation: fc.constantFrom('none', 'sm', 'md', 'lg'),
});

const statusCardConfigArb = fc.record({
  variant: fc.constantFrom('systemForward', 'locationForward'),
  showDatabaseStatus: fc.boolean(),
  showSyncStatus: fc.boolean(),
  showLastSync: fc.boolean(),
  showStoreInfo: fc.boolean(),
  showStationInfo: fc.boolean(),
});

const headerConfigArb = fc.record({
  showLogo: fc.boolean(),
  showEnvironmentSelector: fc.boolean(),
  showHelpMenu: fc.boolean(),
  logoUrl: fc.option(fc.webUrl(), { nil: undefined }),
  companyName: fc.string({ minLength: 1, maxLength: 50 }),
});

const footerConfigArb = fc.record({
  showVersion: fc.boolean(),
  showBuild: fc.boolean(),
  showCopyright: fc.boolean(),
  copyrightText: fc.string({ minLength: 1, maxLength: 100 }),
});

const errorCalloutConfigArb = fc.record({
  presentation: fc.constantFrom('inline', 'callout'),
  showRetryAction: fc.boolean(),
  showDiagnosticsAction: fc.boolean(),
});

const componentConfigArb = fc.record({
  authCard: authCardConfigArb,
  statusCard: statusCardConfigArb,
  header: headerConfigArb,
  footer: footerConfigArb,
  errorCallout: errorCalloutConfigArb,
});

const colorStopArb = fc.record({
  color: hexColorArb,
  position: fc.integer({ min: 0, max: 100 }),
});

const backgroundConfigArb = fc.oneof(
  fc.record({
    type: fc.constant('solid' as const),
    solid: fc.record({
      color: hexColorArb,
    }),
  }),
  fc.record({
    type: fc.constant('gradient' as const),
    gradient: fc.record({
      stops: fc.array(colorStopArb, { minLength: 2, maxLength: 5 }),
    }),
  }),
  fc.record({
    type: fc.constant('waves' as const),
    waves: fc.record({
      baseColor: hexColorArb,
      waveColor: hexColorArb,
      intensity: fc.double({ min: 0, max: 1, noDefaultInfinity: true }),
      showDotGrid: fc.boolean(),
      dotGridOpacity: fc.double({ min: 0, max: 1, noDefaultInfinity: true }),
    }),
  }),
  fc.record({
    type: fc.constant('photo' as const),
    photo: fc.record({
      url: fc.webUrl(),
      lowResUrl: fc.option(fc.webUrl(), { nil: undefined }),
      placeholderColor: hexColorArb,
      blur: fc.integer({ min: 0, max: 20 }),
      overlay: fc.record({
        enabled: fc.boolean(),
        color: hexColorArb,
        opacity: fc.double({ min: 0, max: 1, noDefaultInfinity: true }),
      }),
    }),
  })
);

const validLoginThemeConfigArb: fc.Arbitrary<LoginThemeConfig> = fc.record({
  name: fc.string({ minLength: 1, maxLength: 50 }),
  version: fc
    .tuple(
      fc.integer({ min: 0, max: 99 }),
      fc.integer({ min: 0, max: 99 }),
      fc.integer({ min: 0, max: 99 })
    )
    .map(([major, minor, patch]) => `${major}.${minor}.${patch}`),
  layout: layoutConfigArb,
  tokens: tokenConfigArb,
  components: componentConfigArb,
  background: backgroundConfigArb,
});

// ============================================================================
// Property Tests
// ============================================================================

describe('Property 1: Configuration Loading and Validation', () => {
  it('should validate any valid configuration', () => {
    fc.assert(
      fc.property(validLoginThemeConfigArb, (config) => {
        const result = validateLoginThemeConfigSafe(config);
        expect(result.success).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('should reject any configuration with invalid version format', () => {
    fc.assert(
      fc.property(
        validLoginThemeConfigArb,
        fc.string().filter((s) => !/^\d+\.\d+\.\d+$/.test(s)),
        (config, invalidVersion) => {
          const invalidConfig = { ...config, version: invalidVersion };
          const result = validateLoginThemeConfigSafe(invalidConfig);
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject any configuration with empty name', () => {
    fc.assert(
      fc.property(validLoginThemeConfigArb, (config) => {
        const invalidConfig = { ...config, name: '' };
        const result = validateLoginThemeConfigSafe(invalidConfig);
        expect(result.success).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it('should reject any configuration with invalid template', () => {
    fc.assert(
      fc.property(
        validLoginThemeConfigArb,
        fc
          .string()
          .filter(
            (s) =>
              ![
                'splitHeroCompactForm',
                'leftStatusRightAuthCard',
                'leftStatusRightAuthCardPhoto',
              ].includes(s)
          ),
        (config, invalidTemplate) => {
          const invalidConfig = {
            ...config,
            layout: { ...config.layout, template: invalidTemplate as any },
          };
          const result = validateLoginThemeConfigSafe(invalidConfig);
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject any configuration with negative breakpoint values', () => {
    fc.assert(
      fc.property(
        validLoginThemeConfigArb,
        fc.integer({ min: -1000, max: -1 }),
        (config, negativeValue) => {
          const invalidConfig = {
            ...config,
            layout: {
              ...config.layout,
              responsive: {
                ...config.layout.responsive,
                breakpoints: {
                  ...config.layout.responsive.breakpoints,
                  mobile: negativeValue,
                },
              },
            },
          };
          const result = validateLoginThemeConfigSafe(invalidConfig);
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject any configuration with invalid font weight', () => {
    fc.assert(
      fc.property(
        validLoginThemeConfigArb,
        fc.integer().filter((n) => n < 100 || n > 900),
        (config, invalidWeight) => {
          const invalidConfig = {
            ...config,
            tokens: {
              ...config.tokens,
              typography: {
                ...config.tokens.typography,
                fontWeight: {
                  ...config.tokens.typography.fontWeight,
                  normal: invalidWeight,
                },
              },
            },
          };
          const result = validateLoginThemeConfigSafe(invalidConfig);
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject any gradient configuration with less than 2 stops', () => {
    fc.assert(
      fc.property(validLoginThemeConfigArb, (config) => {
        const invalidConfig = {
          ...config,
          background: {
            type: 'gradient' as const,
            gradient: {
              stops: [{ color: '#000000', position: 0 }],
            },
          },
        };
        const result = validateLoginThemeConfigSafe(invalidConfig);
        expect(result.success).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it('should reject any gradient with stop positions outside 0-100 range', () => {
    fc.assert(
      fc.property(
        validLoginThemeConfigArb,
        fc.integer().filter((n) => n < 0 || n > 100),
        (config, invalidPosition) => {
          const invalidConfig = {
            ...config,
            background: {
              type: 'gradient' as const,
              gradient: {
                stops: [
                  { color: '#000000', position: 0 },
                  { color: '#ffffff', position: invalidPosition },
                ],
              },
            },
          };
          const result = validateLoginThemeConfigSafe(invalidConfig);
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject any waves configuration with intensity outside 0-1 range', () => {
    fc.assert(
      fc.property(
        validLoginThemeConfigArb,
        fc.double().filter((n) => n < 0 || n > 1),
        (config, invalidIntensity) => {
          const invalidConfig = {
            ...config,
            background: {
              type: 'waves' as const,
              waves: {
                baseColor: '#000000',
                waveColor: '#ffffff',
                intensity: invalidIntensity,
                showDotGrid: true,
                dotGridOpacity: 0.5,
              },
            },
          };
          const result = validateLoginThemeConfigSafe(invalidConfig);
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject any photo configuration with negative blur', () => {
    fc.assert(
      fc.property(
        validLoginThemeConfigArb,
        fc.integer({ min: -100, max: -1 }),
        (config, negativeBlur) => {
          const invalidConfig = {
            ...config,
            background: {
              type: 'photo' as const,
              photo: {
                url: 'https://example.com/bg.jpg',
                placeholderColor: '#000000',
                blur: negativeBlur,
                overlay: {
                  enabled: true,
                  color: '#000000',
                  opacity: 0.5,
                },
              },
            },
          };
          const result = validateLoginThemeConfigSafe(invalidConfig);
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject any photo configuration with overlay opacity outside 0-1 range', () => {
    fc.assert(
      fc.property(
        validLoginThemeConfigArb,
        fc.double().filter((n) => n < 0 || n > 1),
        (config, invalidOpacity) => {
          const invalidConfig = {
            ...config,
            background: {
              type: 'photo' as const,
              photo: {
                url: 'https://example.com/bg.jpg',
                placeholderColor: '#000000',
                blur: 4,
                overlay: {
                  enabled: true,
                  color: '#000000',
                  opacity: invalidOpacity,
                },
              },
            },
          };
          const result = validateLoginThemeConfigSafe(invalidConfig);
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle any arbitrary JSON input gracefully', () => {
    fc.assert(
      fc.property(fc.anything(), (input) => {
        const result = validateLoginThemeConfigSafe(input);
        // Should either succeed or fail gracefully without throwing
        expect(typeof result.success).toBe('boolean');
      }),
      { numRuns: 100 }
    );
  });
});
