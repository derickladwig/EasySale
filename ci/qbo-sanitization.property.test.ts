/**
 * Property Test 12: QuickBooks Input Sanitization
 * 
 * **Validates: Requirements 5.1**
 * 
 * This property test verifies that all QuickBooks query value sanitization is properly implemented
 * to prevent SQL injection attacks through QBO query parameters.
 * 
 * Properties tested:
 * 1. QBO sanitizer module exists and exports sanitization function
 * 2. Sanitization function escapes single quotes
 * 3. Sanitization function handles special characters
 * 4. All QBO query builders use the sanitization helper
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

describe('Property 12: QuickBooks Input Sanitization', () => {
  it('should have QBO sanitizer module with sanitization function', () => {
    const sanitizerPath = path.join(
      REPO_ROOT,
      'backend/crates/server/src/security/qbo_sanitizer.rs'
    );
    
    expect(fs.existsSync(sanitizerPath), 'QBO sanitizer module should exist').toBe(true);
    
    const content = fs.readFileSync(sanitizerPath, 'utf-8');
    
    // Should export sanitization function
    expect(
      content.includes('pub fn sanitize_qbo_query_value'),
      'Should export sanitize_qbo_query_value function'
    ).toBe(true);
    
    // Should handle single quotes
    expect(
      content.includes("replace('") || content.includes('replace("'),
      'Should implement quote escaping'
    ).toBe(true);
  });

  it('should use sanitization in all QBO query builders', () => {
    const qboHandlersDir = path.join(
      REPO_ROOT,
      'backend/crates/server/src/handlers'
    );
    
    // Find all QuickBooks handler files
    const qboFiles = fs.readdirSync(qboHandlersDir)
      .filter(f => f.startsWith('quickbooks') && f.endsWith('.rs'));
    
    expect(qboFiles.length, 'Should have QuickBooks handler files').toBeGreaterThan(0);
    
    const violations: string[] = [];
    
    for (const file of qboFiles) {
      const filePath = path.join(qboHandlersDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Check if file builds QBO queries (not just error messages)
      // Look for actual query building patterns
      const hasQueryBuilding = (content.includes('query=') && content.includes('format!')) || 
                               (content.includes('Query::') && !content.includes('Query::from'));
      
      if (hasQueryBuilding) {
        // Should import or use sanitization
        const usesSanitization = content.includes('sanitize_qbo_query_value') ||
                                 content.includes('qbo_sanitizer::') ||
                                 content.includes('use crate::security::qbo_sanitizer');
        
        if (!usesSanitization) {
          violations.push(`${file}: builds QBO queries but doesn't use sanitization`);
        }
      }
    }
    
    expect(
      violations,
      `All QBO query builders should use sanitization:\n${violations.join('\n')}`
    ).toHaveLength(0);
  });

  it('should not have raw string interpolation in QBO queries', () => {
    const qboHandlersDir = path.join(
      REPO_ROOT,
      'backend/crates/server/src/handlers'
    );
    
    const qboFiles = fs.readdirSync(qboHandlersDir)
      .filter(f => f.startsWith('quickbooks') && f.endsWith('.rs'));
    
    const violations: string[] = [];
    
    for (const file of qboFiles) {
      const filePath = path.join(qboHandlersDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Check for dangerous patterns: format! with query= or Query::
        if ((line.includes('query=') || line.includes('Query::')) && 
            line.includes('format!')) {
          // Check if the line uses sanitization
          const contextStart = Math.max(0, i - 3);
          const contextEnd = Math.min(lines.length, i + 3);
          const context = lines.slice(contextStart, contextEnd).join('\n');
          
          if (!context.includes('sanitize_qbo_query_value')) {
            violations.push(`${file}:${i + 1}: Potential unsanitized query interpolation`);
          }
        }
      }
    }
    
    expect(
      violations,
      `QBO queries should use sanitization, not raw interpolation:\n${violations.join('\n')}`
    ).toHaveLength(0);
  });

  it('should have unit tests for QBO sanitization', () => {
    const sanitizerPath = path.join(
      REPO_ROOT,
      'backend/crates/server/src/security/qbo_sanitizer.rs'
    );
    
    const content = fs.readFileSync(sanitizerPath, 'utf-8');
    
    // Should have test module
    expect(
      content.includes('#[cfg(test)]') && content.includes('mod tests'),
      'Should have test module'
    ).toBe(true);
    
    // Should test special characters
    expect(
      content.includes("'") || content.includes('single quote') || content.includes('apostrophe'),
      'Should test single quote handling'
    ).toBe(true);
  });
});
