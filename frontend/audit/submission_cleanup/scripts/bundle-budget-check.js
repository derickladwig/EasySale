#!/usr/bin/env node
/**
 * Bundle Budget Checker (Enhanced CI Version)
 * 
 * This script validates that the production build meets size budgets.
 * It's designed for CI integration with detailed reporting and configurable thresholds.
 * 
 * Usage:
 *   node scripts/bundle-budget-check.js [options]
 * 
 * Options:
 *   --strict          Use stricter budget limits
 *   --json            Output results as JSON
 *   --fail-on-warn    Exit with code 1 on warnings (not just failures)
 *   --dist-dir=PATH   Custom dist directory (default: ./dist)
 * 
 * Exit codes:
 *   0 - All budgets passed
 *   1 - One or more budgets exceeded
 *   2 - Build artifacts not found
 * 
 * Environment variables:
 *   BUNDLE_BUDGET_STRICT=true    Enable strict mode
 *   BUNDLE_BUDGET_JSON=true      Output JSON format
 */

import { readdirSync, statSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { gzipSync, brotliCompressSync } from 'zlib';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  strict: args.includes('--strict') || process.env.BUNDLE_BUDGET_STRICT === 'true',
  json: args.includes('--json') || process.env.BUNDLE_BUDGET_JSON === 'true',
  failOnWarn: args.includes('--fail-on-warn'),
  distDir: args.find(a => a.startsWith('--dist-dir='))?.split('=')[1] || './dist',
};

// Budget configuration (in KB, gzip sizes)
const BUDGETS = {
  standard: {
    // Initial JS bundle (entry chunk) - gzip size
    initialJsGzip: 100,
    
    // Largest single chunk (excluding exempt) - gzip size
    largestChunkGzip: 80,
    
    // Total JS - gzip size
    totalJsGzip: 500,
    
    // Total CSS - gzip size
    cssGzip: 30,
    
    // Individual route chunk limit
    routeChunkGzip: 50,
    
    // Vendor chunk limit (excluding react)
    vendorChunkGzip: 30,
  },
  strict: {
    initialJsGzip: 80,
    largestChunkGzip: 60,
    totalJsGzip: 400,
    cssGzip: 25,
    routeChunkGzip: 40,
    vendorChunkGzip: 25,
  },
};

// Chunks exempt from individual size limits
const EXEMPT_CHUNKS = [
  'react-vendor',      // React core is large but necessary
  'validation-vendor', // Zod is large but necessary for validation
];

// Chunk categories for reporting
const CHUNK_CATEGORIES = {
  vendor: /vendor/i,
  route: /Page|Tab|Layout|Wizard|Dashboard/i,
  shared: /index-|hooks|utils|types|api/i,
};

/**
 * Calculate gzip size of a file
 */
function getGzipSize(filePath) {
  const content = readFileSync(filePath);
  const gzipped = gzipSync(content, { level: 9 });
  return gzipped.length / 1024; // KB
}

/**
 * Calculate brotli size of a file
 */
function getBrotliSize(filePath) {
  const content = readFileSync(filePath);
  const compressed = brotliCompressSync(content);
  return compressed.length / 1024; // KB
}

/**
 * Get raw file size
 */
function getRawSize(filePath) {
  return statSync(filePath).size / 1024; // KB
}

/**
 * Categorize a chunk by its name
 */
function categorizeChunk(name) {
  if (CHUNK_CATEGORIES.vendor.test(name)) return 'vendor';
  if (CHUNK_CATEGORIES.route.test(name)) return 'route';
  if (CHUNK_CATEGORIES.shared.test(name)) return 'shared';
  return 'other';
}

/**
 * Find and analyze all assets in dist directory
 */
function findAssets(distDir) {
  const assetsDir = join(distDir, 'assets');
  
  if (!existsSync(assetsDir)) {
    return { jsFiles: [], cssFiles: [], error: 'Assets directory not found' };
  }
  
  const files = readdirSync(assetsDir);
  
  const jsFiles = files
    .filter(f => f.endsWith('.js'))
    .map(f => {
      const filePath = join(assetsDir, f);
      return {
        name: f,
        path: filePath,
        rawSize: getRawSize(filePath),
        gzipSize: getGzipSize(filePath),
        brotliSize: getBrotliSize(filePath),
        category: categorizeChunk(f),
        isExempt: EXEMPT_CHUNKS.some(exempt => f.includes(exempt)),
      };
    })
    .sort((a, b) => b.gzipSize - a.gzipSize);
  
  const cssFiles = files
    .filter(f => f.endsWith('.css'))
    .map(f => {
      const filePath = join(assetsDir, f);
      return {
        name: f,
        path: filePath,
        rawSize: getRawSize(filePath),
        gzipSize: getGzipSize(filePath),
        brotliSize: getBrotliSize(filePath),
      };
    })
    .sort((a, b) => b.gzipSize - a.gzipSize);
  
  return { jsFiles, cssFiles };
}

