/**
 * Storybook Stories for Skeleton Screen Components
 *
 * Showcases all skeleton screen components with various configurations.
 */

import type { Meta, StoryObj } from '@storybook/react';
import {
  SkeletonCard,
  SkeletonTable,
  SkeletonForm,
  SkeletonList,
  SkeletonGrid,
  SkeletonDashboard,
} from '../SkeletonScreens';

// SkeletonCard Stories
const metaCard: Meta<typeof SkeletonCard> = {
  title: 'Atoms/Skeleton Screens/SkeletonCard',
  component: SkeletonCard,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Skeleton placeholder for card components with optional header and footer.',
      },
    },
  },
};

export default metaCard;

type StoryCard = StoryObj<typeof SkeletonCard>;

export const BasicCard: StoryCard = {
  args: {},
};

export const CardWithHeader: StoryCard = {
  args: {
    hasHeader: true,
  },
};

export const CardWithFooter: StoryCard = {
  args: {
    hasFooter: true,
  },
};

export const CardWithHeaderAndFooter: StoryCard = {
  args: {
    hasHeader: true,
    hasFooter: true,
  },
};

export const CardWithManyLines: StoryCard = {
  args: {
    contentLines: 7,
  },
};

export const CardGrid: StoryCard = {
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <SkeletonCard key={i} hasHeader />
      ))}
    </div>
  ),
};

// SkeletonTable Stories
const metaTable: Meta<typeof SkeletonTable> = {
  title: 'Atoms/Skeleton Screens/SkeletonTable',
  component: SkeletonTable,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Skeleton placeholder for table components with configurable rows and columns.',
      },
    },
  },
};

export const BasicTable: StoryObj<typeof SkeletonTable> = {
  args: {},
};

export const TableWithoutHeader: StoryObj<typeof SkeletonTable> = {
  args: {
    showHeader: false,
  },
};

export const TableWithSelection: StoryObj<typeof SkeletonTable> = {
  args: {
    showSelection: true,
  },
};

export const TableWithActions: StoryObj<typeof SkeletonTable> = {
  args: {
    showActions: true,
  },
};

export const LargeTable: StoryObj<typeof SkeletonTable> = {
  args: {
    rows: 10,
    columns: 6,
  },
};

export const TableWithAllFeatures: StoryObj<typeof SkeletonTable> = {
  args: {
    rows: 8,
    columns: 5,
    showHeader: true,
    showSelection: true,
    showActions: true,
  },
};

// SkeletonForm Stories
const metaForm: Meta<typeof SkeletonForm> = {
  title: 'Atoms/Skeleton Screens/SkeletonForm',
  component: SkeletonForm,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Skeleton placeholder for form components with various field types.',
      },
    },
  },
};

export const BasicForm: StoryObj<typeof SkeletonForm> = {
  args: {},
};

export const FormWithoutButtons: StoryObj<typeof SkeletonForm> = {
  args: {
    hasSubmitButton: false,
  },
};

export const FormWithCancelButton: StoryObj<typeof SkeletonForm> = {
  args: {
    hasCancelButton: true,
  },
};

export const HorizontalForm: StoryObj<typeof SkeletonForm> = {
  args: {
    layout: 'horizontal',
    fields: 5,
  },
};

export const LargeForm: StoryObj<typeof SkeletonForm> = {
  args: {
    fields: 10,
  },
};

// SkeletonList Stories
const metaList: Meta<typeof SkeletonList> = {
  title: 'Atoms/Skeleton Screens/SkeletonList',
  component: SkeletonList,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Skeleton placeholder for list components with avatars and actions.',
      },
    },
  },
};

export const BasicList: StoryObj<typeof SkeletonList> = {
  args: {},
};

export const ListWithoutAvatars: StoryObj<typeof SkeletonList> = {
  args: {
    showAvatar: false,
  },
};

export const ListWithoutSecondaryText: StoryObj<typeof SkeletonList> = {
  args: {
    showSecondaryText: false,
  },
};

export const ListWithActions: StoryObj<typeof SkeletonList> = {
  args: {
    showAction: true,
  },
};

export const LongList: StoryObj<typeof SkeletonList> = {
  args: {
    items: 10,
  },
};

// SkeletonGrid Stories
const metaGrid: Meta<typeof SkeletonGrid> = {
  title: 'Atoms/Skeleton Screens/SkeletonGrid',
  component: SkeletonGrid,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Skeleton placeholder for grid layouts with images and content.',
      },
    },
  },
};

export const BasicGrid: StoryObj<typeof SkeletonGrid> = {
  args: {},
};

export const GridWithoutImages: StoryObj<typeof SkeletonGrid> = {
  args: {
    hasImage: false,
  },
};

export const TwoColumnGrid: StoryObj<typeof SkeletonGrid> = {
  args: {
    columns: 2,
  },
};

export const FourColumnGrid: StoryObj<typeof SkeletonGrid> = {
  args: {
    columns: 4,
  },
};

export const LargeGrid: StoryObj<typeof SkeletonGrid> = {
  args: {
    items: 12,
    columns: 4,
  },
};

// SkeletonDashboard Stories
const metaDashboard: Meta<typeof SkeletonDashboard> = {
  title: 'Atoms/Skeleton Screens/SkeletonDashboard',
  component: SkeletonDashboard,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Skeleton placeholder for dashboard layouts with stat cards and charts.',
      },
    },
  },
};

export const BasicDashboard: StoryObj<typeof SkeletonDashboard> = {
  args: {},
};

export const DashboardWithoutHeader: StoryObj<typeof SkeletonDashboard> = {
  args: {
    showHeader: false,
  },
};

export const DashboardWithoutChart: StoryObj<typeof SkeletonDashboard> = {
  args: {
    showChart: false,
  },
};

export const DashboardWithManyStats: StoryObj<typeof SkeletonDashboard> = {
  args: {
    statCards: 6,
  },
};

export const MinimalDashboard: StoryObj<typeof SkeletonDashboard> = {
  args: {
    showHeader: false,
    statCards: 2,
    showChart: false,
  },
};

// Combined Example
export const CompleteLoadingPage: StoryObj = {
  render: () => (
    <div className="space-y-8 p-6 bg-background-primary min-h-screen">
      <h2 className="text-2xl font-bold text-text-primary mb-6">Complete Loading Page Example</h2>
      
      {/* Dashboard Section */}
      <section>
        <h3 className="text-lg font-semibold text-text-primary mb-4">Dashboard</h3>
        <SkeletonDashboard />
      </section>

      {/* Table Section */}
      <section>
        <h3 className="text-lg font-semibold text-text-primary mb-4">Data Table</h3>
        <SkeletonTable rows={5} columns={5} showSelection showActions />
      </section>

      {/* Grid Section */}
      <section>
        <h3 className="text-lg font-semibold text-text-primary mb-4">Product Grid</h3>
        <SkeletonGrid items={6} columns={3} />
      </section>

      {/* Form Section */}
      <section>
        <h3 className="text-lg font-semibold text-text-primary mb-4">Form</h3>
        <div className="max-w-2xl">
          <SkeletonForm fields={5} />
        </div>
      </section>

      {/* List Section */}
      <section>
        <h3 className="text-lg font-semibold text-text-primary mb-4">List</h3>
        <SkeletonList items={5} showAction />
      </section>
    </div>
  ),
};

export { metaTable, metaForm, metaList, metaGrid, metaDashboard };
