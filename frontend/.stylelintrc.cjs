/**
 * Stylelint Configuration for EasySale Design System
 * 
 * Enforces CSS ownership rules:
 * 1. Only tokens.css and themes.css may define raw colors
 * 2. Only AppShell, Modal, and Toast may use position: fixed
 * 3. Only tokens may define z-index values
 */

module.exports = {
  extends: [
    'stylelint-config-standard',
    'stylelint-config-css-modules',
  ],
  
  rules: {
    // ============================================
    // COLOR OWNERSHIP RULES
    // ============================================
    
    // Disallow hex colors everywhere except tokens.css and themes.css
    'color-no-hex': true,
    
    // Disallow rgb(), rgba(), hsl(), hsla() functions
    'function-disallowed-list': ['rgb', 'rgba', 'hsl', 'hsla'],
    
    // Require CSS variables for color-related properties and z-index tokens
    'declaration-property-value-allowed-list': {
      '/^(color|background|background-color|border|border-color|border-top-color|border-right-color|border-bottom-color|border-left-color|outline|outline-color|box-shadow|text-shadow)/': [
        '/^var\\(--/',  // Must start with var(--
        'transparent',
        'currentColor',
        'inherit',
        'initial',
        'unset',
        'none',
      ],
      'z-index': [
        '/^var\\(--z-/',  // Must use z-index tokens
        'auto',
        'inherit',
        'initial',
        'unset',
      ],
    },
    
    // ============================================
    // POSITIONING RULES
    // ============================================
    
    // Disallow position: fixed except in allowed files
    'declaration-property-value-disallowed-list': {
      'position': ['fixed'],
    },
    
    // ============================================
    // GENERAL RULES
    // ============================================
    
    // Allow CSS custom properties
    'custom-property-pattern': null,
    
    // Allow CSS modules :global() syntax
    'selector-pseudo-class-no-unknown': [
      true,
      {
        ignorePseudoClasses: ['global', 'local'],
      },
    ],
    
    // Allow CSS modules composes
    'property-no-unknown': [
      true,
      {
        ignoreProperties: ['composes'],
      },
    ],
    
    // Disable some rules that conflict with CSS modules
    'selector-class-pattern': null,
    'keyframes-name-pattern': null,
    
    // Allow vendor prefixes (autoprefixer handles these)
    'property-no-vendor-prefix': null,
    'value-no-vendor-prefix': null,
  },
  
  // ============================================
  // FILE-SPECIFIC OVERRIDES
  // ============================================
  
  overrides: [
    {
      // Allow raw colors only in tokens.css and themes.css
      files: ['**/tokens.css', '**/themes.css'],
      rules: {
        'color-no-hex': null,
        'function-disallowed-list': null,
        'declaration-property-value-allowed-list': null,
      },
    },
    {
      // Print CSS has special requirements - allow more flexibility
      files: ['**/print.css'],
      rules: {
        'color-no-hex': null,
        'function-disallowed-list': null,
        'declaration-property-value-disallowed-list': null,
        'declaration-property-value-allowed-list': null,
      },
    },
    {
      // Allow position: fixed only in AppShell, Modal, and Toast components
      files: [
        '**/AppShell.module.css',
        '**/Modal.module.css',
        '**/Toast.module.css',
        '**/Notification.module.css',
        '**/Dropdown.module.css',
      ],
      rules: {
        'declaration-property-value-disallowed-list': null,
      },
    },
    {
      // Allow z-index literals only in tokens.css
      files: ['**/tokens.css'],
      rules: {
        // Override the z-index rule for tokens.css
        'declaration-property-value-allowed-list': {
          'z-index': [
            '/^[0-9]+$/',  // Allow numeric literals in tokens.css
            'auto',
            'inherit',
            'initial',
            'unset',
          ],
        },
      },
    },
  ],
  
  // ============================================
  // IGNORED FILES
  // ============================================
  
  ignoreFiles: [
    'dist/**',
    'node_modules/**',
    'build/**',
    '**/*.js',
    '**/*.ts',
    '**/*.tsx',
  ],
};
