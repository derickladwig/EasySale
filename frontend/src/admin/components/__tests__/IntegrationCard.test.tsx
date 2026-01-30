/**
 * Unit Tests: IntegrationCard Component
 * 
 * Tests for the IntegrationCard component covering all states and interactions.
 * 
 * Validates: Requirements 10.1, 10.2
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { IntegrationCard, IntegrationCardProps } from '../IntegrationCard';

describe('IntegrationCard', () => {
  const defaultProps: IntegrationCardProps = {
    id: 'test-integration',
    name: 'Test Integration',
    description: 'A test integration for unit testing',
    status: 'not_connected',
  };

  describe('Empty State (Not Connected)', () => {
    it('should render empty state when status is not_connected and not enabled', () => {
      render(<IntegrationCard {...defaultProps} />);
      
      expect(screen.getByText('Test Integration')).toBeInTheDocument();
      expect(screen.getByText('A test integration for unit testing')).toBeInTheDocument();
      expect(screen.getByText(/Connect your Test Integration account/i)).toBeInTheDocument();
      expect(screen.getByText('Not Connected')).toBeInTheDocument();
    });

    it('should show connect button in empty state', () => {
      const onConnect = vi.fn();
      render(
        <IntegrationCard
          {...defaultProps}
          actions={{ onConnect }}
        />
      );
      
      const connectButton = screen.getByRole('button', { name: /Connect Test Integration/i });
      expect(connectButton).toBeInTheDocument();
      
      fireEvent.click(connectButton);
      expect(onConnect).toHaveBeenCalledTimes(1);
    });
  });

  describe('Connected State', () => {
    it('should render connected state with success icon', () => {
      render(
        <IntegrationCard
          {...defaultProps}
          status="connected"
          enabled={true}
        />
      );
      
      expect(screen.getByText('Connected')).toBeInTheDocument();
      // Success icon should be present (CheckCircle)
      const statusBadge = screen.getByText('Connected');
      expect(statusBadge).toHaveClass('text-success-400');
    });

    it('should show last sync time when connected', () => {
      const lastSync = '2024-01-15T10:30:00Z';
      render(
        <IntegrationCard
          {...defaultProps}
          status="connected"
          enabled={true}
          config={{ lastSync }}
        />
      );
      
      expect(screen.getByText(/Last sync:/i)).toBeInTheDocument();
    });

    it('should show store URL when provided', () => {
      render(
        <IntegrationCard
          {...defaultProps}
          status="connected"
          enabled={true}
          config={{ storeUrl: 'https://example.com' }}
        />
      );
      
      expect(screen.getByText('Store URL:')).toBeInTheDocument();
      expect(screen.getByText('https://example.com')).toBeInTheDocument();
    });

    it('should show disconnect button when connected', () => {
      const onDisconnect = vi.fn();
      render(
        <IntegrationCard
          {...defaultProps}
          status="connected"
          enabled={true}
          actions={{ onDisconnect }}
        />
      );
      
      const disconnectButton = screen.getByRole('button', { name: /Disconnect/i });
      expect(disconnectButton).toBeInTheDocument();
      
      fireEvent.click(disconnectButton);
      expect(onDisconnect).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error State', () => {
    it('should render error state with error icon', () => {
      render(
        <IntegrationCard
          {...defaultProps}
          status="error"
          enabled={true}
        />
      );
      
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText(/Connection Error/i)).toBeInTheDocument();
    });

    it('should show custom error message when provided', () => {
      const errorMessage = 'Invalid API credentials';
      render(
        <IntegrationCard
          {...defaultProps}
          status="error"
          enabled={true}
          config={{ errorMessage }}
        />
      );
      
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('should show default error message when not provided', () => {
      render(
        <IntegrationCard
          {...defaultProps}
          status="error"
          enabled={true}
        />
      );
      
      expect(screen.getByText(/Failed to connect to the integration/i)).toBeInTheDocument();
    });
  });

  describe('Disabled State (Capability Off)', () => {
    it('should render disabled state when capability is off', () => {
      render(
        <IntegrationCard
          {...defaultProps}
          capabilityEnabled={false}
        />
      );
      
      expect(screen.getByText('Disabled')).toBeInTheDocument();
      expect(screen.getByText(/Integration Disabled/i)).toBeInTheDocument();
    });

    it('should show custom disabled reason when provided', () => {
      const disabledReason = 'This feature requires a premium subscription';
      render(
        <IntegrationCard
          {...defaultProps}
          capabilityEnabled={false}
          disabledReason={disabledReason}
        />
      );
      
      expect(screen.getByText(disabledReason)).toBeInTheDocument();
    });

    it('should not show toggle switch when disabled', () => {
      const onToggle = vi.fn();
      render(
        <IntegrationCard
          {...defaultProps}
          capabilityEnabled={false}
          actions={{ onToggle }}
        />
      );
      
      // Toggle switch should not be present
      const toggles = screen.queryAllByRole('checkbox');
      expect(toggles).toHaveLength(0);
    });

    it('should not show connect button when capability is off', () => {
      const onConnect = vi.fn();
      render(
        <IntegrationCard
          {...defaultProps}
          capabilityEnabled={false}
          actions={{ onConnect }}
        />
      );
      
      // Connect button should not be rendered in disabled state
      expect(screen.queryByRole('button', { name: /Connect Test Integration/i })).not.toBeInTheDocument();
    });
  });

  describe('Bug State (Capability On, Backend Missing)', () => {
    it('should render bug state when capability is on but backend is missing', () => {
      render(
        <IntegrationCard
          {...defaultProps}
          capabilityEnabled={true}
          backendAvailable={false}
        />
      );
      
      expect(screen.getByText('Backend Missing')).toBeInTheDocument();
      expect(screen.getByText(/Backend Not Available/i)).toBeInTheDocument();
      expect(screen.getByText(/This is a bug that needs to be fixed/i)).toBeInTheDocument();
    });

    it('should not show toggle switch in bug state', () => {
      const onToggle = vi.fn();
      render(
        <IntegrationCard
          {...defaultProps}
          capabilityEnabled={true}
          backendAvailable={false}
          actions={{ onToggle }}
        />
      );
      
      // Toggle switch should not be present
      const toggles = screen.queryAllByRole('checkbox');
      expect(toggles).toHaveLength(0);
    });

    it('should not show connect button in bug state', () => {
      const onConnect = vi.fn();
      render(
        <IntegrationCard
          {...defaultProps}
          capabilityEnabled={true}
          backendAvailable={false}
          actions={{ onConnect }}
        />
      );
      
      // Connect button should not be rendered in bug state
      expect(screen.queryByRole('button', { name: /Connect Test Integration/i })).not.toBeInTheDocument();
    });
  });

  describe('Syncing State', () => {
    it('should render syncing state with pulsing icon', () => {
      render(
        <IntegrationCard
          {...defaultProps}
          status="syncing"
          enabled={true}
        />
      );
      
      expect(screen.getByText('Syncing...')).toBeInTheDocument();
    });

    it('should disable test button when syncing', () => {
      const onTestConnection = vi.fn();
      render(
        <IntegrationCard
          {...defaultProps}
          status="syncing"
          enabled={true}
          actions={{ onTestConnection }}
        />
      );
      
      const testButton = screen.getByRole('button', { name: /Test/i });
      expect(testButton).toBeDisabled();
    });
  });

  describe('Actions', () => {
    it('should call onToggle when toggle switch is clicked', () => {
      const onToggle = vi.fn();
      render(
        <IntegrationCard
          {...defaultProps}
          enabled={false}
          actions={{ onToggle }}
        />
      );
      
      const toggle = screen.getByRole('checkbox');
      fireEvent.click(toggle);
      
      expect(onToggle).toHaveBeenCalledWith(true);
    });

    it('should call onConfigure when configure button is clicked', () => {
      const onConfigure = vi.fn();
      render(
        <IntegrationCard
          {...defaultProps}
          enabled={true}
          actions={{ onConfigure }}
        />
      );
      
      const configureButton = screen.getByRole('button', { name: /Configure/i });
      fireEvent.click(configureButton);
      
      expect(onConfigure).toHaveBeenCalledTimes(1);
    });

    it('should call onTestConnection when test button is clicked', () => {
      const onTestConnection = vi.fn();
      render(
        <IntegrationCard
          {...defaultProps}
          status="connected"
          enabled={true}
          actions={{ onTestConnection }}
        />
      );
      
      const testButton = screen.getByRole('button', { name: /Test/i });
      fireEvent.click(testButton);
      
      expect(onTestConnection).toHaveBeenCalledTimes(1);
    });

    it('should not show test button when not connected', () => {
      const onTestConnection = vi.fn();
      render(
        <IntegrationCard
          {...defaultProps}
          status="not_connected"
          enabled={true}
          actions={{ onTestConnection }}
        />
      );
      
      expect(screen.queryByRole('button', { name: /Test/i })).not.toBeInTheDocument();
    });
  });

  describe('Configuration Panel', () => {
    it('should show configuration content when showConfig is true', () => {
      const configContent = <div data-testid="config-panel">Configuration Panel</div>;
      render(
        <IntegrationCard
          {...defaultProps}
          enabled={true}
          showConfig={true}
          configContent={configContent}
        />
      );
      
      expect(screen.getByTestId('config-panel')).toBeInTheDocument();
    });

    it('should not show configuration content when showConfig is false', () => {
      const configContent = <div data-testid="config-panel">Configuration Panel</div>;
      render(
        <IntegrationCard
          {...defaultProps}
          enabled={true}
          showConfig={false}
          configContent={configContent}
        />
      );
      
      expect(screen.queryByTestId('config-panel')).not.toBeInTheDocument();
    });

    it('should not show configuration content when not enabled', () => {
      const configContent = <div data-testid="config-panel">Configuration Panel</div>;
      render(
        <IntegrationCard
          {...defaultProps}
          enabled={false}
          showConfig={true}
          configContent={configContent}
        />
      );
      
      expect(screen.queryByTestId('config-panel')).not.toBeInTheDocument();
    });
  });

  describe('Custom Icon', () => {
    it('should render custom icon when provided', () => {
      const customIcon = <div data-testid="custom-icon">Custom Icon</div>;
      render(
        <IntegrationCard
          {...defaultProps}
          icon={customIcon}
        />
      );
      
      expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
    });
  });

  describe('Status Badge Styling', () => {
    it('should apply success styling for connected state', () => {
      render(
        <IntegrationCard
          {...defaultProps}
          status="connected"
          enabled={true}
        />
      );
      
      const badge = screen.getByText('Connected');
      expect(badge).toHaveClass('text-success-400');
    });

    it('should apply error styling for error state', () => {
      render(
        <IntegrationCard
          {...defaultProps}
          status="error"
          enabled={true}
        />
      );
      
      const badge = screen.getByText('Error');
      expect(badge).toHaveClass('text-error-400');
    });

    it('should apply warning styling for bug state', () => {
      render(
        <IntegrationCard
          {...defaultProps}
          capabilityEnabled={true}
          backendAvailable={false}
        />
      );
      
      const badge = screen.getByText('Backend Missing');
      expect(badge).toHaveClass('text-warning-400');
    });

    it('should apply disabled styling for disabled state', () => {
      render(
        <IntegrationCard
          {...defaultProps}
          capabilityEnabled={false}
        />
      );
      
      const badge = screen.getByText('Disabled');
      expect(badge).toHaveClass('text-text-disabled');
    });
  });
});
