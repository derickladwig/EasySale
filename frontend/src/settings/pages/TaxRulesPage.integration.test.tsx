/**
 * Integration Tests: Tax Rules Page
 *
 * End-to-end integration tests for the Tax Rules page.
 * Tests tax rule creation, validation, and calculation tester.
 *
 * Validates Requirements: 15.2, 15.3, 15.5, 15.7
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, waitFor, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaxRulesPage } from './TaxRulesPage';
import { toast } from '@common/components/molecules/Toast';
import type { TaxRule } from '../hooks/useTaxRulesQuery';

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

// Mock tax rules data
const mockTaxRules: TaxRule[] = [
  {
    id: 'tax-1',
    name: 'GST',
    rate: 5,
    category: null,
    is_default: true,
    store_id: 'store-001',
  },
  {
    id: 'tax-2',
    name: 'PST',
    rate: 7,
    category: null,
    is_default: false,
    store_id: 'store-001',
  },
  {
    id: 'tax-3',
    name: 'Luxury Tax',
    rate: 15,
    category: 'Accessories',
    is_default: false,
    store_id: 'store-001',
  },
];

// Mock the useTaxRulesQuery hook
vi.mock('../hooks/useTaxRulesQuery', () => ({
  useTaxRulesQuery: vi.fn(() => ({
    data: mockTaxRules,
    isLoading: false,
    error: null,
  })),
  TaxRule: {} as any, // Type export
}));

// ============================================================================
// Setup
// ============================================================================

describe('TaxRulesPage Integration Tests', () => {
  beforeEach(() => {
    // Clear any previous state
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  // ==========================================================================
  // Requirement 15.2: Allow defining multiple tax rates per store
  // ==========================================================================

  describe('Tax Rule Creation - Requirement 15.2', () => {
    it('should display tax rules section', async () => {
      // Act
      render(<TaxRulesPage />);

      // Assert: Tax rules section should be present
      await waitFor(() => {
        const taxRulesHeadings = screen.getAllByText(/tax rules/i);
        expect(taxRulesHeadings.length).toBeGreaterThan(0);
        expect(screen.getByRole('button', { name: /add tax rule/i })).toBeTruthy();
      });
    });

    it('should display store selector', async () => {
      // Act
      render(<TaxRulesPage />);

      // Assert: Store selector should be present
      await waitFor(() => {
        expect(screen.getByText(/store selection/i)).toBeTruthy();
        expect(screen.getByText(/configure tax rules for/i)).toBeTruthy();
      });
    });

    it('should show store options in selector', async () => {
      // Act
      render(<TaxRulesPage />);

      // Assert: Store options should be available
      await waitFor(() => {
        // Get the store selector specifically (first combobox)
        const selects = screen.getAllByRole('combobox');
        const storeSelect = selects[0]; // First select is the store selector
        expect(storeSelect).toBeTruthy();
        expect(screen.getByText(/main store/i)).toBeTruthy();
        expect(screen.getByText(/downtown store/i)).toBeTruthy();
      });
    });

    it('should display add tax rule button', async () => {
      // Act
      render(<TaxRulesPage />);

      // Assert: Add button should be visible
      await waitFor(() => {
        const addButton = screen.getByRole('button', { name: /add tax rule/i });
        expect(addButton).toBeTruthy();
      });
    });

    it('should trigger add tax rule action when button is clicked', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<TaxRulesPage />);

      // Act: Click add tax rule button
      const addButton = screen.getByRole('button', { name: /add tax rule/i });
      await user.click(addButton);

      // Assert: Info toast should be shown
      await waitFor(() => {
        expect(toast.info).toHaveBeenCalledWith('Tax rule configuration requires admin privileges. Contact your administrator to add or modify tax rules.');
      });
    });

    it('should show store-specific description', async () => {
      // Act
      render(<TaxRulesPage />);

      // Assert: Description should explain store-specific nature
      await waitFor(() => {
        expect(
          screen.getByText(/tax rules are store-specific/i)
        ).toBeTruthy();
      });
    });
  });

  // ==========================================================================
  // Requirement 15.3: Support tax rules by product category
  // ==========================================================================

  describe('Category-Specific Tax Rules - Requirement 15.3', () => {
    it('should display tax rule priority information', async () => {
      // Act
      render(<TaxRulesPage />);

      // Assert: Priority information should be displayed
      await waitFor(() => {
        expect(screen.getByText(/tax rule priority/i)).toBeTruthy();
        expect(screen.getByText(/category-specific tax rules/i)).toBeTruthy();
        const defaultRuleTexts = screen.getAllByText(/default tax rule/i);
        expect(defaultRuleTexts.length).toBeGreaterThan(0);
      });
    });

    it('should show priority order', async () => {
      // Act
      render(<TaxRulesPage />);

      // Assert: Priority order should be listed
      await waitFor(() => {
        const prioritySection = screen.getByText(/tax rule priority/i).closest('div');
        expect(prioritySection?.textContent).toContain('1.');
        expect(prioritySection?.textContent).toContain('2.');
      });
    });

    it('should explain category-specific rules override default', async () => {
      // Act
      render(<TaxRulesPage />);

      // Assert: Override behavior should be explained
      await waitFor(() => {
        expect(
          screen.getByText(/category-specific rules override the default rule/i)
        ).toBeTruthy();
      });
    });
  });

  // ==========================================================================
  // Requirement 15.5: Validate that tax rates are between 0% and 100%
  // ==========================================================================

  describe('Tax Rate Validation - Requirement 15.5', () => {
    it('should display validation rules section', async () => {
      // Act
      render(<TaxRulesPage />);

      // Assert: Validation rules should be displayed
      await waitFor(() => {
        expect(screen.getByText(/validation rules/i)).toBeTruthy();
      });
    });

    it('should show tax rate range validation rule', async () => {
      // Act
      render(<TaxRulesPage />);

      // Assert: Rate range rule should be displayed
      await waitFor(() => {
        expect(screen.getByText(/tax rates must be between 0% and 100%/i)).toBeTruthy();
      });
    });

    it('should show default tax rule requirement', async () => {
      // Act
      render(<TaxRulesPage />);

      // Assert: Default rule requirement should be displayed
      await waitFor(() => {
        expect(
          screen.getByText(/each store must have exactly one default tax rule/i)
        ).toBeTruthy();
      });
    });

    it('should show category override rule', async () => {
      // Act
      render(<TaxRulesPage />);

      // Assert: Category override rule should be displayed
      await waitFor(() => {
        expect(
          screen.getByText(/category-specific rules override the default rule/i)
        ).toBeTruthy();
      });
    });

    it('should show unique name requirement', async () => {
      // Act
      render(<TaxRulesPage />);

      // Assert: Unique name rule should be displayed
      await waitFor(() => {
        expect(
          screen.getByText(/tax rule names must be unique within a store/i)
        ).toBeTruthy();
      });
    });

    it('should display validation rules with checkmarks', async () => {
      // Act
      const { container } = render(<TaxRulesPage />);

      // Assert: Checkmarks should be present
      await waitFor(() => {
        const validationSection = screen.getByText(/validation rules/i).closest('div');
        const checkmarks = validationSection?.querySelectorAll('div:has-text("✓")');
        expect(checkmarks).toBeTruthy();
      });
    });
  });

  // ==========================================================================
  // Requirement 15.7: Allow testing tax calculations with sample transactions
  // ==========================================================================

  describe('Tax Calculation Tester - Requirement 15.7', () => {
    it('should display tax calculator section', async () => {
      // Act
      render(<TaxRulesPage />);

      // Assert: Calculator section should be present
      await waitFor(() => {
        expect(screen.getByText(/tax calculator/i)).toBeTruthy();
      });
    });

    it('should show amount input field', async () => {
      // Act
      render(<TaxRulesPage />);

      // Assert: Amount input should be present
      await waitFor(() => {
        const amountInput = screen.getByLabelText(/amount/i) as HTMLInputElement;
        expect(amountInput).toBeTruthy();
        expect(amountInput.type).toBe('number');
      });
    });

    it('should show category selector', async () => {
      // Act
      render(<TaxRulesPage />);

      // Assert: Category selector should be present
      await waitFor(() => {
        const categoryLabel = screen.getByLabelText(/category \(optional\)/i);
        expect(categoryLabel).toBeTruthy();
      });
    });

    it('should show category options', async () => {
      // Act
      render(<TaxRulesPage />);

      // Assert: Category options should be available
      await waitFor(() => {
        const categorySelect = screen.getByLabelText(/category \(optional\)/i);
        expect(categorySelect).toBeTruthy();
        // Check for default option
        const defaultOptions = screen.getAllByText(/default \(all categories\)/i);
        expect(defaultOptions.length).toBeGreaterThan(0);
      });
    });

    it('should show calculate button', async () => {
      // Act
      render(<TaxRulesPage />);

      // Assert: Calculate button should be present
      await waitFor(() => {
        const calculateButton = screen.getByRole('button', { name: /calculate/i });
        expect(calculateButton).toBeTruthy();
      });
    });

    it('should have default amount value', async () => {
      // Act
      render(<TaxRulesPage />);

      // Assert: Amount should have default value
      await waitFor(() => {
        const amountInput = screen.getByLabelText(/amount/i) as HTMLInputElement;
        expect(amountInput.value).toBe('100.00');
      });
    });

    it('should allow updating amount', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<TaxRulesPage />);

      // Act: Update amount
      const amountInputs = screen.getAllByLabelText(/amount/i);
      const amountInput = amountInputs[0]; // First one is the calculator amount
      await user.clear(amountInput);
      await user.type(amountInput, '250.50');

      // Assert: Amount should be updated (note: input may trim trailing zeros)
      const value = (amountInput as HTMLInputElement).value;
      expect(parseFloat(value)).toBe(250.5);
    });

    it('should allow selecting category', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<TaxRulesPage />);

      // Act: Select category
      const categorySelect = screen.getByLabelText(/category \(optional\)/i);
      await user.selectOptions(categorySelect, 'Caps');

      // Assert: Category should be selected
      expect((categorySelect as HTMLSelectElement).value).toBe('Caps');
    });

    it('should show error for invalid amount', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<TaxRulesPage />);

      // Act: Clear amount and calculate
      const amountInputs = screen.getAllByLabelText(/amount/i);
      const amountInput = amountInputs[0];
      await user.clear(amountInput);

      const calculateButton = screen.getByRole('button', { name: /calculate/i });
      await user.click(calculateButton);

      // Assert: Error toast should be shown
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Invalid amount');
      });
    });

    it('should calculate tax when calculate button is clicked', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<TaxRulesPage />);

      // Act: Enter amount and calculate
      const amountInputs = screen.getAllByLabelText(/amount/i);
      const amountInput = amountInputs[0];
      await user.clear(amountInput);
      await user.type(amountInput, '100.00');

      const calculateButton = screen.getByRole('button', { name: /calculate/i });
      await user.click(calculateButton);

      // Assert: Success should be shown (GST is default at 5%)
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          expect.stringContaining('5.00'),
          expect.any(Object)
        );
      });
    });

    it('should show calculator description', async () => {
      // Act
      render(<TaxRulesPage />);

      // Assert: Description should be present
      await waitFor(() => {
        expect(
          screen.getByText(/test tax calculations with sample amounts and categories/i)
        ).toBeTruthy();
      });
    });

    it('should support decimal amounts', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<TaxRulesPage />);

      // Act: Enter decimal amount
      const amountInputs = screen.getAllByLabelText(/amount/i);
      const amountInput = amountInputs[0];
      await user.clear(amountInput);
      await user.type(amountInput, '99.99');

      // Assert: Decimal value should be accepted
      expect((amountInput as HTMLInputElement).value).toBe('99.99');
    });

    it('should allow testing with different categories', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<TaxRulesPage />);

      // Act: Test with Caps category (should use default GST)
      const categorySelect = screen.getByLabelText(/category \(optional\)/i);
      await user.selectOptions(categorySelect, 'Caps');

      const calculateButton = screen.getByRole('button', { name: /calculate/i });
      await user.click(calculateButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledTimes(1);
      });

      // Act: Test with Accessories category (should use Luxury Tax at 15%)
      await user.selectOptions(categorySelect, 'Accessories');
      await user.click(calculateButton);

      // Assert: Both calculations should succeed
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledTimes(2);
      });
    });
  });

  // ==========================================================================
  // Empty State
  // ==========================================================================

  describe('Empty State', () => {
    it('should show tax rules when data exists', async () => {
      // Act
      render(<TaxRulesPage />);

      // Assert: Tax rules should be displayed (not empty state)
      await waitFor(() => {
        expect(screen.getByText('GST')).toBeTruthy();
        expect(screen.getByText('PST')).toBeTruthy();
        expect(screen.getByText('Luxury Tax')).toBeTruthy();
      });
    });

    it('should show tax rule details', async () => {
      // Act
      render(<TaxRulesPage />);

      // Assert: Tax rule details should be visible
      await waitFor(() => {
        const fivePercent = screen.getAllByText(/5%/);
        const sevenPercent = screen.getAllByText(/7%/);
        const fifteenPercent = screen.getAllByText(/15%/);
        expect(fivePercent.length).toBeGreaterThan(0); // GST rate
        expect(sevenPercent.length).toBeGreaterThan(0); // PST rate
        expect(fifteenPercent.length).toBeGreaterThan(0); // Luxury Tax rate
      });
    });

    it('should show default badge for default tax rule', async () => {
      // Act
      render(<TaxRulesPage />);

      // Assert: Default badge should be present
      await waitFor(() => {
        const defaultBadges = screen.getAllByText(/default/i);
        expect(defaultBadges.length).toBeGreaterThan(0);
      });
    });
  });

  // ==========================================================================
  // Page Layout and Structure
  // ==========================================================================

  describe('Page Layout', () => {
    it('should display page header with title and description', async () => {
      // Act
      render(<TaxRulesPage />);

      // Assert: Header should be present
      await waitFor(() => {
        const taxRulesHeadings = screen.getAllByText(/^tax rules$/i);
        expect(taxRulesHeadings.length).toBeGreaterThan(0);
        expect(screen.getByText(/configure tax rates per store and category/i)).toBeTruthy();
      });
    });

    it('should display all main sections', async () => {
      // Act
      render(<TaxRulesPage />);

      // Assert: All sections should be present
      await waitFor(() => {
        expect(screen.getByText(/store selection/i)).toBeTruthy();
        expect(screen.getByText(/tax calculator/i)).toBeTruthy();
        expect(screen.getByText(/validation rules/i)).toBeTruthy();
      });
    });

    it('should display section icons', async () => {
      // Act
      const { container } = render(<TaxRulesPage />);

      // Assert: Icons should be present
      await waitFor(() => {
        const storeSection = screen.getByText(/store selection/i).closest('div');
        expect(storeSection?.querySelector('svg')).toBeTruthy();

        const calculatorSection = screen.getByText(/tax calculator/i).closest('div');
        expect(calculatorSection?.querySelector('svg')).toBeTruthy();

        const validationSection = screen.getByText(/validation rules/i).closest('div');
        expect(validationSection?.querySelector('svg')).toBeTruthy();
      });
    });

    it('should use card layout for sections', async () => {
      // Act
      const { container } = render(<TaxRulesPage />);

      // Assert: Sections should be in cards
      await waitFor(() => {
        const cards = container.querySelectorAll('[class*="p-6"]');
        expect(cards.length).toBeGreaterThan(0);
      });
    });

    it('should have proper spacing and layout', async () => {
      // Act
      const { container } = render(<TaxRulesPage />);

      // Assert: Page should have proper container and spacing
      await waitFor(() => {
        const mainContainer = container.querySelector('.max-w-6xl');
        expect(mainContainer).toBeTruthy();
      });
    });
  });

  // ==========================================================================
  // Complete Workflow Tests
  // ==========================================================================

  describe('Complete Workflows', () => {
    it('should allow selecting store and testing calculation', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<TaxRulesPage />);

      // Act: Select store
      const selects = screen.getAllByRole('combobox');
      const storeSelect = selects[0]; // First select is store selector
      await user.selectOptions(storeSelect, 'store-002');

      // Act: Enter amount and calculate
      const amountInputs = screen.getAllByLabelText(/amount/i);
      const amountInput = amountInputs[0];
      await user.clear(amountInput);
      await user.type(amountInput, '150.00');

      const calculateButton = screen.getByRole('button', { name: /calculate/i });
      await user.click(calculateButton);

      // Assert: Calculation should succeed
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalled();
      });
    });

    it('should maintain form state when switching stores', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<TaxRulesPage />);

      // Act: Enter amount
      const amountInputs = screen.getAllByLabelText(/amount/i);
      const amountInput = amountInputs[0];
      await user.clear(amountInput);
      await user.type(amountInput, '200.00');

      // Act: Switch store
      const selects = screen.getAllByRole('combobox');
      const storeSelect = selects[0];
      await user.selectOptions(storeSelect, 'store-002');

      // Assert: Amount should still be present (note: input may trim trailing zeros)
      const value = (amountInput as HTMLInputElement).value;
      expect(parseFloat(value)).toBe(200);
    });

    it('should allow multiple calculations in sequence', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<TaxRulesPage />);

      // Act: First calculation
      const amountInputs = screen.getAllByLabelText(/amount/i);
      const amountInput = amountInputs[0];
      const calculateButton = screen.getByRole('button', { name: /calculate/i });

      await user.clear(amountInput);
      await user.type(amountInput, '100.00');
      await user.click(calculateButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledTimes(1);
      });

      // Act: Second calculation
      await user.clear(amountInput);
      await user.type(amountInput, '200.00');
      await user.click(calculateButton);

      // Assert: Both calculations should succeed
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledTimes(2);
      });
    });
  });

  // ==========================================================================
  // Accessibility Tests
  // ==========================================================================

  describe('Accessibility', () => {
    it('should have proper form labels', async () => {
      // Act
      render(<TaxRulesPage />);

      // Assert: All inputs should have associated labels
      await waitFor(() => {
        const amountInputs = screen.getAllByLabelText(/amount/i);
        expect(amountInputs.length).toBeGreaterThan(0);
        expect(screen.getByLabelText(/category \(optional\)/i)).toBeTruthy();
      });
    });

    it('should have proper button roles', async () => {
      // Act
      render(<TaxRulesPage />);

      // Assert: Buttons should have proper roles
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add tax rule/i })).toBeTruthy();
        expect(screen.getByRole('button', { name: /calculate/i })).toBeTruthy();
      });
    });

    it('should have proper heading hierarchy', async () => {
      // Act
      render(<TaxRulesPage />);

      // Assert: Headings should be present and properly structured
      await waitFor(() => {
        // Main heading (h1)
        const headings = screen.getAllByText(/^tax rules$/i);
        expect(headings.length).toBeGreaterThan(0);
        
        // Section headings
        expect(screen.getByText(/store selection/i)).toBeTruthy();
        expect(screen.getByText(/tax calculator/i)).toBeTruthy();
        expect(screen.getByText(/validation rules/i)).toBeTruthy();
      });
    });

    it('should have proper select elements', async () => {
      // Act
      render(<TaxRulesPage />);

      // Assert: Select elements should be present
      await waitFor(() => {
        const selects = screen.getAllByRole('combobox');
        expect(selects.length).toBe(2); // Store selector and category selector
      });
    });
  });
});
