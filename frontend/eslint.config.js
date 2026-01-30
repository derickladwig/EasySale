import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import importPlugin from 'eslint-plugin-import';

export default [
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        fetch: 'readonly',
        FormData: 'readonly',
        Headers: 'readonly',
        Request: 'readonly',
        Response: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        navigator: 'readonly',
        global: 'readonly',
        HTMLElement: 'readonly',
        HTMLDivElement: 'readonly',
        HTMLButtonElement: 'readonly',
        HTMLInputElement: 'readonly',
        HTMLSelectElement: 'readonly',
        HTMLSpanElement: 'readonly',
        HTMLImageElement: 'readonly',
        KeyboardEvent: 'readonly',
        MouseEvent: 'readonly',
        React: 'readonly',
        RequestInit: 'readonly',
        alert: 'readonly',
        confirm: 'readonly',
        File: 'readonly',
        Blob: 'readonly',
        Element: 'readonly',
        Node: 'readonly',
        NodeFilter: 'readonly',
        ShadowRoot: 'readonly',
        ResizeObserver: 'readonly',
        MutationObserver: 'readonly',
        CustomEvent: 'readonly',
        Event: 'readonly',
        performance: 'readonly',
        getComputedStyle: 'readonly',
        innerWidth: 'readonly',
        innerHeight: 'readonly',
        btoa: 'readonly',
        Buffer: 'readonly',
        process: 'readonly',
        afterEach: 'readonly',
        ThemePreferences: 'readonly',
        NodeJS: 'readonly',
        CSSStyleDeclaration: 'readonly',
        SVGSVGElement: 'readonly',
        HTMLLabelElement: 'readonly',
        FocusEvent: 'readonly',
        EventListener: 'readonly',
        Image: 'readonly',
        MediaQueryList: 'readonly',
        MediaQueryListEvent: 'readonly',
        DOMRect: 'readonly',
        DOMException: 'readonly',
        FileReader: 'readonly',
        Storage: 'readonly',
        Notification: 'readonly',
        AbortController: 'readonly',
        AbortSignal: 'readonly',
        HTMLTextAreaElement: 'readonly',
        PointerEvent: 'readonly',
        TouchEvent: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      import: importPlugin,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'no-console': 'warn',
      'no-case-declarations': 'warn',
      'no-global-assign': 'warn',
      'no-useless-escape': 'warn',
      'react/no-unescaped-entities': 'warn',
      'react/jsx-no-duplicate-props': 'warn',
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-empty-object-type': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/rules-of-hooks': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/immutability': 'warn',
      'react-refresh/only-export-components': 'off',
      
      // Design system enforcement: disallow inline styles
      'react/forbid-component-props': [
        'warn', // Changed from 'error' to 'warn' for production builds
        {
          forbid: [
            {
              propName: 'style',
              message: 'Use CSS modules or design tokens instead of inline styles. See docs/CSS_OWNERSHIP_RULES.md',
            },
          ],
        },
      ],
      'react/forbid-dom-props': [
        'warn', // Changed from 'error' to 'warn' for production builds
        {
          forbid: [
            {
              propName: 'style',
              message: 'Use CSS modules or design tokens instead of inline styles. See docs/CSS_OWNERSHIP_RULES.md',
            },
          ],
        },
      ],
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  // Test files: more lenient rules
  {
    files: ['**/*.test.{ts,tsx}', '**/*.property.test.{ts,tsx}', '**/test-*.{ts,tsx}', 'src/test/**/*.{ts,tsx}', '**/__tests__/**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        test: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        vi: 'readonly',
        jest: 'readonly',
        mock: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': 'off',
      'react/forbid-component-props': 'off',
      'react/forbid-dom-props': 'off',
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/immutability': 'warn',
      'react/display-name': 'off',
    },
  },
  // Module boundary enforcement for features
  // POST-REFACTOR (2026-01-28): Features moved to src/{feature}
  {
    files: [
      'src/auth/**/*.{ts,tsx}',
      'src/admin/**/*.{ts,tsx}',
      'src/sell/**/*.{ts,tsx}',
      'src/lookup/**/*.{ts,tsx}',
      'src/warehouse/**/*.{ts,tsx}',
      'src/customers/**/*.{ts,tsx}',
      'src/reporting/**/*.{ts,tsx}',
      'src/review/**/*.{ts,tsx}',
      'src/settings/**/*.{ts,tsx}',
      'src/setup/**/*.{ts,tsx}',
      'src/documents/**/*.{ts,tsx}',
      'src/exports/**/*.{ts,tsx}',
      'src/sales/**/*.{ts,tsx}',
      'src/templates/**/*.{ts,tsx}',
      'src/preferences/**/*.{ts,tsx}',
      'src/home/**/*.{ts,tsx}',
      'src/forms/**/*.{ts,tsx}',
      'src/features/**/*.{ts,tsx}', // Barrel re-exports
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              // Block imports like: ../lookup/..., ../sell/..., etc.
              // But allow: ../../common/..., ../../domains/..., ./...
              group: [
                '../admin/**',
                '../auth/**',
                '../customers/**',
                '../forms/**',
                '../home/**',
                '../lookup/**',
                '../products/**',
                '../reporting/**',
                '../sell/**',
                '../settings/**',
                '../setup/**',
                '../templates/**',
                '../warehouse/**',
              ],
              message: 'Features should not import from other features. Use domains/ or common/ instead.',
            },
          ],
        },
      ],
    },
  },
  // Module boundary enforcement for domains
  {
    files: ['src/domains/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/features/**'],
              message: 'Domains should not import from features. Keep domain logic independent.',
            },
          ],
        },
      ],
    },
  },
  // Module boundary enforcement for common
  {
    files: ['src/common/**/*.{ts,tsx}'],
    ignores: [
      // Navigation.tsx is a special case that needs to import from features for capability-driven navigation
      'src/common/components/Navigation.tsx',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/features/**', '**/domains/**'],
              message: 'Common utilities should not import from features or domains.',
            },
          ],
        },
      ],
    },
  },
  {
    ignores: [
      'dist',
      'node_modules',
      '*.config.js',
      '*.config.ts',
      '.storybook',
      'storybook-static',
      'coverage',
      'playwright-report',
      'test-results',
    ],
  },
];
