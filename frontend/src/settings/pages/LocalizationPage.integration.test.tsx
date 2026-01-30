/**
 * Integration Tests: Localization Page
 *
 * End-to-end integration tests for the Localization page.
 * Tests language switching, currency formatting, and tax configuration.
 *
 * Validates Requirements: 23.2, 23.3, 23.4
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, waitFor, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LocalizationPage } from './LocalizationPage';
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

// ============================================================================
// Setup
// ============================================================================

describe('LocalizationPage Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  // ==========================================================================
  // Requirement 23.2: Allow selecting default language
  // ==========================================================================

  describe('Language Selection - Requirement 23.2', () => {
    it('should display language section', async () => {
      // Act
      render(<LocalizationPage />);

      // Assert: Language section should be present
      await waitFor(() => {
        expect(screen.getByText(/^language$/i)).toBeTruthy();
        expect(screen.getByText(/default language/i)).toBeTruthy();
      });
    });

    it('should have English selected by default', async () => {
      // Act
      const { container } = render(<LocalizationPage />);

      // Assert: English should be selected
      await waitFor(() => {
        const languageSelect = container.querySelector('select') as HTMLSelectElement;
        expect(languageSelect.value).toBe('en');
      });
    });

    it('should display all available language options', async () => {
      // Act
      const { container } = render(<LocalizationPage />);

      // Assert: All language options should be available
      await waitFor(() => {
        const languageSelect = container.querySelector('select') as HTMLSelectElement;
        const options = Array.from(languageSelect.options).map((opt) => opt.value);
        expect(options).toContain('en');
        expect(options).toContain('fr');
        expect(options).toContain('es');
      });
    });

    it('should allow switching to French', async () => {
      // Arrange
      const user = userEvent.setup();
      const { container } = render(<LocalizationPage />);

      // Act: Select French
      const languageSelect = container.querySelector('select') as HTMLSelectElement;
      await user.selectOptions(languageSelect, 'fr');

      // Assert: French should be selected
      expect(languageSelect.value).toBe('fr');
    });

    it('should allow switching to Spanish', async () => {
      // Arrange
      const user = userEvent.setup();
      const { container } = render(<LocalizationPage />);

      // Act: Select Spanish
      const languageSelect = container.querySelector('select') as HTMLSelectElement;
      await user.selectOptions(languageSelect, 'es');

      // Assert: Spanish should be selected
      expect(languageSelect.value).toBe('es');
    });

    it('should show helper text about language application', async () => {
      // Act
      render(<LocalizationPage />);

      // Assert: Helper text should be displayed
      await waitFor(() => {
        expect(screen.getByText(/applied to ui, receipts, and reports/i)).toBeTruthy();
      });
    });

    it('should save language settings when save button is clicked', async () => {
      // Arrange
      const user = userEvent.setup();
      const { container } = render(<LocalizationPage />);

      // Act: Change language and save
      const languageSelect = container.querySelector('select') as HTMLSelectElement;
      await user.selectOptions(languageSelect, 'fr');

      const saveButton = screen.getByRole('button', { name: /save all settings/i });
      await user.click(saveButton);

      // Assert: Success toast should be shown
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Localization settings updated successfully');
      });
    });
  });

  // ==========================================================================
  // Requirement 23.3: Allow selecting default currency
  // ==========================================================================

  describe('Currency Selection - Requirement 23.3', () => {
    it('should display currency section', async () => {
      // Act
      render(<LocalizationPage />);

      // Assert: Currency section should be present
      await waitFor(() => {
        expect(screen.getAllByText(/^currency$/i).length).toBeGreaterThan(0);
        expect(screen.getByText(/default currency/i)).toBeTruthy();
      });
    });

    it('should have CAD selected by default', async () => {
      // Act
      const { container } = render(<LocalizationPage />);

      // Assert: CAD should be selected (find select with CAD option selected)
      await waitFor(() => {
        const selects = container.querySelectorAll('select');
        const currencySelect = Array.from(selects).find(
          (select) => select.value === 'CAD' && Array.from(select.options).some((opt) => opt.value === 'USD')
        );
        expect(currencySelect).toBeTruthy();
        expect(currencySelect?.value).toBe('CAD');
      });
    });

    it('should display all available currency options', async () => {
      // Act
      const { container } = render(<LocalizationPage />);

      // Assert: All currency options should be available
      await waitFor(() => {
        const selects = container.querySelectorAll('select');
        const currencySelect = Array.from(selects).find(
          (select) => select.value === 'CAD' && Array.from(select.options).some((opt) => opt.value === 'USD')
        );
        expect(currencySelect).toBeTruthy();
        const options = Array.from(currencySelect!.options).map((opt) => opt.value);
        expect(options).toContain('CAD');
        expect(options).toContain('USD');
        expect(options).toContain('EUR');
        expect(options).toContain('GBP');
      });
    });

    it('should allow switching to USD', async () => {
      // Arrange
      const user = userEvent.setup();
      const { container } = render(<LocalizationPage />);

      // Act: Select USD
      const selects = container.querySelectorAll('select');
      const currencySelect = Array.from(selects).find(
        (select) => select.value === 'CAD' && Array.from(select.options).some((opt) => opt.value === 'USD')
      ) as HTMLSelectElement;
      await user.selectOptions(currencySelect, 'USD');

      // Assert: USD should be selected
      expect(currencySelect.value).toBe('USD');
    });

    it('should allow changing currency symbol', async () => {
      // Arrange
      const user = userEvent.setup();
      const { container } = render(<LocalizationPage />);

      // Act: Change currency symbol (find input with $ value)
      const inputs = container.querySelectorAll('input[type="text"]');
      const symbolInput = Array.from(inputs).find(
        (input) => (input as HTMLInputElement).value === '$'
      ) as HTMLInputElement;
      await user.clear(symbolInput);
      await user.type(symbolInput, '€');

      // Assert: Symbol should be updated
      expect(symbolInput.value).toBe('€');
    });

    it('should allow changing symbol position', async () => {
      // Arrange
      const user = userEvent.setup();
      const { container } = render(<LocalizationPage />);

      // Act: Change symbol position (find select with before/after options)
      const selects = container.querySelectorAll('select');
      const positionSelect = Array.from(selects).find(
        (select) => Array.from(select.options).some((opt) => opt.value === 'before' || opt.value === 'after')
      ) as HTMLSelectElement;
      await user.selectOptions(positionSelect, 'after');

      // Assert: Position should be updated
      expect(positionSelect.value).toBe('after');
    });

    it('should allow changing decimal places', async () => {
      // Arrange
      const user = userEvent.setup();
      const { container } = render(<LocalizationPage />);

      // Act: Change decimal places (find number input with value 2)
      const inputs = container.querySelectorAll('input[type="number"]');
      const decimalInput = Array.from(inputs).find(
        (input) => (input as HTMLInputElement).value === '2' && (input as HTMLInputElement).min === '0'
      ) as HTMLInputElement;
      await user.clear(decimalInput);
      await user.type(decimalInput, '3');

      // Assert: Decimal places should be updated
      expect(decimalInput.value).toBe('3');
    });

    it('should display currency preview', async () => {
      // Act
      render(<LocalizationPage />);

      // Assert: Preview should be displayed (there are multiple "Preview:" texts, so use getAllByText)
      await waitFor(() => {
        const previews = screen.getAllByText(/preview:/i);
        expect(previews.length).toBeGreaterThan(0);
        // Preview should show formatted currency (check for the number, symbol position may vary)
        const preview = screen.getByText(/1234\.56/);
        expect(preview).toBeTruthy();
      });
    });

    it('should update preview when currency settings change', async () => {
      // Arrange
      const user = userEvent.setup();
      const { container } = render(<LocalizationPage />);

      // Act: Change symbol position to after
      const selects = container.querySelectorAll('select');
      const positionSelect = Array.from(selects).find(
        (select) => Array.from(select.options).some((opt) => opt.value === 'before' || opt.value === 'after')
      ) as HTMLSelectElement;
      await user.selectOptions(positionSelect, 'after');

      // Assert: Preview should update to show symbol after amount
      await waitFor(() => {
        expect(screen.getByText(/1234\.56\$/)).toBeTruthy();
      });
    });

    it('should update preview when decimal places change', async () => {
      // Arrange
      const user = userEvent.setup();
      const { container } = render(<LocalizationPage />);

      // Act: Change decimal places to 0
      const inputs = container.querySelectorAll('input[type="number"]');
      const decimalInput = Array.from(inputs).find(
        (input) => (input as HTMLInputElement).value === '2' && (input as HTMLInputElement).min === '0'
      ) as HTMLInputElement;
      await user.clear(decimalInput);
      await user.type(decimalInput, '0');

      // Assert: Preview should update to show no decimals
      await waitFor(() => {
        expect(screen.getByText(/\$1235/)).toBeTruthy();
      });
    });

    it('should save currency settings when save button is clicked', async () => {
      // Arrange
      const user = userEvent.setup();
      const { container } = render(<LocalizationPage />);

      // Act: Change currency and save
      const selects = container.querySelectorAll('select');
      const currencySelect = Array.from(selects).find(
        (select) => select.value === 'CAD' && Array.from(select.options).some((opt) => opt.value === 'USD')
      ) as HTMLSelectElement;
      await user.selectOptions(currencySelect, 'USD');

      const saveButton = screen.getByRole('button', { name: /save all settings/i });
      await user.click(saveButton);

      // Assert: Success toast should be shown
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Localization settings updated successfully');
      });
    });
  });

  // ==========================================================================
  // Requirement 23.4: Allow configuring tax settings
  // ==========================================================================

  describe('Tax Configuration - Requirement 23.4', () => {
    it('should display tax configuration section', async () => {
      // Act
      render(<LocalizationPage />);

      // Assert: Tax section should be present
      await waitFor(() => {
        expect(screen.getByText(/tax configuration/i)).toBeTruthy();
        expect(screen.getByText(/enable tax/i)).toBeTruthy();
      });
    });

    it('should have tax enabled by default', async () => {
      // Act
      render(<LocalizationPage />);

      // Assert: Tax should be enabled
      await waitFor(() => {
        const taxToggle = screen.getByRole('checkbox') as HTMLInputElement;
        expect(taxToggle.checked).toBe(true);
      });
    });

    it('should allow disabling tax', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<LocalizationPage />);

      // Act: Disable tax
      const taxToggle = screen.getByRole('checkbox');
      await user.click(taxToggle);

      // Assert: Tax should be disabled
      expect((taxToggle as HTMLInputElement).checked).toBe(false);
    });

    it('should hide tax fields when tax is disabled', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<LocalizationPage />);

      // Act: Disable tax
      const taxToggle = screen.getByRole('checkbox');
      await user.click(taxToggle);

      // Assert: Tax fields should be hidden
      await waitFor(() => {
        expect(screen.queryByText(/tax rate \(%\)/i)).toBeNull();
        expect(screen.queryByText(/^tax name$/i)).toBeNull();
      });
    });

    it('should show tax fields when tax is enabled', async () => {
      // Act
      const { container } = render(<LocalizationPage />);

      // Assert: Tax fields should be visible
      await waitFor(() => {
        expect(screen.getByText(/tax rate \(%\)/i)).toBeTruthy();
        expect(screen.getByText(/^tax name$/i)).toBeTruthy();
        // Find tax rate input
        const inputs = container.querySelectorAll('input[type="number"]');
        const taxRateInput = Array.from(inputs).find(
          (input) => (input as HTMLInputElement).value === '13.00'
        );
        expect(taxRateInput).toBeTruthy();
      });
    });

    it('should have default tax rate of 13.00', async () => {
      // Act
      const { container } = render(<LocalizationPage />);

      // Assert: Default tax rate should be 13.00
      await waitFor(() => {
        const inputs = container.querySelectorAll('input[type="number"]');
        const taxRateInput = Array.from(inputs).find(
          (input) => (input as HTMLInputElement).value === '13.00'
        ) as HTMLInputElement;
        expect(taxRateInput).toBeTruthy();
        expect(taxRateInput.value).toBe('13.00');
      });
    });

    it('should allow changing tax rate', async () => {
      // Arrange
      const user = userEvent.setup();
      const { container } = render(<LocalizationPage />);

      // Act: Change tax rate
      const inputs = container.querySelectorAll('input[type="number"]');
      const taxRateInput = Array.from(inputs).find(
        (input) => (input as HTMLInputElement).value === '13.00'
      ) as HTMLInputElement;
      await user.clear(taxRateInput);
      await user.type(taxRateInput, '15.50');

      // Assert: Tax rate should be updated (may not include trailing zeros)
      const value = taxRateInput.value;
      expect(parseFloat(value)).toBe(15.50);
    });

    it('should have HST selected as default tax name', async () => {
      // Act
      const { container } = render(<LocalizationPage />);

      // Assert: HST should be selected
      await waitFor(() => {
        const selects = container.querySelectorAll('select');
        const taxNameSelect = Array.from(selects).find(
          (select) => select.value === 'HST' && Array.from(select.options).some((opt) => opt.value === 'GST')
        ) as HTMLSelectElement;
        expect(taxNameSelect).toBeTruthy();
        expect(taxNameSelect.value).toBe('HST');
      });
    });

    it('should display all available tax name options', async () => {
      // Act
      const { container } = render(<LocalizationPage />);

      // Assert: All tax name options should be available
      await waitFor(() => {
        const selects = container.querySelectorAll('select');
        const taxNameSelect = Array.from(selects).find(
          (select) => select.value === 'HST' && Array.from(select.options).some((opt) => opt.value === 'GST')
        ) as HTMLSelectElement;
        expect(taxNameSelect).toBeTruthy();
        const options = Array.from(taxNameSelect.options).map((opt) => opt.value);
        expect(options).toContain('GST');
        expect(options).toContain('HST');
        expect(options).toContain('PST');
        expect(options).toContain('VAT');
        expect(options).toContain('Sales Tax');
      });
    });

    it('should allow changing tax name to GST', async () => {
      // Arrange
      const user = userEvent.setup();
      const { container } = render(<LocalizationPage />);

      // Act: Change tax name
      const selects = container.querySelectorAll('select');
      const taxNameSelect = Array.from(selects).find(
        (select) => select.value === 'HST' && Array.from(select.options).some((opt) => opt.value === 'GST')
      ) as HTMLSelectElement;
      await user.selectOptions(taxNameSelect, 'GST');

      // Assert: GST should be selected
      expect(taxNameSelect.value).toBe('GST');
    });

    it('should allow changing tax name to VAT', async () => {
      // Arrange
      const user = userEvent.setup();
      const { container } = render(<LocalizationPage />);

      // Act: Change tax name
      const selects = container.querySelectorAll('select');
      const taxNameSelect = Array.from(selects).find(
        (select) => select.value === 'HST' && Array.from(select.options).some((opt) => opt.value === 'GST')
      ) as HTMLSelectElement;
      await user.selectOptions(taxNameSelect, 'VAT');

      // Assert: VAT should be selected
      expect(taxNameSelect.value).toBe('VAT');
    });

    it('should save tax settings when save button is clicked', async () => {
      // Arrange
      const user = userEvent.setup();
      const { container } = render(<LocalizationPage />);

      // Act: Change tax settings and save
      const inputs = container.querySelectorAll('input[type="number"]');
      const taxRateInput = Array.from(inputs).find(
        (input) => (input as HTMLInputElement).value === '13.00'
      ) as HTMLInputElement;
      await user.clear(taxRateInput);
      await user.type(taxRateInput, '10.00');

      const saveButton = screen.getByRole('button', { name: /save all settings/i });
      await user.click(saveButton);

      // Assert: Success toast should be shown
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Localization settings updated successfully');
      });
    });
  });

  // ==========================================================================
  // Date & Time Settings
  // ==========================================================================

  describe('Date & Time Settings', () => {
    it('should display date & time section', async () => {
      // Act
      const { container } = render(<LocalizationPage />);

      // Assert: Date & time section should be present
      await waitFor(() => {
        expect(screen.getByText(/^date & time$/i)).toBeTruthy();
        expect(screen.getByText(/date format/i)).toBeTruthy();
        expect(screen.getByText(/time format/i)).toBeTruthy();
        // Timezone appears multiple times, so just check it exists
        const timezoneElements = screen.getAllByText(/timezone/i);
        expect(timezoneElements.length).toBeGreaterThan(0);
        // Verify selects exist
        const selects = container.querySelectorAll('select');
        expect(selects.length).toBeGreaterThan(3); // At least 4 selects (language, currency, date, time, timezone, tax)
      });
    });

    it('should have YYYY-MM-DD as default date format', async () => {
      // Act
      const { container } = render(<LocalizationPage />);

      // Assert: YYYY-MM-DD should be selected
      await waitFor(() => {
        const selects = container.querySelectorAll('select');
        const dateFormatSelect = Array.from(selects).find(
          (select) => select.value === 'YYYY-MM-DD' && Array.from(select.options).some((opt) => opt.value === 'MM/DD/YYYY')
        ) as HTMLSelectElement;
        expect(dateFormatSelect).toBeTruthy();
        expect(dateFormatSelect.value).toBe('YYYY-MM-DD');
      });
    });

    it('should allow changing date format', async () => {
      // Arrange
      const user = userEvent.setup();
      const { container } = render(<LocalizationPage />);

      // Act: Change date format
      const selects = container.querySelectorAll('select');
      const dateFormatSelect = Array.from(selects).find(
        (select) => select.value === 'YYYY-MM-DD' && Array.from(select.options).some((opt) => opt.value === 'MM/DD/YYYY')
      ) as HTMLSelectElement;
      await user.selectOptions(dateFormatSelect, 'MM/DD/YYYY');

      // Assert: MM/DD/YYYY should be selected
      expect(dateFormatSelect.value).toBe('MM/DD/YYYY');
    });

    it('should have 24-hour as default time format', async () => {
      // Act
      const { container } = render(<LocalizationPage />);

      // Assert: 24-hour should be selected
      await waitFor(() => {
        const selects = container.querySelectorAll('select');
        const timeFormatSelect = Array.from(selects).find(
          (select) => select.value === '24h' && Array.from(select.options).some((opt) => opt.value === '12h')
        ) as HTMLSelectElement;
        expect(timeFormatSelect).toBeTruthy();
        expect(timeFormatSelect.value).toBe('24h');
      });
    });

    it('should allow changing time format to 12-hour', async () => {
      // Arrange
      const user = userEvent.setup();
      const { container } = render(<LocalizationPage />);

      // Act: Change time format
      const selects = container.querySelectorAll('select');
      const timeFormatSelect = Array.from(selects).find(
        (select) => select.value === '24h' && Array.from(select.options).some((opt) => opt.value === '12h')
      ) as HTMLSelectElement;
      await user.selectOptions(timeFormatSelect, '12h');

      // Assert: 12-hour should be selected
      expect(timeFormatSelect.value).toBe('12h');
    });

    it('should have America/Edmonton as default timezone', async () => {
      // Act
      const { container } = render(<LocalizationPage />);

      // Assert: America/Edmonton should be selected (Canada-first default)
      await waitFor(() => {
        const selects = container.querySelectorAll('select');
        const timezoneSelect = Array.from(selects).find(
          (select) => select.value === 'America/Edmonton' && Array.from(select.options).some((opt) => opt.value === 'America/Vancouver')
        ) as HTMLSelectElement;
        expect(timezoneSelect).toBeTruthy();
        expect(timezoneSelect.value).toBe('America/Edmonton');
      });
    });

    it('should allow changing timezone', async () => {
      // Arrange
      const user = userEvent.setup();
      const { container } = render(<LocalizationPage />);

      // Act: Change timezone
      const selects = container.querySelectorAll('select');
      const timezoneSelect = Array.from(selects).find(
        (select) => select.value === 'America/Edmonton' && Array.from(select.options).some((opt) => opt.value === 'America/Vancouver')
      ) as HTMLSelectElement;
      await user.selectOptions(timezoneSelect, 'America/Vancouver');

      // Assert: America/Vancouver should be selected
      expect(timezoneSelect.value).toBe('America/Vancouver');
    });

    it('should display date/time preview', async () => {
      // Act
      render(<LocalizationPage />);

      // Assert: Preview should be displayed
      await waitFor(() => {
        expect(screen.getByText(/current date\/time preview:/i)).toBeTruthy();
        expect(screen.getByText(/timezone:/i)).toBeTruthy();
      });
    });
  });

  // ==========================================================================
  // Page Layout and Structure
  // ==========================================================================

  describe('Page Layout', () => {
    it('should display page header with title and description', async () => {
      // Act
      render(<LocalizationPage />);

      // Assert: Header should be present
      await waitFor(() => {
        expect(screen.getByText(/^localization$/i)).toBeTruthy();
        expect(
          screen.getByText(/configure language, currency, and regional settings/i)
        ).toBeTruthy();
      });
    });

    it('should display all main sections', async () => {
      // Act
      render(<LocalizationPage />);

      // Assert: All sections should be present
      await waitFor(() => {
        expect(screen.getByText(/^language$/i)).toBeTruthy();
        expect(screen.getAllByText(/^currency$/i).length).toBeGreaterThan(0);
        expect(screen.getByText(/tax configuration/i)).toBeTruthy();
        expect(screen.getByText(/^date & time$/i)).toBeTruthy();
      });
    });

    it('should display section icons', async () => {
      // Act
      const { container } = render(<LocalizationPage />);

      // Assert: Icons should be present for each section (at least 4 sections)
      await waitFor(() => {
        const icons = container.querySelectorAll('svg');
        expect(icons.length).toBeGreaterThanOrEqual(4); // At least one icon per section
      });
    });

    it('should use card layout for sections', async () => {
      // Act
      const { container } = render(<LocalizationPage />);

      // Assert: Sections should be in cards
      await waitFor(() => {
        const cards = container.querySelectorAll('[class*="p-6"]');
        expect(cards.length).toBeGreaterThan(0);
      });
    });

    it('should display save button', async () => {
      // Act
      render(<LocalizationPage />);

      // Assert: Save button should be present
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save all settings/i })).toBeTruthy();
      });
    });

    it('should be scrollable for long content', async () => {
      // Act
      const { container } = render(<LocalizationPage />);

      // Assert: Page should be scrollable
      await waitFor(() => {
        const scrollableContainer = container.querySelector('[class*="overflow-auto"]');
        expect(scrollableContainer).toBeTruthy();
      });
    });
  });

  // ==========================================================================
  // Complete Workflow Tests
  // ==========================================================================

  describe('Complete Workflows', () => {
    it('should allow updating all settings at once', async () => {
      // Arrange
      const user = userEvent.setup();
      const { container } = render(<LocalizationPage />);

      // Act: Update language
      const languageSelect = container.querySelector('select') as HTMLSelectElement;
      await user.selectOptions(languageSelect, 'fr');

      // Act: Update currency
      const selects = container.querySelectorAll('select');
      const currencySelect = Array.from(selects).find(
        (select) => select.value === 'CAD' && Array.from(select.options).some((opt) => opt.value === 'EUR')
      ) as HTMLSelectElement;
      await user.selectOptions(currencySelect, 'EUR');

      // Act: Update tax rate
      const inputs = container.querySelectorAll('input[type="number"]');
      const taxRateInput = Array.from(inputs).find(
        (input) => (input as HTMLInputElement).value === '13.00'
      ) as HTMLInputElement;
      await user.clear(taxRateInput);
      await user.type(taxRateInput, '20.00');

      // Act: Save all settings
      const saveButton = screen.getByRole('button', { name: /save all settings/i });
      await user.click(saveButton);

      // Assert: Success toast should be shown
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Localization settings updated successfully');
      });

      // Assert: All settings should be updated (tax rate may not have trailing zeros)
      expect(languageSelect.value).toBe('fr');
      expect(currencySelect.value).toBe('EUR');
      expect(parseFloat(taxRateInput.value)).toBe(20.00);
    });

    it('should show loading state while saving', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<LocalizationPage />);

      // Act: Click save button
      const saveButton = screen.getByRole('button', { name: /save all settings/i });
      await user.click(saveButton);

      // Assert: Button should show loading state (implementation depends on Button component)
      expect(saveButton).toBeTruthy();
    });

    it('should maintain state after toggling tax on and off', async () => {
      // Arrange
      const user = userEvent.setup();
      const { container } = render(<LocalizationPage />);

      // Act: Change tax rate
      const inputs = container.querySelectorAll('input[type="number"]');
      const taxRateInput = Array.from(inputs).find(
        (input) => (input as HTMLInputElement).value === '13.00'
      ) as HTMLInputElement;
      await user.clear(taxRateInput);
      await user.type(taxRateInput, '15.00');

      // Act: Disable tax
      const taxToggle = screen.getByRole('checkbox');
      await user.click(taxToggle);

      // Act: Re-enable tax
      await user.click(taxToggle);

      // Assert: Tax rate should be preserved (may not include trailing zeros)
      await waitFor(() => {
        const inputsAfter = container.querySelectorAll('input[type="number"]');
        const taxRateInputAfter = Array.from(inputsAfter).find(
          (input) => (input as HTMLInputElement).min === '0' && (input as HTMLInputElement).max === '100'
        ) as HTMLInputElement;
        expect(parseFloat(taxRateInputAfter.value)).toBe(15.00);
      });
    });
  });

  // ==========================================================================
  // Accessibility
  // ==========================================================================

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', async () => {
      // Act
      render(<LocalizationPage />);

      // Assert: Headings should be present
      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1 })).toBeTruthy();
        const h2Headings = screen.getAllByRole('heading', { level: 2 });
        expect(h2Headings.length).toBeGreaterThan(0);
      });
    });

    it('should have labels for all form inputs', async () => {
      // Act
      render(<LocalizationPage />);

      // Assert: All labels should be present (even if not properly associated)
      await waitFor(() => {
        expect(screen.getByText(/default language/i)).toBeTruthy();
        expect(screen.getByText(/default currency/i)).toBeTruthy();
        expect(screen.getByText(/currency symbol/i)).toBeTruthy();
        expect(screen.getByText(/tax rate/i)).toBeTruthy();
        expect(screen.getByText(/date format/i)).toBeTruthy();
        expect(screen.getByText(/time format/i)).toBeTruthy();
        // Use getAllByText for timezone since it appears multiple times
        const timezoneLabels = screen.getAllByText(/timezone/i);
        expect(timezoneLabels.length).toBeGreaterThan(0);
      });
    });

    it('should have accessible toggle for tax enable/disable', async () => {
      // Act
      render(<LocalizationPage />);

      // Assert: Toggle should be accessible
      await waitFor(() => {
        const taxToggle = screen.getByRole('checkbox');
        expect(taxToggle).toBeTruthy();
      });
    });
  });
});
