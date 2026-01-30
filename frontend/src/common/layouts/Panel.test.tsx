import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Panel } from './Panel';

describe('Panel', () => {
  describe('Basic Rendering', () => {
    it('renders children correctly', () => {
      render(
        <Panel>
          <div>Panel Content</div>
        </Panel>
      );
      expect(screen.getByText('Panel Content')).toBeInTheDocument();
    });

    it('renders title when provided', () => {
      render(
        <Panel title="Panel Title">
          <div>Content</div>
        </Panel>
      );
      expect(screen.getByText('Panel Title')).toBeInTheDocument();
    });

    it('does not render title section when title not provided', () => {
      const { container } = render(
        <Panel>
          <div>Content</div>
        </Panel>
      );
      const titleSection = container.querySelector('.border-b');
      expect(titleSection).not.toBeInTheDocument();
    });
  });

  describe('Padding Variants', () => {
    it('applies default medium padding', () => {
      const { container } = render(
        <Panel>
          <div>Content</div>
        </Panel>
      );
      const contentDiv = screen.getByText('Content').parentElement;
      expect(contentDiv).toHaveClass('p-4', 'sm:p-6');
    });

    it('applies no padding when padding="none"', () => {
      const { container } = render(
        <Panel padding="none">
          <div>Content</div>
        </Panel>
      );
      const contentDiv = screen.getByText('Content').parentElement;
      expect(contentDiv).not.toHaveClass('p-4');
      expect(contentDiv).not.toHaveClass('sm:p-6');
    });

    it('applies small padding when padding="sm"', () => {
      const { container } = render(
        <Panel padding="sm">
          <div>Content</div>
        </Panel>
      );
      const contentDiv = screen.getByText('Content').parentElement;
      expect(contentDiv).toHaveClass('p-3', 'sm:p-4');
    });

    it('applies large padding when padding="lg"', () => {
      const { container } = render(
        <Panel padding="lg">
          <div>Content</div>
        </Panel>
      );
      const contentDiv = screen.getByText('Content').parentElement;
      expect(contentDiv).toHaveClass('p-6', 'sm:p-8');
    });
  });

  describe('Spacing Tokens', () => {
    it('uses design token spacing for padding', () => {
      const { container } = render(
        <Panel>
          <div>Content</div>
        </Panel>
      );
      const contentDiv = screen.getByText('Content').parentElement;
      // p-4 = 1rem (16px), sm:p-6 = 1.5rem (24px) - both are design tokens
      expect(contentDiv).toHaveClass('p-4', 'sm:p-6');
    });

    it('uses design token spacing for title section', () => {
      const { container } = render(
        <Panel title="Title">
          <div>Content</div>
        </Panel>
      );
      const titleDiv = screen.getByText('Title').parentElement;
      expect(titleDiv).toHaveClass('px-4', 'sm:px-6', 'py-3', 'sm:py-4');
    });

    it('enforces spacing tokens in all padding variants', () => {
      // All padding values should be from the design token system
      const variants: Array<'none' | 'sm' | 'md' | 'lg'> = ['none', 'sm', 'md', 'lg'];
      
      variants.forEach((padding) => {
        const { container } = render(
          <Panel padding={padding}>
            <div>Content {padding}</div>
          </Panel>
        );
        
        const contentDiv = screen.getByText(`Content ${padding}`).parentElement;
        const classes = contentDiv?.className || '';
        
        // Verify no arbitrary padding values (like p-[17px])
        expect(classes).not.toMatch(/p-\[.*px\]/);
        expect(classes).not.toMatch(/px-\[.*px\]/);
        expect(classes).not.toMatch(/py-\[.*px\]/);
      });
    });
  });

  describe('Visual Styling', () => {
    it('applies card-like styling', () => {
      const { container } = render(
        <Panel>
          <div>Content</div>
        </Panel>
      );
      const panel = container.firstChild as HTMLElement;
      expect(panel).toHaveClass(
        'bg-surface',
        'border',
        'border-border',
        'rounded-lg',
        'sm:rounded-xl',
        'shadow-sm'
      );
    });

    it('applies responsive border radius', () => {
      const { container } = render(
        <Panel>
          <div>Content</div>
        </Panel>
      );
      const panel = container.firstChild as HTMLElement;
      expect(panel).toHaveClass('rounded-lg', 'sm:rounded-xl');
    });

    it('applies title section border', () => {
      const { container } = render(
        <Panel title="Title">
          <div>Content</div>
        </Panel>
      );
      const titleDiv = screen.getByText('Title').parentElement;
      expect(titleDiv).toHaveClass('border-b', 'border-border');
    });
  });

  describe('Custom Props', () => {
    it('accepts custom className', () => {
      const { container } = render(
        <Panel className="custom-class">
          <div>Content</div>
        </Panel>
      );
      const panel = container.firstChild as HTMLElement;
      expect(panel).toHaveClass('custom-class');
    });

    it('merges custom className with default classes', () => {
      const { container } = render(
        <Panel className="custom-class">
          <div>Content</div>
        </Panel>
      );
      const panel = container.firstChild as HTMLElement;
      expect(panel).toHaveClass('custom-class', 'bg-surface', 'border');
    });

    it('forwards HTML div attributes', () => {
      const { container } = render(
        <Panel data-testid="test-panel" aria-label="Test Panel">
          <div>Content</div>
        </Panel>
      );
      const panel = container.firstChild as HTMLElement;
      expect(panel).toHaveAttribute('data-testid', 'test-panel');
      expect(panel).toHaveAttribute('aria-label', 'Test Panel');
    });
  });

  describe('Title Styling', () => {
    it('applies semantic heading styling to title', () => {
      render(
        <Panel title="Panel Title">
          <div>Content</div>
        </Panel>
      );
      const title = screen.getByText('Panel Title');
      expect(title.tagName).toBe('H3');
      expect(title).toHaveClass('text-base', 'sm:text-lg', 'font-semibold');
    });

    it('uses responsive text sizing for title', () => {
      render(
        <Panel title="Panel Title">
          <div>Content</div>
        </Panel>
      );
      const title = screen.getByText('Panel Title');
      expect(title).toHaveClass('text-base', 'sm:text-lg');
    });
  });

  describe('Layout Structure', () => {
    it('maintains proper structure with title', () => {
      const { container } = render(
        <Panel title="Title">
          <div>Content</div>
        </Panel>
      );
      
      const panel = container.firstChild as HTMLElement;
      const titleSection = panel.querySelector('.border-b');
      const contentSection = screen.getByText('Content').parentElement;
      
      expect(titleSection).toBeInTheDocument();
      expect(contentSection).toBeInTheDocument();
      expect(titleSection?.nextElementSibling).toBe(contentSection);
    });

    it('maintains proper structure without title', () => {
      const { container } = render(
        <Panel>
          <div>Content</div>
        </Panel>
      );
      
      const panel = container.firstChild as HTMLElement;
      const contentSection = screen.getByText('Content').parentElement;
      
      expect(panel.children.length).toBe(1);
      expect(panel.firstChild).toBe(contentSection);
    });
  });
});
