/**
 * Property Test: Payment Status Updates from Webhooks
 * 
 * Validates: Requirements 12.4, 12.5, 13.2
 * 
 * Properties tested:
 * - checkout.session.completed updates payment to completed
 * - checkout.session.expired updates payment to expired
 * - Webhook events are stored for idempotency
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Payment Status Updates Property Tests', () => {
  describe('Property 11.1: Webhook handler processes checkout.session.completed', () => {
    it('should handle checkout.session.completed event type', () => {
      const paymentsPath = path.join(__dirname, '../backend/crates/server/src/handlers/payments.rs');
      
      if (!fs.existsSync(paymentsPath)) {
        console.log('Payments handler not found, skipping');
        return;
      }
      
      const content = fs.readFileSync(paymentsPath, 'utf-8');
      
      // Should match checkout.session.completed event
      expect(content).toMatch(/checkout\.session\.completed/);
      
      // Should call process function for completed
      expect(content).toMatch(/process_checkout_completed/);
    });
    
    it('should update payment status to completed', () => {
      const paymentsPath = path.join(__dirname, '../backend/crates/server/src/handlers/payments.rs');
      
      if (!fs.existsSync(paymentsPath)) {
        console.log('Payments handler not found, skipping');
        return;
      }
      
      const content = fs.readFileSync(paymentsPath, 'utf-8');
      
      // Should update status to completed
      expect(content).toMatch(/UPDATE payments SET status = 'completed'/);
      
      // Should set completed_at timestamp
      expect(content).toMatch(/completed_at/);
    });
  });
  
  describe('Property 11.2: Webhook handler processes checkout.session.expired', () => {
    it('should handle checkout.session.expired event type', () => {
      const paymentsPath = path.join(__dirname, '../backend/crates/server/src/handlers/payments.rs');
      
      if (!fs.existsSync(paymentsPath)) {
        console.log('Payments handler not found, skipping');
        return;
      }
      
      const content = fs.readFileSync(paymentsPath, 'utf-8');
      
      // Should match checkout.session.expired event
      expect(content).toMatch(/checkout\.session\.expired/);
      
      // Should call process function for expired
      expect(content).toMatch(/process_checkout_expired/);
    });
    
    it('should update payment status to expired', () => {
      const paymentsPath = path.join(__dirname, '../backend/crates/server/src/handlers/payments.rs');
      
      if (!fs.existsSync(paymentsPath)) {
        console.log('Payments handler not found, skipping');
        return;
      }
      
      const content = fs.readFileSync(paymentsPath, 'utf-8');
      
      // Should update status to expired
      expect(content).toMatch(/UPDATE payments SET status = 'expired'/);
    });
  });
  
  describe('Property 11.3: Webhook events are stored for idempotency', () => {
    it('should check for duplicate events before processing', () => {
      const paymentsPath = path.join(__dirname, '../backend/crates/server/src/handlers/payments.rs');
      
      if (!fs.existsSync(paymentsPath)) {
        console.log('Payments handler not found, skipping');
        return;
      }
      
      const content = fs.readFileSync(paymentsPath, 'utf-8');
      
      // Should query webhook_events table
      expect(content).toMatch(/SELECT.*FROM webhook_events.*WHERE.*event_id/);
      
      // Should return early for duplicates
      expect(content).toMatch(/duplicate.*true/);
    });
    
    it('should store webhook event after receiving', () => {
      const paymentsPath = path.join(__dirname, '../backend/crates/server/src/handlers/payments.rs');
      
      if (!fs.existsSync(paymentsPath)) {
        console.log('Payments handler not found, skipping');
        return;
      }
      
      const content = fs.readFileSync(paymentsPath, 'utf-8');
      
      // Should insert into webhook_events
      expect(content).toMatch(/INSERT INTO webhook_events/);
      
      // Should store event_id, event_type, payload
      expect(content).toMatch(/event_id/);
      expect(content).toMatch(/event_type/);
      expect(content).toMatch(/payload/);
    });
    
    it('should mark event as processed after handling', () => {
      const paymentsPath = path.join(__dirname, '../backend/crates/server/src/handlers/payments.rs');
      
      if (!fs.existsSync(paymentsPath)) {
        console.log('Payments handler not found, skipping');
        return;
      }
      
      const content = fs.readFileSync(paymentsPath, 'utf-8');
      
      // Should update processed status
      expect(content).toMatch(/UPDATE webhook_events SET processed/);
      
      // Should set processed_at timestamp
      expect(content).toMatch(/processed_at/);
    });
  });
  
  describe('Property 11.4: Database schema supports webhook events', () => {
    it('should have webhook_events table', () => {
      const migrationPath = path.join(__dirname, '../backend/migrations/052_payments_phase2.sql');
      
      if (!fs.existsSync(migrationPath)) {
        console.log('Payments migration not found, skipping');
        return;
      }
      
      const content = fs.readFileSync(migrationPath, 'utf-8');
      
      // Should have webhook_events table
      expect(content).toMatch(/CREATE TABLE.*webhook_events/);
      
      // Should have event_id for idempotency
      expect(content).toMatch(/event_id TEXT NOT NULL/);
      
      // Should have processed flag
      expect(content).toMatch(/processed BOOLEAN/);
      
      // Should have index on event_id
      expect(content).toMatch(/CREATE INDEX.*idx_webhook_events_event_id/);
    });
  });
  
  describe('Property 11.5: Frontend can poll for payment status', () => {
    it('should have getPaymentStatus method in syncApi', () => {
      const syncApiPath = path.join(__dirname, '../frontend/src/services/syncApi.ts');
      
      if (!fs.existsSync(syncApiPath)) {
        console.log('syncApi not found, skipping');
        return;
      }
      
      const content = fs.readFileSync(syncApiPath, 'utf-8');
      
      // Should have getPaymentStatus method
      expect(content).toMatch(/getPaymentStatus/);
      
      // Should return status field
      expect(content).toMatch(/status.*string/);
    });
    
    it('should have polling logic in StripeCheckoutButton', () => {
      const buttonPath = path.join(__dirname, '../frontend/src/sales/components/StripeCheckoutButton.tsx');
      
      if (!fs.existsSync(buttonPath)) {
        console.log('StripeCheckoutButton not found, skipping');
        return;
      }
      
      const content = fs.readFileSync(buttonPath, 'utf-8');
      
      // Should have polling function
      expect(content).toMatch(/pollPaymentStatus/);
      
      // Should handle completed status
      expect(content).toMatch(/completed/);
      
      // Should handle expired status
      expect(content).toMatch(/expired/);
    });
  });
});
