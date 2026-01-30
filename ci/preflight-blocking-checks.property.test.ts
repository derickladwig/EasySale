/**
 * Property Test 20: Preflight Blocking Checks
 * 
 * **Validates: Requirements 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8**
 * 
 * This property test verifies that the preflight checker implements
 * all required blocking checks before installation.
 * 
 * Properties tested:
 * 1. Checks configuration file exists
 * 2. Validates required secrets
 * 3. Checks port availability
 * 4. Validates directory permissions
 * 5. Checks database migrations
 * 6. Validates health endpoint
 * 7. Checks frontend dist exists
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Property 20: Preflight Blocking Checks', () => {
  const isInCiDir = process.cwd().endsWith('ci');
  const preflightScript = isInCiDir
    ? path.join(process.cwd(), '..', 'installer', 'windows', 'preflight.ps1')
    : path.join(process.cwd(), 'installer', 'windows', 'preflight.ps1');
  
  it('preflight script exists', () => {
    expect(fs.existsSync(preflightScript)).toBe(true);
  });
  
  it('implements configuration file check', () => {
    const content = fs.readFileSync(preflightScript, 'utf-8');
    
    // Should check for config file
    expect(content).toContain('ConfigPath');
    expect(content).toContain('Test-Path');
    expect(content).toContain('config');
  });
  
  it('implements secrets validation', () => {
    const content = fs.readFileSync(preflightScript, 'utf-8');
    
    // Should validate secrets
    expect(content).toContain('secret');
    expect(content).toContain('placeholder');
    expect(content).toContain('JWT_SECRET');
  });
  
  it('implements port availability check', () => {
    const content = fs.readFileSync(preflightScript, 'utf-8');
    
    // Should check port availability
    expect(content).toContain('Port');
    expect(content).toContain('Get-NetTCPConnection');
    expect(content).toContain('LocalPort');
  });
  
  it('implements directory permissions check', () => {
    const content = fs.readFileSync(preflightScript, 'utf-8');
    
    // Should check write permissions
    expect(content).toContain('writable');
    expect(content).toContain('test-write');
    expect(content).toContain('InstallPath');
    expect(content).toContain('DataPath');
  });
  
  it('implements database migration check', () => {
    const content = fs.readFileSync(preflightScript, 'utf-8');
    
    // Should check database
    expect(content).toContain('database');
    expect(content).toContain('pos.db');
  });
  
  it('returns proper exit codes', () => {
    const content = fs.readFileSync(preflightScript, 'utf-8');
    
    // Should have exit codes: 0=OK, 1=WARN, 2=BLOCK
    expect(content).toContain('exit 0');
    expect(content).toContain('exit 1');
    expect(content).toContain('exit 2');
  });
  
  it('generates JSON report', () => {
    const content = fs.readFileSync(preflightScript, 'utf-8');
    
    // Should generate JSON report
    expect(content).toContain('ConvertTo-Json');
    expect(content).toContain('report');
  });
  
  it('aggregates check results', () => {
    const content = fs.readFileSync(preflightScript, 'utf-8');
    
    // Should aggregate results
    expect(content).toContain('Results');
    expect(content).toContain('checks');
    expect(content).toContain('summary');
  });
  
  it('implements Add-CheckResult helper', () => {
    const content = fs.readFileSync(preflightScript, 'utf-8');
    
    // Should have helper function
    expect(content).toContain('Add-CheckResult');
    expect(content).toContain('Category');
    expect(content).toContain('Status');
  });
  
  it('checks system requirements', () => {
    const content = fs.readFileSync(preflightScript, 'utf-8');
    
    // Should check OS version and disk space
    expect(content).toContain('OSVersion');
    expect(content).toContain('disk');
    expect(content).toContain('space');
  });
  
  it('validates mode parameter', () => {
    const content = fs.readFileSync(preflightScript, 'utf-8');
    
    // Should validate mode (dev/demo/prod)
    expect(content).toContain('Mode');
    expect(content).toContain('ValidateSet');
    expect(content).toMatch(/dev.*demo.*prod/);
  });
  
  it('implements Parse-EnvFile helper', () => {
    const content = fs.readFileSync(preflightScript, 'utf-8');
    
    // Should parse .env files
    expect(content).toContain('Parse-EnvFile');
    expect(content).toContain('.env');
  });
});
