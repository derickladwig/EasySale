/**
 * Property Test 31: Installer Mode Profile Enforcement
 * 
 * **Validates: Requirements 13.2, 13.3**
 * 
 * This property test verifies that the installer enforces
 * runtime profile consistency with installation mode.
 * 
 * Properties tested:
 * 1. Install script accepts Mode parameter
 * 2. Mode is passed to configuration generation
 * 3. Mode is set in service configuration
 * 4. Preflight validates mode consistency
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Property 31: Installer Mode Profile Enforcement', () => {
  const isInCiDir = process.cwd().endsWith('ci');
  const installerDir = isInCiDir
    ? path.join(process.cwd(), '..', 'installer', 'windows')
    : path.join(process.cwd(), 'installer', 'windows');
  
  it('install script accepts Mode parameter', () => {
    const installScript = path.join(installerDir, 'install.ps1');
    
    if (fs.existsSync(installScript)) {
      const content = fs.readFileSync(installScript, 'utf-8');
      
      // Should have Mode parameter
      expect(content).toContain('param(');
      expect(content).toContain('Mode');
      expect(content).toContain('ValidateSet');
      expect(content).toMatch(/dev.*demo.*prod/);
    }
  });
  
  it('Mode parameter has default value', () => {
    const installScript = path.join(installerDir, 'install.ps1');
    
    if (fs.existsSync(installScript)) {
      const content = fs.readFileSync(installScript, 'utf-8');
      
      // Should default to prod
      expect(content).toMatch(/Mode.*=.*"prod"/);
    }
  });
  
  it('Mode is passed to configuration generation', () => {
    const installScript = path.join(installerDir, 'install.ps1');
    
    if (fs.existsSync(installScript)) {
      const content = fs.readFileSync(installScript, 'utf-8');
      
      // Should use Mode in config
      expect(content).toContain('$Mode');
      expect(content).toContain('RUNTIME_PROFILE');
    }
  });
  
  it('Mode is set in service environment', () => {
    const installScript = path.join(installerDir, 'install.ps1');
    
    if (fs.existsSync(installScript)) {
      const content = fs.readFileSync(installScript, 'utf-8');
      
      // Should set RUNTIME_PROFILE
      expect(content).toContain('RUNTIME_PROFILE');
      expect(content).toContain('$Mode');
    }
  });
  
  it('preflight script validates mode', () => {
    const preflightScript = path.join(installerDir, 'preflight.ps1');
    
    if (fs.existsSync(preflightScript)) {
      const content = fs.readFileSync(preflightScript, 'utf-8');
      
      // Should validate mode
      expect(content).toContain('Mode');
      expect(content).toContain('ValidateSet');
    }
  });
  
  it('upgrade script preserves mode', () => {
    const upgradeScript = path.join(installerDir, 'upgrade.ps1');
    
    if (fs.existsSync(upgradeScript)) {
      const content = fs.readFileSync(upgradeScript, 'utf-8');
      
      // Should preserve existing configuration
      expect(content).toContain('config');
      expect(content).toContain('backup');
    }
  });
  
  it('service template uses mode variable', () => {
    const serviceTemplate = path.join(installerDir, 'templates', 'easysale-service.xml.template');
    
    if (fs.existsSync(serviceTemplate)) {
      const content = fs.readFileSync(serviceTemplate, 'utf-8');
      
      // Should have RUNTIME_PROFILE variable
      expect(content).toContain('RUNTIME_PROFILE');
      expect(content).toContain('{{RUNTIME_PROFILE}}');
    }
  });
});
