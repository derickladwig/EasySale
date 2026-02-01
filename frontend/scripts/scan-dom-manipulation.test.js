/**
 * Tests for scan-dom-manipulation.js scanner
 * 
 * Tests the automated DOM manipulation scanner to ensure it correctly detects
 * direct DOM manipulation for theme changes and respects allowed files.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCRIPT_PATH = path.join(__dirname, 'scan-dom-manipulation.js');
const TEST_DIR = path.join(__dirname, '..', 'src', '__test_dom_scanner__');

describe('DOM Manipulation Scanner', () => {
  beforeEach(() => {
    // Create test directory
    if (!fs.existsSync(TEST_DIR)) {
      fs.mkdirSync(TEST_DIR, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  describe('documentElement.style.setProperty Detection', () => {
    it('should detect document.documentElement.style.setProperty', () => {
      const testFile = path.join(TEST_DIR, 'test.tsx');
      fs.writeFileSync(testFile, `
        function applyTheme() {
          document.documentElement.style.setProperty('--color-primary-500', '#3b82f6');
        }
      `);

      try {
        execSync(`node ${SCRIPT_PATH}`, { encoding: 'utf8' });
        expect.fail('Should have detected documentElement.style.setProperty');
      } catch (error) {
        expect(error.stdout).toContain('documentElement.style.setProperty');
        expect(error.stdout).toContain('Direct manipulation of document.documentElement.style');
      }
    });

    it('should detect multiple setProperty calls', () => {
      const testFile = path.join(TEST_DIR, 'test.tsx');
      fs.writeFileSync(testFile, `
        function applyTheme() {
          document.documentElement.style.setProperty('--color-primary-500', '#3b82f6');
          document.documentElement.style.setProperty('--color-accent-500', '#10b981');
        }
      `);

      try {
        execSync(`node ${SCRIPT_PATH}`, { encoding: 'utf8' });
        expect.fail('Should have detected multiple violations');
      } catch (error) {
        expect(error.stdout).toContain('Found 2 violation');
      }
    });
  });

  describe('document.body.style.setProperty Detection', () => {
    it('should detect document.body.style.setProperty', () => {
      const testFile = path.join(TEST_DIR, 'test.tsx');
      fs.writeFileSync(testFile, `
        function applyTheme() {
          document.body.style.setProperty('--color-primary-500', '#3b82f6');
        }
      `);

      try {
        execSync(`node ${SCRIPT_PATH}`, { encoding: 'utf8' });
        expect.fail('Should have detected document.body.style.setProperty');
      } catch (error) {
        expect(error.stdout).toContain('document.body.style.setProperty');
        expect(error.stdout).toContain('Direct manipulation of document.body.style');
      }
    });
  });

  describe('root.style.setProperty Detection', () => {
    it('should detect root.style.setProperty', () => {
      const testFile = path.join(TEST_DIR, 'test.tsx');
      fs.writeFileSync(testFile, `
        function applyTheme() {
          const root = document.documentElement;
          root.style.setProperty('--color-primary-500', '#3b82f6');
        }
      `);

      try {
        execSync(`node ${SCRIPT_PATH}`, { encoding: 'utf8' });
        expect.fail('Should have detected root.style.setProperty');
      } catch (error) {
        expect(error.stdout).toContain('root.style.setProperty');
        expect(error.stdout).toContain('Direct manipulation via root variable');
      }
    });

    it('should detect root variable with different spacing', () => {
      const testFile = path.join(TEST_DIR, 'test.tsx');
      fs.writeFileSync(testFile, `
        function applyTheme() {
          const root = document.documentElement;
          root.style.setProperty( '--color-primary-500', '#3b82f6' );
        }
      `);

      try {
        execSync(`node ${SCRIPT_PATH}`, { encoding: 'utf8' });
        expect.fail('Should have detected root.style.setProperty with spacing');
      } catch (error) {
        expect(error.stdout).toContain('root.style.setProperty');
      }
    });
  });

  describe('Theme CSS Variable Detection', () => {
    it('should detect element.style.setProperty for --color- variables', () => {
      const testFile = path.join(TEST_DIR, 'test.tsx');
      fs.writeFileSync(testFile, `
        function applyTheme(element) {
          element.style.setProperty('--color-primary-500', '#3b82f6');
        }
      `);

      try {
        execSync(`node ${SCRIPT_PATH}`, { encoding: 'utf8' });
        expect.fail('Should have detected theme variable manipulation');
      } catch (error) {
        expect(error.stdout).toContain('element.style.setProperty (theme vars)');
        expect(error.stdout).toContain('Direct manipulation of theme CSS variables');
      }
    });

    it('should detect element.style.setProperty for --theme- variables', () => {
      const testFile = path.join(TEST_DIR, 'test.tsx');
      fs.writeFileSync(testFile, `
        function applyTheme(element) {
          element.style.setProperty('--theme-mode', 'dark');
        }
      `);

      try {
        execSync(`node ${SCRIPT_PATH}`, { encoding: 'utf8' });
        expect.fail('Should have detected theme variable manipulation');
      } catch (error) {
        expect(error.stdout).toContain('element.style.setProperty (theme vars)');
      }
    });

    it('should not detect non-theme CSS variables', () => {
      const testFile = path.join(TEST_DIR, 'test.tsx');
      fs.writeFileSync(testFile, `
        function setCustomProperty(element) {
          element.style.setProperty('--custom-width', '100px');
          element.style.setProperty('--animation-duration', '300ms');
        }
      `);

      const result = execSync(`node ${SCRIPT_PATH}`, { encoding: 'utf8' });
      expect(result).toContain('No direct DOM manipulation found');
    });
  });

  describe('data-theme Attribute Detection', () => {
    it('should detect document.documentElement.setAttribute for data-theme', () => {
      const testFile = path.join(TEST_DIR, 'test.tsx');
      fs.writeFileSync(testFile, `
        function setTheme() {
          document.documentElement.setAttribute('data-theme', 'dark');
        }
      `);

      try {
        execSync(`node ${SCRIPT_PATH}`, { encoding: 'utf8' });
        expect.fail('Should have detected data-theme manipulation');
      } catch (error) {
        expect(error.stdout).toContain('documentElement.setAttribute (data-theme)');
      }
    });

    it('should detect document.body.setAttribute for data-theme', () => {
      const testFile = path.join(TEST_DIR, 'test.tsx');
      fs.writeFileSync(testFile, `
        function setTheme() {
          document.body.setAttribute('data-theme', 'dark');
        }
      `);

      try {
        execSync(`node ${SCRIPT_PATH}`, { encoding: 'utf8' });
        expect.fail('Should have detected data-theme manipulation');
      } catch (error) {
        expect(error.stdout).toContain('document.body.setAttribute (data-theme)');
      }
    });

    it('should detect root.setAttribute for data-theme', () => {
      const testFile = path.join(TEST_DIR, 'test.tsx');
      fs.writeFileSync(testFile, `
        function setTheme() {
          const root = document.documentElement;
          root.setAttribute('data-theme', 'dark');
        }
      `);

      try {
        execSync(`node ${SCRIPT_PATH}`, { encoding: 'utf8' });
        expect.fail('Should have detected data-theme manipulation');
      } catch (error) {
        expect(error.stdout).toContain('root.setAttribute (data-theme)');
      }
    });
  });

  describe('Theme Class Detection', () => {
    it('should detect documentElement.classList.add for theme classes', () => {
      const testFile = path.join(TEST_DIR, 'test.tsx');
      fs.writeFileSync(testFile, `
        function setDarkMode() {
          document.documentElement.classList.add('dark');
        }
      `);

      try {
        execSync(`node ${SCRIPT_PATH}`, { encoding: 'utf8' });
        expect.fail('Should have detected theme class manipulation');
      } catch (error) {
        expect(error.stdout).toContain('documentElement.classList (theme)');
      }
    });

    it('should detect documentElement.classList.remove for theme classes', () => {
      const testFile = path.join(TEST_DIR, 'test.tsx');
      fs.writeFileSync(testFile, `
        function removeDarkMode() {
          document.documentElement.classList.remove('dark');
        }
      `);

      try {
        execSync(`node ${SCRIPT_PATH}`, { encoding: 'utf8' });
        expect.fail('Should have detected theme class manipulation');
      } catch (error) {
        expect(error.stdout).toContain('documentElement.classList (theme)');
      }
    });

    it('should detect documentElement.classList.toggle for theme classes', () => {
      const testFile = path.join(TEST_DIR, 'test.tsx');
      fs.writeFileSync(testFile, `
        function toggleDarkMode() {
          document.documentElement.classList.toggle('dark');
        }
      `);

      try {
        execSync(`node ${SCRIPT_PATH}`, { encoding: 'utf8' });
        expect.fail('Should have detected theme class manipulation');
      } catch (error) {
        expect(error.stdout).toContain('documentElement.classList (theme)');
      }
    });

    it('should not detect non-theme class manipulation', () => {
      const testFile = path.join(TEST_DIR, 'test.tsx');
      fs.writeFileSync(testFile, `
        function addCustomClass() {
          document.documentElement.classList.add('custom-class');
          document.documentElement.classList.remove('another-class');
        }
      `);

      const result = execSync(`node ${SCRIPT_PATH}`, { encoding: 'utf8' });
      expect(result).toContain('No direct DOM manipulation found');
    });
  });

  describe('Comment Handling', () => {
    it('should not detect violations in single-line comments', () => {
      const testFile = path.join(TEST_DIR, 'test.tsx');
      fs.writeFileSync(testFile, `
        function applyTheme() {
          // document.documentElement.style.setProperty('--color-primary-500', '#3b82f6');
          const validCode = true;
        }
      `);

      const result = execSync(`node ${SCRIPT_PATH}`, { encoding: 'utf8' });
      expect(result).toContain('No direct DOM manipulation found');
    });

    it('should not detect violations in multi-line comments', () => {
      const testFile = path.join(TEST_DIR, 'test.tsx');
      fs.writeFileSync(testFile, `
        function applyTheme() {
          /*
           * This is a comment with:
           * document.documentElement.style.setProperty('--color-primary-500', '#3b82f6');
           * root.style.setProperty('--color-accent-500', '#10b981');
           */
          const validCode = true;
        }
      `);

      const result = execSync(`node ${SCRIPT_PATH}`, { encoding: 'utf8' });
      expect(result).toContain('No direct DOM manipulation found');
    });

    it('should not detect violations in JSDoc comments', () => {
      const testFile = path.join(TEST_DIR, 'test.tsx');
      fs.writeFileSync(testFile, `
        /**
         * Apply theme by calling:
         * document.documentElement.style.setProperty('--color-primary-500', '#3b82f6');
         */
        function applyTheme() {
          const validCode = true;
        }
      `);

      const result = execSync(`node ${SCRIPT_PATH}`, { encoding: 'utf8' });
      expect(result).toContain('No direct DOM manipulation found');
    });
  });

  describe('Allowed Files', () => {
    it('should allow DOM manipulation in ThemeEngine.ts', () => {
      const themeEngineDir = path.join(__dirname, '..', 'src', 'theme');
      const testFile = path.join(themeEngineDir, 'ThemeEngine.ts');
      
      // Create directory if it doesn't exist
      if (!fs.existsSync(themeEngineDir)) {
        fs.mkdirSync(themeEngineDir, { recursive: true });
      }
      
      const originalContent = fs.existsSync(testFile) ? fs.readFileSync(testFile, 'utf8') : '';
      
      try {
        fs.writeFileSync(testFile, `
          export class ThemeEngine {
            applyTheme() {
              document.documentElement.style.setProperty('--color-primary-500', '#3b82f6');
              const root = document.documentElement;
              root.style.setProperty('--color-accent-500', '#10b981');
            }
          }
        `);

        const result = execSync(`node ${SCRIPT_PATH}`, { encoding: 'utf8' });
        expect(result).toContain('No direct DOM manipulation found');
      } finally {
        if (originalContent) {
          fs.writeFileSync(testFile, originalContent);
        } else if (fs.existsSync(testFile)) {
          fs.unlinkSync(testFile);
        }
      }
    });

    it('should allow DOM manipulation in LoginThemeProvider.tsx', () => {
      const authThemeDir = path.join(__dirname, '..', 'src', 'auth', 'theme');
      const testFile = path.join(authThemeDir, 'LoginThemeProvider.tsx');
      
      // Create directory if it doesn't exist
      if (!fs.existsSync(authThemeDir)) {
        fs.mkdirSync(authThemeDir, { recursive: true });
      }
      
      const originalContent = fs.existsSync(testFile) ? fs.readFileSync(testFile, 'utf8') : '';
      
      try {
        fs.writeFileSync(testFile, `
          export function LoginThemeProvider() {
            document.documentElement.style.setProperty('--login-bg', '#fff');
          }
        `);

        const result = execSync(`node ${SCRIPT_PATH}`, { encoding: 'utf8' });
        expect(result).toContain('No direct DOM manipulation found');
      } finally {
        if (originalContent) {
          fs.writeFileSync(testFile, originalContent);
        } else if (fs.existsSync(testFile)) {
          fs.unlinkSync(testFile);
        }
      }
    });

    it('should allow DOM manipulation in test files', () => {
      const testFile = path.join(TEST_DIR, 'Component.test.tsx');
      fs.writeFileSync(testFile, `
        it('should apply theme', () => {
          document.documentElement.style.setProperty('--color-primary-500', '#3b82f6');
          expect(getComputedStyle(document.documentElement).getPropertyValue('--color-primary-500')).toBe('#3b82f6');
        });
      `);

      const result = execSync(`node ${SCRIPT_PATH}`, { encoding: 'utf8' });
      expect(result).toContain('No direct DOM manipulation found');
    });

    it('should allow DOM manipulation in story files', () => {
      const testFile = path.join(TEST_DIR, 'Component.stories.tsx');
      fs.writeFileSync(testFile, `
        export const WithCustomTheme = {
          decorators: [
            (Story) => {
              document.documentElement.style.setProperty('--color-primary-500', '#3b82f6');
              return <Story />;
            },
          ],
        };
      `);

      const result = execSync(`node ${SCRIPT_PATH}`, { encoding: 'utf8' });
      expect(result).toContain('No direct DOM manipulation found');
    });
  });

  describe('Edge Cases', () => {
    it('should handle files with no violations', () => {
      const testFile = path.join(TEST_DIR, 'test.tsx');
      fs.writeFileSync(testFile, `
        import { ThemeEngine } from '@/theme/ThemeEngine';
        
        function applyTheme() {
          const themeEngine = ThemeEngine.getInstance();
          themeEngine.saveThemePreference('store', {
            colors: { primary: { 500: '#3b82f6' } }
          });
        }
      `);

      const result = execSync(`node ${SCRIPT_PATH}`, { encoding: 'utf8' });
      expect(result).toContain('No direct DOM manipulation found');
    });

    it('should handle empty files', () => {
      const testFile = path.join(TEST_DIR, 'empty.tsx');
      fs.writeFileSync(testFile, '');

      const result = execSync(`node ${SCRIPT_PATH}`, { encoding: 'utf8' });
      expect(result).toContain('No direct DOM manipulation found');
    });

    it('should handle multiple violations in one file', () => {
      const testFile = path.join(TEST_DIR, 'test.tsx');
      fs.writeFileSync(testFile, `
        function applyTheme() {
          document.documentElement.style.setProperty('--color-primary-500', '#3b82f6');
          document.body.style.setProperty('--color-accent-500', '#10b981');
          const root = document.documentElement;
          root.style.setProperty('--color-success-500', '#22c55e');
          document.documentElement.setAttribute('data-theme', 'dark');
        }
      `);

      try {
        execSync(`node ${SCRIPT_PATH}`, { encoding: 'utf8' });
        expect.fail('Should have detected multiple violations');
      } catch (error) {
        expect(error.stdout).toContain('Found 4 violation');
        expect(error.stdout).toContain('documentElement.style.setProperty');
        expect(error.stdout).toContain('document.body.style.setProperty');
        expect(error.stdout).toContain('root.style.setProperty');
        expect(error.stdout).toContain('documentElement.setAttribute (data-theme)');
      }
    });

    it('should provide helpful error messages', () => {
      const testFile = path.join(TEST_DIR, 'test.tsx');
      fs.writeFileSync(testFile, `
        function applyTheme() {
          document.documentElement.style.setProperty('--color-primary-500', '#3b82f6');
        }
      `);

      try {
        execSync(`node ${SCRIPT_PATH}`, { encoding: 'utf8' });
        expect.fail('Should have detected violation');
      } catch (error) {
        expect(error.stdout).toContain('Fix:');
        expect(error.stdout).toContain('ThemeEngine');
        expect(error.stdout).toContain('WRONG:');
        expect(error.stdout).toContain('CORRECT:');
        expect(error.stdout).toContain('saveThemePreference');
      }
    });

    it('should handle violations across multiple files', () => {
      const testFile1 = path.join(TEST_DIR, 'test1.tsx');
      const testFile2 = path.join(TEST_DIR, 'test2.tsx');
      
      fs.writeFileSync(testFile1, `
        function applyTheme1() {
          document.documentElement.style.setProperty('--color-primary-500', '#3b82f6');
        }
      `);
      
      fs.writeFileSync(testFile2, `
        function applyTheme2() {
          document.body.style.setProperty('--color-accent-500', '#10b981');
        }
      `);

      try {
        execSync(`node ${SCRIPT_PATH}`, { encoding: 'utf8' });
        expect.fail('Should have detected violations in multiple files');
      } catch (error) {
        expect(error.stdout).toContain('Found 2 violation');
        expect(error.stdout).toContain('test1.tsx');
        expect(error.stdout).toContain('test2.tsx');
      }
    });
  });

  describe('Performance', () => {
    it('should handle large files efficiently', () => {
      const testFile = path.join(TEST_DIR, 'large.tsx');
      const lines = Array(1000).fill('const validCode = true;');
      fs.writeFileSync(testFile, lines.join('\n'));

      const start = Date.now();
      const result = execSync(`node ${SCRIPT_PATH}`, { encoding: 'utf8' });
      const duration = Date.now() - start;

      expect(result).toContain('No direct DOM manipulation found');
      expect(duration).toBeLessThan(5000); // Should complete in under 5 seconds
    });

    it('should handle many files efficiently', () => {
      // Create 50 test files
      for (let i = 0; i < 50; i++) {
        const testFile = path.join(TEST_DIR, `test${i}.tsx`);
        fs.writeFileSync(testFile, `const validCode = true;`);
      }

      const start = Date.now();
      const result = execSync(`node ${SCRIPT_PATH}`, { encoding: 'utf8' });
      const duration = Date.now() - start;

      expect(result).toContain('No direct DOM manipulation found');
      expect(duration).toBeLessThan(10000); // Should complete in under 10 seconds
    });
  });

  describe('Exit Codes', () => {
    it('should exit with 0 when no violations found', () => {
      const testFile = path.join(TEST_DIR, 'test.tsx');
      fs.writeFileSync(testFile, `
        import { ThemeEngine } from '@/theme/ThemeEngine';
        const themeEngine = ThemeEngine.getInstance();
      `);

      const result = execSync(`node ${SCRIPT_PATH}`, { encoding: 'utf8' });
      expect(result).toContain('No direct DOM manipulation found');
    });

    it('should exit with 1 when violations found', () => {
      const testFile = path.join(TEST_DIR, 'test.tsx');
      fs.writeFileSync(testFile, `
        document.documentElement.style.setProperty('--color-primary-500', '#3b82f6');
      `);

      try {
        execSync(`node ${SCRIPT_PATH}`, { encoding: 'utf8' });
        expect.fail('Should have exited with error code');
      } catch (error) {
        expect(error.status).toBe(1);
      }
    });
  });

  describe('Real-World Scenarios', () => {
    it('should detect violations in BrandingSettingsPage pattern', () => {
      const testFile = path.join(TEST_DIR, 'BrandingSettings.tsx');
      fs.writeFileSync(testFile, `
        function applyAccentPreview(accent500: string) {
          const root = document.documentElement;
          ['accent', 'primary'].forEach(prefix => {
            root.style.setProperty(\`--color-\${prefix}-500\`, accent500);
          });
        }
      `);

      try {
        execSync(`node ${SCRIPT_PATH}`, { encoding: 'utf8' });
        expect.fail('Should have detected BrandingSettingsPage pattern');
      } catch (error) {
        expect(error.stdout).toContain('root.style.setProperty');
      }
    });

    it('should detect violations in BrandingStepContent pattern', () => {
      const testFile = path.join(TEST_DIR, 'BrandingStep.tsx');
      fs.writeFileSync(testFile, `
        function previewTheme(colors: ThemeColors) {
          const root = document.documentElement;
          Object.entries(colors).forEach(([key, value]) => {
            root.style.setProperty(\`--color-\${key}\`, value);
          });
        }
      `);

      try {
        execSync(`node ${SCRIPT_PATH}`, { encoding: 'utf8' });
        expect.fail('Should have detected BrandingStepContent pattern');
      } catch (error) {
        expect(error.stdout).toContain('root.style.setProperty');
      }
    });

    it('should accept correct ThemeEngine usage', () => {
      const testFile = path.join(TEST_DIR, 'CorrectUsage.tsx');
      fs.writeFileSync(testFile, `
        import { ThemeEngine } from '@/theme/ThemeEngine';
        
        function applyTheme(colors: ThemeColors) {
          const themeEngine = ThemeEngine.getInstance();
          themeEngine.saveThemePreference('store', {
            colors: colors,
          });
        }
      `);

      const result = execSync(`node ${SCRIPT_PATH}`, { encoding: 'utf8' });
      expect(result).toContain('No direct DOM manipulation found');
    });
  });
});
