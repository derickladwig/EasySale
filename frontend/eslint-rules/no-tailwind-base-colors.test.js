/**
 * Tests for no-tailwind-base-colors ESLint rule
 * 
 * @fileoverview Tests for the custom ESLint rule that prevents Tailwind base colors
 */

import { RuleTester } from 'eslint';
import rule from './no-tailwind-base-colors.js';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
    },
  },
});

ruleTester.run('no-tailwind-base-colors', rule, {
  valid: [
    // Semantic tokens are allowed
    {
      code: '<div className="bg-primary-500 text-white" />',
      filename: 'src/components/Button.tsx',
    },
    {
      code: '<div className="text-error-600 border-error-200" />',
      filename: 'src/components/Alert.tsx',
    },
    {
      code: '<div className="bg-success-50 text-success-700" />',
      filename: 'src/components/Toast.tsx',
    },
    {
      code: '<div className="bg-warning-100 text-warning-800" />',
      filename: 'src/components/Banner.tsx',
    },
    {
      code: '<div className="bg-info-50 text-info-700" />',
      filename: 'src/components/Notification.tsx',
    },
    {
      code: '<div className="bg-surface-100 text-text-primary" />',
      filename: 'src/components/Card.tsx',
    },
    {
      code: '<div className="bg-accent-600 hover:bg-accent-700" />',
      filename: 'src/components/Link.tsx',
    },
    
    // Template literals with semantic tokens
    {
      code: '<div className={`bg-primary-500 ${active ? "text-white" : "text-surface-600"}`} />',
      filename: 'src/components/Tab.tsx',
    },
    
    // Utility functions with semantic tokens
    {
      code: '<div className={clsx("bg-error-50", "border-error-200")} />',
      filename: 'src/components/ErrorBoundary.tsx',
    },
    
    // Theme system files are excluded
    {
      code: '<div className="bg-blue-500 text-red-600" />',
      filename: 'src/styles/tokens.css',
    },
    {
      code: '<div className="bg-blue-500 text-red-600" />',
      filename: 'src/theme/ThemeEngine.ts',
    },
    {
      code: '<div className="bg-blue-500 text-red-600" />',
      filename: 'src/config/themeBridge.ts',
    },
    {
      code: '<div className="bg-blue-500 text-red-600" />',
      filename: 'src/auth/theme/LoginThemeProvider.tsx',
    },
    
    // Test files are excluded
    {
      code: '<div className="bg-blue-500 text-red-600" />',
      filename: 'src/components/Button.test.tsx',
    },
    {
      code: '<div className="bg-blue-500 text-red-600" />',
      filename: 'src/components/Button.spec.tsx',
    },
    {
      code: '<div className="bg-blue-500 text-red-600" />',
      filename: 'src/components/Button.stories.tsx',
    },
    
    // Legacy/quarantine files are excluded
    {
      code: '<div className="bg-blue-500 text-red-600" />',
      filename: 'src/legacy_quarantine/OldComponent.tsx',
    },
    
    // Non-className attributes are ignored
    {
      code: '<div data-color="blue-500" />',
      filename: 'src/components/Widget.tsx',
    },
    
    // Custom exclude patterns
    {
      code: '<div className="bg-blue-500 text-red-600" />',
      filename: 'src/examples/Demo.tsx',
      options: [{ excludePatterns: ['src/examples/'] }],
    },
  ],

  invalid: [
    // Basic violations
    {
      code: '<div className="bg-blue-500" />',
      filename: 'src/components/Button.tsx',
      errors: [
        {
          messageId: 'noBaseColor',
          data: {
            match: 'bg-blue-500',
            suggestion: 'bg-info-500',
          },
        },
      ],
      output: '<div className="bg-info-500" />',
    },
    {
      code: '<div className="text-red-600" />',
      filename: 'src/components/Alert.tsx',
      errors: [
        {
          messageId: 'noBaseColor',
          data: {
            match: 'text-red-600',
            suggestion: 'text-error-600',
          },
        },
      ],
      output: '<div className="text-error-600" />',
    },
    {
      code: '<div className="border-green-400" />',
      filename: 'src/components/Card.tsx',
      errors: [
        {
          messageId: 'noBaseColor',
          data: {
            match: 'border-green-400',
            suggestion: 'border-success-400',
          },
        },
      ],
      output: '<div className="border-success-400" />',
    },
    
    // Multiple violations in one className
    {
      code: '<div className="bg-blue-500 text-red-600 border-green-400" />',
      filename: 'src/components/Widget.tsx',
      errors: [
        {
          messageId: 'noBaseColor',
          data: {
            match: 'bg-blue-500',
            suggestion: 'bg-info-500',
          },
        },
        {
          messageId: 'noBaseColor',
          data: {
            match: 'text-red-600',
            suggestion: 'text-error-600',
          },
        },
        {
          messageId: 'noBaseColor',
          data: {
            match: 'border-green-400',
            suggestion: 'border-success-400',
          },
        },
      ],
      output: '<div className="bg-info-500 text-error-600 border-success-400" />',
    },
    
    // Template literals - only checks static parts
    {
      code: '<div className={`bg-slate-100`} />',
      filename: 'src/components/Tab.tsx',
      errors: [
        {
          messageId: 'noBaseColor',
          data: {
            match: 'bg-slate-100',
            suggestion: 'bg-surface-100',
          },
        },
      ],
      output: '<div className={`bg-surface-100`} />',
    },
    
    // Utility functions
    {
      code: '<div className={clsx("bg-indigo-600", "hover:bg-indigo-700")} />',
      filename: 'src/components/Button.tsx',
      errors: [
        {
          messageId: 'noBaseColor',
          data: {
            match: 'bg-indigo-600',
            suggestion: 'bg-primary-600',
          },
        },
        {
          messageId: 'noBaseColor',
          data: {
            match: 'bg-indigo-700',
            suggestion: 'bg-primary-700',
          },
        },
      ],
      output: '<div className={clsx("bg-primary-600", "hover:bg-primary-700")} />',
    },
    
    // Different color utilities
    {
      code: '<div className="ring-purple-500 fill-pink-400 stroke-orange-600" />',
      filename: 'src/components/Icon.tsx',
      errors: [
        {
          messageId: 'noBaseColor',
          data: {
            match: 'ring-purple-500',
            suggestion: 'ring-primary-500',
          },
        },
        {
          messageId: 'noBaseColor',
          data: {
            match: 'fill-pink-400',
            suggestion: 'fill-primary-400',
          },
        },
        {
          messageId: 'noBaseColor',
          data: {
            match: 'stroke-orange-600',
            suggestion: 'stroke-warning-600',
          },
        },
      ],
      output: '<div className="ring-primary-500 fill-primary-400 stroke-warning-600" />',
    },
    
    // Gradient utilities
    {
      code: '<div className="from-blue-500 via-purple-500 to-pink-500" />',
      filename: 'src/components/Hero.tsx',
      errors: [
        {
          messageId: 'noBaseColor',
          data: {
            match: 'from-blue-500',
            suggestion: 'from-info-500',
          },
        },
        {
          messageId: 'noBaseColor',
          data: {
            match: 'via-purple-500',
            suggestion: 'via-primary-500',
          },
        },
        {
          messageId: 'noBaseColor',
          data: {
            match: 'to-pink-500',
            suggestion: 'to-primary-500',
          },
        },
      ],
      output: '<div className="from-info-500 via-primary-500 to-primary-500" />',
    },
    
    // Opacity modifiers
    {
      code: '<div className="bg-blue-500/50 text-red-600/75" />',
      filename: 'src/components/Overlay.tsx',
      errors: [
        {
          messageId: 'noBaseColor',
          data: {
            match: 'bg-blue-500/50',
            suggestion: 'bg-info-500/50',
          },
        },
        {
          messageId: 'noBaseColor',
          data: {
            match: 'text-red-600/75',
            suggestion: 'text-error-600/75',
          },
        },
      ],
      output: '<div className="bg-info-500/50 text-error-600/75" />',
    },
    
    // Neutral colors
    {
      code: '<div className="bg-gray-100 text-zinc-700 border-slate-300" />',
      filename: 'src/components/Card.tsx',
      errors: [
        {
          messageId: 'noBaseColor',
          data: {
            match: 'bg-gray-100',
            suggestion: 'bg-surface-100',
          },
        },
        {
          messageId: 'noBaseColor',
          data: {
            match: 'text-zinc-700',
            suggestion: 'text-surface-700',
          },
        },
        {
          messageId: 'noBaseColor',
          data: {
            match: 'border-slate-300',
            suggestion: 'border-surface-300',
          },
        },
      ],
      output: '<div className="bg-surface-100 text-surface-700 border-surface-300" />',
    },
    
    // Auto-fix disabled
    {
      code: '<div className="bg-blue-500" />',
      filename: 'src/components/Button.tsx',
      options: [{ autoFix: false }],
      errors: [
        {
          messageId: 'noBaseColor',
          data: {
            match: 'bg-blue-500',
            suggestion: 'bg-info-500',
          },
        },
      ],
    },
  ],
});

console.log('✅ All tests passed!');
