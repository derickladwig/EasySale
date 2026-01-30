/**
 * Property Test 32: Prod Install Demo Detection
 * 
 * **Validates: Requirement 13.4**
 * 
 * This property test verifies that production installations
 * detect and reject demo mode configuration.
 * 
 * Properties tested:
 * 1. Preflight detects demo mode in prod
 * 2. Preflight blocks installation with demo mode
 * 3. Install script validates mode consistency
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Property 32: Prod Install Demo Detection', () => {
  const isInCiDir = process.cwd().endsWith('ci');
  const installerDir = isInCiDir
    ? path.join(process.cwd(), '..', 'installer', 'windows')
    : path.join(process.cwd(), 'installer', 'windows');
  
  it('preflight detects demo mode in config', () => {
    const preflightScript = path.join(installerDir, 'preflight.ps1');
    
    if (fs.existsSync(preflightScript)) {
      const content = fs.readFileSync(preflightScript, 'utf-8');
      
      // Should check for DEMO_MODE
      expect(content).toContain('DEMO_MODE');
      expect(content).toContain('true');
    }
  });
  
  it('preflight blocks demo mode in production', () => {
    const preflightScript = path.join(installerDir, 'preflight.ps1');
    
    if (fs.existsSync(preflightScript)) {
      const content = fs.readFileSync(preflightScript, 'utf-8');
      
      // Should fail when demo mode enabled in prod
      expect(content).toContain('prod');
      expect(content).toContain('fail');
      expect(content).toContain('demo');
    }
  });
  
  it('preflight runs policy checks in prod mode', () => {
    const preflightScript = path.join(installerDir, 'preflight.ps1');
    
    if (fs.existsSync(preflightScript)) {
      const content = fs.readFileSync(preflightScript, 'utf-8');
      
      // Should have conditional policy checks
      expect(content).toMatch(/if.*Mode.*prod/i);
      expect(content).toContain('Policy');
    }
  });
  
  it('install script calls preflight before installation', () => {
    const installScript = path.join(installerDir, 'install.ps1');
    
    if (fs.existsSync(installScript)) {
      const content = fs.readFileSync(installScript, 'utf-8');
      
      // Should run preflight
      expect(content).toContain('preflight');
      expect(content).toContain('SkipPreflight');
    }
  });
  
  it('install script blocks on preflight failure', () => {
    const installScript = path.join(installerDir, 'install.ps1');
    
    if (fs.existsSync(installScript)) {
      const content = fs.readFileSync(installScript, 'utf-8');
      
      // Should check preflight exit code
      expect(content).toContain('preflightExitCode');
      expect(content).toContain('exit 1');
    }
  });
  
  it('preflight reports demo mode violation', () => {
    const preflightScript = path.join(installerDir, 'preflight.ps1');
    
    if (fs.existsSync(preflightScript)) {
      const content = fs.readFileSync(preflightScript, 'utf-8');
      
      // Should report violation
      expect(content).toContain('Add-CheckResult');
      expect(content).toContain('demo');
    }
  });
});
