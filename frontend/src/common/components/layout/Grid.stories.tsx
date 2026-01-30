import type { Meta, StoryObj } from '@storybook/react';
import { Grid } from './Grid';

/**
 * Grid Component Stories
 * 
 * Demonstrates the responsive grid layout component with various configurations.
 */

const meta: Meta<typeof Grid> = {
  title: 'Layout/Grid',
  component: Grid,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
A responsive grid layout component that adapts to different screen sizes.

**Features:**
- Responsive column counts (1 on mobile, 2 on tablet, 3+ on desktop)
- Consistent gaps (16px on mobile, 24px on desktop)
- Auto-fit for flexible layouts
- Prevents horizontal scrolling at all breakpoints
- Centers content on ultrawide displays with max-width constraints
- Aspect-ratio support for consistent card heights
- Follows design system color scheme and spacing

**Requirements:** 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10
        `,
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    columns: {
      control: 'select',
      options: [1, 2, 3, 4, 6],
      description: 'Number of columns on desktop',
    },
    autoFit: {
      control: 'boolean',
      description: 'Use auto-fit for flexible layouts',
    },
    minColumnWidth: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Minimum column width for auto-fit',
    },
    gap: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'responsive'],
      description: 'Gap size between grid items',
    },
    centerOnUltrawide: {
      control: 'boolean',
      description: 'Center content on ultrawide displays',
    },
    maxWidth: {
      control: 'select',
      options: ['screen-sm', 'screen-md', 'screen-lg', 'screen-xl', 'screen-2xl'],
      description: 'Maximum width for ultrawide centering',
    },
    aspectRatio: {
      control: 'select',
      options: ['auto', 'square', 'video', 'portrait', 'photo'],
      description: 'Aspect ratio for grid items',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Grid>;

// Sample card component for demonstrations
const SampleCard = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-background-secondary rounded-lg p-4 border border-border-light ${className}`}>
    <div className="text-text-primary font-semibold mb-2">{children}</div>
    <div className="text-text-secondary text-sm">Sample content</div>
  </div>
);

/**
 * Default 3-column grid
 * 
 * Shows 1 column on mobile, 2 on tablet, and 3 on desktop.
 */
export const Default: Story = {
  args: {
    children: (
      <>
        <SampleCard>Item 1</SampleCard>
        <SampleCard>Item 2</SampleCard>
        <SampleCard>Item 3</SampleCard>
        <SampleCard>Item 4</SampleCard>
        <SampleCard>Item 5</SampleCard>
        <SampleCard>Item 6</SampleCard>
      </>
    ),
  },
};

/**
 * 2-column grid
 * 
 * Shows 1 column on mobile, 2 on tablet and desktop.
 */
export const TwoColumns: Story = {
  args: {
    columns: 2,
    children: (
      <>
        <SampleCard>Item 1</SampleCard>
        <SampleCard>Item 2</SampleCard>
        <SampleCard>Item 3</SampleCard>
        <SampleCard>Item 4</SampleCard>
      </>
    ),
  },
};

/**
 * 4-column grid
 * 
 * Shows 1 column on mobile, 2 on tablet, and 4 on desktop.
 */
export const FourColumns: Story = {
  args: {
    columns: 4,
    children: (
      <>
        <SampleCard>Item 1</SampleCard>
        <SampleCard>Item 2</SampleCard>
        <SampleCard>Item 3</SampleCard>
        <SampleCard>Item 4</SampleCard>
        <SampleCard>Item 5</SampleCard>
        <SampleCard>Item 6</SampleCard>
        <SampleCard>Item 7</SampleCard>
        <SampleCard>Item 8</SampleCard>
      </>
    ),
  },
};

/**
 * 6-column grid
 * 
 * Shows 2 columns on mobile, 3 on tablet, and 6 on desktop.
 */
export const SixColumns: Story = {
  args: {
    columns: 6,
    children: (
      <>
        {Array.from({ length: 12 }, (_, i) => (
          <SampleCard key={i}>Item {i + 1}</SampleCard>
        ))}
      </>
    ),
  },
};

/**
 * Auto-fit grid with medium min-width (250px)
 * 
 * Automatically fits as many columns as possible based on available space.
 */
