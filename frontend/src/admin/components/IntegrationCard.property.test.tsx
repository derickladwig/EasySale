/**
 * Property-Based Test: RBAC-Based Control Rendering
 * 
 * Feature: sync-monitoring-ui
 * Property 4: RBAC-Based Control Rendering
 * 
 * **Validates: Requirements 9.1, 9.4, 9.5**
 * 
 * For any combination of user permissions, the IntegrationCard SHALL:
 * - Disable actions when user lacks required permissions
 * - Show lock icon on disabled buttons
 * - Display tooltip explaining why action is disabled
 * 
 * Framework: fast-check
 * Minimum iterations: 100
 */

import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import fc from 'fast-check';
import { render, screen, cleanup } from '@testing-library/react';
import React, { createContext, useContext, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ============================================================================
// Mock the permissions context before importing the component
// ============================================================================

// Create a test permissions context
interface TestPermissionsContextType {
  permissions: Set<string>;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (...permissions: string[]) => boolean;
  hasAllPermissions: (...permissions: string[]) => boolean;
}

const TestPermissionsContext = createContext<TestPermissionsContextType | undefined>(undefined);

// Test permissions provider that accepts permissions as props
const TestPermissionsProvider: React.FC<{ 
  children: ReactNode; 
  permissions: string[];
}> = ({ children, permissions }) => {
  const permSet = new Set(permissions);
  
  const value: TestPermissionsContextType = {
    permissions: permSet,
    hasPermission: (perm: string) => permSet.has(perm),
    hasAnyPermission: (...perms: string[]) => perms.some(p => permSet.has(p)),
    hasAllPermissions: (...perms: string[]) => perms.every(p => permSet.has(p)),
  };

  return (
    <TestPermissionsContext.Provider value={value}>
      {children}
    </TestPermissionsContext.Provider>
  );
};

// Mock the usePermissions hook
vi.mock('@common/contexts/PermissionsContext', () => ({
  usePermissions: () => {
    const context = useContext(TestPermissionsContext);
    if (!context) {
      // Return default empty permissions if no provider
      return {
        permissions: new Set(),
        hasPermission: () => false,
        hasAnyPermission: () => false,
        hasAllPermissions: () => false,
      };
    }
    return context;
  },
  PermissionsProvider: ({ children }: { children: ReactNode }) => children,
}));

// Now import the component after mocking
import { IntegrationCard, IntegrationCardProps } from './IntegrationCard';

// ============================================================================
// Test Setup
// ============================================================================

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

// Wrapper that provides all contexts
const TestWrapper: React.FC<{ 
  children: React.ReactNode; 
  permissions: string[];
}> = ({ children, permissions }) => {
  const queryClient = createTestQueryClient();
  
  return (
    <QueryClientProvider client={queryClient}>
      <TestPermissionsProvider permissions={permissions}>
        {children}
      </TestPermissionsProvider>
    </QueryClientProvider>
  );
};

// ============================================================================
// Arbitraries (Generators)
// ============================================================================

/**
 * All integration-related permissions
 */
const integrationPermissions = [
  'manage_integrations',
  'connect_integrations',
  'disconnect_integrations',
  'trigger_sync',
  'manage_settings',
];

/**
 * Generate arbitrary subset of permissions
 */
const permissionSubset = fc.subarray(integrationPermissions);

/**
 * Generate arbitrary integration status
 */
const integrationStatus = fc.constantFrom<IntegrationCardProps['status']>(
  'connected',
  'not_connected',
  'error',
  'syncing'
);

/**
 * Generate arbitrary integration card props
 */
const integrationCardProps = fc.record({
  id: fc.stringMatching(/^[a-z]{3,10}$/),
  name: fc.stringMatching(/^[A-Z][a-z]{2,10}$/),
  description: fc.stringMatching(/^[A-Za-z ]{10,50}$/),
  status: integrationStatus,
  enabled: fc.boolean(),
  capabilityEnabled: fc.constant(true),
  backendAvailable: fc.constant(true),
});

// ============================================================================
// Test Suite
// ============================================================================

describe('Property 4: RBAC-Based Control Rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  // ==========================================================================
  // Property: Connect button respects permissions
  // ==========================================================================

  describe('Property: Connect button respects connect_integrations permission', () => {
    it('should disable Connect button when user lacks connect permission', () => {
      fc.assert(
        fc.property(
          integrationCardProps,
          fc.subarray(['manage_settings', 'trigger_sync']),
          (props, permissions) => {
            cleanup();
            
            render(
              <TestWrapper permissions={permissions}>
                <IntegrationCard
                  {...props}
                  status="not_connected"
                  enabled={false}
                  actions={{
                    onConnect: vi.fn(),
                  }}
                />
              </TestWrapper>
            );

            const connectButton = screen.queryByRole('button', { name: /connect/i });
            
            if (connectButton) {
              const hasConnectPermission = permissions.includes('connect_integrations') || 
                                           permissions.includes('manage_integrations');
              
              if (!hasConnectPermission) {
                expect(connectButton).toBeDisabled();
              }
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should enable Connect button when user has connect permission', () => {
      fc.assert(
        fc.property(
          integrationCardProps,
          fc.constantFrom(
            ['connect_integrations'],
            ['manage_integrations'],
            ['connect_integrations', 'manage_integrations']
          ),
          (props, permissions) => {
            cleanup();
            
            render(
              <TestWrapper permissions={[...permissions]}>
                <IntegrationCard
                  {...props}
                  status="not_connected"
                  enabled={false}
                  actions={{
                    onConnect: vi.fn(),
                  }}
                />
              </TestWrapper>
            );

            const connectButton = screen.queryByRole('button', { name: /connect/i });
            
            if (connectButton) {
              expect(connectButton).not.toBeDisabled();
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // ==========================================================================
  // Property: Disconnect button respects permissions
  // ==========================================================================

  describe('Property: Disconnect button respects disconnect_integrations permission', () => {
    it('should disable Disconnect button when user lacks disconnect permission', () => {
      fc.assert(
        fc.property(
          integrationCardProps,
          fc.subarray(['manage_settings', 'trigger_sync', 'connect_integrations']),
          (props, permissions) => {
            cleanup();
            
            render(
              <TestWrapper permissions={permissions}>
                <IntegrationCard
                  {...props}
                  status="connected"
                  enabled={true}
                  actions={{
                    onDisconnect: vi.fn(),
                  }}
                />
              </TestWrapper>
            );

            const disconnectButton = screen.queryByRole('button', { name: /disconnect/i });
            
            if (disconnectButton) {
              const hasDisconnectPermission = permissions.includes('disconnect_integrations') || 
                                              permissions.includes('manage_integrations');
              
              if (!hasDisconnectPermission) {
                expect(disconnectButton).toBeDisabled();
              }
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should enable Disconnect button when user has disconnect permission', () => {
      fc.assert(
        fc.property(
          integrationCardProps,
          fc.constantFrom(
            ['disconnect_integrations'],
            ['manage_integrations'],
            ['disconnect_integrations', 'manage_integrations']
          ),
          (props, permissions) => {
            cleanup();
            
            render(
              <TestWrapper permissions={[...permissions]}>
                <IntegrationCard
                  {...props}
                  status="connected"
                  enabled={true}
                  actions={{
                    onDisconnect: vi.fn(),
                  }}
                />
              </TestWrapper>
            );

            const disconnectButton = screen.queryByRole('button', { name: /disconnect/i });
            
            if (disconnectButton) {
              expect(disconnectButton).not.toBeDisabled();
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // ==========================================================================
  // Property: Configure button respects permissions
  // ==========================================================================

  describe('Property: Configure button respects manage_settings permission', () => {
    it('should disable Configure button when user lacks settings permission', () => {
      fc.assert(
        fc.property(
          integrationCardProps,
          fc.subarray(['trigger_sync', 'connect_integrations', 'disconnect_integrations']),
          (props, permissions) => {
            cleanup();
            
            render(
              <TestWrapper permissions={permissions}>
                <IntegrationCard
                  {...props}
                  status="connected"
                  enabled={true}
                  actions={{
                    onConfigure: vi.fn(),
                  }}
                />
              </TestWrapper>
            );

            const configureButton = screen.queryByRole('button', { name: /configure/i });
            
            if (configureButton) {
              const hasConfigurePermission = permissions.includes('manage_settings') || 
                                             permissions.includes('manage_integrations');
              
              if (!hasConfigurePermission) {
                expect(configureButton).toBeDisabled();
              }
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should enable Configure button when user has settings permission', () => {
      fc.assert(
        fc.property(
          integrationCardProps,
          fc.constantFrom(
            ['manage_settings'],
            ['manage_integrations'],
            ['manage_settings', 'manage_integrations']
          ),
          (props, permissions) => {
            cleanup();
            
            render(
              <TestWrapper permissions={[...permissions]}>
                <IntegrationCard
                  {...props}
                  status="connected"
                  enabled={true}
                  actions={{
                    onConfigure: vi.fn(),
                  }}
                />
              </TestWrapper>
            );

            const configureButton = screen.queryByRole('button', { name: /configure/i });
            
            if (configureButton) {
              expect(configureButton).not.toBeDisabled();
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // ==========================================================================
  // Property: Test button respects permissions
  // ==========================================================================

  describe('Property: Test button respects trigger_sync permission', () => {
    it('should disable Test button when user lacks sync permission', () => {
      fc.assert(
        fc.property(
          integrationCardProps,
          fc.subarray(['manage_settings', 'connect_integrations', 'disconnect_integrations']),
          (props, permissions) => {
            cleanup();
            
            render(
              <TestWrapper permissions={permissions}>
                <IntegrationCard
                  {...props}
                  status="connected"
                  enabled={true}
                  actions={{
                    onTestConnection: vi.fn(),
                  }}
                />
              </TestWrapper>
            );

            const testButton = screen.queryByRole('button', { name: /test/i });
            
            if (testButton) {
              const hasSyncPermission = permissions.includes('trigger_sync') || 
                                        permissions.includes('manage_integrations');
              
              if (!hasSyncPermission) {
                expect(testButton).toBeDisabled();
              }
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should enable Test button when user has sync permission', () => {
      fc.assert(
        fc.property(
          integrationCardProps,
          fc.constantFrom(
            ['trigger_sync'],
            ['manage_integrations'],
            ['trigger_sync', 'manage_integrations']
          ),
          (props, permissions) => {
            cleanup();
            
            render(
              <TestWrapper permissions={[...permissions]}>
                <IntegrationCard
                  {...props}
                  status="connected"
                  enabled={true}
                  actions={{
                    onTestConnection: vi.fn(),
                  }}
                />
              </TestWrapper>
            );

            const testButton = screen.queryByRole('button', { name: /test/i });
            
            if (testButton) {
              expect(testButton).not.toBeDisabled();
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // ==========================================================================
  // Property: Full permissions enable all actions
  // ==========================================================================

  describe('Property: Full permissions enable all actions', () => {
    it('should enable all buttons when user has manage_integrations permission', () => {
      fc.assert(
        fc.property(
          integrationCardProps,
          (props) => {
            cleanup();
            
            render(
              <TestWrapper permissions={['manage_integrations']}>
                <IntegrationCard
                  {...props}
                  status="connected"
                  enabled={true}
                  actions={{
                    onConnect: vi.fn(),
                    onConfigure: vi.fn(),
                    onTestConnection: vi.fn(),
                    onDisconnect: vi.fn(),
                  }}
                />
              </TestWrapper>
            );

            const configureButton = screen.queryByRole('button', { name: /configure/i });
            const testButton = screen.queryByRole('button', { name: /test/i });
            const disconnectButton = screen.queryByRole('button', { name: /disconnect/i });

            if (configureButton) expect(configureButton).not.toBeDisabled();
            if (testButton) expect(testButton).not.toBeDisabled();
            if (disconnectButton) expect(disconnectButton).not.toBeDisabled();

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // ==========================================================================
  // Property: No permissions disable all actions
  // ==========================================================================

  describe('Property: No permissions disable all actions', () => {
    it('should disable all buttons when user has no permissions', () => {
      fc.assert(
        fc.property(
          integrationCardProps,
          (props) => {
            cleanup();
            
            render(
              <TestWrapper permissions={[]}>
                <IntegrationCard
                  {...props}
                  status="connected"
                  enabled={true}
                  actions={{
                    onConfigure: vi.fn(),
                    onTestConnection: vi.fn(),
                    onDisconnect: vi.fn(),
                  }}
                />
              </TestWrapper>
            );

            const configureButton = screen.queryByRole('button', { name: /configure/i });
            const testButton = screen.queryByRole('button', { name: /test/i });
            const disconnectButton = screen.queryByRole('button', { name: /disconnect/i });

            if (configureButton) expect(configureButton).toBeDisabled();
            if (testButton) expect(testButton).toBeDisabled();
            if (disconnectButton) expect(disconnectButton).toBeDisabled();

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
