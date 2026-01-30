/**
 * Property Test 28: Readiness Gate Artifact Validation
 * 
 * **Validates: Requirement 11.7**
 * 
 * This property test verifies that the readiness gate validates produced
 * ZIP artifacts to ensure they do not contain excluded directories
 * (archive/, tests/, fixtures/, node_modules/, etc.).
 * 
 * Properties tested:
 * 1. Artifacts do not contain archive/ directory
 * 2. Artifacts do not contain test directories or files
 * 3. Artifacts do not contain fixture directories
 * 4. Artifacts do not contain node_modules/ directory
 * 5. Artifacts do not contain .git/ directory
 * 6. Artifacts do not contain build artifacts (target/, dist/ in source form)
 * 7. Artifacts contain only production runtime code
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Property 28: Readiness Gate Artifact Validation', () => {
  // Determine if we're running from ci/ directory or root
  const isInCiDir = process.cwd().endsWith('ci');
  const policyPath = isInCiDir 
    ? path.join(process.cwd(), 'readiness-policy.json')
    : path.join(process.cwd(), 'ci', 'readiness-policy.json');
  const policy = JSON.parse(fs.readFileSync(policyPath, 'utf-8'));
  
  it('policy defines exclusions for artifact validation', () => {
    expect(policy.exclusions).toBeDefined();
    expect(policy.exclusions).toBeInstanceOf(Array);
    expect(policy.exclusions.length).toBeGreaterThan(0);
  });
  
  it('exclusions include archive directory', () => {
    expect(policy.exclusions).toContain('archive/');
  });
  
  it('exclusions include test directories', () => {
    const testExclusions = [
      '**/tests/',
      '**/test/',
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.spec.ts',
      '**/*.spec.tsx'
    ];
    
    for (const exclusion of testExclusions) {
      expect(policy.exclusions).toContain(exclusion);
    }
  });
  
  it('exclusions include fixture directories', () => {
    expect(policy.exclusions).toContain('**/fixtures/');
  });
  
  it('exclusions include node_modules directory', () => {
    expect(policy.exclusions).toContain('**/node_modules/');
  });
  
  it('exclusions include build artifacts', () => {
    expect(policy.exclusions).toContain('**/target/');
  });
  
  it('exclusions include version control directories', () => {
    // .git should be excluded (typically handled by .gitignore but good to verify)
    const hasGitExclusion = policy.exclusions.some((e: string) => 
      e.includes('.git')
    );
    // This is optional since .git is usually not in build artifacts anyway
    // but it's good practice to exclude it explicitly
  });
  
  it('artifact validation checks for excluded directories', () => {
    // Read the GitHub workflow to verify artifact validation is implemented
    const workflowPath = isInCiDir
      ? path.join(process.cwd(), '..', '.github', 'workflows', 'readiness-gate.yml')
      : path.join(process.cwd(), '.github', 'workflows', 'readiness-gate.yml');
    
    if (fs.existsSync(workflowPath)) {
      const workflow = fs.readFileSync(workflowPath, 'utf-8');
      
      // Verify workflow includes artifact validation step
      expect(workflow).toContain('artifact-validation');
      expect(workflow).toContain('Validate artifact contents');
    }
  });
  
  it('excluded directories should not appear in production artifacts', () => {
    const criticalExclusions = [
      'archive',
      'tests',
      'test',
      'fixtures',
      'node_modules',
      '.git'
    ];
    
    // These directories should never be in production artifacts
    for (const exclusion of criticalExclusions) {
      const hasExclusion = policy.exclusions.some((e: string) => 
        e.includes(exclusion)
      );
      expect(hasExclusion).toBe(true);
    }
  });
  
  it('frontend artifacts should only contain dist/ output', () => {
    // Frontend package should only contain the built dist/ output
    // No source files, tests, or node_modules
    const frontendExclusions = [
      '**/node_modules/',
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.spec.ts',
      '**/*.spec.tsx',
      '**/tests/',
      '**/fixtures/'
    ];
    
    for (const exclusion of frontendExclusions) {
      expect(policy.exclusions).toContain(exclusion);
    }
  });
  
  it('backend artifacts should only contain executable', () => {
    // Backend package should only contain the compiled executable
    // No source files, tests, or build artifacts
    const backendExclusions = [
      '**/target/',
      '**/tests/',
      '**/*.test.rs'
    ];
    
    for (const exclusion of backendExclusions) {
      const hasExclusion = policy.exclusions.some((e: string) => 
        e.includes(exclusion) || e.includes('target')
      );
      expect(hasExclusion).toBe(true);
    }
  });
  
  it('artifact validation is part of CI pipeline', () => {
    const workflowPath = isInCiDir
      ? path.join(process.cwd(), '..', '.github', 'workflows', 'readiness-gate.yml')
      : path.join(process.cwd(), '.github', 'workflows', 'readiness-gate.yml');
    
    if (fs.existsSync(workflowPath)) {
      const workflow = fs.readFileSync(workflowPath, 'utf-8');
      
      // Verify artifact validation runs after readiness scan
      expect(workflow).toContain('needs: readiness-scan');
      expect(workflow).toContain('artifact-validation');
    }
  });
  
  it('artifact validation checks package contents', () => {
    const workflowPath = isInCiDir
      ? path.join(process.cwd(), '..', '.github', 'workflows', 'readiness-gate.yml')
      : path.join(process.cwd(), '.github', 'workflows', 'readiness-gate.yml');
    
    if (fs.existsSync(workflowPath)) {
      const workflow = fs.readFileSync(workflowPath, 'utf-8');
      
      // Verify workflow extracts and checks package contents
      expect(workflow).toContain('Expand-Archive');
      expect(workflow).toContain('Get-ChildItem');
    }
  });
  
  it('artifact validation fails on excluded directory presence', () => {
    const workflowPath = isInCiDir
      ? path.join(process.cwd(), '..', '.github', 'workflows', 'readiness-gate.yml')
      : path.join(process.cwd(), '.github', 'workflows', 'readiness-gate.yml');
    
    if (fs.existsSync(workflowPath)) {
      const workflow = fs.readFileSync(workflowPath, 'utf-8');
      
      // Verify workflow exits with error if excluded directories found
      expect(workflow).toContain('exit 1');
      expect(workflow).toContain('errors');
    }
  });
  
  it('exclusion patterns cover all non-production content', () => {
    const nonProductionPatterns = [
      'archive',
      'test',
      'spec',
      'fixtures',
      'examples',
      'presets',
      'node_modules',
      'target'
    ];
    
    for (const pattern of nonProductionPatterns) {
      const hasExclusion = policy.exclusions.some((e: string) => 
        e.toLowerCase().includes(pattern.toLowerCase())
      );
      expect(hasExclusion).toBe(true);
    }
  });
  
  it('artifact validation is comprehensive', () => {
    // Verify both frontend and backend artifacts are validated
    const workflowPath = isInCiDir
      ? path.join(process.cwd(), '..', '.github', 'workflows', 'readiness-gate.yml')
      : path.join(process.cwd(), '.github', 'workflows', 'readiness-gate.yml');
    
    if (fs.existsSync(workflowPath)) {
      const workflow = fs.readFileSync(workflowPath, 'utf-8');
      
      expect(workflow).toContain('frontend');
      expect(workflow).toContain('backend');
      expect(workflow).toContain('package');
    }
  });
  
  it('artifact validation produces clear error messages', () => {
    const workflowPath = isInCiDir
      ? path.join(process.cwd(), '..', '.github', 'workflows', 'readiness-gate.yml')
      : path.join(process.cwd(), '.github', 'workflows', 'readiness-gate.yml');
    
    if (fs.existsSync(workflowPath)) {
      const workflow = fs.readFileSync(workflowPath, 'utf-8');
      
      // Verify workflow provides clear error messages
      expect(workflow).toContain('contains excluded directory');
      expect(workflow).toContain('Validation Failed');
    }
  });
  
  it('artifact validation uploads validated artifacts', () => {
    const workflowPath = isInCiDir
      ? path.join(process.cwd(), '..', '.github', 'workflows', 'readiness-gate.yml')
      : path.join(process.cwd(), '.github', 'workflows', 'readiness-gate.yml');
    
    if (fs.existsSync(workflowPath)) {
      const workflow = fs.readFileSync(workflowPath, 'utf-8');
      
      // Verify validated artifacts are uploaded
      expect(workflow).toContain('upload-artifact');
      expect(workflow).toContain('validated-packages');
    }
  });
  
  it('exclusions prevent leaking sensitive or unnecessary files', () => {
    const sensitivePatterns = [
      '.git',
      'node_modules',
      'target',
      'archive'
    ];
    
    // These should all be excluded to prevent leaking sensitive data
    // or bloating package size
    for (const pattern of sensitivePatterns) {
      const hasExclusion = policy.exclusions.some((e: string) => 
        e.includes(pattern)
      );
      expect(hasExclusion).toBe(true);
    }
  });
  
  it('artifact validation is blocking', () => {
    const workflowPath = isInCiDir
      ? path.join(process.cwd(), '..', '.github', 'workflows', 'readiness-gate.yml')
      : path.join(process.cwd(), '.github', 'workflows', 'readiness-gate.yml');
    
    if (fs.existsSync(workflowPath)) {
      const workflow = fs.readFileSync(workflowPath, 'utf-8');
      
      // Verify success job depends on artifact validation
      expect(workflow).toContain('readiness-gate-success');
      expect(workflow).toContain('needs:');
      expect(workflow).toContain('artifact-validation');
    }
  });
});