export const AutoFit: Story = {
  args: {
    autoFit: true,
    minColumnWidth: 'md',
    children: (
      <>
        <SampleCard>Item 1</SampleCard>
        <SampleCard>Item 2</SampleCard>
        <SampleCard>Item 3</SampleCard>
        <SampleCard>Item 4</SampleCard>
        <SampleCard>Item 5</SampleCard>
        <SampleCard>Item 6</SampleCard>
      </>
    ),
  },
};

/**
 * Auto-fit grid with small min-width (200px)
 * 
 * Fits more columns due to smaller minimum width.
 */
export const AutoFitSmall: Story = {
  args: {
    autoFit: true,
    minColumnWidth: 'sm',
    children: (
      <>
        {Array.from({ length: 12 }, (_, i) => (
          <SampleCard key={i}>Item {i + 1}</SampleCard>
        ))}
      </>
    ),
  },
};

/**
 * Auto-fit grid with large min-width (350px)
 * 
 * Fits fewer columns due to larger minimum width.
 */
export const AutoFitLarge: Story = {
  args: {
    autoFit: true,
    minColumnWidth: 'lg',
    children: (
      <>
        <SampleCard>Item 1</SampleCard>
        <SampleCard>Item 2</SampleCard>
        <SampleCard>Item 3</SampleCard>
        <SampleCard>Item 4</SampleCard>
      </>
    ),
  },
};

/**
 * Small gap (8px)
 * 
 * Uses a smaller gap between grid items.
 */
export const SmallGap: Story = {
  args: {
    gap: 'sm',
    children: (
      <>
        <SampleCard>Item 1</SampleCard>
        <SampleCard>Item 2</SampleCard>
        <SampleCard>Item 3</SampleCard>
        <SampleCard>Item 4</SampleCard>
        <SampleCard>Item 5</SampleCard>
        <SampleCard>Item 6</SampleCard>
      </>
    ),
  },
};

/**
 * Large gap (24px)
 * 
 * Uses a larger gap between grid items.
 */
export const LargeGap: Story = {
  args: {
    gap: 'lg',
    children: (
      <>
        <SampleCard>Item 1</SampleCard>
        <SampleCard>Item 2</SampleCard>
        <SampleCard>Item 3</SampleCard>
        <SampleCard>Item 4</SampleCard>
        <SampleCard>Item 5</SampleCard>
        <SampleCard>Item 6</SampleCard>
      </>
    ),
  },
};

/**
 * Responsive gap (16px mobile, 24px desktop)
 * 
 * Gap adjusts based on screen size.
 */
export const ResponsiveGap: Story = {
  args: {
    gap: 'responsive',
    children: (
      <>
        <SampleCard>Item 1</SampleCard>
        <SampleCard>Item 2</SampleCard>
        <SampleCard>Item 3</SampleCard>
        <SampleCard>Item 4</SampleCard>
        <SampleCard>Item 5</SampleCard>
        <SampleCard>Item 6</SampleCard>
      </>
    ),
  },
};

/**
 * Product grid example
 * 
 * Demonstrates a typical product grid layout.
 */
export const ProductGrid: Story = {
  args: {
    columns: 4,
    gap: 'responsive',
    children: (
      <>
        {Array.from({ length: 8 }, (_, i) => (
          <div
            key={i}
            className="bg-background-secondary rounded-lg overflow-hidden border border-border-light hover:shadow-lg transition-shadow cursor-pointer"
          >
            <div className="aspect-square bg-background-tertiary flex items-center justify-center">
              <div className="text-text-tertiary text-4xl">📦</div>
            </div>
            <div className="p-4">
              <h3 className="text-text-primary font-semibold mb-1">Product {i + 1}</h3>
              <p className="text-text-secondary text-sm mb-2">SKU: PRD-{String(i + 1).padStart(3, '0')}</p>
              <div className="flex justify-between items-center">
                <span className="text-success font-bold">${(19.99 + i * 5).toFixed(2)}</span>
                <span className="text-text-tertiary text-sm">In Stock</span>
              </div>
            </div>
          </div>
        ))}
      </>
    ),
  },
};

/**
 * Dashboard cards example
 * 
 * Demonstrates a dashboard layout with stat cards.
 */
