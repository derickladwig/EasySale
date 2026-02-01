/**
 * TimeTrackingPage Component Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TimeTrackingPage } from '../pages/TimeTrackingPage';
import * as configModule from '../../../config';

// Mock the config module
vi.mock('../../../config', () => ({
  useConfig: vi.fn(),
}));

// Mock the child components
vi.mock('../components/TimeTrackingDashboard', () => ({
  TimeTrackingDashboard: () => <div data-testid="dashboard">Dashboard</div>,
}));

vi.mock('../components/TimeEntryList', () => ({
  TimeEntryList: () => <div data-testid="entries">Entries</div>,
}));

vi.mock('../components/TimeReports', () => ({
  TimeReports: () => <div data-testid="reports">Reports</div>,
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/time-tracking']}>
        <Routes>
          <Route path="/time-tracking" element={children} />
          <Route path="/dashboard" element={<div>Dashboard Redirect</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('TimeTrackingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Module Flag Check', () => {
    it('should redirect to dashboard when module is disabled', () => {
      vi.mocked(configModule.useConfig).mockReturnValue({
        isModuleEnabled: vi.fn().mockReturnValue(false),
        getModuleSettings: vi.fn(),
      } as any);

      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <TimeTrackingPage />
        </Wrapper>
      );

      expect(screen.getByText('Dashboard Redirect')).toBeInTheDocument();
    });

    it('should render page when module is enabled', () => {
      vi.mocked(configModule.useConfig).mockReturnValue({
        isModuleEnabled: vi.fn().mockReturnValue(true),
        getModuleSettings: vi.fn().mockReturnValue(undefined),
      } as any);

      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <TimeTrackingPage />
        </Wrapper>
      );

      expect(screen.getByText('Time Tracking')).toBeInTheDocument();
      expect(screen.getByTestId('dashboard')).toBeInTheDocument();
    });
  });

  describe('Page Layout', () => {
    beforeEach(() => {
      vi.mocked(configModule.useConfig).mockReturnValue({
        isModuleEnabled: vi.fn().mockReturnValue(true),
        getModuleSettings: vi.fn().mockReturnValue(undefined),
      } as any);
    });

    it('should display page title and description', () => {
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <TimeTrackingPage />
        </Wrapper>
      );

      expect(screen.getByText('Time Tracking')).toBeInTheDocument();
      expect(
        screen.getByText('Track employee hours, manage time entries, and generate reports')
      ).toBeInTheDocument();
    });

    it('should display all tabs', () => {
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <TimeTrackingPage />
        </Wrapper>
      );

      // Use getAllByRole to find tab buttons
      const tabs = screen.getAllByRole('button');
      const tabTexts = tabs.map(tab => tab.textContent);
      
      expect(tabTexts).toContain('Dashboard');
      expect(screen.getByText('Time Entries')).toBeInTheDocument();
      expect(screen.getByText('Reports')).toBeInTheDocument();
    });

    it('should display dashboard tab by default', () => {
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <TimeTrackingPage />
        </Wrapper>
      );

      expect(screen.getByTestId('dashboard')).toBeInTheDocument();
      expect(screen.queryByTestId('entries')).not.toBeInTheDocument();
      expect(screen.queryByTestId('reports')).not.toBeInTheDocument();
    });
  });

  describe('Module Settings Display', () => {
    it('should display settings info when settings are available', () => {
      const mockSettings = {
        enabled: true,
        requireWorkOrder: true,
        allowManualEntry: true,
        trackBreaks: true,
        overtimeThreshold: 40,
      };

      vi.mocked(configModule.useConfig).mockReturnValue({
        isModuleEnabled: vi.fn().mockReturnValue(true),
        getModuleSettings: vi.fn().mockReturnValue(mockSettings),
      } as any);

      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <TimeTrackingPage />
        </Wrapper>
      );

      expect(screen.getByText('Module Settings')).toBeInTheDocument();
      expect(screen.getByText('Work order required for time entries')).toBeInTheDocument();
      expect(screen.getByText('Manual time entry allowed')).toBeInTheDocument();
      expect(screen.getByText('Break tracking enabled')).toBeInTheDocument();
      expect(screen.getByText('Overtime threshold: 40 hours/week')).toBeInTheDocument();
    });

    it('should not display settings info when settings are not available', () => {
      vi.mocked(configModule.useConfig).mockReturnValue({
        isModuleEnabled: vi.fn().mockReturnValue(true),
        getModuleSettings: vi.fn().mockReturnValue(undefined),
      } as any);

      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <TimeTrackingPage />
        </Wrapper>
      );

      expect(screen.queryByText('Module Settings')).not.toBeInTheDocument();
    });
  });

  describe('Semantic Tokens Usage', () => {
    it('should use semantic color tokens for styling', () => {
      vi.mocked(configModule.useConfig).mockReturnValue({
        isModuleEnabled: vi.fn().mockReturnValue(true),
        getModuleSettings: vi.fn().mockReturnValue(undefined),
      } as any);

      const Wrapper = createWrapper();
      const { container } = render(
        <Wrapper>
          <TimeTrackingPage />
        </Wrapper>
      );

      // Check that no hardcoded Tailwind base colors are used
      const html = container.innerHTML;
      expect(html).not.toMatch(/\b(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d+\b/);
    });
  });
});
