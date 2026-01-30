import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FormLayout, FormSection } from './FormLayout';

describe('FormLayout', () => {
  describe('Basic Rendering', () => {
    it('renders children correctly', () => {
      render(
        <FormLayout>
          <div>Form Field 1</div>
          <div>Form Field 2</div>
        </FormLayout>
      );
      expect(screen.getByText('Form Field 1')).toBeInTheDocument();
      expect(screen.getByText('Form Field 2')).toBeInTheDocument();
    });

    it('applies grid layout', () => {
      const { container } = render(
        <FormLayout>
          <div>Field</div>
        </FormLayout>
      );
      const grid = container.firstChild as HTMLElement;
      expect(grid).toHaveClass('grid');
    });
  });

  describe('Column Variants', () => {
    it('applies single column layout when columns=1', () => {
      const { container } = render(
        <FormLayout columns={1}>
          <div>Field</div>
        </FormLayout>
      );
      const grid = container.firstChild as HTMLElement;
      expect(grid).toHaveClass('grid-cols-1');
    });

    it('applies default two column layout', () => {
      const { container } = render(
        <FormLayout>
          <div>Field</div>
        </FormLayout>
      );
      const grid = container.firstChild as HTMLElement;
      expect(grid).toHaveClass('grid-cols-1', 'md:grid-cols-2');
    });

    it('applies two column layout when columns=2', () => {
      const { container } = render(
        <FormLayout columns={2}>
          <div>Field</div>
        </FormLayout>
      );
      const grid = container.firstChild as HTMLElement;
      expect(grid).toHaveClass('grid-cols-1', 'md:grid-cols-2');
    });

    it('applies three column layout when columns=3', () => {
      const { container } = render(
        <FormLayout columns={3}>
          <div>Field</div>
        </FormLayout>
      );
      const grid = container.firstChild as HTMLElement;
      expect(grid).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3');
    });
  });

  describe('Spacing Tokens', () => {
    it('uses design token spacing for gap', () => {
      const { container } = render(
        <FormLayout>
          <div>Field</div>
        </FormLayout>
      );
      const grid = container.firstChild as HTMLElement;
      expect(grid).toHaveClass('gap-4', 'sm:gap-6');
    });

    it('enforces spacing tokens (no arbitrary values)', () => {
      const { container } = render(
        <FormLayout>
          <div>Field</div>
        </FormLayout>
      );
      const grid = container.firstChild as HTMLElement;
      const classes = grid.className;
      
      // Verify no arbitrary gap values (like gap-[17px])
      expect(classes).not.toMatch(/gap-\[.*px\]/);
    });
  });

  describe('Responsive Behavior', () => {
    it('starts with single column on mobile', () => {
      const { container } = render(
        <FormLayout columns={2}>
          <div>Field</div>
        </FormLayout>
      );
      const grid = container.firstChild as HTMLElement;
      expect(grid).toHaveClass('grid-cols-1');
    });

    it('expands to multiple columns on larger screens', () => {
      const { container } = render(
        <FormLayout columns={3}>
          <div>Field</div>
        </FormLayout>
      );
      const grid = container.firstChild as HTMLElement;
      expect(grid).toHaveClass('md:grid-cols-2', 'lg:grid-cols-3');
    });
  });

  describe('Custom Props', () => {
    it('accepts custom className', () => {
      const { container } = render(
        <FormLayout className="custom-class">
          <div>Field</div>
        </FormLayout>
      );
      const grid = container.firstChild as HTMLElement;
      expect(grid).toHaveClass('custom-class');
    });

    it('merges custom className with default classes', () => {
      const { container } = render(
        <FormLayout className="custom-class">
          <div>Field</div>
        </FormLayout>
      );
      const grid = container.firstChild as HTMLElement;
      expect(grid).toHaveClass('custom-class', 'grid', 'gap-4');
    });

    it('forwards HTML div attributes', () => {
      const { container } = render(
        <FormLayout data-testid="test-form" aria-label="Test Form">
          <div>Field</div>
        </FormLayout>
      );
      const grid = container.firstChild as HTMLElement;
      expect(grid).toHaveAttribute('data-testid', 'test-form');
      expect(grid).toHaveAttribute('aria-label', 'Test Form');
    });
  });
});

