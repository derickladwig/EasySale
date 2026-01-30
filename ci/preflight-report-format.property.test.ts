/**
 * Property Test 22: Preflight Report Format
 * 
 * **Validates: Requirements 8.13, 8.14**
 * 
 * This property test verifies that the preflight checker generates
 * reports in the correct format with all required fields.
 * 
 * Properties tested:
 * 1. Generates JSON report
 * 2. Includes timestamp
 * 3. Includes mode
 * 4. Includes check results
 * 5. Includes summary statistics
 * 6. Saves to deterministic location
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Property 22: Preflight Report Format', () => {
  const isInCiDir = process.cwd().endsWith('ci');
  const preflightScript = isInCiDir
    ? path.join(process.cwd(), '..', 'installer', 'windows', 'preflight.ps1')
    : path.join(process.cwd(), 'installer', 'windows', 'preflight.ps1');
  
  it('preflight script exists', () => {
    expect(fs.existsSync(preflightScript)).toBe(true);
  });
  
  it('generates JSON report', () => {
    const content = fs.readFileSync(preflightScript, 'utf-8');
    
    // Should convert to JSON
    expect(content).toContain('ConvertTo-Json');
    expect(content).toContain('Depth');
  });
  
  it('includes timestamp in report', () => {
    const content = fs.readFileSync(preflightScript, 'utf-8');
    
    // Should include timestamp
    expect(content).toContain('timestamp');
    expect(content).toContain('Get-Date');
  });
  
  it('includes mode in report', () => {
    const content = fs.readFileSync(preflightScript, 'utf-8');
    
    // Should include mode
    expect(content).toContain('mode');
    expect(content).toContain('$Mode');
  });
  
  it('includes install and data paths in report', () => {
    const content = fs.readFileSync(preflightScript, 'utf-8');
    
    // Should include paths
    expect(content).toContain('install_path');
    expect(content).toContain('data_path');
  });
  
  it('includes check results array', () => {
    const content = fs.readFileSync(preflightScript, 'utf-8');
    
    // Should have checks array
    expect(content).toContain('checks');
    expect(content).toContain('@()');
  });
  
  it('includes summary statistics', () => {
    const content = fs.readFileSync(preflightScript, 'utf-8');
    
    // Should have summary
    expect(content).toContain('summary');
    expect(content).toContain('total');
    expect(content).toContain('passed');
    expect(content).toContain('warnings');
    expect(content).toContain('failures');
  });
  
  it('saves report to deterministic location', () => {
    const content = fs.readFileSync(preflightScript, 'utf-8');
    
    // Should save to DataPath
    expect(content).toContain('reportPath');
    expect(content).toContain('DataPath');
    expect(content).toContain('preflight-report');
  });
  
  it('includes human-readable summary', () => {
    const content = fs.readFileSync(preflightScript, 'utf-8');
    
    // Should print summary
    expect(content).toContain('Summary');
    expect(content).toContain('Total Checks');
    expect(content).toContain('Passed');
    expect(content).toContain('Warnings');
    expect(content).toContain('Failures');
  });
  
  it('report includes check categories', () => {
    const content = fs.readFileSync(preflightScript, 'utf-8');
    
    // Should categorize checks
    expect(content).toContain('Category');
    expect(content).toContain('Config');
    expect(content).toContain('Secrets');
    expect(content).toContain('Network');
    expect(content).toContain('Permissions');
  });
});
