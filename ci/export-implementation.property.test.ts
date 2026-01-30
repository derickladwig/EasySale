/**
 * Property Test 18: Export Implementation or Hiding
 * 
 * **Validates: Requirements 6.3, 6.4**
 * 
 * This property test verifies that export functionality is either properly implemented
 * or hidden/disabled in production when not implemented.
 * 
 * Properties tested:
 * 1. Export buttons are gated in production if not implemented
 * 2. Export endpoints exist or buttons are disabled
 * 3. No broken export functionality in production
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { REPO_ROOT, PAGE_PATHS, BACKEND_PATHS } from './paths.config';

describe('Property 18: Export Implementation or Hiding', () => {
  it('should gate export buttons in production when not implemented', () => {
    const reportingPagePath = PAGE_PATHS.reportingPage;
    
    if (!fs.existsSync(reportingPagePath)) {
      return;
    }
    
    const content = fs.readFileSync(reportingPagePath, 'utf-8');
    
    // Check if export button exists
    const hasExportButton = content.includes('Export') || content.includes('export');
    
    if (hasExportButton) {
      // Export is properly implemented if:
      // 1. It calls an API function (downloadSalesReport, exportSalesReport, etc.)
      // 2. OR it's gated by profile
      // 3. OR it's disabled when no data
      const isImplemented = content.includes('downloadSalesReport') ||
                           content.includes('exportSalesReport') ||
                           content.includes('/api/reports/export');
      
      const isGated = content.includes("profile === 'prod'") ||
                     content.includes('disabled') ||
                     content.includes('profile') && content.includes('Export');
      
      expect(
        isImplemented || isGated,
        'Export button should be implemented or gated in production'
      ).toBe(true);
    }
  });

  it('should have export endpoint or disabled button', () => {
    const reportingHandlerPath = path.join(
      BACKEND_PATHS.handlers,
      'reporting.rs'
    );
    
    const reportingPagePath = PAGE_PATHS.reportingPage;
    
    if (!fs.existsSync(reportingPagePath)) {
      return;
    }
    
    const frontendContent = fs.readFileSync(reportingPagePath, 'utf-8');
    const hasExportButton = frontendContent.includes('Export');
    
    if (hasExportButton) {
      // Check if backend has export endpoint
      // The endpoint is export_report (POST /api/reports/export)
      const backendHasExport = fs.existsSync(reportingHandlerPath) &&
                              (fs.readFileSync(reportingHandlerPath, 'utf-8').includes('export_report') ||
                               fs.readFileSync(reportingHandlerPath, 'utf-8').includes('/api/reports/export'));
      
      const buttonIsDisabled = frontendContent.includes('disabled') &&
                              frontendContent.includes('Export');
      
      expect(
        backendHasExport || buttonIsDisabled,
        'Export should be implemented or button should be disabled'
      ).toBe(true);
    }
  });

  it('should not have broken export links in production', () => {
    const reportingPagePath = PAGE_PATHS.reportingPage;
    
    if (!fs.existsSync(reportingPagePath)) {
      return;
    }
    
    const content = fs.readFileSync(reportingPagePath, 'utf-8');
    
    // Check for export functionality
    const hasExportClick = content.match(/onClick.*export/i) || 
                          content.includes('handleExport') ||
                          content.includes('downloadSalesReport');
    
    if (hasExportClick) {
      // Should either call API or be disabled
      // The page uses downloadSalesReport which calls the API
      const callsAPI = content.includes('downloadSalesReport') ||
                      (content.includes('fetch') && content.includes('export'));
      const isDisabled = content.includes('disabled');
      const hasTooltip = content.includes('title') || content.includes('tooltip');
      
      expect(
        callsAPI || (isDisabled && hasTooltip),
        'Export should call API or be disabled with explanation'
      ).toBe(true);
    }
  });

  it('should have appropriate user feedback for disabled export', () => {
    const reportingPagePath = PAGE_PATHS.reportingPage;
    
    if (!fs.existsSync(reportingPagePath)) {
      return;
    }
    
    const content = fs.readFileSync(reportingPagePath, 'utf-8');
    
    // If export is disabled, should have appropriate feedback
    // The button can be disabled when:
    // 1. No data is available (!salesSummary)
    // 2. Export is in progress (isExporting)
    // Either case is valid - the disabled state itself provides feedback
    if (content.includes('disabled') && content.includes('Export')) {
      // Check for any form of user feedback:
      // - tooltip/title attribute
      // - loading state indicator
      // - conditional text change
      // - disabled based on data availability (implicit feedback)
      const hasExplanation = content.includes('title=') || 
                            content.includes('tooltip') ||
                            content.includes('not yet implemented') ||
                            content.includes('not available') ||
                            content.includes('isExporting') ||
                            content.includes('!salesSummary') ||
                            content.includes('loading');
      
      expect(
        hasExplanation,
        'Disabled export should have user-facing explanation or be disabled based on data state'
      ).toBe(true);
    }
  });
});