export const DashboardCards: Story = {
  args: {
    columns: 4,
    gap: 'responsive',
    children: (
      <>
        <div className="bg-background-secondary rounded-lg p-6 border border-border-light">
          <div className="text-text-tertiary text-sm mb-2">Total Sales</div>
          <div className="text-text-primary text-3xl font-bold mb-1">$12,345</div>
          <div className="text-success text-sm">+12.5% from last month</div>
        </div>
        <div className="bg-background-secondary rounded-lg p-6 border border-border-light">
          <div className="text-text-tertiary text-sm mb-2">Orders</div>
          <div className="text-text-primary text-3xl font-bold mb-1">234</div>
          <div className="text-success text-sm">+8.2% from last month</div>
        </div>
        <div className="bg-background-secondary rounded-lg p-6 border border-border-light">
          <div className="text-text-tertiary text-sm mb-2">Customers</div>
          <div className="text-text-primary text-3xl font-bold mb-1">1,234</div>
          <div className="text-success text-sm">+15.3% from last month</div>
        </div>
        <div className="bg-background-secondary rounded-lg p-6 border border-border-light">
          <div className="text-text-tertiary text-sm mb-2">Inventory</div>
          <div className="text-text-primary text-3xl font-bold mb-1">5,678</div>
          <div className="text-warning text-sm">-3.1% from last month</div>
        </div>
      </>
    ),
  },
};

/**
 * Single column layout
 * 
 * Useful for forms or detailed content.
 */
export const SingleColumn: Story = {
  args: {
    columns: 1,
    children: (
      <>
        <SampleCard>Full width item 1</SampleCard>
        <SampleCard>Full width item 2</SampleCard>
        <SampleCard>Full width item 3</SampleCard>
      </>
    ),
  },
};

/**
 * Mixed content heights
 * 
 * Shows how the grid handles items with varying content heights.
 */
export const MixedHeights: Story = {
  args: {
    columns: 3,
    gap: 'responsive',
    children: (
      <>
        <SampleCard className="h-32">Short content</SampleCard>
        <SampleCard className="h-48">
          Medium content with more text that spans multiple lines
        </SampleCard>
        <SampleCard className="h-32">Short content</SampleCard>
        <SampleCard className="h-64">
          Tall content with even more text that spans many lines and takes up more vertical space
        </SampleCard>
        <SampleCard className="h-32">Short content</SampleCard>
        <SampleCard className="h-40">Medium-short content</SampleCard>
      </>
    ),
  },
};

/**
 * Empty grid
 * 
 * Shows how the grid behaves with no children.
 */
export const Empty: Story = {
  args: {
    children: null,
  },
};

/**
 * Custom styling
 * 
 * Demonstrates how to apply custom classes to the grid.
 */
export const CustomStyling: Story = {
  args: {
    columns: 3,
    gap: 'responsive',
    className: 'bg-background-primary p-6 rounded-xl border-2 border-primary-500',
    children: (
      <>
        <SampleCard>Item 1</SampleCard>
        <SampleCard>Item 2</SampleCard>
        <SampleCard>Item 3</SampleCard>
      </>
    ),
  },
};

/**
 * Centered on ultrawide displays
 * 
 * Content is centered with max-width constraint on ultrawide displays.
 * Resize your browser to see the effect on wide screens.
 */
export const CenteredUltrawide: Story = {
  args: {
    columns: 3,
    gap: 'responsive',
    centerOnUltrawide: true,
    maxWidth: 'screen-xl',
    children: (
      <>
        <SampleCard>Item 1</SampleCard>
        <SampleCard>Item 2</SampleCard>
        <SampleCard>Item 3</SampleCard>
        <SampleCard>Item 4</SampleCard>
        <SampleCard>Item 5</SampleCard>
        <SampleCard>Item 6</SampleCard>
      </>
    ),
  },
};

/**
 * Centered with smaller max-width
 * 
 * Content is centered with a smaller max-width (screen-lg = 1024px).
 */
export const CenteredSmaller: Story = {
  args: {
    columns: 3,
    gap: 'responsive',
    centerOnUltrawide: true,
    maxWidth: 'screen-lg',
    children: (
      <>
        <SampleCard>Item 1</SampleCard>
        <SampleCard>Item 2</SampleCard>
        <SampleCard>Item 3</SampleCard>
        <SampleCard>Item 4</SampleCard>
        <SampleCard>Item 5</SampleCard>
        <SampleCard>Item 6</SampleCard>
      </>
    ),
  },
};

