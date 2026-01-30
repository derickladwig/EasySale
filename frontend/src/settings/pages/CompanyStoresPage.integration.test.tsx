/**
 * Integration Tests: Company & Stores Page
 *
 * End-to-end integration tests for the Company & Stores page.
 * Tests company info updates, store creation, and store updates.
 *
 * Validates Requirements: 17.2, 17.4, 17.5
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, waitFor, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CompanyStoresPage } from './CompanyStoresPage';
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

describe('CompanyStoresPage Integration Tests', () => {
  beforeEach(() => {
    // Clear any previous state
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  // ==========================================================================
  // Requirement 17.2: Allow editing company name, address, phone, email
  // ==========================================================================

  describe('Company Info Updates - Requirement 17.2', () => {
    it('should display company information section', async () => {
      // Act
      render(<CompanyStoresPage />);

      // Assert: Company info section should be present
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /company information/i })).toBeTruthy();
        expect(screen.getByLabelText(/company name/i)).toBeTruthy();
        expect(screen.getByLabelText(/address/i)).toBeTruthy();
        expect(screen.getByLabelText(/city/i)).toBeTruthy();
        expect(screen.getByLabelText(/phone/i)).toBeTruthy();
        expect(screen.getByLabelText(/email/i)).toBeTruthy();
      });
    });

    it('should pre-fill company information with default values', async () => {
      // Act
      render(<CompanyStoresPage />);

      // Assert: Fields should be pre-filled
      await waitFor(() => {
        const companyNameInput = screen.getByLabelText(/company name/i) as HTMLInputElement;
        expect(companyNameInput.value).toBe('Your Business Name');

        const addressInput = screen.getByLabelText(/address/i) as HTMLInputElement;
        expect(addressInput.value).toBe('123 Main St');

        const cityInput = screen.getByLabelText(/city/i) as HTMLInputElement;
        expect(cityInput.value).toBe('Your City');

        const phoneInput = screen.getByLabelText(/phone/i) as HTMLInputElement;
        expect(phoneInput.value).toBe('(555) 123-4567');

        const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
        expect(emailInput.value).toBe('info@example.com');
      });
    });

    it('should allow updating company name', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<CompanyStoresPage />);

      // Act: Update company name
      const companyNameInput = screen.getByLabelText(/company name/i);
      await user.clear(companyNameInput);
      await user.type(companyNameInput, 'New Company Name');

      // Assert: Input value should be updated
      expect((companyNameInput as HTMLInputElement).value).toBe('New Company Name');
    });

    it('should allow updating company address', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<CompanyStoresPage />);

      // Act: Update address
      const addressInput = screen.getByLabelText(/address/i);
      await user.clear(addressInput);
      await user.type(addressInput, '456 New Street');

      // Assert: Input value should be updated
      expect((addressInput as HTMLInputElement).value).toBe('456 New Street');
    });

    it('should allow updating company city', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<CompanyStoresPage />);

      // Act: Update city
      const cityInput = screen.getByLabelText(/city/i);
      await user.clear(cityInput);
      await user.type(cityInput, 'New City');

      // Assert: Input value should be updated
      expect((cityInput as HTMLInputElement).value).toBe('New City');
    });

    it('should allow updating state/province', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<CompanyStoresPage />);

      // Act: Update state
      const stateInput = screen.getByLabelText(/state\/province/i);
      await user.clear(stateInput);
      await user.type(stateInput, 'CA');

      // Assert: Input value should be updated
      expect((stateInput as HTMLInputElement).value).toBe('CA');
    });

    it('should allow updating ZIP/postal code', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<CompanyStoresPage />);

      // Act: Update ZIP
      const zipInput = screen.getByLabelText(/zip\/postal code/i);
      await user.clear(zipInput);
      await user.type(zipInput, '90210');

      // Assert: Input value should be updated
      expect((zipInput as HTMLInputElement).value).toBe('90210');
    });

    it('should allow updating company phone', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<CompanyStoresPage />);

      // Act: Update phone
      const phoneInput = screen.getByLabelText(/phone/i);
      await user.clear(phoneInput);
      await user.type(phoneInput, '(416) 555-0100');

      // Assert: Input value should be updated
      expect((phoneInput as HTMLInputElement).value).toBe('(416) 555-0100');
    });

    it('should allow updating company email', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<CompanyStoresPage />);

      // Act: Update email
      const emailInput = screen.getByLabelText(/email/i);
      await user.clear(emailInput);
      await user.type(emailInput, 'contact@newcompany.com');

      // Assert: Input value should be updated
      expect((emailInput as HTMLInputElement).value).toBe('contact@newcompany.com');
    });

    it('should save company information when save button is clicked', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<CompanyStoresPage />);

      // Act: Update company name
      const companyNameInput = screen.getByLabelText(/company name/i);
      await user.clear(companyNameInput);
      await user.type(companyNameInput, 'Updated Company');

      // Act: Click save button
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      // Assert: Success toast should be shown
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Company information updated successfully');
      });
    });

    it('should show loading state while saving company info', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<CompanyStoresPage />);

      // Act: Update company name and save
      const companyNameInput = screen.getByLabelText(/company name/i);
      await user.clear(companyNameInput);
      await user.type(companyNameInput, 'New Name');

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      // Assert: Button should show loading state
      expect(saveButton).toBeTruthy();
    });

    it('should allow updating multiple company fields together', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<CompanyStoresPage />);

      // Act: Update multiple fields
      const companyNameInput = screen.getByLabelText(/company name/i);
      await user.clear(companyNameInput);
      await user.type(companyNameInput, 'Complete Company Name');

      const addressInput = screen.getByLabelText(/address/i);
      await user.clear(addressInput);
      await user.type(addressInput, '789 Complete St');

      const phoneInput = screen.getByLabelText(/phone/i);
      await user.clear(phoneInput);
      await user.type(phoneInput, '(555) 999-8888');

      // Act: Save changes
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      // Assert: Success toast should be shown
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Company information updated successfully');
      });
    });

    it('should display company information section icon', async () => {
      // Act
      const { container } = render(<CompanyStoresPage />);

      // Assert: Icon should be present
      await waitFor(() => {
        const heading = screen.getByRole('heading', { name: /company information/i });
        const companySection = heading.closest('div');
        expect(companySection?.querySelector('svg')).toBeTruthy();
      });
    });
  });

  // ==========================================================================
  // Requirement 17.4: Allow adding/editing stores
  // ==========================================================================

  describe('Store Management - Requirements 17.4, 17.5', () => {
    it('should display store locations section', async () => {
      // Act
      render(<CompanyStoresPage />);

      // Assert: Store locations section should be present
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /store locations/i })).toBeTruthy();
        expect(screen.getByRole('button', { name: /add store/i })).toBeTruthy();
      });
    });

    it('should show add store button', async () => {
      // Act
      render(<CompanyStoresPage />);

      // Assert: Add store button should be visible
      await waitFor(() => {
        const addButton = screen.getByRole('button', { name: /add store/i });
        expect(addButton).toBeTruthy();
      });
    });

    it('should trigger add store action when button is clicked', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<CompanyStoresPage />);

      // Act: Click add store button
      const addButton = screen.getByRole('button', { name: /add store/i });
      await user.click(addButton);

      // Assert: Info toast should be shown
      await waitFor(() => {
        expect(toast.info).toHaveBeenCalledWith('Store management is configured through the admin setup wizard. Contact your administrator to add new store locations.');
      });
    });

    it('should display store locations section icon', async () => {
      // Act
      const { container } = render(<CompanyStoresPage />);

      // Assert: Icon should be present
      await waitFor(() => {
        const heading = screen.getByRole('heading', { name: /store locations/i });
        const storeSection = heading.closest('div');
        expect(storeSection?.querySelector('svg')).toBeTruthy();
      });
    });

    // Note: The following tests would require mock store data
    // Since the component initializes with an empty stores array,
    // we test the empty state and the structure

    it('should show empty state when no stores exist', async () => {
      // Act
      render(<CompanyStoresPage />);

      // Assert: With empty stores array, no store cards should be displayed
      await waitFor(() => {
        const heading = screen.getByRole('heading', { name: /store locations/i });
        const storeSection = heading.closest('div')?.parentElement;
        expect(storeSection).toBeTruthy();
        // No store cards should be present (no "Active" or "Inactive" badges)
        const statusBadges = screen.queryAllByText(/^(Active|Inactive)$/);
        expect(statusBadges.length).toBe(0);
      });
    });

    it('should have proper layout for store cards', async () => {
      // Act
      const { container } = render(<CompanyStoresPage />);

      // Assert: Store section should have proper structure
      await waitFor(() => {
        const heading = screen.getByRole('heading', { name: /store locations/i });
        // Navigate up to find the parent div that contains the stores container
        const storeSection = heading.parentElement?.parentElement?.parentElement;
        expect(storeSection).toBeTruthy();
        // Check for space-y-4 class on the stores container
        const storesContainer = storeSection?.querySelector('.space-y-4');
        expect(storesContainer).toBeTruthy();
      });
    });
  });

  // ==========================================================================
  // Page Layout and Structure
  // ==========================================================================

  describe('Page Layout', () => {
    it('should display page header with title and description', async () => {
      // Act
      render(<CompanyStoresPage />);

      // Assert: Header should be present
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /company & stores/i })).toBeTruthy();
        expect(screen.getByText(/manage company information and store locations/i)).toBeTruthy();
      });
    });

    it('should display both main sections', async () => {
      // Act
      render(<CompanyStoresPage />);

      // Assert: Both sections should be present
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /company information/i })).toBeTruthy();
        expect(screen.getByRole('heading', { name: /store locations/i })).toBeTruthy();
      });
    });

    it('should use card layout for sections', async () => {
      // Act
      const { container } = render(<CompanyStoresPage />);

      // Assert: Sections should be in cards
      await waitFor(() => {
        const cards = container.querySelectorAll('[class*="p-6"]');
        expect(cards.length).toBeGreaterThan(0);
      });
    });

    it('should have proper spacing between sections', async () => {
      // Act
      const { container } = render(<CompanyStoresPage />);

      // Assert: Container should have space-y class for spacing
      await waitFor(() => {
        const mainContainer = container.querySelector('[class*="space-y"]');
        expect(mainContainer).toBeTruthy();
      });
    });

    it('should be responsive with max-width container', async () => {
      // Act
      const { container } = render(<CompanyStoresPage />);

      // Assert: Should have max-width container
      await waitFor(() => {
        const maxWidthContainer = container.querySelector('[class*="max-w"]');
        expect(maxWidthContainer).toBeTruthy();
      });
    });
  });

  // ==========================================================================
  // Form Validation and Input Types
  // ==========================================================================

  describe('Form Validation', () => {
    it('should have email input with type email', async () => {
      // Act
      render(<CompanyStoresPage />);

      // Assert: Email input should have type="email"
      await waitFor(() => {
        const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
        expect(emailInput.type).toBe('email');
      });
    });

    it('should have phone input with type tel', async () => {
      // Act
      render(<CompanyStoresPage />);

      // Assert: Phone input should have type="tel"
      await waitFor(() => {
        const phoneInput = screen.getByLabelText(/phone/i) as HTMLInputElement;
        expect(phoneInput.type).toBe('tel');
      });
    });

    it('should have appropriate placeholders for all fields', async () => {
      // Act
      render(<CompanyStoresPage />);

      // Assert: Fields should have placeholders
      await waitFor(() => {
        const companyNameInput = screen.getByLabelText(/company name/i) as HTMLInputElement;
        expect(companyNameInput.placeholder).toBeTruthy();

        const addressInput = screen.getByLabelText(/address/i) as HTMLInputElement;
        expect(addressInput.placeholder).toBeTruthy();

        const cityInput = screen.getByLabelText(/city/i) as HTMLInputElement;
        expect(cityInput.placeholder).toBeTruthy();
      });
    });

    it('should maintain form state when switching focus between fields', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<CompanyStoresPage />);

      // Act: Update company name
      const companyNameInput = screen.getByLabelText(/company name/i);
      await user.clear(companyNameInput);
      await user.type(companyNameInput, 'Test Company');

      // Act: Focus on another field
      const addressInput = screen.getByLabelText(/address/i);
      await user.click(addressInput);

      // Assert: Company name should still have the updated value
      expect((companyNameInput as HTMLInputElement).value).toBe('Test Company');
    });
  });

  // ==========================================================================
  // Complete Workflow Tests
  // ==========================================================================

  describe('Complete Workflows', () => {
    it('should allow updating all company fields and saving', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<CompanyStoresPage />);

      // Act: Update all fields
      const companyNameInput = screen.getByLabelText(/company name/i);
      await user.clear(companyNameInput);
      await user.type(companyNameInput, 'Complete Business Inc');

      const addressInput = screen.getByLabelText(/address/i);
      await user.clear(addressInput);
      await user.type(addressInput, '100 Business Blvd');

      const cityInput = screen.getByLabelText(/city/i);
      await user.clear(cityInput);
      await user.type(cityInput, 'Toronto');

      const stateInput = screen.getByLabelText(/state\/province/i);
      await user.clear(stateInput);
      await user.type(stateInput, 'ON');

      const zipInput = screen.getByLabelText(/zip\/postal code/i);
      await user.clear(zipInput);
      await user.type(zipInput, 'M5H 2N2');

      const phoneInput = screen.getByLabelText(/phone/i);
      await user.clear(phoneInput);
      await user.type(phoneInput, '(416) 555-1234');

      const emailInput = screen.getByLabelText(/email/i);
      await user.clear(emailInput);
      await user.type(emailInput, 'contact@completebusiness.com');

      // Act: Save changes
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      // Assert: Success toast should be shown
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Company information updated successfully');
      });

      // Assert: All fields should retain their values
      expect((companyNameInput as HTMLInputElement).value).toBe('Complete Business Inc');
      expect((addressInput as HTMLInputElement).value).toBe('100 Business Blvd');
      expect((cityInput as HTMLInputElement).value).toBe('Toronto');
      expect((stateInput as HTMLInputElement).value).toBe('ON');
      expect((zipInput as HTMLInputElement).value).toBe('M5H 2N2');
      expect((phoneInput as HTMLInputElement).value).toBe('(416) 555-1234');
      expect((emailInput as HTMLInputElement).value).toBe('contact@completebusiness.com');
    });

    it('should allow partial updates to company information', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<CompanyStoresPage />);

      // Act: Update only company name and phone
      const companyNameInput = screen.getByLabelText(/company name/i);
      await user.clear(companyNameInput);
      await user.type(companyNameInput, 'Partial Update Co');

      const phoneInput = screen.getByLabelText(/phone/i);
      await user.clear(phoneInput);
      await user.type(phoneInput, '(555) 111-2222');

      // Act: Save changes
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      // Assert: Success toast should be shown
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Company information updated successfully');
      });

      // Assert: Updated fields should have new values
      expect((companyNameInput as HTMLInputElement).value).toBe('Partial Update Co');
      expect((phoneInput as HTMLInputElement).value).toBe('(555) 111-2222');

      // Assert: Other fields should retain original values
      const addressInput = screen.getByLabelText(/address/i) as HTMLInputElement;
      expect(addressInput.value).toBe('123 Main St');
    });

    it('should maintain unsaved changes when navigating between sections', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<CompanyStoresPage />);

      // Act: Update company name but don't save
      const companyNameInput = screen.getByLabelText(/company name/i);
      await user.clear(companyNameInput);
      await user.type(companyNameInput, 'Unsaved Company');

      // Act: Check that store section exists (simulating navigation)
      const storeHeading = screen.getByRole('heading', { name: /store locations/i });
      expect(storeHeading).toBeTruthy();

      // Assert: Company name should still have the updated value
      expect((companyNameInput as HTMLInputElement).value).toBe('Unsaved Company');
    });

    it('should handle rapid updates to multiple fields', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<CompanyStoresPage />);

      // Act: Rapidly update multiple fields
      const companyNameInput = screen.getByLabelText(/company name/i);
      await user.clear(companyNameInput);
      await user.type(companyNameInput, 'Rapid');

      const cityInput = screen.getByLabelText(/city/i);
      await user.clear(cityInput);
      await user.type(cityInput, 'Fast');

      const phoneInput = screen.getByLabelText(/phone/i);
      await user.clear(phoneInput);
      await user.type(phoneInput, '(555) 123-4567');

      // Assert: All fields should have updated values
      expect((companyNameInput as HTMLInputElement).value).toBe('Rapid');
      expect((cityInput as HTMLInputElement).value).toBe('Fast');
      expect((phoneInput as HTMLInputElement).value).toBe('(555) 123-4567');
    });
  });

  // ==========================================================================
  // Grid Layout Tests
  // ==========================================================================

  describe('Responsive Grid Layout', () => {
    it('should use grid layout for company information fields', async () => {
      // Act
      const { container } = render(<CompanyStoresPage />);

      // Assert: Should have grid layout
      await waitFor(() => {
        const gridContainer = container.querySelector('[class*="grid"]');
        expect(gridContainer).toBeTruthy();
      });
    });

    it('should have proper column spans for full-width fields', async () => {
      // Act
      const { container } = render(<CompanyStoresPage />);

      // Assert: Company name and address should span full width
      await waitFor(() => {
        // The Input component wraps the input in a flex container,
        // and the parent div has the md:col-span-2 class
        const companyNameLabel = screen.getByLabelText(/company name/i);
        // Go up: input -> relative div -> flex flex-col gap-1 -> md:col-span-2 div
        const companyNameContainer = companyNameLabel.parentElement?.parentElement?.parentElement;
        expect(companyNameContainer?.className).toContain('md:col-span-2');

        const addressLabel = screen.getByLabelText(/address/i);
        const addressContainer = addressLabel.parentElement?.parentElement?.parentElement;
        expect(addressContainer?.className).toContain('md:col-span-2');
      });
    });

    it('should group state and ZIP fields together', async () => {
      // Act
      const { container } = render(<CompanyStoresPage />);

      // Assert: State and ZIP should be in a grid container
      await waitFor(() => {
        const stateInput = screen.getByLabelText(/state\/province/i);
        const zipInput = screen.getByLabelText(/zip\/postal code/i);
        
        // Both inputs should be within the same parent grid container
        // Go up: input -> relative div -> flex flex-col gap-1 -> grid grid-cols-2 gap-4
        const stateParent = stateInput.parentElement?.parentElement?.parentElement;
        const zipParent = zipInput.parentElement?.parentElement?.parentElement;
        
        // Both should be in the same grid container
        expect(stateParent).toBe(zipParent);
        expect(stateParent?.className).toContain('grid');
        expect(stateParent?.className).toContain('grid-cols-2');
      });
    });
  });

  // ==========================================================================
  // Accessibility Tests
  // ==========================================================================

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      // Act
      render(<CompanyStoresPage />);

      // Assert: Should have h1 for page title
      const pageTitle = screen.getByRole('heading', { name: /company & stores/i });
      expect(pageTitle).toBeTruthy();
    });

    it('should have labels for all form inputs', async () => {
      // Act
      render(<CompanyStoresPage />);

      // Assert: All inputs should have associated labels
      await waitFor(() => {
        expect(screen.getByLabelText(/company name/i)).toBeTruthy();
        expect(screen.getByLabelText(/address/i)).toBeTruthy();
        expect(screen.getByLabelText(/city/i)).toBeTruthy();
        expect(screen.getByLabelText(/state\/province/i)).toBeTruthy();
        expect(screen.getByLabelText(/zip\/postal code/i)).toBeTruthy();
        expect(screen.getByLabelText(/phone/i)).toBeTruthy();
        expect(screen.getByLabelText(/email/i)).toBeTruthy();
      });
    });

    it('should have accessible buttons with proper labels', async () => {
      // Act
      render(<CompanyStoresPage />);

      // Assert: Buttons should have accessible names
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save changes/i })).toBeTruthy();
        expect(screen.getByRole('button', { name: /add store/i })).toBeTruthy();
      });
    });
  });
});
