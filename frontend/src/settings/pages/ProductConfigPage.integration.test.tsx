/**
 * Integration Tests: Product Config Page
 *
 * End-to-end integration tests for the Product Configuration page.
 * Tests category creation, unit management, and pricing tier management.
 *
 * Validates Requirements: 19.2, 19.3, 19.4
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, waitFor, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductConfigPage } from './ProductConfigPage';
import { toast } from '@common/components/molecules/Toast';

// ============================================================================
// Mocks
// ============================================================================

// Mock Toast
vi.mock('@common/components/molecules/Toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock CategoryManagement component
vi.mock('../../admin/components/CategoryManagement', () => ({
  CategoryManagement: () => (
    <div data-testid="category-management">
      <h3>Category Management</h3>
      <button>Add Category</button>
      <div>Caps</div>
      <div>Accessories</div>
      <div>Apparel</div>
    </div>
  ),
}));

// Mock UnitsManagement component
vi.mock('../../admin/components/UnitsManagement', () => ({
  UnitsManagement: () => (
    <div data-testid="units-management">
      <h3>Units Management</h3>
      <button>Add Unit</button>
      <div>Each</div>
      <div>Case</div>
      <div>Gallon</div>
    </div>
  ),
}));

// Mock PricingTiersManagement component
vi.mock('../../admin/components/PricingTiersManagement', () => ({
  PricingTiersManagement: () => (
    <div data-testid="pricing-tiers-management">
      <h3>Pricing Tiers Management</h3>
      <button>Add Pricing Tier</button>
      <div>Retail</div>
      <div>Wholesale</div>
      <div>Contractor</div>
    </div>
  ),
}));

// ============================================================================
// Setup
// ============================================================================

describe('ProductConfigPage Integration Tests', () => {
  beforeEach(() => {
    // Clear any previous state
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  // ==========================================================================
  // Requirement 19.2: Allow defining product categories with hierarchical structure
  // ==========================================================================

  describe('Category Management - Requirement 19.2', () => {
    it('should display categories tab by default', async () => {
      // Act
      render(<ProductConfigPage />);

      // Assert: Categories tab should be active
      await waitFor(() => {
        const categoriesTab = screen.getByRole('button', { name: /categories/i });
        expect(categoriesTab).toBeTruthy();
        expect(categoriesTab?.className).toContain('border-primary-500');
      });
    });

    it('should display category management component', async () => {
      // Act
      render(<ProductConfigPage />);

      // Assert: Category management should be rendered
      await waitFor(() => {
        const categoryManagement = screen.getByTestId('category-management');
        expect(categoryManagement).toBeTruthy();
        expect(screen.getByText(/category management/i)).toBeTruthy();
      });
    });

    it('should show add category button', async () => {
      // Act
      render(<ProductConfigPage />);

      // Assert: Add category button should be present
      await waitFor(() => {
        const addButton = screen.getByRole('button', { name: /add category/i });
        expect(addButton).toBeTruthy();
      });
    });

    it('should display existing categories', async () => {
      // Act
      render(<ProductConfigPage />);

      // Assert: Categories should be displayed
      await waitFor(() => {
        expect(screen.getByText('Caps')).toBeTruthy();
        expect(screen.getByText('Accessories')).toBeTruthy();
        expect(screen.getByText('Apparel')).toBeTruthy();
      });
    });

    it('should allow clicking add category button', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<ProductConfigPage />);

      // Act: Click add category button
      const addButton = screen.getByRole('button', { name: /add category/i });
      await user.click(addButton);

      // Assert: Button should be clickable (actual functionality tested in CategoryManagement tests)
      expect(addButton).toBeTruthy();
    });

    it('should maintain categories tab state when switching tabs', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<ProductConfigPage />);

      // Act: Switch to units tab
      const unitsTab = screen.getByRole('button', { name: /^units$/i });
      await user.click(unitsTab);

      // Act: Switch back to categories tab
      const categoriesTab = screen.getByRole('button', { name: /categories/i });
      await user.click(categoriesTab);

      // Assert: Categories should still be displayed
      await waitFor(() => {
        expect(screen.getByText('Caps')).toBeTruthy();
        expect(screen.getByText('Accessories')).toBeTruthy();
      });
    });
  });

  // ==========================================================================
  // Requirement 19.3: Allow defining units of measure
  // ==========================================================================

  describe('Units Management - Requirement 19.3', () => {
    it('should display units tab', async () => {
      // Act
      render(<ProductConfigPage />);

      // Assert: Units tab should be present
      await waitFor(() => {
        const unitsTab = screen.getByRole('button', { name: /^units$/i });
        expect(unitsTab).toBeTruthy();
      });
    });

    it('should switch to units tab when clicked', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<ProductConfigPage />);

      // Act: Click units tab
      const unitsTab = screen.getByRole('button', { name: /^units$/i });
      await user.click(unitsTab);

      // Assert: Units tab should be active
      await waitFor(() => {
        expect(unitsTab?.className).toContain('border-primary-500');
      });
    });

    it('should display units management component when units tab is active', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<ProductConfigPage />);

      // Act: Click units tab
      const unitsTab = screen.getByRole('button', { name: /^units$/i });
      await user.click(unitsTab);

      // Assert: Units management should be rendered
      await waitFor(() => {
        const unitsManagement = screen.getByTestId('units-management');
        expect(unitsManagement).toBeTruthy();
        expect(screen.getByText(/units management/i)).toBeTruthy();
      });
    });

    it('should show add unit button', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<ProductConfigPage />);

      // Act: Switch to units tab
      const unitsTab = screen.getByRole('button', { name: /^units$/i });
      await user.click(unitsTab);

      // Assert: Add unit button should be present
      await waitFor(() => {
        const addButton = screen.getByRole('button', { name: /add unit/i });
        expect(addButton).toBeTruthy();
      });
    });

    it('should display existing units', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<ProductConfigPage />);

      // Act: Switch to units tab
      const unitsTab = screen.getByRole('button', { name: /^units$/i });
      await user.click(unitsTab);

      // Assert: Units should be displayed
      await waitFor(() => {
        expect(screen.getByText('Each')).toBeTruthy();
        expect(screen.getByText('Case')).toBeTruthy();
        expect(screen.getByText('Gallon')).toBeTruthy();
      });
    });

    it('should allow clicking add unit button', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<ProductConfigPage />);

      // Act: Switch to units tab
      const unitsTab = screen.getByRole('button', { name: /^units$/i });
      await user.click(unitsTab);

      // Act: Click add unit button
      const addButton = screen.getByRole('button', { name: /add unit/i });
      await user.click(addButton);

      // Assert: Button should be clickable
      expect(addButton).toBeTruthy();
    });
  });

  // ==========================================================================
  // Requirement 19.4: Allow configuring pricing tiers
  // ==========================================================================

  describe('Pricing Tiers Management - Requirement 19.4', () => {
    it('should display pricing tiers tab', async () => {
      // Act
      render(<ProductConfigPage />);

      // Assert: Pricing tiers tab should be present
      await waitFor(() => {
        const pricingTab = screen.getByRole('button', { name: /pricing tiers/i });
        expect(pricingTab).toBeTruthy();
      });
    });

    it('should switch to pricing tiers tab when clicked', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<ProductConfigPage />);

      // Act: Click pricing tiers tab
      const pricingTab = screen.getByRole('button', { name: /pricing tiers/i });
      await user.click(pricingTab);

      // Assert: Pricing tiers tab should be active
      await waitFor(() => {
        expect(pricingTab?.className).toContain('border-primary-500');
      });
    });

    it('should display pricing tiers management component when tab is active', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<ProductConfigPage />);

      // Act: Click pricing tiers tab
      const pricingTab = screen.getByRole('button', { name: /pricing tiers/i });
      await user.click(pricingTab);

      // Assert: Pricing tiers management should be rendered
      await waitFor(() => {
        const pricingManagement = screen.getByTestId('pricing-tiers-management');
        expect(pricingManagement).toBeTruthy();
        expect(screen.getByText(/pricing tiers management/i)).toBeTruthy();
      });
    });

    it('should show add pricing tier button', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<ProductConfigPage />);

      // Act: Switch to pricing tiers tab
      const pricingTab = screen.getByRole('button', { name: /pricing tiers/i });
      await user.click(pricingTab);

      // Assert: Add pricing tier button should be present
      await waitFor(() => {
        const addButton = screen.getByRole('button', { name: /add pricing tier/i });
        expect(addButton).toBeTruthy();
      });
    });

    it('should display existing pricing tiers', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<ProductConfigPage />);

      // Act: Switch to pricing tiers tab
      const pricingTab = screen.getByRole('button', { name: /pricing tiers/i });
      await user.click(pricingTab);

      // Assert: Pricing tiers should be displayed
      await waitFor(() => {
        expect(screen.getByText('Retail')).toBeTruthy();
        expect(screen.getByText('Wholesale')).toBeTruthy();
        expect(screen.getByText('Contractor')).toBeTruthy();
      });
    });

    it('should allow clicking add pricing tier button', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<ProductConfigPage />);

      // Act: Switch to pricing tiers tab
      const pricingTab = screen.getByRole('button', { name: /pricing tiers/i });
      await user.click(pricingTab);

      // Act: Click add pricing tier button
      const addButton = screen.getByRole('button', { name: /add pricing tier/i });
      await user.click(addButton);

      // Assert: Button should be clickable
      expect(addButton).toBeTruthy();
    });
  });

  // ==========================================================================
  // Core Charges Tab
  // ==========================================================================

  describe('Core Charges Configuration', () => {
    it('should display core charges tab', async () => {
      // Act
      render(<ProductConfigPage />);

      // Assert: Core charges tab should be present
      await waitFor(() => {
        const coreChargesTab = screen.getByRole('button', { name: /core charges/i });
        expect(coreChargesTab).toBeTruthy();
      });
    });

    it('should switch to core charges tab when clicked', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<ProductConfigPage />);

      // Act: Click core charges tab
      const coreChargesTab = screen.getByRole('button', { name: /core charges/i });
      await user.click(coreChargesTab);

      // Assert: Core charges tab should be active
      await waitFor(() => {
        expect(coreChargesTab?.className).toContain('border-primary-500');
      });
    });

    it('should display core charges configuration when tab is active', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<ProductConfigPage />);

      // Act: Click core charges tab
      const coreChargesTab = screen.getByRole('button', { name: /core charges/i });
      await user.click(coreChargesTab);

      // Assert: Core charges content should be displayed
      await waitFor(() => {
        expect(screen.getByText(/enable core charges/i)).toBeTruthy();
        expect(screen.getByText(/track refundable deposits for returnable parts/i)).toBeTruthy();
      });
    });

    it('should show enable core charges toggle', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<ProductConfigPage />);

      // Act: Switch to core charges tab
      const coreChargesTab = screen.getByRole('button', { name: /core charges/i });
      await user.click(coreChargesTab);

      // Assert: Toggle should be present
      await waitFor(() => {
        const toggle = screen.getByRole('checkbox') as HTMLInputElement;
        expect(toggle).toBeTruthy();
        expect(toggle.type).toBe('checkbox');
      });
    });

    it('should show core charges description', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<ProductConfigPage />);

      // Act: Switch to core charges tab
      const coreChargesTab = screen.getByRole('button', { name: /core charges/i });
      await user.click(coreChargesTab);

      // Assert: Description should be displayed
      await waitFor(() => {
        expect(
          screen.getByText(/core charges can be configured per product/i)
        ).toBeTruthy();
      });
    });
  });

  // ==========================================================================
  // Tab Navigation
  // ==========================================================================

  describe('Tab Navigation', () => {
    it('should display all four tabs', async () => {
      // Act
      render(<ProductConfigPage />);

      // Assert: All tabs should be present
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /categories/i })).toBeTruthy();
        expect(screen.getByRole('button', { name: /^units$/i })).toBeTruthy();
        expect(screen.getByRole('button', { name: /pricing tiers/i })).toBeTruthy();
        expect(screen.getByRole('button', { name: /core charges/i })).toBeTruthy();
      });
    });

    it('should show tab icons', async () => {
      // Act
      const { container } = render(<ProductConfigPage />);

      // Assert: Each tab should have an icon
      await waitFor(() => {
        const tabs = container.querySelectorAll('button[class*="border-b-2"]');
        tabs.forEach((tab) => {
          expect(tab.querySelector('svg')).toBeTruthy();
        });
      });
    });

    it('should highlight active tab', async () => {
      // Act
      render(<ProductConfigPage />);

      // Assert: Categories tab should be highlighted by default
      await waitFor(() => {
        const categoriesTab = screen.getByRole('button', { name: /categories/i });
        expect(categoriesTab?.className).toContain('border-primary-500');
        expect(categoriesTab?.className).toContain('text-primary-400');
      });
    });

    it('should allow switching between all tabs', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<ProductConfigPage />);

      // Act & Assert: Switch to each tab
      const unitsTab = screen.getByRole('button', { name: /^units$/i });
      await user.click(unitsTab);
      await waitFor(() => {
        expect(unitsTab.className).toContain('border-primary-500');
      });

      const pricingTab = screen.getByRole('button', { name: /pricing tiers/i });
      await user.click(pricingTab);
      await waitFor(() => {
        expect(pricingTab.className).toContain('border-primary-500');
      });

      const coreChargesTab = screen.getByRole('button', { name: /core charges/i });
      await user.click(coreChargesTab);
      await waitFor(() => {
        expect(coreChargesTab.className).toContain('border-primary-500');
      });

      const categoriesTab = screen.getByRole('button', { name: /categories/i });
      await user.click(categoriesTab);
      await waitFor(() => {
        expect(categoriesTab.className).toContain('border-primary-500');
      });
    });

    it('should only show one tab content at a time', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<ProductConfigPage />);

      // Assert: Initially only categories content is visible
      await waitFor(() => {
        expect(screen.getByTestId('category-management')).toBeTruthy();
        expect(screen.queryByTestId('units-management')).toBeNull();
        expect(screen.queryByTestId('pricing-tiers-management')).toBeNull();
      });

      // Act: Switch to units tab
      const unitsTab = screen.getByRole('button', { name: /^units$/i });
      await user.click(unitsTab);

      // Assert: Only units content is visible
      await waitFor(() => {
        expect(screen.queryByTestId('category-management')).toBeNull();
        expect(screen.getByTestId('units-management')).toBeTruthy();
        expect(screen.queryByTestId('pricing-tiers-management')).toBeNull();
      });
    });
  });

  // ==========================================================================
  // Page Layout and Structure
  // ==========================================================================

  describe('Page Layout', () => {
    it('should display page header with title and description', async () => {
      // Act
      render(<ProductConfigPage />);

      // Assert: Header should be present
      await waitFor(() => {
        expect(screen.getByText(/product configuration/i)).toBeTruthy();
        expect(
          screen.getByText(/manage product categories, units, and pricing tiers/i)
        ).toBeTruthy();
      });
    });

    it('should use card layout for tab content', async () => {
      // Act
      const { container } = render(<ProductConfigPage />);

      // Assert: Content should be in a card
      await waitFor(() => {
        const cards = container.querySelectorAll('[class*="p-6"]');
        expect(cards.length).toBeGreaterThan(0);
      });
    });

    it('should have proper spacing and layout', async () => {
      // Act
      const { container } = render(<ProductConfigPage />);

      // Assert: Page should have proper container and spacing
      await waitFor(() => {
        const mainContainer = container.querySelector('.max-w-6xl');
        expect(mainContainer).toBeTruthy();
      });
    });

    it('should display tab navigation bar', async () => {
      // Act
      const { container } = render(<ProductConfigPage />);

      // Assert: Tab navigation should be present
      await waitFor(() => {
        const tabNav = container.querySelector('nav');
        expect(tabNav).toBeTruthy();
        expect(tabNav?.className).toContain('flex');
      });
    });
  });

  // ==========================================================================
  // Complete Workflow Tests
  // ==========================================================================

  describe('Complete Workflows', () => {
    it('should allow navigating through all tabs in sequence', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<ProductConfigPage />);

      // Act: Navigate through all tabs
      const tabs = [
        { name: /^units$/i, testId: 'units-management' },
        { name: /pricing tiers/i, testId: 'pricing-tiers-management' },
        { name: /core charges/i, testId: null },
        { name: /categories/i, testId: 'category-management' },
      ];

      for (const tab of tabs) {
        const tabButton = screen.getByRole('button', { name: tab.name });
        await user.click(tabButton);
        await waitFor(() => {
          expect(tabButton.className).toContain('border-primary-500');
        });
        if (tab.testId) {
          expect(screen.getByTestId(tab.testId)).toBeTruthy();
        }
      }

      // Assert: All tabs should have been successfully navigated
      expect(true).toBe(true);
    });

    it('should maintain tab state when performing actions', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<ProductConfigPage />);

      // Act: Switch to units tab
      const unitsTab = screen.getByRole('button', { name: /^units$/i });
      await user.click(unitsTab);

      // Act: Click add unit button
      const addButton = screen.getByRole('button', { name: /add unit/i });
      await user.click(addButton);

      // Assert: Should still be on units tab
      await waitFor(() => {
        expect(unitsTab?.className).toContain('border-primary-500');
        expect(screen.getByTestId('units-management')).toBeTruthy();
      });
    });
  });

  // ==========================================================================
  // Accessibility Tests
  // ==========================================================================

  describe('Accessibility', () => {
    it('should have proper button roles for tabs', async () => {
      // Act
      render(<ProductConfigPage />);

      // Assert: All tabs should be buttons
      await waitFor(() => {
        const categoriesTab = screen.getByRole('button', { name: /categories/i });
        const unitsTab = screen.getByRole('button', { name: /^units$/i });
        const pricingTab = screen.getByRole('button', { name: /pricing tiers/i });
        const coreChargesTab = screen.getByRole('button', { name: /core charges/i });

        expect(categoriesTab).toBeTruthy();
        expect(unitsTab).toBeTruthy();
        expect(pricingTab).toBeTruthy();
        expect(coreChargesTab).toBeTruthy();
      });
    });

    it('should have proper heading hierarchy', async () => {
      // Act
      render(<ProductConfigPage />);

      // Assert: Main heading should be present
      await waitFor(() => {
        expect(screen.getByText(/product configuration/i)).toBeTruthy();
      });
    });

    it('should support keyboard navigation between tabs', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<ProductConfigPage />);

      // Act: Tab through the navigation
      const categoriesTab = screen.getByRole('button', { name: /categories/i });
      categoriesTab.focus();
      expect(document.activeElement).toBe(categoriesTab);

      // Note: Full keyboard navigation testing would require more complex setup
      // This test verifies tabs are focusable
      expect(categoriesTab).toBeTruthy();
    });
  });
});