/**
 * Square aspect ratio
 * 
 * All grid items maintain a square aspect ratio (1:1).
 * Useful for image galleries or icon grids.
 */
export const SquareAspectRatio: Story = {
  args: {
    columns: 4,
    gap: 'responsive',
    aspectRatio: 'square',
    children: (
      <>
        {Array.from({ length: 8 }, (_, i) => (
          <div
            key={i}
            className="bg-background-secondary rounded-lg overflow-hidden border border-border-light flex items-center justify-center"
          >
            <div className="text-text-primary text-2xl font-bold">Item {i + 1}</div>
          </div>
        ))}
      </>
    ),
  },
};

/**
 * Video aspect ratio
 * 
 * All grid items maintain a video aspect ratio (16:9).
 * Useful for video thumbnails or wide cards.
 */
export const VideoAspectRatio: Story = {
  args: {
    columns: 3,
    gap: 'responsive',
    aspectRatio: 'video',
    children: (
      <>
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            className="bg-background-secondary rounded-lg overflow-hidden border border-border-light flex items-center justify-center"
          >
            <div className="text-text-primary text-xl font-bold">Video {i + 1}</div>
          </div>
        ))}
      </>
    ),
  },
};

/**
 * Portrait aspect ratio
 * 
 * All grid items maintain a portrait aspect ratio (3:4).
 * Useful for profile cards or portrait images.
 */
export const PortraitAspectRatio: Story = {
  args: {
    columns: 4,
    gap: 'responsive',
    aspectRatio: 'portrait',
    children: (
      <>
        {Array.from({ length: 8 }, (_, i) => (
          <div
            key={i}
            className="bg-background-secondary rounded-lg overflow-hidden border border-border-light flex items-center justify-center"
          >
            <div className="text-text-primary text-lg font-bold">Portrait {i + 1}</div>
          </div>
        ))}
      </>
    ),
  },
};

/**
 * Photo aspect ratio
 * 
 * All grid items maintain a photo aspect ratio (4:3).
 * Useful for photo galleries.
 */
export const PhotoAspectRatio: Story = {
  args: {
    columns: 3,
    gap: 'responsive',
    aspectRatio: 'photo',
    children: (
      <>
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            className="bg-background-secondary rounded-lg overflow-hidden border border-border-light flex items-center justify-center"
          >
            <div className="text-text-primary text-xl font-bold">Photo {i + 1}</div>
          </div>
        ))}
      </>
    ),
  },
};

/**
 * Auto-fit with max column width
 * 
 * Demonstrates auto-fit with a maximum column width constraint.
 * Columns won't grow beyond 400px.
 */
export const AutoFitWithMaxWidth: Story = {
  args: {
    autoFit: true,
    minColumnWidth: 'md',
    maxColumnWidth: '400px',
    gap: 'responsive',
    children: (
      <>
        {Array.from({ length: 6 }, (_, i) => (
          <SampleCard key={i}>Item {i + 1}</SampleCard>
        ))}
      </>
    ),
  },
};

/**
 * Combined: Centered + Aspect Ratio
 * 
 * Demonstrates combining ultrawide centering with aspect ratio.
 */
export const CenteredWithAspectRatio: Story = {
  args: {
    columns: 4,
    gap: 'responsive',
    centerOnUltrawide: true,
    maxWidth: 'screen-xl',
    aspectRatio: 'square',
    children: (
      <>
        {Array.from({ length: 8 }, (_, i) => (
          <div
            key={i}
            className="bg-background-secondary rounded-lg overflow-hidden border border-border-light flex items-center justify-center"
          >
            <div className="text-text-primary text-xl font-bold">{i + 1}</div>
          </div>
        ))}
      </>
    ),
  },
};

/**
 * No horizontal scrolling test
 * 
 * Demonstrates that the grid prevents horizontal scrolling even with many items.
 * Try resizing your browser to different widths.
 */
export const NoHorizontalScrolling: Story = {
  args: {
    columns: 6,
    gap: 'responsive',
    children: (
      <>
        {Array.from({ length: 24 }, (_, i) => (
          <SampleCard key={i}>Item {i + 1}</SampleCard>
        ))}
      </>
    ),
  },
};
