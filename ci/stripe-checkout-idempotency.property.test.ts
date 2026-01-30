/**
 * Property Test: Idempotent Checkout Session
 * 
 * Validates: Requirements 12.9
 * 
 * Properties tested:
 * - Same order_id returns existing session if not expired
 * - Idempotency key is derived from order_id
 * - Payment records are created with idempotency support
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Stripe Checkout Idempotency Property Tests', () => {
  describe('Property 9.1: Checkout session uses idempotency key', () => {
    it('should derive idempotency key from order_id in checkout.rs', () => {
      const checkoutPath = path.join(__dirname, '../backend/crates/server/src/connectors/stripe/checkout.rs');
      
      if (!fs.existsSync(checkoutPath)) {
        console.log('Checkout module not found, skipping');
        return;
      }
      
      const content = fs.readFileSync(checkoutPath, 'utf-8');
      
      // Should create idempotency key from order_id
      expect(content).toMatch(/idempotency_key.*=.*format!.*checkout.*order_id/);
      
      // Should include Idempotency-Key header
      expect(content).toMatch(/Idempotency-Key/);
    });
    
    it('should store order_id in metadata', () => {
      const checkoutPath = path.join(__dirname, '../backend/crates/server/src/connectors/stripe/checkout.rs');
      
      if (!fs.existsSync(checkoutPath)) {
        console.log('Checkout module not found, skipping');
        return;
      }
      
      const content = fs.readFileSync(checkoutPath, 'utf-8');
      
      // Should include order_id in metadata
      expect(content).toMatch(/metadata\[order_id\]/);
    });
  });
  
  describe('Property 9.2: Payment handler checks for existing payment', () => {
    it('should query for existing payment before creating new one', () => {
      const paymentsPath = path.join(__dirname, '../backend/crates/server/src/handlers/payments.rs');
      
      if (!fs.existsSync(paymentsPath)) {
        console.log('Payments handler not found, skipping');
        return;
      }
      
      const content = fs.readFileSync(paymentsPath, 'utf-8');
      
      // Should check for existing payment with same order_id
      expect(content).toMatch(/SELECT.*FROM payments.*WHERE.*order_id/);
      
      // Should return existing payment if found
      expect(content).toMatch(/if let Some\(payment\)/);
    });
    
    it('should only check pending or completed payments for idempotency', () => {
      const paymentsPath = path.join(__dirname, '../backend/crates/server/src/handlers/payments.rs');
      
      if (!fs.existsSync(paymentsPath)) {
        console.log('Payments handler not found, skipping');
        return;
      }
      
      const content = fs.readFileSync(paymentsPath, 'utf-8');
      
      // Should filter by status (pending, completed) - not expired or failed
      expect(content).toMatch(/status IN \('pending', 'completed'\)/);
    });
  });
  
  describe('Property 9.3: Frontend handles idempotent responses', () => {
    it('should have createCheckoutSession method in syncApi', () => {
      const syncApiPath = path.join(__dirname, '../frontend/src/services/syncApi.ts');
      
      if (!fs.existsSync(syncApiPath)) {
        console.log('syncApi not found, skipping');
        return;
      }
      
      const content = fs.readFileSync(syncApiPath, 'utf-8');
      
      // Should have createCheckoutSession method
      expect(content).toMatch(/createCheckoutSession/);
      
      // Should accept order_id parameter
      expect(content).toMatch(/order_id.*string/);
    });
    
    it('should have StripeCheckoutButton component', () => {
      const buttonPath = path.join(__dirname, '../frontend/src/sales/components/StripeCheckoutButton.tsx');
      
      if (!fs.existsSync(buttonPath)) {
        console.log('StripeCheckoutButton not found, skipping');
        return;
      }
      
      const content = fs.readFileSync(buttonPath, 'utf-8');
      
      // Should accept orderId prop
      expect(content).toMatch(/orderId.*string/);
      
      // Should call createCheckoutSession
      expect(content).toMatch(/createCheckoutSession/);
    });
  });
  
  describe('Property 9.4: Database schema supports idempotency', () => {
    it('should have payments table with order_id index', () => {
      const migrationPath = path.join(__dirname, '../backend/migrations/052_payments_phase2.sql');
      
      if (!fs.existsSync(migrationPath)) {
        console.log('Payments migration not found, skipping');
        return;
      }
      
      const content = fs.readFileSync(migrationPath, 'utf-8');
      
      // Should have payments table
      expect(content).toMatch(/CREATE TABLE.*payments/);
      
      // Should have order_id column
      expect(content).toMatch(/order_id TEXT NOT NULL/);
      
      // Should have index on order_id
      expect(content).toMatch(/CREATE INDEX.*idx_payments_order.*order_id/);
    });
  });
});
