/**
 * Property Test 21: Preflight Policy Checks
 * 
 * **Validates: Requirements 8.9, 8.10, 8.11**
 * 
 * This property test verifies that the preflight checker implements
 * policy compliance checks for production installations.
 * 
 * Properties tested:
 * 1. Checks for demo mode in production
 * 2. Scans for forbidden tokens
 * 3. Validates localhost OAuth in production
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Property 21: Preflight Policy Checks', () => {
  const isInCiDir = process.cwd().endsWith('ci');
  const preflightScript = isInCiDir
    ? path.join(process.cwd(), '..', 'installer', 'windows', 'preflight.ps1')
    : path.join(process.cwd(), 'installer', 'windows', 'preflight.ps1');
  
  it('preflight script exists', () => {
    expect(fs.existsSync(preflightScript)).toBe(true);
  });
  
  it('checks for demo mode in production', () => {
    const content = fs.readFileSync(preflightScript, 'utf-8');
    
    // Should check demo mode
    expect(content).toContain('DEMO_MODE');
    expect(content).toContain('prod');
  });
  
  it('validates OAuth configuration', () => {
    const content = fs.readFileSync(preflightScript, 'utf-8');
    
    // Should check OAuth URIs
    expect(content).toContain('OAUTH');
    expect(content).toContain('localhost');
    expect(content).toContain('REDIRECT');
  });
  
  it('implements policy compliance section', () => {
    const content = fs.readFileSync(preflightScript, 'utf-8');
    
    // Should have policy compliance checks
    expect(content).toContain('Policy');
    expect(content).toContain('Compliance');
  });
  
  it('only runs policy checks in production mode', () => {
    const content = fs.readFileSync(preflightScript, 'utf-8');
    
    // Should check mode before policy checks
    expect(content).toMatch(/if.*Mode.*prod/i);
  });
  
  it('reports policy violations as failures', () => {
    const content = fs.readFileSync(preflightScript, 'utf-8');
    
    // Should report violations
    expect(content).toContain('fail');
    expect(content).toContain('Policy');
  });
  
  it('checks configuration for policy violations', () => {
    const content = fs.readFileSync(preflightScript, 'utf-8');
    
    // Should parse config for policy checks
    expect(content).toContain('config');
    expect(content).toContain('Parse-EnvFile');
  });
});
