/**
 * Property Test 14: OAuth Configuration Source
 * 
 * **Validates: Requirements 5.3**
 * 
 * This property test verifies that OAuth redirect URIs come from configuration/environment
 * and are not hardcoded in source code.
 * 
 * Properties tested:
 * 1. No hardcoded localhost OAuth redirect URIs in source
 * 2. OAuth handlers read redirect URIs from config/env
 * 3. OAuth configuration is externalized
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

describe('Property 14: OAuth Configuration Source', () => {
  it('should not have hardcoded localhost OAuth redirect URIs', () => {
    const handlersDir = path.join(
      REPO_ROOT,
      'backend/crates/server/src/handlers'
    );
    
    const oauthFiles = fs.readdirSync(handlersDir)
      .filter(f => f.includes('oauth') || f.includes('integrations'))
      .filter(f => f.endsWith('.rs'));
    
    expect(oauthFiles.length, 'Should have OAuth handler files').toBeGreaterThan(0);
    
    const violations: string[] = [];
    
    for (const file of oauthFiles) {
      const filePath = path.join(handlersDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();
        
        // Skip comments (lines starting with // or containing // before the match)
        if (trimmedLine.startsWith('//')) continue;
        
        // Check for hardcoded localhost redirect URIs in string literals
        // Pattern: "http://localhost..." or "http://127.0.0.1..." as a string value
        const hardcodedPattern = /["']https?:\/\/(localhost|127\.0\.0\.1)[^"']*["']/;
        
        if (line.includes('redirect_uri') && hardcodedPattern.test(line)) {
          // Make sure it's not in a comment section of the line
          const commentIndex = line.indexOf('//');
          const matchIndex = line.search(hardcodedPattern);
          
          if (commentIndex === -1 || matchIndex < commentIndex) {
            violations.push(`${file}:${i + 1}: Hardcoded localhost redirect URI`);
          }
        }
      }
    }
    
    expect(
      violations,
      `OAuth redirect URIs should not be hardcoded:\n${violations.join('\n')}`
    ).toHaveLength(0);
  });

  it('should read OAuth redirect URIs from config or environment', () => {
    const handlersDir = path.join(
      REPO_ROOT,
      'backend/crates/server/src/handlers'
    );
    
    const oauthFiles = fs.readdirSync(handlersDir)
      .filter(f => f.includes('oauth') || f.includes('integrations'))
      .filter(f => f.endsWith('.rs'));
    
    let foundConfigUsage = false;
    
    for (const file of oauthFiles) {
      const filePath = path.join(handlersDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Check if file reads redirect URI from config or env
      // Pattern 1: config.something with redirect_uri
      const readsFromConfig = content.includes('config.') && content.includes('redirect_uri');
      // Pattern 2: std::env::var("..._REDIRECT_URI") - the actual pattern used
      const readsFromEnv = content.includes('env::var') && content.includes('REDIRECT_URI');
      // Pattern 3: settings with redirect_uri
      const readsFromSettings = content.includes('settings') && content.includes('redirect_uri');
      
      if (readsFromConfig || readsFromEnv || readsFromSettings) {
        foundConfigUsage = true;
        break;
      }
    }
    
    expect(
      foundConfigUsage,
      'OAuth handlers should read redirect URIs from config or environment'
    ).toBe(true);
  });

  it('should have OAuth configuration in config module', () => {
    const configPath = path.join(
      REPO_ROOT,
      'backend/crates/server/src/config'
    );
    
    if (!fs.existsSync(configPath)) {
      // Config module doesn't exist, skip
      return;
    }
    
    const configFiles = fs.readdirSync(configPath)
      .filter(f => f.endsWith('.rs'));
    
    let hasOAuthConfig = false;
    
    for (const file of configFiles) {
      const filePath = path.join(configPath, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Check for OAuth-related configuration fields
      if (content.includes('oauth') || 
          content.includes('redirect_uri') ||
          content.includes('quickbooks') ||
          content.includes('google_drive')) {
        hasOAuthConfig = true;
        break;
      }
    }
    
    expect(
      hasOAuthConfig,
      'Config module should include OAuth configuration'
    ).toBe(true);
  });

  it('should not have hardcoded OAuth client secrets', () => {
    const handlersDir = path.join(
      REPO_ROOT,
      'backend/crates/server/src/handlers'
    );
    
    const oauthFiles = fs.readdirSync(handlersDir)
      .filter(f => f.includes('oauth') || f.includes('integrations'))
      .filter(f => f.endsWith('.rs'));
    
    const violations: string[] = [];
    
    for (const file of oauthFiles) {
      const filePath = path.join(handlersDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Check for hardcoded secrets (common patterns)
        if ((line.includes('client_secret') || line.includes('CLIENT_SECRET')) &&
            line.includes('=') &&
            line.includes('"') &&
            !line.includes('env::var') &&
            !line.includes('config.') &&
            !line.includes('//')) { // Not a comment
          
          // Check if it's actually a hardcoded value (not a variable assignment from config)
          if (line.match(/"[A-Za-z0-9_-]{20,}"/)) {
            violations.push(`${file}:${i + 1}: Potential hardcoded OAuth client secret`);
          }
        }
      }
    }
    
    expect(
      violations,
      `OAuth client secrets should not be hardcoded:\n${violations.join('\n')}`
    ).toHaveLength(0);
  });
});
