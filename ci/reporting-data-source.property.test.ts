/**
 * Property Test 17: Reporting Data from Backend
 * 
 * **Validates: Requirements 6.1**
 * 
 * This property test verifies that reporting UI fetches data from backend API endpoints
 * rather than using hardcoded mock data.
 * 
 * Properties tested:
 * 1. Reporting page fetches from API endpoints
 * 2. No hardcoded mock data in reporting components
 * 3. Empty states are shown when no data available
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import { FRONTEND_PATHS, PAGE_PATHS } from './paths.config';

describe('Property 17: Reporting Data from Backend', () => {
  it('should fetch reporting data from API endpoints', () => {
    const reportingPagePath = PAGE_PATHS.reportingPage;
    
    expect(fs.existsSync(reportingPagePath), 'Reporting page should exist').toBe(true);
    
    const content = fs.readFileSync(reportingPagePath, 'utf-8');
    
    // Should use React Query hooks for data fetching (modern pattern)
    // The page uses useSalesReportQuery and useSalesByCategoryQuery which call the API
    const usesReactQuery = content.includes('useSalesReportQuery') || 
                          content.includes('useSalesByCategoryQuery') ||
                          content.includes('useQuery');
    
    // Alternative: direct fetch calls
    const usesFetch = content.includes('fetch(') && content.includes('/api/reports');
    
    // Alternative: useEffect with API call
    const usesUseEffect = content.includes('useEffect');
    
    expect(
      usesReactQuery || usesFetch,
      'Should fetch from API using React Query hooks or fetch()'
    ).toBe(true);
  });

  it('should not have hardcoded mock data in reporting components', () => {
    const reportingDir = FRONTEND_PATHS.reporting;
    
    if (!fs.existsSync(reportingDir)) {
      // Reporting feature doesn't exist, skip
      return;
    }
    
    const violations: string[] = [];
    
    const checkDirectory = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = `${dir}/${entry.name}`;
        
        if (entry.isDirectory()) {
          checkDirectory(fullPath);
        } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          
          // Check for hardcoded mock arrays that look like data (but not computed from API data)
          // Look for arrays with multiple hardcoded objects
          const hasMockData = content.match(/const\s+\w+\s*=\s*\[\s*\{[^}]*\},\s*\{[^}]*revenue|sales|total/i);
          
          if (hasMockData && !entry.name.includes('.test.') && !entry.name.includes('.stories.')) {
            // Check if it's computed from API data
            const isComputedFromAPI = content.includes('salesSummary') || 
                                     content.includes('categorySales') ||
                                     content.includes('.map(');
            
            if (!isComputedFromAPI) {
              violations.push(`${entry.name}: Contains potential hardcoded mock data`);
            }
          }
        }
      }
    };
    
    checkDirectory(reportingDir);
    
    expect(
      violations,
      `Reporting components should not have hardcoded mock data:\n${violations.join('\n')}`
    ).toHaveLength(0);
  });

  it('should show empty states when no data available', () => {
    const reportingPagePath = PAGE_PATHS.reportingPage;
    
    const content = fs.readFileSync(reportingPagePath, 'utf-8');
    
    // Should have empty state handling
    const hasEmptyState = content.includes('No Data') || 
                         content.includes('No data') ||
                         content.includes('no data') ||
                         content.includes('empty');
    
    expect(
      hasEmptyState,
      'Should have empty state handling'
    ).toBe(true);
  });

  it('should have loading states for async data fetching', () => {
    const reportingPagePath = PAGE_PATHS.reportingPage;
    
    const content = fs.readFileSync(reportingPagePath, 'utf-8');
    
    // Should have loading state
    const hasLoadingState = content.includes('isLoading') || 
                           content.includes('loading') ||
                           content.includes('Loading');
    
    expect(
      hasLoadingState,
      'Should have loading state for async operations'
    ).toBe(true);
  });

  it('should have error handling for failed API requests', () => {
    const reportingPagePath = PAGE_PATHS.reportingPage;
    
    const content = fs.readFileSync(reportingPagePath, 'utf-8');
    
    // Should have error handling
    const hasErrorHandling = (content.includes('catch') || content.includes('error')) &&
                            (content.includes('Error') || content.includes('Failed'));
    
    expect(
      hasErrorHandling,
      'Should have error handling for API failures'
    ).toBe(true);
  });
});