/**
 * Check all budgets and return results
 */
function checkBudgets(distDir, budgetConfig) {
  const { jsFiles, cssFiles, error } = findAssets(distDir);
  
  if (error) {
    return { error, results: [], warnings: [], jsFiles: [], cssFiles: [] };
  }
  
  const results = [];
  const warnings = [];
  
  // Find entry chunk (index-*.js that's not a vendor chunk)
  const entryChunk = jsFiles.find(f => 
    f.name.startsWith('index-') && 
    !f.name.includes('vendor') &&
    f.category !== 'vendor'
  );
  
  // Calculate totals
  const totalJsGzip = jsFiles.reduce((sum, f) => sum + f.gzipSize, 0);
  const totalCssGzip = cssFiles.reduce((sum, f) => sum + f.gzipSize, 0);
  
  // Find largest non-exempt chunk
  const nonExemptChunks = jsFiles.filter(f => !f.isExempt);
  const largestChunk = nonExemptChunks[0];
  
  // Check initial JS budget
  if (entryChunk) {
    const passed = entryChunk.gzipSize <= budgetConfig.initialJsGzip;
    const nearLimit = entryChunk.gzipSize > budgetConfig.initialJsGzip * 0.9;
    
    results.push({
      name: 'Initial JS (gzip)',
      actual: entryChunk.gzipSize,
      budget: budgetConfig.initialJsGzip,
      passed,
      file: entryChunk.name,
      category: 'critical',
    });
    
    if (passed && nearLimit) {
      warnings.push(`Initial JS is at ${((entryChunk.gzipSize / budgetConfig.initialJsGzip) * 100).toFixed(0)}% of budget`);
    }
  }
  
  // Check largest chunk budget
  if (largestChunk) {
    const passed = largestChunk.gzipSize <= budgetConfig.largestChunkGzip;
    const nearLimit = largestChunk.gzipSize > budgetConfig.largestChunkGzip * 0.9;
    
    results.push({
      name: 'Largest Chunk (gzip)',
      actual: largestChunk.gzipSize,
      budget: budgetConfig.largestChunkGzip,
      passed,
      file: largestChunk.name,
      category: 'critical',
    });
    
    if (passed && nearLimit) {
      warnings.push(`Largest chunk is at ${((largestChunk.gzipSize / budgetConfig.largestChunkGzip) * 100).toFixed(0)}% of budget`);
    }
  }
  
  // Check total JS budget
  {
    const passed = totalJsGzip <= budgetConfig.totalJsGzip;
    results.push({
      name: 'Total JS (gzip)',
      actual: totalJsGzip,
      budget: budgetConfig.totalJsGzip,
      passed,
      category: 'critical',
    });
  }
  
  // Check CSS budget
  {
    const passed = totalCssGzip <= budgetConfig.cssGzip;
    results.push({
      name: 'Total CSS (gzip)',
      actual: totalCssGzip,
      budget: budgetConfig.cssGzip,
      passed,
      category: 'standard',
    });
  }
  
  // Check individual route chunks
  const routeChunks = jsFiles.filter(f => f.category === 'route' && !f.isExempt);
  const oversizedRoutes = routeChunks.filter(f => f.gzipSize > budgetConfig.routeChunkGzip);
  
  if (oversizedRoutes.length > 0) {
    warnings.push(`${oversizedRoutes.length} route chunk(s) exceed ${budgetConfig.routeChunkGzip}KB limit`);
    oversizedRoutes.forEach(f => {
      warnings.push(`  - ${f.name}: ${f.gzipSize.toFixed(2)}KB`);
    });
  }
  
  // Check vendor chunks (excluding exempt)
  const vendorChunks = jsFiles.filter(f => f.category === 'vendor' && !f.isExempt);
  const oversizedVendors = vendorChunks.filter(f => f.gzipSize > budgetConfig.vendorChunkGzip);
  
  if (oversizedVendors.length > 0) {
    warnings.push(`${oversizedVendors.length} vendor chunk(s) exceed ${budgetConfig.vendorChunkGzip}KB limit`);
    oversizedVendors.forEach(f => {
      warnings.push(`  - ${f.name}: ${f.gzipSize.toFixed(2)}KB`);
    });
  }
  
  return { results, warnings, jsFiles, cssFiles };
}

/**
 * Format results for console output
 */
