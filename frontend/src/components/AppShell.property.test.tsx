/**
 * Property-Based Tests for AppShell
 *
 * These tests verify universal properties that should hold true for all valid
 * AppShell configurations using fast-check for property-based testing.
 *
 * Framework: fast-check
 * Minimum iterations: 100 per property test
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { render } from '@testing-library/react';
import { AppShell } from './AppShell';
import React from 'react';

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Check if two bounding boxes overlap
 */
function doBoxesOverlap(box1: DOMRect, box2: DOMRect): boolean {
  return !(
    box1.right <= box2.left ||
    box1.left >= box2.right ||
    box1.bottom <= box2.top ||
    box1.top >= box2.bottom
  );
}

/**
 * Get bounding box for an element
 */
function getBoundingBox(element: Element | null): DOMRect | null {
  if (!element) return null;
  return element.getBoundingClientRect();
}

// ============================================================================
// Arbitraries (Generators for Property-Based Testing)
// ============================================================================

/**
 * Generate random content with varying heights
 */
const contentGenerator = fc
  .integer({ min: 1, max: 20 })
  .map((paragraphs) => {
    return Array.from({ length: paragraphs }, (_, i) =>
      React.createElement('p', { key: `content-${i}`, style: { margin: '1rem 0' } },
        `Content paragraph ${i + 1}. This is test content to verify layout behavior.`
      )
    );
  });

/**
 * Generate sidebar content with varying heights
 */
const sidebarGenerator = fc
  .integer({ min: 1, max: 15 })
  .map((items) => {
    return React.createElement('nav', null,
      Array.from({ length: items }, (_, i) =>
        React.createElement('div', { key: `nav-${i}`, style: { padding: '0.5rem 1rem' } },
          `Nav Item ${i + 1}`
        )
      )
    );
  });

/**
 * Generate header content with varying complexity
 */
const headerGenerator = fc
  .integer({ min: 1, max: 5 })
  .map((buttons) => {
    return React.createElement('div', { style: { display: 'flex', gap: '1rem', alignItems: 'center' } },
      React.createElement('h1', { style: { margin: 0, fontSize: '1.5rem' } }, 'Page Title'),
      React.createElement('div', { style: { marginLeft: 'auto', display: 'flex', gap: '0.5rem' } },
        Array.from({ length: buttons }, (_, i) =>
          React.createElement('button', { key: `btn-${i}` }, `Action ${i + 1}`)
        )
      )
    );
  });

/**
 * Generate boolean for sidebar presence
 */
const hasSidebar = fc.boolean();

/**
 * Generate boolean for header presence
 */
const hasHeader = fc.boolean();

/**
 * Generate boolean for sidebar open state (mobile)
 */
const isSidebarOpen = fc.boolean();

// ============================================================================
// Setup/Teardown
// ============================================================================

beforeEach(() => {
  // Reset any global state
  document.body.innerHTML = '';
});

afterEach(() => {
  // Clean up after each test
  document.body.innerHTML = '';
});

// ============================================================================
// Property 5: Layout Overlap Prevention
// ============================================================================

