#!/usr/bin/env node
/**
 * Bundle Budget Checker
 * 
 * Validates that the production build meets size budgets.
 * Run after `npm run build` to verify bundle sizes.
 * 
 * Usage:
 *   node scripts/check-bundle-budget.js
 * 
 * Exit codes:
 *   0 - All budgets passed
 *   1 - One or more budgets exceeded
 */

import { readdirSync, statSync } from 'fs';
import { join } from 'path';
import { gzipSync } from 'zlib';
import { readFileSync } from 'fs';

// Budget configuration (in KB)
const BUDGETS = {
  // Initial JS bundle (entry chunk) - gzip size
  initialJsGzip: 100, // Target: < 100 KB gzip
  
  // Largest single chunk - gzip size
  largestChunkGzip: 80, // Target: < 80 KB gzip (excluding react-vendor)
  
  // Total JS - gzip size
  totalJsGzip: 500, // Target: < 500 KB gzip total
  
  // CSS - gzip size
  cssGzip: 30, // Target: < 30 KB gzip
};

// Chunks that are allowed to exceed largestChunkGzip
const EXEMPT_CHUNKS = [
  'react-vendor', // React core is large but necessary
  'validation-vendor', // Zod is large but necessary for validation
];

function getGzipSize(filePath) {
  const content = readFileSync(filePath);
  const gzipped = gzipSync(content);
  return gzipped.length / 1024; // KB
}

function getRawSize(filePath) {
  return statSync(filePath).size / 1024; // KB
}

function findAssets(distDir) {
  const assetsDir = join(distDir, 'assets');
  const files = readdirSync(assetsDir);
  
  const jsFiles = files.filter(f => f.endsWith('.js')).map(f => ({
    name: f,
    path: join(assetsDir, f),
    rawSize: getRawSize(join(assetsDir, f)),
    gzipSize: getGzipSize(join(assetsDir, f)),
  }));
  
  const cssFiles = files.filter(f => f.endsWith('.css')).map(f => ({
    name: f,
    path: join(assetsDir, f),
    rawSize: getRawSize(join(assetsDir, f)),
    gzipSize: getGzipSize(join(assetsDir, f)),
  }));
  
  return { jsFiles, cssFiles };
}

function checkBudgets() {
  const distDir = join(process.cwd(), 'dist');
  
  console.log('🔍 Checking bundle budgets...\n');
  
  let { jsFiles, cssFiles } = findAssets(distDir);
  
  // Sort by gzip size descending
  jsFiles = jsFiles.sort((a, b) => b.gzipSize - a.gzipSize);
  cssFiles = cssFiles.sort((a, b) => b.gzipSize - a.gzipSize);
  
  // Find entry chunk (index-*.js that's not a vendor chunk)
  const entryChunk = jsFiles.find(f => 
    f.name.startsWith('index-') && 
    !f.name.includes('vendor')
  );
  
  // Calculate totals
  const totalJsGzip = jsFiles.reduce((sum, f) => sum + f.gzipSize, 0);
  const totalCssGzip = cssFiles.reduce((sum, f) => sum + f.gzipSize, 0);
  
  // Find largest non-exempt chunk
  const nonExemptChunks = jsFiles.filter(f => 
    !EXEMPT_CHUNKS.some(exempt => f.name.includes(exempt))
  );
  const largestChunk = nonExemptChunks[0];
  
  const results = [];
  let hasFailure = false;
  
  // Check initial JS budget
  if (entryChunk) {
    const passed = entryChunk.gzipSize <= BUDGETS.initialJsGzip;
    results.push({
      name: 'Initial JS (gzip)',
      actual: entryChunk.gzipSize.toFixed(2),
      budget: BUDGETS.initialJsGzip,
      passed,
      file: entryChunk.name,
    });
    if (!passed) hasFailure = true;
  }
  
  // Check largest chunk budget
  if (largestChunk) {
    const passed = largestChunk.gzipSize <= BUDGETS.largestChunkGzip;
    results.push({
      name: 'Largest Chunk (gzip)',
      actual: largestChunk.gzipSize.toFixed(2),
      budget: BUDGETS.largestChunkGzip,
      passed,
      file: largestChunk.name,
    });
    if (!passed) hasFailure = true;
  }
  
  // Check total JS budget
  {
    const passed = totalJsGzip <= BUDGETS.totalJsGzip;
    results.push({
      name: 'Total JS (gzip)',
      actual: totalJsGzip.toFixed(2),
      budget: BUDGETS.totalJsGzip,
      passed,
    });
    if (!passed) hasFailure = true;
  }
  
  // Check CSS budget
  {
    const passed = totalCssGzip <= BUDGETS.cssGzip;
    results.push({
      name: 'Total CSS (gzip)',
      actual: totalCssGzip.toFixed(2),
      budget: BUDGETS.cssGzip,
      passed,
    });
    if (!passed) hasFailure = true;
  }
  
  // Print results
  console.log('Budget Results:');
  console.log('─'.repeat(70));
  
  for (const result of results) {
    const status = result.passed ? '✅' : '❌';
    const fileInfo = result.file ? ` (${result.file})` : '';
    console.log(
      `${status} ${result.name}: ${result.actual} KB / ${result.budget} KB${fileInfo}`
    );
  }
  
  console.log('─'.repeat(70));
  
  // Print top 10 chunks for reference
  console.log('\nTop 10 JS chunks by gzip size:');
  jsFiles.slice(0, 10).forEach((f, i) => {
    console.log(`  ${i + 1}. ${f.name}: ${f.gzipSize.toFixed(2)} KB gzip`);
  });
  
  console.log('\nCSS files:');
  cssFiles.forEach(f => {
    console.log(`  - ${f.name}: ${f.gzipSize.toFixed(2)} KB gzip`);
  });
  
  if (hasFailure) {
    console.log('\n❌ Bundle budget check FAILED');
    process.exit(1);
  } else {
    console.log('\n✅ All bundle budgets passed!');
    process.exit(0);
  }
}

checkBudgets();
