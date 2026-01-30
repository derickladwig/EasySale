import type { Meta, StoryObj } from '@storybook/react';
import {
  Spinner,
  ButtonSpinner,
  PageSpinner,
  InlineSpinner,
} from './Spinner';

/**
 * Spinner Components
 *
 * A collection of loading spinner components for different use cases:
 * - **Spinner**: Base spinner component
 * - **ButtonSpinner**: For use inside buttons
 * - **PageSpinner**: For page-level loading states
 * - **InlineSpinner**: For inline use within text or compact UI elements
 *
 * Requirements:
 * - 12.2: Use spinners for action loading (buttons, forms)
 * - 12.4: Animate smoothly with CSS animations
 */

const meta = {
  title: 'Atoms/Spinner',
  component: Spinner,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Spinner>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Basic Spinner
 *
 * The base spinner component with different sizes and colors.
 */
export const Basic: Story = {
  args: {
    size: 'md',
    variant: 'primary',
  },
};

/**
 * All Sizes
 *
 * Spinners in all available sizes.
 */
export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Spinner size="xs" variant="primary" />
      <Spinner size="sm" variant="primary" />
      <Spinner size="md" variant="primary" />
      <Spinner size="lg" variant="primary" />
      <Spinner size="xl" variant="primary" />
    </div>
  ),
};

/**
 * All Variants
 *
 * Spinners in all available color variants.
 */
export const AllVariants: Story = {
  render: () => (
    <div className="flex items-center gap-4 bg-background-secondary p-4 rounded-lg">
      <div className="flex flex-col items-center gap-2">
        <Spinner variant="default" />
        <span className="text-xs text-text-tertiary">Default</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Spinner variant="primary" />
        <span className="text-xs text-text-tertiary">Primary</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Spinner variant="success" />
        <span className="text-xs text-text-tertiary">Success</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Spinner variant="warning" />
        <span className="text-xs text-text-tertiary">Warning</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Spinner variant="error" />
        <span className="text-xs text-text-tertiary">Error</span>
      </div>
      <div className="flex flex-col items-center gap-2 bg-background-primary p-2 rounded">
        <Spinner variant="white" />
        <span className="text-xs text-text-tertiary">White</span>
      </div>
    </div>
  ),
};

/**
 * Button Spinner
 *
 * A spinner designed for use inside buttons.
 */
export const InButton: Story = {
  render: () => (
    <div className="flex gap-4">
      <button className="px-4 py-2 bg-primary-500 text-white rounded-lg flex items-center">
        <ButtonSpinner />
        Saving...
      </button>
      <button className="px-4 py-2 bg-success-DEFAULT text-white rounded-lg flex items-center">
        <ButtonSpinner />
        Processing...
      </button>
      <button className="px-4 py-2 bg-error-DEFAULT text-white rounded-lg flex items-center">
        <ButtonSpinner />
        Deleting...
      </button>
    </div>
  ),
};

/**
 * Page Spinner
 *
 * A larger spinner for page-level loading states with optional text.
 */
export const PageLoading: Story = {
  render: () => (
    <div className="space-y-8">
      <div className="bg-background-secondary p-8 rounded-lg">
        <PageSpinner />
      </div>
      <div className="bg-background-secondary p-8 rounded-lg">
        <PageSpinner text="Loading products..." />
      </div>
      <div className="bg-background-secondary p-8 rounded-lg">
        <PageSpinner variant="success" text="Syncing data..." />
      </div>
    </div>
  ),
};

/**
 * Page Spinner Not Centered
 *
 * Page spinner without automatic centering.
 */
export const PageNotCentered: Story = {
  render: () => (
    <div className="bg-background-secondary p-8 rounded-lg">
      <PageSpinner centered={false} text="Loading..." />
    </div>
  ),
};

/**
 * Inline Spinner
 *
 * A small spinner for inline use within text or compact UI elements.
 */
export const InlineUsage: Story = {
  render: () => (
    <div className="space-y-4 bg-background-secondary p-6 rounded-lg">
      <div className="flex items-center gap-2 text-text-primary">
        <InlineSpinner variant="primary" />
        <span>Loading data...</span>
      </div>
      <div className="flex items-center gap-2 text-text-primary">
        <InlineSpinner variant="success" />
        <span>Syncing...</span>
      </div>
      <div className="flex items-center gap-2 text-text-primary">
        <InlineSpinner variant="warning" />
        <span>Processing...</span>
      </div>
      <p className="text-text-secondary">
        Please wait <InlineSpinner variant="default" /> while we process your request.
      </p>
    </div>
  ),
};

/**
 * Real-World Examples
 *
 * Common use cases for spinners in the application.
 */
export const RealWorldExamples: Story = {
  render: () => (
    <div className="space-y-6 max-w-2xl">
      {/* Card with loading state */}
      <div className="bg-background-secondary rounded-lg p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">
          Recent Transactions
        </h3>
        <PageSpinner text="Loading transactions..." centered={false} />
      </div>

      {/* Form with loading button */}
      <div className="bg-background-secondary rounded-lg p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">
          Update Settings
        </h3>
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Store name"
            className="w-full px-4 py-2 bg-background-primary border border-border-DEFAULT rounded-lg text-text-primary"
          />
          <button className="px-6 py-2 bg-primary-500 text-white rounded-lg flex items-center">
            <ButtonSpinner />
            Saving Changes...
          </button>
        </div>
      </div>

      {/* Status indicator with inline spinner */}
      <div className="bg-background-secondary rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-text-primary">
              Sync Status
            </h3>
            <p className="text-sm text-text-tertiary mt-1">
              Last synced: 2 minutes ago
            </p>
          </div>
          <div className="flex items-center gap-2 text-primary-500">
            <InlineSpinner variant="primary" />
            <span className="text-sm font-medium">Syncing...</span>
          </div>
        </div>
      </div>
    </div>
  ),
};
