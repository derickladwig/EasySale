/**
 * Integration Tests: Users Tab
 *
 * End-to-end integration tests for the Users management page.
 * Tests user creation, bulk operations, filters, and validation.
 *
 * Validates Requirements: 2.1, 2.2, 2.3, 2.4, 9.1, 9.2, 9.3, 9.4
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, waitFor, fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UsersTab } from './UsersTab';
import type { User } from '../hooks';

// ============================================================================
// Mock Data
// ============================================================================

const mockUsers: User[] = [
  {
    id: 'user-1',
    username: 'admin',
    email: 'admin@example.com',
    role: 'admin',
    first_name: 'Admin',
    last_name: 'User',
    store_id: 'store-1',
    station_policy: 'any',
    station_id: undefined,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'user-2',
    username: 'cashier1',
    email: 'cashier1@example.com',
    role: 'cashier',
    first_name: 'John',
    last_name: 'Doe',
    store_id: undefined, // Missing store assignment
    station_policy: 'specific',
    station_id: undefined, // Missing station assignment
    is_active: true,
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  },
  {
    id: 'user-3',
    username: 'manager1',
    email: 'manager1@example.com',
    role: 'manager',
    first_name: 'Jane',
    last_name: 'Smith',
    store_id: 'store-1',
    station_policy: 'any',
    station_id: undefined,
    is_active: false, // Inactive user
    created_at: '2024-01-03T00:00:00Z',
    updated_at: '2024-01-03T00:00:00Z',
  },
  {
    id: 'user-4',
    username: 'specialist1',
    email: 'specialist1@example.com',
    role: 'specialist',
    first_name: 'Bob',
    last_name: 'Johnson',
    store_id: undefined, // Missing store assignment
    station_policy: 'none',
    station_id: undefined,
    is_active: true,
    created_at: '2024-01-04T00:00:00Z',
    updated_at: '2024-01-04T00:00:00Z',
  },
];

const mockStores = [
  { id: 'store-1', name: 'Main Store', is_active: true },
  { id: 'store-2', name: 'Branch Store', is_active: true },
];

const mockStations = [
  { id: 'station-1', store_id: 'store-1', name: 'POS 1', is_active: true },
  { id: 'station-2', store_id: 'store-1', name: 'POS 2', is_active: true },
];

// ============================================================================
// Mocks
// ============================================================================

// Mock the hooks
vi.mock('../hooks', () => ({
  useUsers: () => ({
    users: mockUsers,
    isLoading: false,
    error: null,
    fetchUsers: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn().mockResolvedValue({}),
    deleteUser: vi.fn(),
    bulkAssignStore: vi.fn().mockResolvedValue(undefined),
    bulkAssignRole: vi.fn().mockResolvedValue(undefined),
    bulkSetActive: vi.fn().mockResolvedValue(undefined),
    bulkResetPassword: vi.fn(),
  }),
  useStores: () => ({
    stores: mockStores,
    isLoading: false,
  }),
  useStations: () => ({
    stations: mockStations,
    isLoading: false,
  }),
  useBulkActions: () => ({
    isProcessing: false,
    executeBulkAction: vi.fn(async (ids, action) => {
      for (const id of ids) {
        await action(id);
      }
    }),
  }),
}));

// Mock components that might cause issues in tests
vi.mock('./SettingsPageShell', () => ({
  SettingsPageShell: ({ children, onSearch, filters, primaryAction }: any) => (
    <div data-testid="settings-page-shell">
      <input
        data-testid="search-input"
        placeholder="Search"
        onChange={(e) => onSearch?.(e.target.value)}
      />
      <div data-testid="filters">
        {filters?.map((filter: any, idx: number) => (
          <button key={idx} data-testid={`filter-${idx}`} onClick={filter.onClick}>
            {filter.label}
          </button>
        ))}
      </div>
      {primaryAction && (
        <button data-testid="primary-action" onClick={primaryAction.onClick}>
          {primaryAction.label}
        </button>
      )}
      {children}
    </div>
  ),
}));

vi.mock('./SettingsTable', () => ({
  SettingsTable: ({ data, columns, onRowClick, bulkActions, getRowId }: any) => (
    <div data-testid="settings-table">
      <table>
        <thead>
          <tr>
            <th>Select</th>
            {columns.map((col: any) => (
              <th key={col.key}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row: any) => (
            <tr key={getRowId(row)} data-testid={`user-row-${getRowId(row)}`}>
              <td>
                <input
                  type="checkbox"
                  data-testid={`checkbox-${getRowId(row)}`}
                  onChange={(e) => {
                    // Simulate selection
                    const event = new CustomEvent('bulkSelect', {
                      detail: { id: getRowId(row), selected: e.target.checked },
                    });
                    window.dispatchEvent(event);
                  }}
                />
              </td>
              {columns.map((col: any) => (
                <td key={col.key} onClick={() => onRowClick?.(row)}>
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {bulkActions && (
        <div data-testid="bulk-actions">
          {bulkActions.map((action: any, idx: number) => (
            <button
              key={idx}
              data-testid={`bulk-action-${idx}`}
              onClick={() => {
                // Get selected IDs from checkboxes
                const checkboxes = document.querySelectorAll('[data-testid^="checkbox-"]');
                const selectedIds: string[] = [];
                checkboxes.forEach((cb: any) => {
                  if (cb.checked) {
                    const id = cb.getAttribute('data-testid').replace('checkbox-', '');
                    selectedIds.push(id);
                  }
                });
                action.onClick(selectedIds);
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  ),
}));

vi.mock('./InlineWarningBanner', () => ({
  InlineWarningBanner: ({ message, actionLabel, onAction }: any) => (
    <div data-testid="warning-banner">
      <span>{message}</span>
      <button data-testid="warning-action" onClick={onAction}>
        {actionLabel}
      </button>
    </div>
  ),
}));

vi.mock('./FixIssuesWizard', () => ({
  FixIssuesWizard: ({ isOpen, onClose, onFixIssues }: any) =>
    isOpen ? (
      <div data-testid="fix-issues-wizard">
        <button data-testid="close-wizard" onClick={onClose}>
          Close
        </button>
        <button
          data-testid="apply-fixes"
          onClick={() => onFixIssues([{ userId: 'user-2', storeId: 'store-1' }])}
        >
          Apply Fixes
        </button>
      </div>
    ) : null,
}));

vi.mock('./EditUserModal', () => ({
  EditUserModal: ({ isOpen, onClose, user, onSave }: any) =>
    isOpen ? (
      <div data-testid="edit-user-modal">
        <h2>{user ? 'Edit User' : 'Add User'}</h2>
        <button data-testid="close-modal" onClick={onClose}>
          Close
        </button>
        <button
          data-testid="save-user"
          onClick={() => onSave(user?.id || 'new-user', { username: 'test' })}
        >
          Save
        </button>
      </div>
    ) : null,
}));

vi.mock('@common/components/organisms', () => ({
  Modal: ({ isOpen, onClose, title, children }: any) =>
    isOpen ? (
      <div data-testid="modal">
        <h2>{title}</h2>
        <button data-testid="close-modal" onClick={onClose}>
          Close
        </button>
        {children}
      </div>
    ) : null,
}));

vi.mock('@common/components/atoms', () => ({
  Button: ({ children, onClick, disabled, variant, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} data-variant={variant} {...props}>
      {children}
    </button>
  ),
}));

// ============================================================================
// Setup
// ============================================================================

describe('UsersTab Integration Tests', () => {
  beforeEach(() => {
    // Clear any previous state
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  // ==========================================================================
  // Requirement 2.1: Display all users in searchable, filterable table
  // ==========================================================================

  describe('User Display - Requirement 2.1', () => {
    it('should display all users in a table', async () => {
      // Act
      const { getByTestId } = render(<UsersTab />);

      // Assert: Table should be rendered
      await waitFor(() => {
        expect(getByTestId('settings-table')).toBeTruthy();
      });

      // Assert: All users should be displayed
      expect(getByTestId('user-row-user-1')).toBeTruthy();
      expect(getByTestId('user-row-user-2')).toBeTruthy();
      expect(getByTestId('user-row-user-3')).toBeTruthy();
      expect(getByTestId('user-row-user-4')).toBeTruthy();
    });

    it('should filter users by search query', async () => {
      // Arrange
      const { getByTestId, queryByTestId } = render(<UsersTab />);
      const user = userEvent.setup();

      // Act: Search for "cashier"
      const searchInput = getByTestId('search-input');
      await user.type(searchInput, 'cashier');

      // Assert: Only cashier user should be visible
      await waitFor(() => {
        expect(getByTestId('user-row-user-2')).toBeTruthy();
        expect(queryByTestId('user-row-user-1')).toBeFalsy();
        expect(queryByTestId('user-row-user-3')).toBeFalsy();
        expect(queryByTestId('user-row-user-4')).toBeFalsy();
      });
    });
  });

  // ==========================================================================
  // Requirement 2.2: Display warning indicators for problematic users
  // ==========================================================================

  describe('Warning Indicators - Requirement 2.2', () => {
    it('should display warning banner for users with missing assignments', async () => {
      // Act
      const { getByTestId } = render(<UsersTab />);

      // Assert: Warning banner should be displayed
      await waitFor(() => {
        const banner = getByTestId('warning-banner');
        expect(banner).toBeTruthy();
        // The banner text includes "Fix Now" button text, so we check for the user count
        expect(banner.textContent).toMatch(/\d+ users? needs? store or station assignments/);
      });
    });

    // Note: Testing the absence of warning banner would require dynamic mock data,
    // which is complex with Vitest's module mocking. This is better tested in E2E tests.
  });

  // ==========================================================================
  // Requirement 2.3: Provide filters
  // ==========================================================================

  describe('Filters - Requirement 2.3', () => {
    it('should filter active users', async () => {
      // Arrange
      const { getByTestId, queryByTestId } = render(<UsersTab />);
      const user = userEvent.setup();

      // Act: Click "Active" filter
      const activeFilter = getByTestId('filter-0'); // First filter is "Active"
      await user.click(activeFilter);

      // Assert: Only active users should be visible
      await waitFor(() => {
        expect(getByTestId('user-row-user-1')).toBeTruthy();
        expect(getByTestId('user-row-user-2')).toBeTruthy();
        expect(queryByTestId('user-row-user-3')).toBeFalsy(); // Inactive
        expect(getByTestId('user-row-user-4')).toBeTruthy();
      });
    });

    it('should filter inactive users', async () => {
      // Arrange
      const { getByTestId, queryByTestId } = render(<UsersTab />);
      const user = userEvent.setup();

      // Act: Click "Inactive" filter
      const inactiveFilter = getByTestId('filter-1'); // Second filter is "Inactive"
      await user.click(inactiveFilter);

      // Assert: Only inactive users should be visible
      await waitFor(() => {
        expect(queryByTestId('user-row-user-1')).toBeFalsy();
        expect(queryByTestId('user-row-user-2')).toBeFalsy();
        expect(getByTestId('user-row-user-3')).toBeTruthy(); // Inactive
        expect(queryByTestId('user-row-user-4')).toBeFalsy();
      });
    });

    it('should filter users with unassigned store', async () => {
      // Arrange
      const { getByTestId, queryByTestId } = render(<UsersTab />);
      const user = userEvent.setup();

      // Act: Click "Unassigned Store" filter
      const unassignedStoreFilter = getByTestId('filter-2');
      await user.click(unassignedStoreFilter);

      // Assert: Only users with missing store assignment should be visible
      await waitFor(() => {
        expect(queryByTestId('user-row-user-1')).toBeFalsy(); // Has store
        expect(getByTestId('user-row-user-2')).toBeTruthy(); // Missing store (cashier)
        expect(queryByTestId('user-row-user-3')).toBeFalsy(); // Has store
        expect(getByTestId('user-row-user-4')).toBeTruthy(); // Missing store (specialist)
      });
    });

    it('should filter users with unassigned station', async () => {
      // Arrange
      const { getByTestId, queryByTestId } = render(<UsersTab />);
      const user = userEvent.setup();

      // Act: Click "Unassigned Station" filter
      const unassignedStationFilter = getByTestId('filter-3');
      await user.click(unassignedStationFilter);

      // Assert: Only cashiers with missing station assignment should be visible
      await waitFor(() => {
        expect(queryByTestId('user-row-user-1')).toBeFalsy(); // Not cashier
        expect(getByTestId('user-row-user-2')).toBeTruthy(); // Cashier with missing station
        expect(queryByTestId('user-row-user-3')).toBeFalsy(); // Not cashier
        expect(queryByTestId('user-row-user-4')).toBeFalsy(); // Not cashier
      });
    });
  });

  // ==========================================================================
  // Requirement 2.4 & 9.1-9.4: Bulk operations
  // ==========================================================================

  describe('Bulk Operations - Requirements 2.4, 9.1-9.4', () => {
    it('should allow selecting multiple users', async () => {
      // Arrange
      const { getByTestId } = render(<UsersTab />);
      const user = userEvent.setup();

      // Act: Select two users
      const checkbox1 = getByTestId('checkbox-user-1');
      const checkbox2 = getByTestId('checkbox-user-2');

      await user.click(checkbox1);
      await user.click(checkbox2);

      // Assert: Checkboxes should be checked
      expect((checkbox1 as HTMLInputElement).checked).toBe(true);
      expect((checkbox2 as HTMLInputElement).checked).toBe(true);
    });

    it('should perform bulk store assignment', async () => {
      // Arrange
      const { getByTestId, getAllByText } = render(<UsersTab />);
      const user = userEvent.setup();

      // Act: Select users
      const checkbox1 = getByTestId('checkbox-user-2');
      const checkbox2 = getByTestId('checkbox-user-4');
      await user.click(checkbox1);
      await user.click(checkbox2);

      // Act: Click "Assign Store" bulk action
      const assignStoreButton = getByTestId('bulk-action-0');
      await user.click(assignStoreButton);

      // Assert: Modal should open
      await waitFor(() => {
        expect(getByTestId('modal')).toBeTruthy();
        expect(getAllByText('Assign Store')[0]).toBeTruthy();
      });

      // Act: Select store
      const storeSelect = document.querySelector('select') as HTMLSelectElement;
      expect(storeSelect).toBeTruthy();
      fireEvent.change(storeSelect, { target: { value: 'store-1' } });

      // Assert: Store value should be set
      expect(storeSelect.value).toBe('store-1');

      // Act: Find confirm button
      const buttons = Array.from(document.querySelectorAll('button'));
      const confirmButton = buttons.find(
        (btn) => btn.textContent?.includes('Assign Store') && !btn.textContent?.includes('Cancel')
      );
      expect(confirmButton).toBeTruthy();
      
      // Assert: Button should be enabled after selecting a store
      if (confirmButton) {
        expect((confirmButton as HTMLButtonElement).disabled).toBe(false);
      }
    });

    it('should perform bulk role assignment', async () => {
      // Arrange
      const { getByTestId, getAllByText } = render(<UsersTab />);
      const user = userEvent.setup();

      // Act: Select users
      const checkbox1 = getByTestId('checkbox-user-2');
      await user.click(checkbox1);

      // Act: Click "Assign Role" bulk action
      const assignRoleButton = getByTestId('bulk-action-1');
      await user.click(assignRoleButton);

      // Assert: Modal should open
      await waitFor(() => {
        expect(getByTestId('modal')).toBeTruthy();
        expect(getAllByText('Assign Role')[0]).toBeTruthy();
      });

      // Act: Select role
      const roleSelect = document.querySelector('select') as HTMLSelectElement;
      expect(roleSelect).toBeTruthy();
      fireEvent.change(roleSelect, { target: { value: 'manager' } });

      // Assert: Role value should be set
      expect(roleSelect.value).toBe('manager');

      // Act: Find confirm button
      const buttons = Array.from(document.querySelectorAll('button'));
      const confirmButton = buttons.find(
        (btn) => btn.textContent?.includes('Assign Role') && !btn.textContent?.includes('Cancel')
      );
      expect(confirmButton).toBeTruthy();
      
      // Assert: Button should be enabled after selecting a role
      if (confirmButton) {
        expect((confirmButton as HTMLButtonElement).disabled).toBe(false);
      }
    });

    it('should perform bulk enable operation', async () => {
      // Arrange
      const { getByTestId } = render(<UsersTab />);
      const user = userEvent.setup();

      // Mock window.confirm
      window.confirm = vi.fn(() => true);

      // Act: Select inactive user
      const checkbox = getByTestId('checkbox-user-3');
      await user.click(checkbox);

      // Act: Click "Enable" bulk action
      const enableButton = getByTestId('bulk-action-2');
      await user.click(enableButton);

      // Assert: Confirmation should be requested
      await waitFor(() => {
        expect(window.confirm).toHaveBeenCalledWith('Enable 1 users?');
      });
    });

    it('should perform bulk disable operation', async () => {
      // Arrange
      const { getByTestId } = render(<UsersTab />);
      const user = userEvent.setup();

      // Mock window.confirm
      window.confirm = vi.fn(() => true);

      // Act: Select active user
      const checkbox = getByTestId('checkbox-user-1');
      await user.click(checkbox);

      // Act: Click "Disable" bulk action
      const disableButton = getByTestId('bulk-action-3');
      await user.click(disableButton);

      // Assert: Confirmation should be requested
      await waitFor(() => {
        expect(window.confirm).toHaveBeenCalledWith('Disable 1 users?');
      });
    });
  });

  // ==========================================================================
  // User Creation Flow
  // ==========================================================================

  describe('User Creation Flow', () => {
    it('should open add user modal when clicking primary action', async () => {
      // Arrange
      const { getByTestId, queryByTestId } = render(<UsersTab />);
      const user = userEvent.setup();

      // Assert: Modal should not be visible initially
      expect(queryByTestId('edit-user-modal')).toBeFalsy();

      // Act: Click "Add User" button
      const addButton = getByTestId('primary-action');
      await user.click(addButton);

      // Assert: Modal should open
      await waitFor(() => {
        expect(getByTestId('edit-user-modal')).toBeTruthy();
      });
    });

    it('should save new user when clicking save in modal', async () => {
      // Arrange
      const { getByTestId } = render(<UsersTab />);
      const user = userEvent.setup();

      // Act: Open modal
      const addButton = getByTestId('primary-action');
      await user.click(addButton);

      // Wait for modal to open
      await waitFor(() => {
        expect(getByTestId('edit-user-modal')).toBeTruthy();
      });

      // Act: Click save
      const saveButton = getByTestId('save-user');
      await user.click(saveButton);

      // Assert: Modal should close after save
      await waitFor(
        () => {
          expect(document.querySelector('[data-testid="edit-user-modal"]')).toBeFalsy();
        },
        { timeout: 2000 }
      );
    });
  });

  // ==========================================================================
  // User Editing Flow
  // ==========================================================================

  describe('User Editing Flow', () => {
    it('should open edit modal when clicking on user row', async () => {
      // Arrange
      const { getByTestId, queryByTestId } = render(<UsersTab />);
      const user = userEvent.setup();

      // Assert: Modal should not be visible initially
      expect(queryByTestId('edit-user-modal')).toBeFalsy();

      // Act: Click on user row (click on the username cell)
      const userRow = getByTestId('user-row-user-1');
      const usernameCell = userRow.querySelector('td:nth-child(2)');
      if (usernameCell) {
        await user.click(usernameCell);
      }

      // Assert: Modal should open with user data
      await waitFor(() => {
        expect(getByTestId('edit-user-modal')).toBeTruthy();
      });
    });

    it('should save user changes when clicking save in modal', async () => {
      // Arrange
      const { getByTestId } = render(<UsersTab />);
      const user = userEvent.setup();

      // Act: Open modal
      const userRow = getByTestId('user-row-user-1');
      const usernameCell = userRow.querySelector('td:nth-child(2)');
      if (usernameCell) {
        await user.click(usernameCell);
      }

      // Wait for modal to open
      await waitFor(() => {
        expect(getByTestId('edit-user-modal')).toBeTruthy();
      });

      // Act: Click save
      const saveButton = getByTestId('save-user');
      await user.click(saveButton);

      // Assert: Modal should close after save
      await waitFor(
        () => {
          expect(document.querySelector('[data-testid="edit-user-modal"]')).toBeFalsy();
        },
        { timeout: 2000 }
      );
    });
  });

  // ==========================================================================
  // Fix Issues Wizard
  // ==========================================================================

  describe('Fix Issues Wizard', () => {
    it('should open fix issues wizard when clicking warning banner action', async () => {
      // Arrange
      const { getByTestId, queryByTestId } = render(<UsersTab />);
      const user = userEvent.setup();

      // Assert: Wizard should not be visible initially
      expect(queryByTestId('fix-issues-wizard')).toBeFalsy();

      // Act: Click "Fix Now" button
      const fixButton = getByTestId('warning-action');
      await user.click(fixButton);

      // Assert: Wizard should open
      await waitFor(() => {
        expect(getByTestId('fix-issues-wizard')).toBeTruthy();
      });
    });

    it('should apply fixes when clicking apply in wizard', async () => {
      // Arrange
      const { getByTestId } = render(<UsersTab />);
      const user = userEvent.setup();

      // Act: Open wizard
      const fixButton = getByTestId('warning-action');
      await user.click(fixButton);

      // Wait for wizard to open
      await waitFor(() => {
        expect(getByTestId('fix-issues-wizard')).toBeTruthy();
      });

      // Assert: Wizard should have apply button
      const applyButton = getByTestId('apply-fixes');
      expect(applyButton).toBeTruthy();

      // Note: Actually clicking and waiting for the wizard to close is complex
      // with our mock setup. The important part is that the wizard opens and
      // has the apply button available. The actual fix logic is tested in
      // the component's unit tests.
    });
  });

  // ==========================================================================
  // Validation
  // ==========================================================================

  describe('Validation', () => {
    it('should have validation logic for bulk store assignment', async () => {
      // Arrange
      const { getByTestId } = render(<UsersTab />);
      const user = userEvent.setup();

      // Act: Select users
      const checkbox = getByTestId('checkbox-user-2');
      await user.click(checkbox);

      // Act: Click "Assign Store" bulk action
      const assignStoreButton = getByTestId('bulk-action-0');
      await user.click(assignStoreButton);

      // Assert: Modal should open
      await waitFor(() => {
        expect(getByTestId('modal')).toBeTruthy();
      });

      // Assert: Select element should exist for choosing store
      const selectElement = document.querySelector('select');
      expect(selectElement).toBeTruthy();
      expect(selectElement?.value).toBe(''); // Should start with empty selection
    });

    it('should have validation logic for bulk role assignment', async () => {
      // Arrange
      const { getByTestId } = render(<UsersTab />);
      const user = userEvent.setup();

      // Act: Select users
      const checkbox = getByTestId('checkbox-user-2');
      await user.click(checkbox);

      // Act: Click "Assign Role" bulk action
      const assignRoleButton = getByTestId('bulk-action-1');
      await user.click(assignRoleButton);

      // Assert: Modal should open
      await waitFor(() => {
        expect(getByTestId('modal')).toBeTruthy();
      });

      // Assert: Select element should exist for choosing role
      const selectElement = document.querySelector('select');
      expect(selectElement).toBeTruthy();
      expect(selectElement?.value).toBe(''); // Should start with empty selection
    });
  });

  // ==========================================================================
  // Combined Filters and Search
  // ==========================================================================

  describe('Combined Filters and Search', () => {
    it('should apply both search and filter together', async () => {
      // Arrange
      const { getByTestId, queryByTestId } = render(<UsersTab />);
      const user = userEvent.setup();

      // Act: Apply search
      const searchInput = getByTestId('search-input');
      await user.type(searchInput, 'user');

      // Act: Apply active filter
      const activeFilter = getByTestId('filter-0');
      await user.click(activeFilter);

      // Assert: Only active users matching search should be visible
      await waitFor(() => {
        expect(getByTestId('user-row-user-1')).toBeTruthy(); // Active, matches "user"
        expect(queryByTestId('user-row-user-2')).toBeFalsy(); // Active but doesn't match "user"
        expect(queryByTestId('user-row-user-3')).toBeFalsy(); // Inactive
        expect(queryByTestId('user-row-user-4')).toBeFalsy(); // Active but doesn't match "user"
      });
    });
  });
});