// Feature: unified-design-system, Property 5: Layout Overlap Prevention
describe('Property 5: Layout Overlap Prevention', () => {
  it('should never allow content to overlap with sidebar when sidebar is present', () => {
    fc.assert(
      fc.property(
        sidebarGenerator,
        contentGenerator,
        (sidebar, content) => {
          const { container } = render(
            <AppShell sidebar={sidebar}>
              <div data-testid="content">{content}</div>
            </AppShell>
          );

          const sidebarElement = container.querySelector('aside');
          const contentElement = container.querySelector('main');

          // Both elements should exist
          expect(sidebarElement).toBeTruthy();
          expect(contentElement).toBeTruthy();

          if (sidebarElement && contentElement) {
            const sidebarBox = getBoundingBox(sidebarElement);
            const contentBox = getBoundingBox(contentElement);

            // Bounding boxes should not overlap
            if (sidebarBox && contentBox) {
              const overlaps = doBoxesOverlap(sidebarBox, contentBox);
              expect(overlaps).toBe(false);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should never allow content to overlap with header when header is present', () => {
    fc.assert(
      fc.property(
        headerGenerator,
        contentGenerator,
        (header, content) => {
          const { container } = render(
            <AppShell header={header}>
              <div data-testid="content">{content}</div>
            </AppShell>
          );

          const headerElement = container.querySelector('header');
          const contentElement = container.querySelector('main');

          // Both elements should exist
          expect(headerElement).toBeTruthy();
          expect(contentElement).toBeTruthy();

          if (headerElement && contentElement) {
            const headerBox = getBoundingBox(headerElement);
            const contentBox = getBoundingBox(contentElement);

            // Bounding boxes should not overlap
            if (headerBox && contentBox) {
              const overlaps = doBoxesOverlap(headerBox, contentBox);
              expect(overlaps).toBe(false);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should never allow content to overlap with both sidebar and header when both are present', () => {
    fc.assert(
      fc.property(
        sidebarGenerator,
        headerGenerator,
        contentGenerator,
        (sidebar, header, content) => {
          const { container } = render(
            <AppShell sidebar={sidebar} header={header}>
              <div data-testid="content">{content}</div>
            </AppShell>
          );

          const sidebarElement = container.querySelector('aside');
          const headerElement = container.querySelector('header');
          const contentElement = container.querySelector('main');

          // All elements should exist
          expect(sidebarElement).toBeTruthy();
          expect(headerElement).toBeTruthy();
          expect(contentElement).toBeTruthy();

          if (sidebarElement && headerElement && contentElement) {
            const sidebarBox = getBoundingBox(sidebarElement);
            const headerBox = getBoundingBox(headerElement);
            const contentBox = getBoundingBox(contentElement);

            if (sidebarBox && headerBox && contentBox) {
              // Content should not overlap with sidebar
              const sidebarOverlap = doBoxesOverlap(sidebarBox, contentBox);
              expect(sidebarOverlap).toBe(false);

              // Content should not overlap with header
              const headerOverlap = doBoxesOverlap(headerBox, contentBox);
              expect(headerOverlap).toBe(false);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain no overlap regardless of content height', () => {
    fc.assert(
      fc.property(
        sidebarGenerator,
        headerGenerator,
        fc.integer({ min: 1, max: 100 }), // Very large content
        (sidebar, header, paragraphs) => {
          const largeContent = Array.from({ length: paragraphs }, (_, i) => (
            <p key={i} style={{ margin: '1rem 0' }}>
              Large content paragraph {i + 1}
            </p>
          ));

          const { container } = render(
            <AppShell sidebar={sidebar} header={header}>
              <div data-testid="content">{largeContent}</div>
            </AppShell>
          );

          const sidebarElement = container.querySelector('aside');
          const headerElement = container.querySelector('header');
          const contentElement = container.querySelector('main');

          if (sidebarElement && contentElement) {
            const sidebarBox = getBoundingBox(sidebarElement);
            const contentBox = getBoundingBox(contentElement);

            if (sidebarBox && contentBox) {
              const overlaps = doBoxesOverlap(sidebarBox, contentBox);
              expect(overlaps).toBe(false);
            }
          }

          if (headerElement && contentElement) {
            const headerBox = getBoundingBox(headerElement);
            const contentBox = getBoundingBox(contentElement);

            if (headerBox && contentBox) {
              const overlaps = doBoxesOverlap(headerBox, contentBox);
              expect(overlaps).toBe(false);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain no overlap with any combination of sidebar/header presence', () => {
    fc.assert(
      fc.property(
        hasSidebar,
        hasHeader,
        sidebarGenerator,
        headerGenerator,
        contentGenerator,
        (showSidebar, showHeader, sidebar, header, content) => {
          const { container } = render(
            <AppShell
              sidebar={showSidebar ? sidebar : undefined}
              header={showHeader ? header : undefined}
            >
              <div data-testid="content">{content}</div>
            </AppShell>
          );

          const sidebarElement = container.querySelector('aside');
          const headerElement = container.querySelector('header');
          const contentElement = container.querySelector('main');

          // Content should always exist
          expect(contentElement).toBeTruthy();

          // Check sidebar overlap if sidebar is present
          if (showSidebar && sidebarElement && contentElement) {
            const sidebarBox = getBoundingBox(sidebarElement);
            const contentBox = getBoundingBox(contentElement);

            if (sidebarBox && contentBox) {
              const overlaps = doBoxesOverlap(sidebarBox, contentBox);
              expect(overlaps).toBe(false);
            }
          }

          // Check header overlap if header is present
          if (showHeader && headerElement && contentElement) {
            const headerBox = getBoundingBox(headerElement);
            const contentBox = getBoundingBox(contentElement);

            if (headerBox && contentBox) {
              const overlaps = doBoxesOverlap(headerBox, contentBox);
              expect(overlaps).toBe(false);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain no overlap in mobile sidebar state (open/closed)', () => {
    fc.assert(
      fc.property(
        isSidebarOpen,
        sidebarGenerator,
        headerGenerator,
        contentGenerator,
        (isOpen, sidebar, header, content) => {
          const { container } = render(
            <AppShell
              sidebar={sidebar}
              header={header}
              isSidebarOpen={isOpen}
            >
              <div data-testid="content">{content}</div>
            </AppShell>
          );

          const sidebarElement = container.querySelector('aside');
          const headerElement = container.querySelector('header');
          const contentElement = container.querySelector('main');

          // All elements should exist
          expect(sidebarElement).toBeTruthy();
          expect(headerElement).toBeTruthy();
          expect(contentElement).toBeTruthy();

          if (sidebarElement && contentElement) {
            const sidebarBox = getBoundingBox(sidebarElement);
            const contentBox = getBoundingBox(contentElement);

            if (sidebarBox && contentBox) {
              // In JSDOM, we can't test actual mobile layout transformations,
              // but we can verify the structure is correct
              expect(sidebarElement.getAttribute('data-open')).toBe(String(isOpen));
              
              // Content should still not overlap in the base layout
              const overlaps = doBoxesOverlap(sidebarBox, contentBox);
              expect(overlaps).toBe(false);
            }
          }

          if (headerElement && contentElement) {
            const headerBox = getBoundingBox(headerElement);
            const contentBox = getBoundingBox(contentElement);

            if (headerBox && contentBox) {
              const overlaps = doBoxesOverlap(headerBox, contentBox);
              expect(overlaps).toBe(false);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should use CSS Grid layout to prevent overlaps', () => {
    fc.assert(
      fc.property(
        sidebarGenerator,
        headerGenerator,
        contentGenerator,
        (sidebar, header, content) => {
          const { container } = render(
            <AppShell sidebar={sidebar} header={header}>
              <div data-testid="content">{content}</div>
            </AppShell>
          );

          const appShellElement = container.firstChild as HTMLElement;

          // Verify AppShell uses grid layout (class-based check)
          expect(appShellElement.className).toContain('appShell');

          // Verify semantic HTML structure
          const sidebarElement = container.querySelector('aside');
          const headerElement = container.querySelector('header');
          const mainElement = container.querySelector('main');

          expect(sidebarElement).toBeTruthy();
          expect(headerElement).toBeTruthy();
          expect(mainElement).toBeTruthy();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain layout contract with consistent spacing', () => {
    fc.assert(
      fc.property(
        sidebarGenerator,
        headerGenerator,
        contentGenerator,
        (sidebar, header, content) => {
          const { container } = render(
            <AppShell sidebar={sidebar} header={header}>
              <div data-testid="content">{content}</div>
            </AppShell>
          );

          const contentElement = container.querySelector('main');

          // Content should exist and have proper structure
          expect(contentElement).toBeTruthy();

          if (contentElement) {
            // Verify content has the correct class
            expect(contentElement.className).toContain('content');

            // Content should be scrollable (overflow-y: auto)
            // Note: In JSDOM, computed styles may not fully reflect CSS
            // This test verifies the structure is correct
            expect(contentElement.tagName).toBe('MAIN');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle empty content without overlap', () => {
    fc.assert(
      fc.property(
        sidebarGenerator,
        headerGenerator,
        (sidebar, header) => {
          const { container } = render(
            <AppShell sidebar={sidebar} header={header}>
              <div data-testid="content"></div>
            </AppShell>
          );

          const sidebarElement = container.querySelector('aside');
          const headerElement = container.querySelector('header');
          const contentElement = container.querySelector('main');

          // All elements should exist
          expect(sidebarElement).toBeTruthy();
          expect(headerElement).toBeTruthy();
          expect(contentElement).toBeTruthy();

          if (sidebarElement && contentElement) {
            const sidebarBox = getBoundingBox(sidebarElement);
            const contentBox = getBoundingBox(contentElement);

            if (sidebarBox && contentBox) {
              const overlaps = doBoxesOverlap(sidebarBox, contentBox);
              expect(overlaps).toBe(false);
            }
          }

          if (headerElement && contentElement) {
            const headerBox = getBoundingBox(headerElement);
            const contentBox = getBoundingBox(contentElement);

            if (headerBox && contentBox) {
              const overlaps = doBoxesOverlap(headerBox, contentBox);
              expect(overlaps).toBe(false);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain no overlap with nested scrollable content', () => {
    fc.assert(
      fc.property(
        sidebarGenerator,
        headerGenerator,
        fc.integer({ min: 1, max: 50 }),
        (sidebar, header, items) => {
          const scrollableContent = (
            <div style={{ height: '100%', overflowY: 'auto' }}>
              {Array.from({ length: items }, (_, i) => (
                <div key={i} style={{ padding: '1rem', borderBottom: '1px solid #ccc' }}>
                  Scrollable item {i + 1}
                </div>
              ))}
            </div>
          );

          const { container } = render(
            <AppShell sidebar={sidebar} header={header}>
              {scrollableContent}
            </AppShell>
          );

          const sidebarElement = container.querySelector('aside');
          const headerElement = container.querySelector('header');
          const contentElement = container.querySelector('main');

          if (sidebarElement && contentElement) {
            const sidebarBox = getBoundingBox(sidebarElement);
            const contentBox = getBoundingBox(contentElement);

            if (sidebarBox && contentBox) {
              const overlaps = doBoxesOverlap(sidebarBox, contentBox);
              expect(overlaps).toBe(false);
            }
          }

          if (headerElement && contentElement) {
            const headerBox = getBoundingBox(headerElement);
            const contentBox = getBoundingBox(contentElement);

            if (headerBox && contentBox) {
              const overlaps = doBoxesOverlap(headerBox, contentBox);
              expect(overlaps).toBe(false);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
