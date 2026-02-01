/**
 * Tests for check-hardcoded-colors.js scanner
 * 
 * Tests the automated color scanner to ensure it correctly detects
 * hardcoded colors and respects allowed files.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCRIPT_PATH = path.join(__dirname, 'check-hardcoded-colors.js');
const TEST_DIR = path.join(__dirname, '..', 'src', '__test_color_scanner__');

describe('Color Scanner', () => {
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

  describe('Hex Color Detection', () => {
    it('should detect 3-digit hex colors', () => {
      const testFile = path.join(TEST_DIR, 'test.tsx');
      fs.writeFileSync(testFile, `
        const color = '#fff';
        const bg = '#000';
      `);

      try {
        execSync(`node ${SCRIPT_PATH}`, { encoding: 'utf8' });
        expect.fail('Should have detected hex colors');
      } catch (error) {
        expect(error.stdout).toContain('[HEX]');
        expect(error.stdout).toContain('#fff');
        expect(error.stdout).toContain('#000');
      }
    });

    it('should detect 6-digit hex colors', () => {
      const testFile = path.join(TEST_DIR, 'test.tsx');
      fs.writeFileSync(testFile, `
        const primary = '#3b82f6';
        const secondary = '#10b981';
      `);

      try {
        execSync(`node ${SCRIPT_PATH}`, { encoding: 'utf8' });
        expect.fail('Should have detected hex colors');
      } catch (error) {
        expect(error.stdout).toContain('[HEX]');
        expect(error.stdout).toContain('#3b82f6');
        expect(error.stdout).toContain('#10b981');
      }
    });

    it('should detect 8-digit hex colors with alpha', () => {
      const testFile = path.join(TEST_DIR, 'test.tsx');
      fs.writeFileSync(testFile, `
        const color = '#3b82f6ff';
        const transparent = '#00000080';
      `);

      try {
        execSync(`node ${SCRIPT_PATH}`, { encoding: 'utf8' });
        expect.fail('Should have detected hex colors');
      } catch (error) {
        expect(error.stdout).toContain('[HEX]');
        expect(error.stdout).toContain('#3b82f6ff');
        expect(error.stdout).toContain('#00000080');
      }
    });

    it('should not detect hex colors in comments', () => {
      const testFile = path.join(TEST_DIR, 'test.tsx');
      fs.writeFileSync(testFile, `
        // This is a comment with #fff color
        /* Another comment with #000 */
        const validColor = 'var(--color-primary)';
      `);

      const result = execSync(`node ${SCRIPT_PATH}`, { encoding: 'utf8' });
      expect(result).toContain('No hardcoded colors found');
    });
  });

  describe('RGB/RGBA Detection', () => {
    it('should detect rgb() colors', () => {
      const testFile = path.join(TEST_DIR, 'test.tsx');
      fs.writeFileSync(testFile, `
        const color = 'rgb(59, 130, 246)';
        const bg = 'rgb(255, 255, 255)';
      `);

      try {
        execSync(`node ${SCRIPT_PATH}`, { encoding: 'utf8' });
        expect.fail('Should have detected rgb colors');
      } catch (error) {
        expect(error.stdout).toContain('[RGB]');
        expect(error.stdout).toContain('rgb(59, 130, 246');
      }
    });

    it('should detect rgba() colors', () => {
      const testFile = path.join(TEST_DIR, 'test.tsx');
      fs.writeFileSync(testFile, `
        const color = 'rgba(59, 130, 246, 0.5)';
        const bg = 'rgba(0, 0, 0, 0.8)';
      `);

      try {
        execSync(`node ${SCRIPT_PATH}`, { encoding: 'utf8' });
        expect.fail('Should have detected rgba colors');
      } catch (error) {
        expect(error.stdout).toContain('[RGB]');
        expect(error.stdout).toContain('rgba(59, 130, 246');
      }
    });
  });

  describe('HSL/HSLA Detection', () => {
    it('should detect hsl() colors', () => {
      const testFile = path.join(TEST_DIR, 'test.tsx');
      fs.writeFileSync(testFile, `
        const color = 'hsl(217, 91%, 60%)';
        const bg = 'hsl(0, 0%, 100%)';
      `);

      try {
        execSync(`node ${SCRIPT_PATH}`, { encoding: 'utf8' });
        expect.fail('Should have detected hsl colors');
      } catch (error) {
        expect(error.stdout).toContain('[HSL]');
        expect(error.stdout).toContain('hsl(217, 91%, 60%');
      }
    });

    it('should detect hsla() colors', () => {
      const testFile = path.join(TEST_DIR, 'test.tsx');
      fs.writeFileSync(testFile, `
        const color = 'hsla(217, 91%, 60%, 0.5)';
        const bg = 'hsla(0, 0%, 0%, 0.8)';
      `);

      try {
        execSync(`node ${SCRIPT_PATH}`, { encoding: 'utf8' });
        expect.fail('Should have detected hsla colors');
      } catch (error) {
        expect(error.stdout).toContain('[HSL]');
        expect(error.stdout).toContain('hsla(217, 91%, 60%');
      }
    });
  });

  describe('Named Color Detection', () => {
    it('should detect named colors in style attributes', () => {
      const testFile = path.join(TEST_DIR, 'test.tsx');
      fs.writeFileSync(testFile, `
        <div style={{ color: 'red', backgroundColor: 'blue' }}>
          Content
        </div>
      `);

      try {
        execSync(`node ${SCRIPT_PATH}`, { encoding: 'utf8' });
        expect.fail('Should have detected named colors');
      } catch (error) {
        expect(error.stdout).toContain('[NAMED]');
      }
    });
  });

  describe('Tailwind Base Color Detection', () => {
    it('should detect Tailwind base color utilities', () => {
      const testFile = path.join(TEST_DIR, 'test.tsx');
      fs.writeFileSync(testFile, `
        <div className="text-blue-600 bg-gray-100 border-red-500">
          Content
        </div>
      `);

      try {
        execSync(`node ${SCRIPT_PATH}`, { encoding: 'utf8' });
        expect.fail('Should have detected Tailwind base colors');
      } catch (error) {
        expect(error.stdout).toContain('[TAILWIND]');
        expect(error.stdout).toContain('text-blue-600');
        expect(error.stdout).toContain('bg-gray-100');
        expect(error.stdout).toContain('border-red-500');
      }
    });

    it('should not detect semantic Tailwind utilities', () => {
      const testFile = path.join(TEST_DIR, 'test.tsx');
      fs.writeFileSync(testFile, `
        <div className="text-primary-600 bg-surface text-error-500">
          Content
        </div>
      `);

      const result = execSync(`node ${SCRIPT_PATH}`, { encoding: 'utf8' });
      expect(result).toContain('No hardcoded colors found');
    });
  });

  describe('Allowed Files', () => {
    it('should allow colors in tokens.css', () => {
      const testFile = path.join(__dirname, '..', 'src', 'styles', 'tokens.css');
      const originalContent = fs.existsSync(testFile) ? fs.readFileSync(testFile, 'utf8') : '';
      
      try {
        fs.writeFileSync(testFile, `
          :root {
            --color-primary-500: #3b82f6;
            --color-success-500: #10b981;
          }
        `);

        const result = execSync(`node ${SCRIPT_PATH}`, { encoding: 'utf8' });
        expect(result).toContain('No hardcoded colors found');
      } finally {
        if (originalContent) {
          fs.writeFileSync(testFile, originalContent);
        }
      }
    });

    it('should allow colors in test files', () => {
      const testFile = path.join(TEST_DIR, 'Component.test.tsx');
      fs.writeFileSync(testFile, `
        it('should render with blue color', () => {
          const color = '#3b82f6';
          expect(element).toHaveStyle({ color });
        });
      `);

      const result = execSync(`node ${SCRIPT_PATH}`, { encoding: 'utf8' });
      expect(result).toContain('No hardcoded colors found');
    });

    it('should allow colors in story files', () => {
      const testFile = path.join(TEST_DIR, 'Component.stories.tsx');
      fs.writeFileSync(testFile, `
        export const Primary = {
          args: {
            color: '#3b82f6',
          },
        };
      `);

      const result = execSync(`node ${SCRIPT_PATH}`, { encoding: 'utf8' });
      expect(result).toContain('No hardcoded colors found');
    });
  });

  describe('Edge Cases', () => {
    it('should handle files with no violations', () => {
      const testFile = path.join(TEST_DIR, 'test.tsx');
      fs.writeFileSync(testFile, `
        const color = 'var(--color-primary-500)';
        const bg = 'var(--color-surface)';
        const className = 'text-primary-600 bg-surface';
      `);

      const result = execSync(`node ${SCRIPT_PATH}`, { encoding: 'utf8' });
      expect(result).toContain('No hardcoded colors found');
    });

    it('should handle empty files', () => {
      const testFile = path.join(TEST_DIR, 'empty.tsx');
      fs.writeFileSync(testFile, '');

      const result = execSync(`node ${SCRIPT_PATH}`, { encoding: 'utf8' });
      expect(result).toContain('No hardcoded colors found');
    });

    it('should handle multiple violations in one file', () => {
      const testFile = path.join(TEST_DIR, 'test.tsx');
      fs.writeFileSync(testFile, `
        const color1 = '#fff';
        const color2 = 'rgb(255, 0, 0)';
        const color3 = 'hsl(120, 100%, 50%)';
        const className = 'text-blue-600';
      `);

      try {
        execSync(`node ${SCRIPT_PATH}`, { encoding: 'utf8' });
        expect.fail('Should have detected multiple violations');
      } catch (error) {
        expect(error.stdout).toContain('[HEX]');
        expect(error.stdout).toContain('[RGB]');
        expect(error.stdout).toContain('[HSL]');
        expect(error.stdout).toContain('[TAILWIND]');
      }
    });

    it('should provide helpful error messages', () => {
      const testFile = path.join(TEST_DIR, 'test.tsx');
      fs.writeFileSync(testFile, `
        const color = '#3b82f6';
      `);

      try {
        execSync(`node ${SCRIPT_PATH}`, { encoding: 'utf8' });
        expect.fail('Should have detected violation');
      } catch (error) {
        expect(error.stdout).toContain('Fix:');
        expect(error.stdout).toContain('var(--color-');
        expect(error.stdout).toContain('Examples:');
      }
    });
  });

  describe('Performance', () => {
    it('should handle large files efficiently', () => {
      const testFile = path.join(TEST_DIR, 'large.tsx');
      const lines = Array(1000).fill('const validColor = "var(--color-primary)";');
      fs.writeFileSync(testFile, lines.join('\n'));

      const start = Date.now();
      const result = execSync(`node ${SCRIPT_PATH}`, { encoding: 'utf8' });
      const duration = Date.now() - start;

      expect(result).toContain('No hardcoded colors found');
      expect(duration).toBeLessThan(5000); // Should complete in under 5 seconds
    });

    it('should handle many files efficiently', () => {
      // Create 50 test files
      for (let i = 0; i < 50; i++) {
        const testFile = path.join(TEST_DIR, `test${i}.tsx`);
        fs.writeFileSync(testFile, `const color = 'var(--color-primary)';`);
      }

      const start = Date.now();
      const result = execSync(`node ${SCRIPT_PATH}`, { encoding: 'utf8' });
      const duration = Date.now() - start;

      expect(result).toContain('No hardcoded colors found');
      expect(duration).toBeLessThan(10000); // Should complete in under 10 seconds
    });
  });

  describe('Exit Codes', () => {
    it('should exit with 0 when no violations found', () => {
      const testFile = path.join(TEST_DIR, 'test.tsx');
      fs.writeFileSync(testFile, `const color = 'var(--color-primary)';`);

      const result = execSync(`node ${SCRIPT_PATH}`, { encoding: 'utf8' });
      expect(result).toContain('No hardcoded colors found');
    });

    it('should exit with 1 when violations found', () => {
      const testFile = path.join(TEST_DIR, 'test.tsx');
      fs.writeFileSync(testFile, `const color = '#fff';`);

      try {
        execSync(`node ${SCRIPT_PATH}`, { encoding: 'utf8' });
        expect.fail('Should have exited with error code');
      } catch (error) {
        expect(error.status).toBe(1);
      }
    });
  });
});
