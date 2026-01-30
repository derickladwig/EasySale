/**
 * Breakpoints Demo Stories
 * 
 * Demonstrates the configured breakpoints, container queries, and aspect ratio utilities.
 * 
 * Requirements:
 * - 5.1: Responsive column counts (xs, sm, md, lg, xl breakpoints)
 * - 5.2: Container queries support
 * - 5.3: Aspect ratio utilities
 */

import type { Meta, StoryObj } from '@storybook/react';
import { BreakpointsDemo } from './BreakpointsDemo';

const meta = {
  title: 'Design System/Breakpoints Demo',
  component: BreakpointsDemo,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
# Breakpoints & Responsive Design Demo

This demo showcases the configured breakpoints, container queries, and aspect ratio utilities.

## Features

### Breakpoints (Req 5.1)
- **xs** (0px): Extra small devices (phones)
- **sm** (640px): Small devices (large phones)
- **md** (768px): Medium devices (tablets)
- **lg** (1024px): Large devices (desktops)
- **xl** (1280px): Extra large devices (large desktops)
- **2xl** (1536px): Ultra-wide displays

### Container Queries (Req 5.2)
Container queries enable component-level responsive design, allowing components to respond to their container's size rather than the viewport size.

### Aspect Ratio Utilities (Req 5.3, 5.7)
- **square** (1:1): Perfect squares
- **video** (16:9): Standard video format
- **widescreen** (21:9): Ultrawide format
- **portrait** (3:4): Portrait orientation
- **photo** (4:3): Standard photo format
- **golden** (1.618:1): Golden ratio for aesthetic layouts

## Usage

Resize the browser window or use Storybook's viewport controls to see the responsive behavior in action.
        `,
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof BreakpointsDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default view showing all breakpoint and responsive design features.
 */
export const Default: Story = {};

/**
 * Mobile view (xs breakpoint - 375px)
 */
export const Mobile: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
};

/**
 * Tablet view (md breakpoint - 768px)
 */
export const Tablet: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'tablet',
    },
  },
};

/**
 * Desktop view (lg breakpoint - 1024px)
 */
export const Desktop: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'desktop',
    },
  },
};

/**
 * Large desktop view (xl breakpoint - 1280px)
 */
export const LargeDesktop: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'largeDesktop',
    },
  },
};
