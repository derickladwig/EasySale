import type { Meta, StoryObj } from '@storybook/react';
import { ProgressBar, DeterminateProgressBar, IndeterminateProgressBar } from './ProgressBar';

const meta = {
  title: 'Atoms/ProgressBar',
  component: ProgressBar,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
A progress indicator that shows completion status of an operation.
Supports both determinate (specific percentage) and indeterminate (ongoing activity) modes.

**Requirements:**
- 12.3: Use progress bars for determinate operations
- 12.4: Animate smoothly with CSS animations

**Features:**
- Determinate and indeterminate modes
- Multiple size variants (sm, md, lg)
- Multiple color variants (default, primary, success, warning, error, info)
- Optional percentage label
- Custom label support
- Smooth animations
- Full accessibility support
        `,
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    value: {
      control: { type: 'range', min: 0, max: 100, step: 1 },
      description: 'Progress value (0-100). If undefined, shows indeterminate state',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Size of the progress bar',
    },
    variant: {
      control: 'select',
      options: ['default', 'primary', 'success', 'warning', 'error', 'info'],
      description: 'Color variant',
    },
    showLabel: {
      control: 'boolean',
      description: 'Whether to show the percentage label',
    },
    label: {
      control: 'text',
      description: 'Custom label text (overrides percentage)',
    },
  },
} satisfies Meta<typeof ProgressBar>;

export default meta;
type Story = StoryObj<typeof meta>;

// Basic Examples
export const Default: Story = {
  args: {
    value: 50,
    variant: 'primary',
  },
};

export const WithLabel: Story = {
  args: {
    value: 65,
    variant: 'primary',
    showLabel: true,
  },
};

export const CustomLabel: Story = {
  args: {
    value: 75,
    variant: 'primary',
    label: 'Uploading files...',
  },
};

export const Indeterminate: Story = {
  args: {
    variant: 'primary',
  },
};

// Size Variants
export const Small: Story = {
  args: {
    value: 60,
    size: 'sm',
    variant: 'primary',
  },
};

export const Medium: Story = {
  args: {
    value: 60,
    size: 'md',
    variant: 'primary',
  },
};

export const Large: Story = {
  args: {
    value: 60,
    size: 'lg',
    variant: 'primary',
  },
};

// Color Variants
export const DefaultVariant: Story = {
  args: {
    value: 50,
    variant: 'default',
    showLabel: true,
  },
};

export const Primary: Story = {
  args: {
    value: 50,
    variant: 'primary',
    showLabel: true,
  },
};

export const Success: Story = {
  args: {
    value: 100,
    variant: 'success',
    showLabel: true,
  },
};

export const Warning: Story = {
  args: {
    value: 75,
    variant: 'warning',
    showLabel: true,
  },
};

export const Error: Story = {
  args: {
    value: 25,
    variant: 'error',
    showLabel: true,
  },
};

export const Info: Story = {
  args: {
    value: 50,
    variant: 'info',
    showLabel: true,
  },
};

// Progress States
export const Empty: Story = {
  args: {
    value: 0,
    variant: 'primary',
    showLabel: true,
  },
};

export const Quarter: Story = {
  args: {
    value: 25,
    variant: 'primary',
    showLabel: true,
  },
};

export const Half: Story = {
  args: {
    value: 50,
    variant: 'primary',
    showLabel: true,
  },
};

export const ThreeQuarters: Story = {
  args: {
    value: 75,
    variant: 'primary',
    showLabel: true,
  },
};

export const Complete: Story = {
  args: {
    value: 100,
    variant: 'success',
    showLabel: true,
  },
};

// Use Cases
export const FileUpload: Story = {
  args: {
    value: 45,
    variant: 'primary',
    label: 'Uploading document.pdf (45%)',
  },
};

export const DataSync: Story = {
  args: {
    variant: 'info',
    label: 'Syncing data...',
  },
};

export const Processing: Story = {
  args: {
    variant: 'primary',
    label: 'Processing...',
  },
};

export const LowBattery: Story = {
  args: {
    value: 15,
    variant: 'error',
    showLabel: true,
  },
};

export const HighBattery: Story = {
  args: {
    value: 85,
    variant: 'success',
    showLabel: true,
  },
};

// Multiple Progress Bars
export const MultipleProgressBars: Story = {
  render: () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-text-primary mb-2">File Uploads</h3>
        <div className="space-y-3">
          <ProgressBar value={100} variant="success" label="document.pdf (Complete)" />
          <ProgressBar value={65} variant="primary" label="image.jpg (65%)" />
          <ProgressBar value={30} variant="primary" label="video.mp4 (30%)" />
          <ProgressBar variant="primary" label="archive.zip (Starting...)" />
        </div>
      </div>
    </div>
  ),
};

// Size Comparison
export const SizeComparison: Story = {
  render: () => (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-text-secondary mb-2">Small</p>
        <ProgressBar value={60} size="sm" variant="primary" />
      </div>
      <div>
        <p className="text-sm text-text-secondary mb-2">Medium (Default)</p>
        <ProgressBar value={60} size="md" variant="primary" />
      </div>
      <div>
        <p className="text-sm text-text-secondary mb-2">Large</p>
        <ProgressBar value={60} size="lg" variant="primary" />
      </div>
    </div>
  ),
};

// Variant Comparison
export const VariantComparison: Story = {
  render: () => (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-text-secondary mb-2">Default</p>
        <ProgressBar value={60} variant="default" showLabel />
      </div>
      <div>
        <p className="text-sm text-text-secondary mb-2">Primary</p>
        <ProgressBar value={60} variant="primary" showLabel />
      </div>
      <div>
        <p className="text-sm text-text-secondary mb-2">Success</p>
        <ProgressBar value={60} variant="success" showLabel />
      </div>
      <div>
        <p className="text-sm text-text-secondary mb-2">Warning</p>
        <ProgressBar value={60} variant="warning" showLabel />
      </div>
      <div>
        <p className="text-sm text-text-secondary mb-2">Error</p>
        <ProgressBar value={60} variant="error" showLabel />
      </div>
      <div>
        <p className="text-sm text-text-secondary mb-2">Info</p>
        <ProgressBar value={60} variant="info" showLabel />
      </div>
    </div>
  ),
};

// Determinate vs Indeterminate
export const DeterminateVsIndeterminate: Story = {
  render: () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-text-primary mb-2">Determinate Progress</h3>
        <p className="text-sm text-text-tertiary mb-3">Shows specific progress percentage</p>
        <DeterminateProgressBar value={65} variant="primary" showLabel />
      </div>
      <div>
        <h3 className="text-sm font-medium text-text-primary mb-2">Indeterminate Progress</h3>
        <p className="text-sm text-text-tertiary mb-3">Shows ongoing activity without specific progress</p>
        <IndeterminateProgressBar variant="primary" />
      </div>
    </div>
  ),
};

// Real-world Example
export const RealWorldExample: Story = {
  render: () => (
    <div className="max-w-md mx-auto p-6 bg-background-secondary rounded-lg border border-border-light">
      <h2 className="text-lg font-semibold text-text-primary mb-4">Installation Progress</h2>
      
      <div className="space-y-4">
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-text-primary">Downloading packages</span>
            <span className="text-sm text-text-tertiary">100%</span>
          </div>
          <ProgressBar value={100} variant="success" size="sm" />
        </div>
        
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-text-primary">Installing dependencies</span>
            <span className="text-sm text-text-tertiary">67%</span>
          </div>
          <ProgressBar value={67} variant="primary" size="sm" />
        </div>
        
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-text-primary">Configuring application</span>
            <span className="text-sm text-text-tertiary">In progress...</span>
          </div>
          <IndeterminateProgressBar variant="primary" size="sm" />
        </div>
        
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-text-disabled">Running tests</span>
            <span className="text-sm text-text-disabled">Pending</span>
          </div>
          <ProgressBar value={0} variant="default" size="sm" />
        </div>
      </div>
    </div>
  ),
};
