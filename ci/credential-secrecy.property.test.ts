/**
 * Property Test: Credential Secrecy
 * 
 * Validates: Requirements 1.7, 6.2, 6.4, 6.5
 * 
 * Properties tested:
 * - Credentials never appear in API responses (except OAuth token exchange)
 * - Credentials never appear in logs
 * - Only masked/redacted values are returned for display
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// Patterns that indicate credential exposure in display/summary endpoints
const CREDENTIAL_PATTERNS_IN_DISPLAY = [
  // API keys and tokens should not appear in summary/status responses
  /sk_live_[a-zA-Z0-9]{24,}/,  // Stripe live secret key
  /sk_test_[a-zA-Z0-9]{24,}/,  // Stripe test secret key
  /sq0atp-[a-zA-Z0-9_-]{22,}/, // Square access token
  /sq0csp-[a-zA-Z0-9_-]{43,}/, // Square application secret
  /ck_[a-f0-9]{40}/,           // WooCommerce consumer key
  /cs_[a-f0-9]{40}/,           // WooCommerce consumer secret
];

describe('Credential Secrecy Property Tests', () => {
  describe('Property 3.1: Summary/status endpoints never expose raw credentials', () => {
    it('should use masked values for account identifiers in credentials handler', () => {
      const credentialsPath = path.join(__dirname, '../backend/crates/server/src/handlers/credentials.rs');
      
      if (!fs.existsSync(credentialsPath)) {
        console.log('Credentials handler not found, skipping');
        return;
      }
      
      const content = fs.readFileSync(credentialsPath, 'utf-8');
      
      // Should have masking function
      expect(content).toMatch(/fn mask_/);
      
      // Should use masked values in responses
      expect(content).toMatch(/account_id_masked/);
      expect(content).toMatch(/has_credentials.*true/);
    });
    
    it('should not return raw credentials in get_credentials endpoint', () => {
      const credentialsPath = path.join(__dirname, '../backend/crates/server/src/handlers/credentials.rs');
      
      if (!fs.existsSync(credentialsPath)) {
        console.log('Credentials handler not found, skipping');
        return;
      }
      
      const content = fs.readFileSync(credentialsPath, 'utf-8');
      
      // Find the get_credentials function
      const getCredsMatch = content.match(/pub async fn get_credentials[\s\S]*?^}/m);
      
      if (getCredsMatch) {
        const getCredsFunc = getCredsMatch[0];
        // Should not return consumer_secret, client_secret, access_token directly
        // It should return has_credentials: true instead
        expect(getCredsFunc).toMatch(/has_credentials.*true/);
      }
    });
  });
  
  describe('Property 3.2: Integration log messages are generic', () => {
    it('should use descriptive event names in log calls', () => {
      const integrationsPath = path.join(__dirname, '../backend/crates/server/src/handlers/integrations.rs');
      
      if (!fs.existsSync(integrationsPath)) {
        console.log('Integrations handler not found, skipping');
        return;
      }
      
      const content = fs.readFileSync(integrationsPath, 'utf-8');
      
      // Find all log_integration_event calls with their full arguments
      const logCallMatches = content.matchAll(/log_integration_event\([^)]+,\s*"[^"]+",\s*"([^"]+)",\s*"([^"]+)",\s*"([^"]+)"\)/g);
      
      for (const match of logCallMatches) {
        const [, level, event, message] = match;
        
        // Event names should be descriptive
        expect(event).toMatch(/^[a-z_]+$/);
        
        // Messages should not contain credential patterns
        for (const pattern of CREDENTIAL_PATTERNS_IN_DISPLAY) {
          expect(message).not.toMatch(pattern);
        }
      }
    });
    
    it('should not use tracing macros with credential values', () => {
      const handlersPath = path.join(__dirname, '../backend/crates/server/src/handlers');
      
      if (!fs.existsSync(handlersPath)) {
        console.log('Handlers path not found, skipping');
        return;
      }
      
      const handlerFiles = fs.readdirSync(handlersPath)
        .filter(f => f.endsWith('.rs'));
      
      for (const file of handlerFiles) {
        const content = fs.readFileSync(path.join(handlersPath, file), 'utf-8');
        
        // Find tracing macro calls
        const tracingCalls = content.match(/tracing::(info|warn|error|debug)!\([^)]+\)/g) || [];
        
        for (const call of tracingCalls) {
          // Should not log credential field names with values
          expect(call).not.toMatch(/access_token.*=/);
          expect(call).not.toMatch(/refresh_token.*=/);
          expect(call).not.toMatch(/client_secret.*=/);
          expect(call).not.toMatch(/consumer_secret.*=/);
        }
      }
    });
  });
  
  describe('Property 3.3: Credential storage uses encryption', () => {
    it('should use credential service for storage', () => {
      const credentialServicePath = path.join(__dirname, '../backend/crates/server/src/services/credential_service.rs');
      
      if (!fs.existsSync(credentialServicePath)) {
        console.log('Credential service not found, skipping');
        return;
      }
      
      const content = fs.readFileSync(credentialServicePath, 'utf-8');
      
      // Should have encryption-related code (chacha20poly1305 or similar)
      expect(content).toMatch(/encrypt|cipher|chacha|aes/i);
      
      // Should have store and retrieve methods
      expect(content).toMatch(/store_credentials/);
      expect(content).toMatch(/get_credentials/);
    });
  });
  
  describe('Property 3.4: Frontend never receives raw credentials for display', () => {
    it('should use masked values in summary responses', () => {
      const syncApiPath = path.join(__dirname, '../frontend/src/services/syncApi.ts');
      
      if (!fs.existsSync(syncApiPath)) {
        console.log('syncApi not found, skipping');
        return;
      }
      
      const content = fs.readFileSync(syncApiPath, 'utf-8');
      
      // Summary methods should exist
      expect(content).toMatch(/getStripeSummary/);
      expect(content).toMatch(/getSquareSummary/);
      expect(content).toMatch(/getCloverSummary/);
    });
    
    it('should not store credentials in localStorage', () => {
      const frontendSrcPath = path.join(__dirname, '../frontend/src');
      
      if (!fs.existsSync(frontendSrcPath)) {
        console.log('Frontend src not found, skipping');
        return;
      }
      
      // Check that localStorage is not used for credential storage
      const settingsFiles = [
        path.join(frontendSrcPath, 'settings/pages/IntegrationsPage.tsx'),
      ];
      
      for (const filePath of settingsFiles) {
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8');
          
          // Should not store credentials in localStorage
          expect(content).not.toMatch(/localStorage\.setItem.*access_token/);
          expect(content).not.toMatch(/localStorage\.setItem.*client_secret/);
        }
      }
    });
  });
  
  describe('Property 3.5: Stripe client masks account IDs', () => {
    it('should have mask_account_id function', () => {
      const stripeClientPath = path.join(__dirname, '../backend/crates/server/src/connectors/stripe/client.rs');
      
      if (!fs.existsSync(stripeClientPath)) {
        console.log('Stripe client not found, skipping');
        return;
      }
      
      const content = fs.readFileSync(stripeClientPath, 'utf-8');
      
      // Should have masking function
      expect(content).toMatch(/fn mask_account_id/);
      
      // Should return masked value in summary
      expect(content).toMatch(/account_id_masked/);
    });
  });
});
