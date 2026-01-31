/**
 * Module Boundary Enforcement Tests
 * 
 * These tests verify that ESLint rules properly enforce module boundaries:
 * - Features cannot import from other features
 * - Domains cannot import from features
 * - Common cannot import from features or domains
 * 
 * To run these tests manually:
 * 1. Temporarily create files with violations
 * 2. Run: npm run lint
 * 3. Verify ESLint catches the violations
 * 4. Delete the test files
 */

import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';

describe('Module Boundary Enforcement', () => {
  const testFiles: string[] = [];

  const createTestFile = (path: string, content: string): string => {
    const fullPath = join(process.cwd(), 'src', path);
    writeFileSync(fullPath, content, 'utf-8');
    testFiles.push(fullPath);
    return fullPath;
  };

  const cleanup = () => {
    testFiles.forEach((file) => {
      if (existsSync(file)) {
        unlinkSync(file);
      }
    });
    testFiles.length = 0;
  };

  const runLint = (file: string): { passed: boolean; output: string } => {
    try {
      const output = execSync(`npx eslint ${file}`, {
        cwd: process.cwd(),
        encoding: 'utf-8',
      });
      return { passed: true, output };
    } catch (error: unknown) {
      const execError = error as { stdout?: string; message?: string };
      return { passed: false, output: execError.stdout || execError.message || 'Unknown error' };
    }
  };

  afterEach(() => {
    cleanup();
  });

  it('should prevent feature-to-feature imports', () => {
    const testFile = createTestFile(
      'features/sell/test-violation.ts',
      `
// This should be blocked by ESLint
import { LookupPage } from '../lookup/pages/LookupPage';

export const test = () => LookupPage;
`
    );

    const result = runLint(testFile);
    expect(result.passed).toBe(false);
    expect(result.output).toContain('Features should not import from other features');
  });

  it('should allow features to import from common', () => {
    const testFile = createTestFile(
      'features/sell/test-valid.ts',
      `
// This should be allowed
import { Button } from '../../common/components/Button';

export const test = () => Button;
`
    );

    const result = runLint(testFile);
    expect(result.passed).toBe(true);
  });

  it('should allow features to import from domains', () => {
    const testFile = createTestFile(
      'features/sell/test-valid-domain.ts',
      `
// This should be allowed
import { Cart } from '../../domains/cart';

export const test = () => Cart;
`
    );

    const result = runLint(testFile);
    expect(result.passed).toBe(true);
  });

  it('should prevent domains from importing from features', () => {
    const testFile = createTestFile(
      'domains/cart/test-violation.ts',
      `
// This should be blocked by ESLint
import { SellPage } from '../../features/sell/pages/SellPage';

export const test = () => SellPage;
`
    );

    const result = runLint(testFile);
    expect(result.passed).toBe(false);
    expect(result.output).toContain('Domains should not import from features');
  });

  it('should prevent common from importing from features', () => {
    const testFile = createTestFile(
      'common/utils/test-violation.ts',
      `
// This should be blocked by ESLint
import { SellPage } from '../../features/sell/pages/SellPage';

export const test = () => SellPage;
`
    );

    const result = runLint(testFile);
    expect(result.passed).toBe(false);
    expect(result.output).toContain('Common utilities should not import from features');
  });

  it('should prevent common from importing from domains', () => {
    const testFile = createTestFile(
      'common/utils/test-violation-domain.ts',
      `
// This should be blocked by ESLint
import { Cart } from '../../domains/cart';

export const test = () => Cart;
`
    );

    const result = runLint(testFile);
    expect(result.passed).toBe(false);
    expect(result.output).toContain('Common utilities should not import from features or domains');
  });
});
