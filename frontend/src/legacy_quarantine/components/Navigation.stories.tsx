/**
 * QUARANTINED: Navigation Component Stories
 * 
 * Original Location: frontend/src/common/components/Navigation.stories.tsx
 * Quarantined: 2026-01-26
 * Reason: Stories for quarantined Navigation component
 * Replacement: AppLayout stories (navigation is now part of AppLayout)
 * 
 * This file is preserved per NO DELETES policy.
 * DO NOT include these stories in active Storybook builds.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Navigation } from './Navigation';
import * as PermissionsContext from '../../common/contexts/PermissionsContext';

/**
 * Navigation Component Stories (QUARANTINED)
 * 
 * Demonstrates the navigation component with active state indicators
 * in both light and dark themes.
 */

const meta = {
  title: 'Legacy/Navigation (Quarantined)',
  component: Navigation,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
**QUARANTINED COMPONENT**

This component has been superseded by AppLayout's built-in navigation.
These stories are preserved for reference only.

Navigation component with active state indicators using design tokens.

**Active State Features:**
- Background color using \`--color-surface-3\`
- Text color using \`--color-accent\`
- Left border using \`--color-accent\`
- Font weight using \`--font-weight-medium\`
- Works correctly in both light and dark themes

**Design Tokens Used:**
- Colors: \`--color-accent\`, \`--color-accent-hover\`, \`--color-surface-2\`, \`--color-surface-3\`
- Spacing: \`--space-1\`, \`--space-2\`, \`--space-3\`, \`--space-4\`
- Typography: \`--font-size-base\`, \`--font-size-lg\`, \`--font-weight-medium\`
- Border: \`--border-1\`, \`--border-2\`, \`--radius-md\`
- Transitions: \`--duration-1\`
        `,
      },
    },
  },
  decorators: [
    (Story) => {
      // Mock permissions context - defined for documentation purposes
      const _mockPermissions = {
        permissions: new Set(['access_sell', 'access_warehouse', 'access_admin']),
        hasPermission: () => true,
        hasAnyPermission: () => true,
        hasAllPermissions: () => true,
      };

      return (
        <PermissionsContext.PermissionsProvider>
          <BrowserRouter>
            <Routes>
              <Route path="*" element={<Story />} />
            </Routes>
          </BrowserRouter>
        </PermissionsContext.PermissionsProvider>
      );
    },
  ],
} satisfies Meta<typeof Navigation>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Sidebar navigation with active state on first item.
 * Shows the default desktop navigation layout.
 */
export const SidebarDefault: Story = {
  args: {
    variant: 'sidebar',
  },
  parameters: {
    backgrounds: { default: 'light' },
  },
};

/**
 * Sidebar navigation in dark theme.
 * Demonstrates that active indicators work correctly in dark mode.
 */
export const SidebarDark: Story = {
  args: {
    variant: 'sidebar',
  },
  parameters: {
    backgrounds: { default: 'dark' },
  },
  decorators: [
    (Story) => {
      // Apply dark theme
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', 'dark');
      }
      return <Story />;
    },
  ],
};

/**
 * Sidebar navigation with green accent.
 * Shows how active indicators adapt to different accent colors.
 */
export const SidebarGreenAccent: Story = {
  args: {
    variant: 'sidebar',
  },
  decorators: [
    (Story) => {
      // Apply green accent
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-accent', 'green');
      }
      return <Story />;
    },
  ],
};

/**
 * Sidebar navigation with purple accent.
 * Shows how active indicators adapt to different accent colors.
 */
export const SidebarPurpleAccent: Story = {
  args: {
    variant: 'sidebar',
  },
  decorators: [
    (Story) => {
      // Apply purple accent
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-accent', 'purple');
      }
      return <Story />;
    },
  ],
};

/**
 * Mobile navigation with active state.
 * Shows the mobile bottom bar navigation layout.
 */
export const MobileDefault: Story = {
  args: {
    variant: 'mobile',
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
};

/**
 * Mobile navigation in dark theme.
 * Demonstrates that active indicators work correctly in dark mode on mobile.
 */
export const MobileDark: Story = {
  args: {
    variant: 'mobile',
  },
  parameters: {
    backgrounds: { default: 'dark' },
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
  decorators: [
    (Story) => {
      // Apply dark theme
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', 'dark');
      }
      return <Story />;
    },
  ],
};

/**
 * Interactive example showing hover and active states.
 * Navigate between items to see active state changes.
 */
export const Interactive: Story = {
  args: {
    variant: 'sidebar',
  },
  render: (args) => (
    <div style={{ display: 'flex', gap: '2rem', padding: '2rem' }}>
      <div style={{ width: '240px', background: 'var(--color-bg-secondary)', borderRadius: '8px' }}>
        <Navigation {...args} />
      </div>
      <div style={{ flex: 1, padding: '1rem' }}>
        <h2 style={{ marginBottom: '1rem' }}>Active State Indicators</h2>
        <p style={{ marginBottom: '1rem', color: 'var(--color-text-secondary)' }}>
          Click on navigation items to see the active state change. Active items show:
        </p>
        <ul style={{ listStyle: 'disc', paddingLeft: '2rem', color: 'var(--color-text-secondary)' }}>
          <li>Background color using <code>--color-surface-3</code></li>
          <li>Text color using <code>--color-accent</code></li>
          <li>Left border using <code>--color-accent</code></li>
          <li>Medium font weight</li>
        </ul>
      </div>
    </div>
  ),
};
