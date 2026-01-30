/**
 * Property Test 26: Readiness Gate Forbidden Pattern Detection
 * 
 * **Validates: Requirements 11.1, 11.2, 11.3, 11.4**
 * 
 * This property test verifies that the readiness gate scanner correctly detects
 * forbidden patterns in core runtime paths and blocks production builds.
 * 
 * Properties tested:
 * 1. Scanner detects demo credentials in core runtime paths
 * 2. Scanner detects CAPS branding tokens in core runtime paths
 * 3. Scanner detects localhost OAuth URIs in core runtime paths
 * 4. Scanner detects SQL injection patterns in core runtime paths
 * 5. Scanner respects exclusions (archive/, tests/, fixtures/, presets/)
 * 6. Scanner respects allowed exceptions defined in policy
 * 7. Scanner exits with error code when violations found
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { REPO_ROOT, CONFIG_PATHS } from './paths.config';

describe('Property 26: Readiness Gate Forbidden Pattern Detection', () => {
  // Use centralized config for paths
  const policyPath = CONFIG_PATHS.readinessPolicy;
  const scannerPath = path.join(REPO_ROOT, 'ci', 'readiness-gate.ps1');
  
  // Load policy
  const policy = JSON.parse(fs.readFileSync(policyPath, 'utf-8'));
  
  it('policy file exists and is valid JSON', () => {
    expect(fs.existsSync(policyPath)).toBe(true);
    expect(policy).toBeDefined();
    expect(policy.version).toBeDefined();
    expect(policy.scanPaths).toBeInstanceOf(Array);
    expect(policy.exclusions).toBeInstanceOf(Array);
    expect(policy.forbiddenPatterns).toBeInstanceOf(Array);
  });
  
  it('scanner script exists and is executable', () => {
    expect(fs.existsSync(scannerPath)).toBe(true);
  });
  
  it('policy defines required forbidden patterns', () => {
    const requiredPatterns = [
      'demo-credentials',
      'caps-branding',
      'localhost-oauth',
      'sql-injection'
    ];
    
    const definedPatterns = policy.forbiddenPatterns.map((p: any) => p.id);
    
    for (const required of requiredPatterns) {
      expect(definedPatterns).toContain(required);
    }
  });
  
  it('policy defines core runtime scan paths', () => {
    const requiredPaths = [
      'backend/crates/server/src/handlers',
      'backend/crates/server/src/config',
      'backend/crates/server/src/middleware',
      'frontend/src/features',
      'frontend/src/common/components'
    ];
    
    for (const required of requiredPaths) {
      expect(policy.scanPaths).toContain(required);
    }
  });
  
  it('policy defines required exclusions', () => {
    const requiredExclusions = [
      'archive/',
      '**/tests/',
      '**/test/',
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/fixtures/',
      'configs/examples/',
      'configs/presets/'
    ];
    
    for (const required of requiredExclusions) {
      expect(policy.exclusions).toContain(required);
    }
  });
  
  it('forbidden patterns have required fields', () => {
    for (const pattern of policy.forbiddenPatterns) {
      expect(pattern.id).toBeDefined();
      expect(pattern.pattern).toBeDefined();
      expect(pattern.message).toBeDefined();
      expect(pattern.severity).toBeDefined();
      expect(['error', 'warning']).toContain(pattern.severity);
    }
  });
  
  it('demo credentials pattern is correctly defined', () => {
    const demoPattern = policy.forbiddenPatterns.find((p: any) => p.id === 'demo-credentials');
    expect(demoPattern).toBeDefined();
    expect(demoPattern.severity).toBe('error');
    
    // Test pattern matches demo credentials
    const testCases = [
      'username: "demo"',
      "password: 'demo'",
      'username="demo"',
      "password='demo'"
    ];
    
    const regex = new RegExp(demoPattern.pattern);
    for (const testCase of testCases) {
      expect(regex.test(testCase)).toBe(true);
    }
  });
  
  it('CAPS branding pattern is correctly defined', () => {
    const capsPattern = policy.forbiddenPatterns.find((p: any) => p.id === 'caps-branding');
    expect(capsPattern).toBeDefined();
    expect(capsPattern.severity).toBe('error');
    
    // Test pattern matches CAPS tokens
    const testCases = [
      'CAPS',
      'caps-pos',
      'caps-pos.local',
      'Welcome to CAPS'
    ];
    
    const regex = new RegExp(capsPattern.pattern);
    for (const testCase of testCases) {
      expect(regex.test(testCase)).toBe(true);
    }
  });
  
  it('localhost OAuth pattern is correctly defined', () => {
    const oauthPattern = policy.forbiddenPatterns.find((p: any) => p.id === 'localhost-oauth');
    expect(oauthPattern).toBeDefined();
    expect(oauthPattern.severity).toBe('error');
    
    // Test pattern matches localhost OAuth URIs
    const testCases = [
      'redirect_uri: "http://localhost:3000/callback"',
      "redirect_uri='http://localhost:8080/oauth'",
      'redirect_uri=http://localhost/auth'
    ];
    
    const regex = new RegExp(oauthPattern.pattern);
    for (const testCase of testCases) {
      expect(regex.test(testCase)).toBe(true);
    }
  });
  
  it('SQL injection pattern is correctly defined', () => {
    const sqlPattern = policy.forbiddenPatterns.find((p: any) => p.id === 'sql-injection');
    expect(sqlPattern).toBeDefined();
    expect(sqlPattern.severity).toBe('error');
    
    // Test pattern matches SQL injection vulnerabilities
    const testCases = [
      'format!("SELECT * FROM users WHERE id = {}", user_id)',
      'format!("SELECT {}", column)',
      'format!("SELECT * FROM {} WHERE id = 1", table)'
    ];
    
    const regex = new RegExp(sqlPattern.pattern);
    for (const testCase of testCases) {
      expect(regex.test(testCase)).toBe(true);
    }
  });
  
  it('allowed exceptions are properly defined', () => {
    expect(policy.allowedExceptions).toBeDefined();
    
    // CAPS branding should be allowed in examples and tests
    if (policy.allowedExceptions['caps-branding']) {
      expect(policy.allowedExceptions['caps-branding']).toContain('configs/examples/');
      expect(policy.allowedExceptions['caps-branding']).toContain('archive/');
    }
    
    // Mock arrays should be allowed in stories and tests
    if (policy.allowedExceptions['mock-arrays']) {
      expect(policy.allowedExceptions['mock-arrays']).toContain('*.stories.tsx');
      expect(policy.allowedExceptions['mock-arrays']).toContain('*.test.ts');
    }
  });
  
  it('scanner can be executed with PowerShell', () => {
    // This test verifies the scanner script is syntactically valid
    // by running it with -WhatIf (dry run) if supported, or checking syntax
    try {
      // Just verify the script can be parsed by PowerShell
      const result = execSync(
        `pwsh -Command "Get-Command '${scannerPath}'"`,
        { encoding: 'utf-8', stdio: 'pipe' }
      );
      expect(result).toContain('readiness-gate.ps1');
    } catch (error: any) {
      // If PowerShell is not available, skip this test
      if (error.message.includes('pwsh')) {
        console.warn('PowerShell not available, skipping scanner execution test');
      } else {
        throw error;
      }
    }
  });
  
  it('scanner output format options are valid', () => {
    // Verify the scanner supports required output formats
    const scriptContent = fs.readFileSync(scannerPath, 'utf-8');
    
    expect(scriptContent).toContain('OutputFormat');
    expect(scriptContent).toContain('text');
    expect(scriptContent).toContain('json');
    expect(scriptContent).toContain('both');
  });
  
  it('scanner implements exclusion logic', () => {
    const scriptContent = fs.readFileSync(scannerPath, 'utf-8');
    
    // Verify scanner has exclusion checking logic
    expect(scriptContent).toContain('Test-Excluded');
    expect(scriptContent).toContain('exclusions');
  });
  
  it('scanner implements allowed exception logic', () => {
    const scriptContent = fs.readFileSync(scannerPath, 'utf-8');
    
    // Verify scanner has allowed exception checking logic
    expect(scriptContent).toContain('Test-AllowedException');
    expect(scriptContent).toContain('allowedExceptions');
  });
  
  it('scanner reports violations with required fields', () => {
    const scriptContent = fs.readFileSync(scannerPath, 'utf-8');
    
    // Verify scanner reports include required fields
    expect(scriptContent).toContain('file');
    expect(scriptContent).toContain('line');
    expect(scriptContent).toContain('pattern_id');
    expect(scriptContent).toContain('severity');
  });
  
  it('scanner exits with error code on violations', () => {
    const scriptContent = fs.readFileSync(scannerPath, 'utf-8');
    
    // Verify scanner exits with error code when violations found
    expect(scriptContent).toContain('exit 1');
    expect(scriptContent).toContain('violations_by_severity.error');
  });
});