describe('FormSection', () => {
  describe('Basic Rendering', () => {
    it('renders title correctly', () => {
      render(
        <FormSection title="Section Title">
          <div>Field</div>
        </FormSection>
      );
      expect(screen.getByText('Section Title')).toBeInTheDocument();
    });

    it('renders description when provided', () => {
      render(
        <FormSection title="Section Title" description="Section description">
          <div>Field</div>
        </FormSection>
      );
      expect(screen.getByText('Section description')).toBeInTheDocument();
    });

    it('does not render description when not provided', () => {
      const { container } = render(
        <FormSection title="Section Title">
          <div>Field</div>
        </FormSection>
      );
      const description = container.querySelector('p');
      expect(description).not.toBeInTheDocument();
    });

    it('renders children correctly', () => {
      render(
        <FormSection title="Section">
          <div>Field 1</div>
          <div>Field 2</div>
        </FormSection>
      );
      expect(screen.getByText('Field 1')).toBeInTheDocument();
      expect(screen.getByText('Field 2')).toBeInTheDocument();
    });
  });

  describe('Layout Structure', () => {
    it('spans full width of parent grid', () => {
      const { container } = render(
        <FormSection title="Section">
          <div>Field</div>
        </FormSection>
      );
      const section = container.firstChild as HTMLElement;
      expect(section).toHaveClass('col-span-full');
    });

    it('applies grid layout to children', () => {
      render(
        <FormSection title="Section">
          <div>Field</div>
        </FormSection>
      );
      const childrenContainer = screen.getByText('Field').parentElement;
      expect(childrenContainer).toHaveClass('grid', 'grid-cols-1', 'md:grid-cols-2');
    });
  });

  describe('Spacing Tokens', () => {
    it('uses design token spacing for margins', () => {
      render(
        <FormSection title="Section">
          <div>Field</div>
        </FormSection>
      );
      const titleContainer = screen.getByText('Section').parentElement;
      expect(titleContainer).toHaveClass('mb-4');
    });

    it('uses design token spacing for description margin', () => {
      render(
        <FormSection title="Section" description="Description">
          <div>Field</div>
        </FormSection>
      );
      const description = screen.getByText('Description');
      expect(description).toHaveClass('mt-1');
    });

    it('uses design token spacing for grid gap', () => {
      render(
        <FormSection title="Section">
          <div>Field</div>
        </FormSection>
      );
      const childrenContainer = screen.getByText('Field').parentElement;
      expect(childrenContainer).toHaveClass('gap-4', 'sm:gap-6');
    });

    it('enforces spacing tokens (no arbitrary values)', () => {
      const { container } = render(
        <FormSection title="Section">
          <div>Field</div>
        </FormSection>
      );
      const section = container.firstChild as HTMLElement;
      const classes = section.className;
      
      // Verify no arbitrary spacing values
      expect(classes).not.toMatch(/m-\[.*px\]/);
      expect(classes).not.toMatch(/p-\[.*px\]/);
      expect(classes).not.toMatch(/gap-\[.*px\]/);
    });
  });

  describe('Title Styling', () => {
    it('applies semantic heading styling', () => {
      render(
        <FormSection title="Section Title">
          <div>Field</div>
        </FormSection>
      );
      const title = screen.getByText('Section Title');
      expect(title.tagName).toBe('H3');
      expect(title).toHaveClass('text-base', 'sm:text-lg', 'font-semibold');
    });

    it('uses responsive text sizing', () => {
      render(
        <FormSection title="Section Title">
          <div>Field</div>
        </FormSection>
      );
      const title = screen.getByText('Section Title');
      expect(title).toHaveClass('text-base', 'sm:text-lg');
    });
  });

  describe('Description Styling', () => {
    it('applies appropriate text styling to description', () => {
      render(
        <FormSection title="Section" description="Description text">
          <div>Field</div>
        </FormSection>
      );
      const description = screen.getByText('Description text');
      expect(description).toHaveClass('text-sm', 'text-secondary-600');
    });
  });

  describe('Custom Props', () => {
    it('accepts custom className', () => {
      const { container } = render(
        <FormSection title="Section" className="custom-class">
          <div>Field</div>
        </FormSection>
      );
      const section = container.firstChild as HTMLElement;
      expect(section).toHaveClass('custom-class');
    });

    it('merges custom className with default classes', () => {
      const { container } = render(
        <FormSection title="Section" className="custom-class">
          <div>Field</div>
        </FormSection>
      );
      const section = container.firstChild as HTMLElement;
      expect(section).toHaveClass('custom-class', 'col-span-full');
    });

    it('forwards HTML div attributes', () => {
      const { container } = render(
        <FormSection title="Section" data-testid="test-section" aria-label="Test Section">
          <div>Field</div>
        </FormSection>
      );
      const section = container.firstChild as HTMLElement;
      expect(section).toHaveAttribute('data-testid', 'test-section');
      expect(section).toHaveAttribute('aria-label', 'Test Section');
    });
  });

  describe('Integration with FormLayout', () => {
    it('works correctly inside FormLayout', () => {
      render(
        <FormLayout>
          <FormSection title="Personal Info">
            <div>Name Field</div>
            <div>Email Field</div>
          </FormSection>
          <FormSection title="Address">
            <div>Street Field</div>
            <div>City Field</div>
          </FormSection>
        </FormLayout>
      );

      expect(screen.getByText('Personal Info')).toBeInTheDocument();
      expect(screen.getByText('Address')).toBeInTheDocument();
      expect(screen.getByText('Name Field')).toBeInTheDocument();
      expect(screen.getByText('Street Field')).toBeInTheDocument();
    });
  });
});
