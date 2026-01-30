/**
 * SkeletonForm Component Tests
 *
 * Tests for the SkeletonForm component and variants.
 *
 * Requirements tested:
 * - 12.1: Use skeleton screens for content loading
 * - 12.5: Match the shape of the content being loaded
 * - 12.6: Use subtle pulsing animation for skeletons
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { SkeletonForm, SkeletonFormSection, SkeletonFormTabs } from '../SkeletonForm';

describe('SkeletonForm Component', () => {
  describe('Basic Rendering (Requirement 12.1)', () => {
    it('should render with default props', () => {
      const { container } = render(<SkeletonForm />);
      const wrapper = container.firstChild as HTMLElement;

      expect(wrapper).toBeInTheDocument();
      expect(wrapper).toHaveAttribute('role', 'status');
      expect(wrapper).toHaveAttribute('aria-busy', 'true');
    });

    it('should render default 5 fields', () => {
      const { container } = render(<SkeletonForm />);
      const fields = container.querySelectorAll('.space-y-1\\.5');

      expect(fields).toHaveLength(5);
    });

    it('should render custom number of fields', () => {
      const { container } = render(<SkeletonForm fields={8} />);
      const fields = container.querySelectorAll('.space-y-1\\.5');

      expect(fields).toHaveLength(8);
    });

    it('should have pulsing animation on skeleton elements (Requirement 12.6)', () => {
      const { container } = render(<SkeletonForm />);
      const skeletons = container.querySelectorAll('.animate-pulse');

      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Field Types (Requirement 12.5)', () => {
    it('should render input field skeleton', () => {
      const { container } = render(
        <SkeletonForm fields={[{ type: 'input', label: true }]} showButtons={false} />
      );
      const inputSkeleton = container.querySelector('.h-11.w-full.rounded-lg');

      expect(inputSkeleton).toBeInTheDocument();
    });

    it('should render textarea field skeleton', () => {
      const { container } = render(
        <SkeletonForm fields={[{ type: 'textarea', label: true }]} showButtons={false} />
      );
      const textareaSkeleton = container.querySelector('.h-24.w-full.rounded-lg');

      expect(textareaSkeleton).toBeInTheDocument();
    });

    it('should render select field skeleton', () => {
      const { container } = render(
        <SkeletonForm fields={[{ type: 'select', label: true }]} showButtons={false} />
      );
      const selectSkeleton = container.querySelector('.h-11.w-full.rounded-lg');

      expect(selectSkeleton).toBeInTheDocument();
    });

    it('should render checkbox field skeleton', () => {
      const { container } = render(
        <SkeletonForm fields={[{ type: 'checkbox', label: false }]} showButtons={false} />
      );
      const checkboxSkeleton = container.querySelector('.w-4.h-4.rounded');

      expect(checkboxSkeleton).toBeInTheDocument();
    });

    it('should render radio field skeleton with multiple options', () => {
      const { container } = render(
        <SkeletonForm fields={[{ type: 'radio', label: false }]} showButtons={false} />
      );
      const radioSkeletons = container.querySelectorAll('.rounded-full.w-4.h-4');

      expect(radioSkeletons).toHaveLength(3); // Default 3 radio options
    });

    it('should render toggle field skeleton', () => {
      const { container } = render(
        <SkeletonForm fields={[{ type: 'toggle', label: false }]} showButtons={false} />
      );
      const toggleSkeleton = container.querySelector('.h-6.w-11.rounded-full');

      expect(toggleSkeleton).toBeInTheDocument();
    });
  });

  describe('Field Labels (Requirement 12.5)', () => {
    it('should render label skeleton when label is true', () => {
      const { container } = render(
        <SkeletonForm fields={[{ type: 'input', label: true }]} showButtons={false} />
      );
      const labelSkeleton = container.querySelector('.h-4.w-24');

      expect(labelSkeleton).toBeInTheDocument();
    });

    it('should not render label skeleton when label is false', () => {
      const { container } = render(
        <SkeletonForm fields={[{ type: 'input', label: false }]} showButtons={false} />
      );
      const labelSkeleton = container.querySelector('.h-4.w-24');

      expect(labelSkeleton).not.toBeInTheDocument();
    });
  });

  describe('Helper Text (Requirement 12.5)', () => {
    it('should render helper text skeleton when helperText is true', () => {
      const { container } = render(
        <SkeletonForm fields={[{ type: 'input', label: true, helperText: true }]} showButtons={false} />
      );
      const helperSkeleton = container.querySelector('.h-3.w-48');

      expect(helperSkeleton).toBeInTheDocument();
    });

    it('should not render helper text skeleton when helperText is false', () => {
      const { container } = render(
        <SkeletonForm fields={[{ type: 'input', label: true, helperText: false }]} showButtons={false} />
      );
      const helperSkeleton = container.querySelector('.h-3.w-48');

      expect(helperSkeleton).not.toBeInTheDocument();
    });
  });

  describe('Action Buttons (Requirement 12.5)', () => {
    it('should render action buttons by default', () => {
      const { container } = render(<SkeletonForm />);
      const buttons = container.querySelectorAll('.h-11.w-24.rounded-lg');

      expect(buttons).toHaveLength(2);
    });

    it('should not render buttons when showButtons is false', () => {
      const { container } = render(<SkeletonForm showButtons={false} />);
      const buttonContainer = container.querySelector('.border-t');

      expect(buttonContainer).not.toBeInTheDocument();
    });

    it('should render buttons with proper styling', () => {
      const { container } = render(<SkeletonForm />);
      const buttonContainer = container.querySelector('.border-t');

      expect(buttonContainer).toHaveClass('mt-8');
      expect(buttonContainer).toHaveClass('flex');
      expect(buttonContainer).toHaveClass('gap-3');
      expect(buttonContainer).toHaveClass('justify-end');
      expect(buttonContainer).toHaveClass('pt-6');
    });
  });

  describe('Layout Options (Requirement 12.5)', () => {
    it('should render vertical layout by default', () => {
      const { container } = render(<SkeletonForm showButtons={false} />);
      const fieldsContainer = container.querySelector('.space-y-6');

      expect(fieldsContainer).toBeInTheDocument();
    });

    it('should render horizontal layout', () => {
      const { container } = render(<SkeletonForm layout="horizontal" showButtons={false} />);
      const fieldsContainer = container.querySelector('.space-y-4');

      expect(fieldsContainer).toBeInTheDocument();
    });

    it('should render grid layout', () => {
      const { container } = render(<SkeletonForm layout="grid" showButtons={false} />);
      const fieldsContainer = container.querySelector('.grid');

      expect(fieldsContainer).toBeInTheDocument();
      expect(fieldsContainer).toHaveClass('grid-cols-1');
      expect(fieldsContainer).toHaveClass('md:grid-cols-2');
      expect(fieldsContainer).toHaveClass('gap-6');
    });

    it('should render grid layout with custom columns', () => {
      const { container } = render(
        <SkeletonForm layout="grid" gridColumns={3} showButtons={false} />
      );
      const fieldsContainer = container.querySelector('.grid');

      expect(fieldsContainer).toHaveClass('md:grid-cols-3');
    });
  });

  describe('Custom Styling', () => {
    it('should apply custom className', () => {
      const { container } = render(<SkeletonForm className="custom-form-class" />);
      const wrapper = container.firstChild as HTMLElement;

      expect(wrapper).toHaveClass('custom-form-class');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      const { container } = render(<SkeletonForm />);
      const wrapper = container.firstChild as HTMLElement;

      expect(wrapper).toHaveAttribute('role', 'status');
      expect(wrapper).toHaveAttribute('aria-busy', 'true');
    });
  });
});

describe('SkeletonFormSection Component', () => {
  describe('Basic Rendering (Requirement 12.1)', () => {
    it('should render with default props', () => {
      const { container } = render(<SkeletonFormSection />);
      const section = container.firstChild as HTMLElement;

      expect(section).toBeInTheDocument();
    });

    it('should render default 3 fields', () => {
      const { container } = render(<SkeletonFormSection />);
      const fields = container.querySelectorAll('.space-y-1\\.5');

      expect(fields).toHaveLength(3);
    });

    it('should render custom number of fields', () => {
      const { container } = render(<SkeletonFormSection fields={6} />);
      const fields = container.querySelectorAll('.space-y-1\\.5');

      expect(fields).toHaveLength(6);
    });
  });

  describe('Section Header (Requirement 12.5)', () => {
    it('should render title skeleton by default', () => {
      const { container } = render(<SkeletonFormSection />);
      const titleSkeleton = container.querySelector('.h-6.w-48');

      expect(titleSkeleton).toBeInTheDocument();
    });

    it('should not render title when showTitle is false', () => {
      const { container } = render(<SkeletonFormSection showTitle={false} />);
      const titleSkeleton = container.querySelector('.h-6.w-48');

      expect(titleSkeleton).not.toBeInTheDocument();
    });

    it('should not render description by default', () => {
      const { container } = render(<SkeletonFormSection />);
      const descriptionSkeleton = container.querySelector('.h-4.w-full');

      expect(descriptionSkeleton).not.toBeInTheDocument();
    });

    it('should render description when showDescription is true', () => {
      const { container } = render(<SkeletonFormSection showDescription />);
      const descriptionSkeleton = container.querySelector('.h-4.w-full');

      expect(descriptionSkeleton).toBeInTheDocument();
    });

    it('should render header with border when title or description is shown', () => {
      const { container } = render(<SkeletonFormSection showTitle />);
      const header = container.querySelector('.border-b');

      expect(header).toBeInTheDocument();
      expect(header).toHaveClass('pb-4');
    });
  });

  describe('Custom Styling', () => {
    it('should apply custom className', () => {
      const { container } = render(<SkeletonFormSection className="custom-section-class" />);
      const section = container.firstChild as HTMLElement;

      expect(section).toHaveClass('custom-section-class');
    });
  });
});

describe('SkeletonFormTabs Component', () => {
  describe('Basic Rendering (Requirement 12.1)', () => {
    it('should render with default props', () => {
      const { container } = render(<SkeletonFormTabs />);
      const wrapper = container.firstChild as HTMLElement;

      expect(wrapper).toBeInTheDocument();
      expect(wrapper).toHaveAttribute('role', 'status');
      expect(wrapper).toHaveAttribute('aria-busy', 'true');
    });

    it('should render default 3 tabs', () => {
      const { container } = render(<SkeletonFormTabs />);
      const tabs = container.querySelectorAll('.border-b .h-10.w-24');

      expect(tabs).toHaveLength(3);
    });

    it('should render custom number of tabs', () => {
      const { container } = render(<SkeletonFormTabs tabs={5} />);
      const tabs = container.querySelectorAll('.border-b .h-10.w-24');

      expect(tabs).toHaveLength(5);
    });

    it('should have pulsing animation on skeleton elements (Requirement 12.6)', () => {
      const { container } = render(<SkeletonFormTabs />);
      const skeletons = container.querySelectorAll('.animate-pulse');

      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Tabs Structure (Requirement 12.5)', () => {
    it('should render tabs with proper layout', () => {
      const { container } = render(<SkeletonFormTabs />);
      const tabsContainer = container.querySelector('.border-b');

      expect(tabsContainer).toHaveClass('flex');
      expect(tabsContainer).toHaveClass('gap-4');
      expect(tabsContainer).toHaveClass('mb-6');
    });

    it('should render tabs with border bottom', () => {
      const { container } = render(<SkeletonFormTabs />);
      const tabsContainer = container.querySelector('.border-b');

      expect(tabsContainer).toHaveClass('border-border-light');
    });
  });

  describe('Tab Content (Requirement 12.5)', () => {
    it('should render form skeleton as tab content', () => {
      const { container } = render(<SkeletonFormTabs />);
      const fields = container.querySelectorAll('.space-y-1\\.5');

      // Should render default 5 fields
      expect(fields).toHaveLength(5);
    });

    it('should render custom number of fields per tab', () => {
      const { container } = render(<SkeletonFormTabs fieldsPerTab={8} />);
      const fields = container.querySelectorAll('.space-y-1\\.5');

      expect(fields).toHaveLength(8);
    });

    it('should render action buttons in tab content', () => {
      const { container } = render(<SkeletonFormTabs />);
      const buttons = container.querySelectorAll('.h-11.w-24.rounded-lg');

      expect(buttons).toHaveLength(2);
    });
  });

  describe('Custom Styling', () => {
    it('should apply custom className', () => {
      const { container } = render(<SkeletonFormTabs className="custom-tabs-class" />);
      const wrapper = container.firstChild as HTMLElement;

      expect(wrapper).toHaveClass('custom-tabs-class');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      const { container } = render(<SkeletonFormTabs />);
      const wrapper = container.firstChild as HTMLElement;

      expect(wrapper).toHaveAttribute('role', 'status');
      expect(wrapper).toHaveAttribute('aria-busy', 'true');
    });
  });
});
