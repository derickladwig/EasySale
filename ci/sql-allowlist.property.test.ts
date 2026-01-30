/**
 * Property Test 13: SQL Identifier Allowlisting
 * 
 * **Validates: Requirements 5.2**
 * 
 * This property test verifies that SQL identifier allowlisting is properly implemented
 * to prevent SQL injection through dynamic table/column names.
 * 
 * Properties tested:
 * 1. SQL allowlist module exists with table and column allowlists
 * 2. Validation functions exist for tables and columns
 * 3. Dynamic SQL queries use allowlist validation
 * 4. Unit tests exist for allowlist validation
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

describe('Property 13: SQL Identifier Allowlisting', () => {
  it('should have SQL allowlist module with table and column allowlists', () => {
    const allowlistPath = path.join(
      REPO_ROOT,
      'backend/crates/server/src/security/sql_allowlist.rs'
    );
    
    expect(fs.existsSync(allowlistPath), 'SQL allowlist module should exist').toBe(true);
    
    const content = fs.readFileSync(allowlistPath, 'utf-8');
    
    // Should define allowed tables
    expect(
      content.includes('ALLOWED_TABLES') || content.includes('allowed_tables'),
      'Should define ALLOWED_TABLES constant'
    ).toBe(true);
    
    // Should define allowed columns
    expect(
      content.includes('ALLOWED_COLUMNS') || content.includes('allowed_columns'),
      'Should define ALLOWED_COLUMNS constant'
    ).toBe(true);
    
    // Should export validation functions
    expect(
      content.includes('pub fn validate_table') || content.includes('pub fn is_valid_table'),
      'Should export table validation function'
    ).toBe(true);
    
    expect(
      content.includes('pub fn validate_column') || content.includes('pub fn is_valid_column'),
      'Should export column validation function'
    ).toBe(true);
  });

  it('should use allowlist validation in dynamic SQL queries', () => {
    const reportingPath = path.join(
      REPO_ROOT,
      'backend/crates/server/src/handlers/reporting.rs'
    );
    
    if (!fs.existsSync(reportingPath)) {
      // If reporting handler doesn't exist, skip this test
      return;
    }
    
    const content = fs.readFileSync(reportingPath, 'utf-8');
    
    // Check if file has dynamic SQL (format! with SQL keywords)
    const hasDynamicSQL = content.includes('format!') && 
                          (content.includes('SELECT') || content.includes('FROM') || content.includes('WHERE'));
    
    if (hasDynamicSQL) {
      // Should use allowlist validation OR parameterized queries
      const usesAllowlist = content.includes('validate_table') ||
                           content.includes('validate_column') ||
                           content.includes('is_valid_table') ||
                           content.includes('is_valid_column') ||
                           content.includes('sql_allowlist::');
      
      const usesParameterized = content.includes('.bind(') && content.includes('?');
      
      expect(
        usesAllowlist || usesParameterized,
        'Dynamic SQL queries should use allowlist validation or parameterized queries'
      ).toBe(true);
    }
  });

  it('should not have unvalidated dynamic table/column names', () => {
    const handlersDir = path.join(
      REPO_ROOT,
      'backend/crates/server/src/handlers'
    );
    
    const handlerFiles = fs.readdirSync(handlersDir)
      .filter(f => f.endsWith('.rs'));
    
    const violations: string[] = [];
    
    for (const file of handlerFiles) {
      const filePath = path.join(handlersDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Check for dangerous patterns: format! with FROM or SELECT and variable interpolation
        if (line.includes('format!') && 
            (line.includes('FROM') || line.includes('SELECT')) &&
            (line.includes('{}') || line.includes('{:'))) {
          
          // Check if validation is used in context
          const contextStart = Math.max(0, i - 5);
          const contextEnd = Math.min(lines.length, i + 5);
          const context = lines.slice(contextStart, contextEnd).join('\n');
          
          // Look for validation or allowlist usage
          const hasValidation = context.includes('validate_table') ||
                               context.includes('validate_column') ||
                               context.includes('is_valid_table') ||
                               context.includes('is_valid_column') ||
                               context.includes('ALLOWED_TABLES') ||
                               context.includes('ALLOWED_COLUMNS');
          
          // Also check if it's just formatting static strings (no actual variables)
          const isStaticFormat = !line.match(/\{[^}]*[a-z_][a-z0-9_]*[^}]*\}/i);
          
          if (!hasValidation && !isStaticFormat) {
            violations.push(`${file}:${i + 1}: Potential unvalidated dynamic SQL identifier`);
          }
        }
      }
    }
    
    expect(
      violations,
      `Dynamic SQL identifiers should be validated:\n${violations.join('\n')}`
    ).toHaveLength(0);
  });

  it('should have unit tests for allowlist validation', () => {
    const allowlistPath = path.join(
      REPO_ROOT,
      'backend/crates/server/src/security/sql_allowlist.rs'
    );
    
    const content = fs.readFileSync(allowlistPath, 'utf-8');
    
    // Should have test module
    expect(
      content.includes('#[cfg(test)]') && content.includes('mod tests'),
      'Should have test module'
    ).toBe(true);
    
    // Should test valid identifiers
    expect(
      content.includes('valid') || content.includes('allowed'),
      'Should test valid identifiers'
    ).toBe(true);
    
    // Should test invalid identifiers
    expect(
      content.includes('invalid') || content.includes('reject') || content.includes('deny'),
      'Should test invalid identifiers'
    ).toBe(true);
  });
});
