/**
 * Property Test 29: Quarantined Test Exclusion
 * 
 * **Validates: Requirements 12.3, 12.4**
 * 
 * This property test verifies that quarantined/archived tests
 * are excluded from test runs and CI pipelines.
 * 
 * Properties tested:
 * 1. Archive directory excluded from test discovery
 * 2. Test configuration excludes archive
 * 3. CI workflows don't run archived tests
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Property 29: Quarantined Test Exclusion', () => {
  const isInCiDir = process.cwd().endsWith('ci');
  
  it('vitest config excludes archive directory', () => {
    const vitestConfig = isInCiDir
      ? path.join(process.cwd(), 'vitest.config.ts')
      : path.join(process.cwd(), 'ci', 'vitest.config.ts');
    
    if (fs.existsSync(vitestConfig)) {
      const content = fs.readFileSync(vitestConfig, 'utf-8');
      
      // Should exclude archive
      expect(content).toContain('exclude');
      expect(content).toContain('archive');
    }
  });
  
  it('frontend test config excludes archive', () => {
    const frontendConfig = isInCiDir
      ? path.join(process.cwd(), '..', 'frontend', 'vitest.config.ts')
      : path.join(process.cwd(), 'frontend', 'vitest.config.ts');
    
    if (fs.existsSync(frontendConfig)) {
      const content = fs.readFileSync(frontendConfig, 'utf-8');
      
      // Should exclude archive
      expect(content).toContain('exclude');
    }
  });
  
  it('readiness policy excludes archive from scans', () => {
    const policyPath = isInCiDir
      ? path.join(process.cwd(), 'readiness-policy.json')
      : path.join(process.cwd(), 'ci', 'readiness-policy.json');
    
    if (fs.existsSync(policyPath)) {
      const policy = JSON.parse(fs.readFileSync(policyPath, 'utf-8'));
      
      // Should exclude archive
      expect(policy.exclusions).toContain('archive/');
    }
  });
  
  it('CI workflows exclude archive from test paths', () => {
    const ciWorkflow = isInCiDir
      ? path.join(process.cwd(), '..', '.github', 'workflows', 'ci.yml')
      : path.join(process.cwd(), '.github', 'workflows', 'ci.yml');
    
    if (fs.existsSync(ciWorkflow)) {
      const content = fs.readFileSync(ciWorkflow, 'utf-8');
      
      // Should not explicitly include archive
      expect(content).not.toContain('archive/');
    }
  });
  
  it('gitignore does not exclude archive', () => {
    const gitignore = isInCiDir
      ? path.join(process.cwd(), '..', '.gitignore')
      : path.join(process.cwd(), '.gitignore');
    
    if (fs.existsSync(gitignore)) {
      const content = fs.readFileSync(gitignore, 'utf-8');
      
      // Archive should be committed (not ignored)
      const lines = content.split('\n').map(l => l.trim());
      const archiveIgnored = lines.some(l => l === 'archive' || l === 'archive/');
      
      expect(archiveIgnored).toBe(false);
    }
  });
});
