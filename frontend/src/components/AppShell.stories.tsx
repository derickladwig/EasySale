/**
 * AppShell Component Stories
 * 
 * Visual documentation and examples for the AppShell component.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { AppShell } from './AppShell';
import { useState } from 'react';

const meta = {
  title: 'Layout/AppShell',
  component: AppShell,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
AppShell is the top-level layout component that manages sidebar, header, and content area positioning.

**Key Features:**
- CSS Grid layout with sidebar and main area
- Prevents content overlap through layout contracts
- Responsive behavior for mobile viewports
- Uses design tokens for all spacing and z-index values

**Layout Contract:**
- Sidebar width: \`var(--appSidebarW)\` = 240px
- Header height: \`var(--appHeaderH)\` = 64px
- Content padding: \`var(--pageGutter)\` = 16px
- Z-index: sidebar (\`--z-sidebar\` = 900), header (\`--z-header\` = 800)

**This is the ONLY component allowed to set sidebar and header positioning.**
        `,
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof AppShell>;

export default meta;
type Story = StoryObj<typeof meta>;

// Sample components for demonstration
const SampleSidebar = () => (
  <div style={{ padding: '1rem' }}>
    <h3 style={{ marginBottom: '1rem', fontSize: '1.125rem', fontWeight: 600 }}>Navigation</h3>
    <nav>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {['Dashboard', 'Products', 'Customers', 'Reports', 'Settings'].map((item) => (
          <li key={item} style={{ marginBottom: '0.5rem' }}>
            <a
              href="#"
              style={{
                display: 'block',
                padding: '0.5rem 0.75rem',
                borderRadius: '0.5rem',
                textDecoration: 'none',
                color: 'var(--color-text-primary)',
              }}
            >
              {item}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  </div>
);

const SampleHeader = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Page Title</h1>
    <div style={{ display: 'flex', gap: '0.5rem' }}>
      <button
        style={{
          padding: '0.5rem 1rem',
          borderRadius: '0.5rem',
          border: '1px solid var(--color-border)',
          background: 'var(--color-bg-secondary)',
          cursor: 'pointer',
        }}
      >
        Action 1
      </button>
      <button
        style={{
          padding: '0.5rem 1rem',
          borderRadius: '0.5rem',
          border: 'none',
          background: 'var(--color-accent)',
          color: 'white',
          cursor: 'pointer',
        }}
      >
        Action 2
      </button>
    </div>
  </div>
);

const SampleContent = () => (
  <div>
    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Main Content</h2>
    <p style={{ marginBottom: '1rem', color: 'var(--color-text-secondary)' }}>
      This is the main content area. It scrolls independently when content overflows.
    </p>
    {Array.from({ length: 20 }, (_, i) => (
      <div
        key={i}
        style={{
          padding: '1rem',
          marginBottom: '1rem',
          borderRadius: '0.5rem',
          background: 'var(--color-surface-2)',
          border: '1px solid var(--color-border)',
        }}
      >
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
          Content Block {i + 1}
        </h3>
        <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
          Sample content to demonstrate scrolling behavior.
        </p>
      </div>
    ))}
  </div>
);

/**
 * Complete layout with sidebar, header, and content.
 * This is the most common usage pattern.
 */
export const Complete: Story = {
  args: {
    sidebar: <SampleSidebar />,
    header: <SampleHeader />,
    children: <SampleContent />,
  },
};

/**
 * Layout without sidebar.
 * Useful for full-width pages like login or setup wizards.
 */
export const WithoutSidebar: Story = {
  args: {
    header: <SampleHeader />,
    children: <SampleContent />,
  },
};

/**
 * Layout without header.
 * Useful for pages that need maximum vertical space.
 */
export const WithoutHeader: Story = {
  args: {
    sidebar: <SampleSidebar />,
    children: <SampleContent />,
  },
};

/**
 * Minimal layout with only content.
 * Useful for embedded views or special pages.
 */
export const ContentOnly: Story = {
  args: {
    children: <SampleContent />,
  },
};

/**
 * Interactive mobile sidebar example.
 * Demonstrates the mobile overlay behavior with backdrop.
 */
export const MobileSidebar: Story = {
  args: {
    sidebar: <SampleSidebar />,
    children: <div>Main content</div>,
    isSidebarOpen: false,
    onSidebarClose: () => {}
  },
  render: () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
      <div style={{ height: '100vh' }}>
        <AppShell
          sidebar={<SampleSidebar />}
          header={
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '100%' }}>
              <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                  padding: '0.5rem',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-bg-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ☰
              </button>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Mobile Layout</h1>
            </div>
          }
          isSidebarOpen={isOpen}
          onSidebarClose={() => setIsOpen(false)}
        >
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
              Mobile Sidebar Demo
            </h2>
            <p style={{ marginBottom: '1rem', color: 'var(--color-text-secondary)' }}>
              Click the menu button in the header to toggle the sidebar.
              On mobile viewports (&lt;768px), the sidebar appears as an overlay with a backdrop.
            </p>
            <p style={{ color: 'var(--color-text-secondary)' }}>
              Resize your browser window to see the responsive behavior.
            </p>
          </div>
        </AppShell>
      </div>
    );
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
};

/**
 * Dark theme example.
 * Shows how AppShell adapts to theme changes.
 */
export const DarkTheme: Story = {
  args: {
    sidebar: <SampleSidebar />,
    header: <SampleHeader />,
    children: <SampleContent />,
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
 * Scrolling content example.
 * Demonstrates that content scrolls independently while sidebar and header remain fixed.
 */
export const ScrollingContent: Story = {
  args: {
    sidebar: <SampleSidebar />,
    header: <SampleHeader />,
    children: (
      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
          Scrolling Behavior
        </h2>
        <p style={{ marginBottom: '1rem', color: 'var(--color-text-secondary)' }}>
          Scroll down to see that the sidebar and header remain fixed while content scrolls.
        </p>
        {Array.from({ length: 50 }, (_, i) => (
          <div
            key={i}
            style={{
              padding: '1rem',
              marginBottom: '1rem',
              borderRadius: '0.5rem',
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
            }}
          >
            Content Block {i + 1}
          </div>
        ))}
      </div>
    ),
  },
};