function formatConsoleOutput(checkResult, budgetMode) {
  const { results, warnings, jsFiles, cssFiles, error } = checkResult;
  
  if (error) {
    console.error(`\n❌ Error: ${error}\n`);
    return;
  }
  
  const hasFailure = results.some(r => !r.passed);
  
  console.log(`\n🔍 Bundle Budget Check (${budgetMode} mode)\n`);
  console.log('═'.repeat(75));
  
  // Budget results
  console.log('\nBudget Results:');
  console.log('─'.repeat(75));
  
  for (const result of results) {
    const status = result.passed ? '✅' : '❌';
    const fileInfo = result.file ? ` (${result.file})` : '';
    const percentage = ((result.actual / result.budget) * 100).toFixed(0);
    console.log(
      `${status} ${result.name}: ${result.actual.toFixed(2)} KB / ${result.budget} KB (${percentage}%)${fileInfo}`
    );
  }
  
  // Warnings
  if (warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    console.log('─'.repeat(75));
    warnings.forEach(w => console.log(`  ${w}`));
  }
  
  // Top chunks by category
  console.log('\n📊 Chunk Analysis:');
  console.log('─'.repeat(75));
  
  const categories = ['vendor', 'route', 'shared', 'other'];
  for (const cat of categories) {
    const chunks = jsFiles.filter(f => f.category === cat);
    if (chunks.length > 0) {
      const totalSize = chunks.reduce((sum, f) => sum + f.gzipSize, 0);
      console.log(`\n  ${cat.toUpperCase()} (${chunks.length} chunks, ${totalSize.toFixed(2)} KB total):`);
      chunks.slice(0, 5).forEach((f, i) => {
        const exempt = f.isExempt ? ' [exempt]' : '';
        console.log(`    ${i + 1}. ${f.name}: ${f.gzipSize.toFixed(2)} KB${exempt}`);
      });
      if (chunks.length > 5) {
        console.log(`    ... and ${chunks.length - 5} more`);
      }
    }
  }
  
  // CSS files
  console.log('\n  CSS FILES:');
  cssFiles.forEach(f => {
    console.log(`    - ${f.name}: ${f.gzipSize.toFixed(2)} KB`);
  });
  
  // Summary
  console.log('\n' + '═'.repeat(75));
  
  if (hasFailure) {
    console.log('❌ Bundle budget check FAILED\n');
  } else if (warnings.length > 0) {
    console.log('⚠️  Bundle budget check PASSED with warnings\n');
  } else {
    console.log('✅ All bundle budgets passed!\n');
  }
  
  return hasFailure;
}

/**
 * Format results as JSON
 */
function formatJsonOutput(checkResult, budgetMode) {
  const { results, warnings, jsFiles, cssFiles, error } = checkResult;
  
  const output = {
    timestamp: new Date().toISOString(),
    mode: budgetMode,
    error: error || null,
    passed: !error && results.every(r => r.passed),
    hasWarnings: warnings.length > 0,
    budgetResults: results.map(r => ({
      ...r,
      actual: parseFloat(r.actual.toFixed(2)),
      percentage: parseFloat(((r.actual / r.budget) * 100).toFixed(1)),
    })),
    warnings,
    summary: {
      totalJsChunks: jsFiles.length,
      totalJsSize: parseFloat(jsFiles.reduce((sum, f) => sum + f.gzipSize, 0).toFixed(2)),
      totalCssFiles: cssFiles.length,
      totalCssSize: parseFloat(cssFiles.reduce((sum, f) => sum + f.gzipSize, 0).toFixed(2)),
      chunksByCategory: {
        vendor: jsFiles.filter(f => f.category === 'vendor').length,
        route: jsFiles.filter(f => f.category === 'route').length,
        shared: jsFiles.filter(f => f.category === 'shared').length,
        other: jsFiles.filter(f => f.category === 'other').length,
      },
    },
    chunks: jsFiles.map(f => ({
      name: f.name,
      rawSize: parseFloat(f.rawSize.toFixed(2)),
      gzipSize: parseFloat(f.gzipSize.toFixed(2)),
      brotliSize: parseFloat(f.brotliSize.toFixed(2)),
      category: f.category,
      isExempt: f.isExempt,
    })),
    cssFiles: cssFiles.map(f => ({
      name: f.name,
      rawSize: parseFloat(f.rawSize.toFixed(2)),
      gzipSize: parseFloat(f.gzipSize.toFixed(2)),
      brotliSize: parseFloat(f.brotliSize.toFixed(2)),
    })),
  };
  
  console.log(JSON.stringify(output, null, 2));
  
  return !output.passed;
}

/**
 * Main execution
 */
function main() {
  const budgetMode = options.strict ? 'strict' : 'standard';
  const budgetConfig = BUDGETS[budgetMode];
  
  // Resolve dist directory relative to CWD
  const distDir = join(process.cwd(), options.distDir);
  
  if (!existsSync(distDir)) {
    console.error(`\n❌ Error: Dist directory not found: ${distDir}`);
    console.error('   Run "npm run build" first.\n');
    process.exit(2);
  }
  
  const checkResult = checkBudgets(distDir, budgetConfig);
  
  let hasFailure;
  if (options.json) {
    hasFailure = formatJsonOutput(checkResult, budgetMode);
  } else {
    hasFailure = formatConsoleOutput(checkResult, budgetMode);
  }
  
  // Determine exit code
  if (checkResult.error) {
    process.exit(2);
  } else if (hasFailure) {
    process.exit(1);
  } else if (options.failOnWarn && checkResult.warnings.length > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main();
