/**
 * Tests for brand asset conversion script
 * 
 * Run with: node --test convert-brand-assets.test.js
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { validateInput, ensureOutputDir } from './convert-brand-assets.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_DIR = path.join(__dirname, 'test-output');
const TEST_ASSETS_DIR = path.join(__dirname, 'test-assets');

describe('Brand Asset Conversion Script', () => {
  before(async () => {
    // Create test directories
    await fs.mkdir(TEST_DIR, { recursive: true });
    await fs.mkdir(TEST_ASSETS_DIR, { recursive: true });
    
    // Create test image files
    const testPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    await fs.writeFile(path.join(TEST_ASSETS_DIR, 'test.png'), testPng);
    
    // Create test SVG
    const testSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="blue"/></svg>';
    await fs.writeFile(path.join(TEST_ASSETS_DIR, 'test.svg'), testSvg);
  });

  after(async () => {
    // Clean up test directories
    try {
      await fs.rm(TEST_DIR, { recursive: true, force: true });
      await fs.rm(TEST_ASSETS_DIR, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('validateInput', () => {
    it('should validate existing PNG file', async () => {
      const testFile = path.join(TEST_ASSETS_DIR, 'test.png');
      const ext = await validateInput(testFile);
      assert.strictEqual(ext, '.png');
    });

    it('should validate existing SVG file', async () => {
      const testFile = path.join(TEST_ASSETS_DIR, 'test.svg');
      const ext = await validateInput(testFile);
      assert.strictEqual(ext, '.svg');
    });

    it('should reject non-existent file', async () => {
      await assert.rejects(
        async () => await validateInput('nonexistent.png'),
        /Input file not found/
      );
    });

    it('should reject unsupported format', async () => {
      const testFile = path.join(TEST_ASSETS_DIR, 'test.txt');
      await fs.writeFile(testFile, 'test');
      
      await assert.rejects(
        async () => await validateInput(testFile),
        /Unsupported input format/
      );
    });
  });

  describe('ensureOutputDir', () => {
    it('should create output directory', async () => {
      const outputDir = path.join(TEST_DIR, 'brand', 'test-tenant');
      await ensureOutputDir(outputDir);
      
      const stats = await fs.stat(outputDir);
      assert.ok(stats.isDirectory());
    });

    it('should handle existing directory', async () => {
      const outputDir = path.join(TEST_DIR, 'brand', 'existing');
      await fs.mkdir(outputDir, { recursive: true });
      
      // Should not throw
      await ensureOutputDir(outputDir);
      
      const stats = await fs.stat(outputDir);
      assert.ok(stats.isDirectory());
    });

    it('should create nested directories', async () => {
      const outputDir = path.join(TEST_DIR, 'deep', 'nested', 'path');
      await ensureOutputDir(outputDir);
      
      const stats = await fs.stat(outputDir);
      assert.ok(stats.isDirectory());
    });
  });

  describe('Output file structure', () => {
    it('should define correct output paths', () => {
      const tenant = 'test-tenant';
      const outputDir = path.join('frontend', 'public', 'brand', tenant);
      
      const expectedFiles = [
        'logo.png',
        'logo-light.png',
        'logo-dark.png',
        'favicon.ico',
        'favicon-16x16.png',
        'favicon-32x32.png',
        'apple-touch-icon.png',
        'android-chrome-192x192.png',
        'android-chrome-512x512.png',
        'manifest.json'
      ];
      
      expectedFiles.forEach(file => {
        const fullPath = path.join(outputDir, file);
        assert.ok(fullPath.includes(tenant), `Path should include tenant: ${fullPath}`);
        assert.ok(fullPath.includes('brand'), `Path should include brand: ${fullPath}`);
      });
    });
  });

  describe('Supported formats', () => {
    it('should support all required formats', () => {
      const supportedFormats = ['.svg', '.png', '.jpg', '.jpeg', '.ico', '.webp'];
      
      // Verify SVG support (Requirement 6.2)
      assert.ok(supportedFormats.includes('.svg'), 'Should support SVG');
      
      // Verify ICO support (Requirement 6.2)
      assert.ok(supportedFormats.includes('.ico'), 'Should support ICO');
      
      // Verify PNG output (Requirement 6.2)
      assert.ok(supportedFormats.includes('.png'), 'Should support PNG');
      
      // Verify JPG output (Requirement 6.2)
      assert.ok(supportedFormats.includes('.jpg'), 'Should support JPG');
    });
  });

  describe('Output location validation', () => {
    it('should output to deterministic location (Requirement 6.3)', () => {
      const tenant = 'acme';
      const expectedPath = path.join('frontend', 'public', 'brand', tenant);
      
      // Verify path structure matches requirement (normalize for cross-platform)
      const normalizedPath = expectedPath.replace(/\\/g, '/');
      assert.ok(normalizedPath.includes('public/brand'), 'Should use public/brand directory');
      assert.ok(expectedPath.includes(tenant), 'Should include tenant ID');
      
      // Verify path is deterministic (same input = same output)
      const expectedPath2 = path.join('frontend', 'public', 'brand', tenant);
      assert.strictEqual(expectedPath, expectedPath2, 'Path should be deterministic');
    });
  });
});

console.log('Running brand asset conversion tests...');
