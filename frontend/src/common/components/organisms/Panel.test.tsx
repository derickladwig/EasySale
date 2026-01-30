import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Panel } from './Panel';

describe('Panel', () => {
  describe('Rendering', () => {
    it('should render panel', () => {
      const { container } = render(
        <Panel isOpen={true} onClose={vi.fn()}>
          <div>Panel content</div>
        </Panel>
      );
      expect(container.querySelector('aside')).toBeInTheDocument();
    });

    it('should render children', () => {
      render(
        <Panel isOpen={true} onClose={vi.fn()}>
          <div>Panel content</div>
        </Panel>
      );
      expect(screen.getByText('Panel content')).toBeInTheDocument();
    });

    it('should render title when provided', () => {
      render(
        <Panel isOpen={true} onClose={vi.fn()} title="Test Panel">
          <div>Content</div>
        </Panel>
      );
      expect(screen.getByText('Test Panel')).toBeInTheDocument();
    });

    it('should not render title when not provided', () => {
      const { container } = render(
        <Panel isOpen={true} onClose={vi.fn()}>
          <div>Content</div>
        </Panel>
      );
      expect(container.querySelector('h2')).not.toBeInTheDocument();
    });

    it('should render footer when provided', () => {
      render(
        <Panel isOpen={true} onClose={vi.fn()} footer={<div>Footer content</div>}>
          <div>Content</div>
        </Panel>
      );
      expect(screen.getByText('Footer content')).toBeInTheDocument();
    });

    it('should not render footer when not provided', () => {
      render(
        <Panel isOpen={true} onClose={vi.fn()}>
          <div>Content</div>
        </Panel>
      );
      expect(screen.queryByText('Footer content')).not.toBeInTheDocument();
    });
  });

  describe('Open/Close State', () => {
    it('should be visible when isOpen is true', () => {
      const { container } = render(
        <Panel isOpen={true} onClose={vi.fn()}>
          <div>Content</div>
        </Panel>
      );
      const panel = container.querySelector('aside');
      expect(panel).toHaveClass('translate-x-0');
    });

    it('should be hidden when isOpen is false', () => {
      const { container } = render(
        <Panel isOpen={false} onClose={vi.fn()}>
          <div>Content</div>
        </Panel>
      );
      const panel = container.querySelector('aside');
      expect(panel).toHaveClass('translate-x-full');
    });

    it('should render close button', () => {
      render(
        <Panel isOpen={true} onClose={vi.fn()}>
          <div>Content</div>
        </Panel>
      );
      expect(screen.getByLabelText('Close panel')).toBeInTheDocument();
    });

    it('should call onClose when close button is clicked', () => {
      const handleClose = vi.fn();
      render(
        <Panel isOpen={true} onClose={handleClose}>
          <div>Content</div>
        </Panel>
      );

      const closeButton = screen.getByLabelText('Close panel');
      closeButton.click();

      expect(handleClose).toHaveBeenCalled();
    });

    it('should render backdrop when open', () => {
      const { container } = render(
        <Panel isOpen={true} onClose={vi.fn()}>
          <div>Content</div>
        </Panel>
      );
      const backdrop = container.querySelector('.bg-black\\/50');
      expect(backdrop).toBeInTheDocument();
    });

    it('should call onClose when backdrop is clicked', () => {
      const handleClose = vi.fn();
      const { container } = render(
        <Panel isOpen={true} onClose={handleClose}>
          <div>Content</div>
        </Panel>
      );

      const backdrop = container.querySelector('.bg-black\\/50');
      backdrop?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(handleClose).toHaveBeenCalled();
    });

    it('should not render backdrop when closed', () => {
      const { container } = render(
        <Panel isOpen={false} onClose={vi.fn()}>
          <div>Content</div>
        </Panel>
      );
      const backdrop = container.querySelector('.bg-black\\/50');
      expect(backdrop).not.toBeInTheDocument();
    });
  });

  describe('Collapsible Behavior', () => {
    it('should not render collapse button by default', () => {
      render(
        <Panel isOpen={true} onClose={vi.fn()}>
          <div>Content</div>
        </Panel>
      );
      expect(screen.queryByLabelText('Collapse panel')).not.toBeInTheDocument();
    });

    it('should render collapse button when collapsible', () => {
      render(
        <Panel isOpen={true} onClose={vi.fn()} collapsible onToggleCollapse={vi.fn()}>
          <div>Content</div>
        </Panel>
      );
      expect(screen.getByLabelText('Collapse panel')).toBeInTheDocument();
    });

    it('should call onToggleCollapse when collapse button is clicked', () => {
      const handleToggleCollapse = vi.fn();
      render(
        <Panel isOpen={true} onClose={vi.fn()} collapsible onToggleCollapse={handleToggleCollapse}>
          <div>Content</div>
        </Panel>
      );

      const collapseButton = screen.getByLabelText('Collapse panel');
      collapseButton.click();

      expect(handleToggleCollapse).toHaveBeenCalled();
    });

    it('should hide content when collapsed', () => {
      render(
        <Panel
          isOpen={true}
          onClose={vi.fn()}
          collapsible
          isCollapsed={true}
          onToggleCollapse={vi.fn()}
        >
          <div>Content</div>
        </Panel>
      );
      expect(screen.queryByText('Content')).not.toBeInTheDocument();
    });

    it('should show expand button when collapsed', () => {
      render(
        <Panel
          isOpen={true}
          onClose={vi.fn()}
          collapsible
          isCollapsed={true}
          onToggleCollapse={vi.fn()}
        >
          <div>Content</div>
        </Panel>
      );
      expect(screen.getByLabelText('Expand panel')).toBeInTheDocument();
    });

    it('should have narrow width when collapsed', () => {
      const { container } = render(
        <Panel
          isOpen={true}
          onClose={vi.fn()}
          collapsible
          isCollapsed={true}
          onToggleCollapse={vi.fn()}
        >
          <div>Content</div>
        </Panel>
      );
      const panel = container.querySelector('aside');
      expect(panel).toHaveClass('w-12');
    });

    it('should not render backdrop when collapsed', () => {
      const { container } = render(
        <Panel
          isOpen={true}
          onClose={vi.fn()}
          collapsible
          isCollapsed={true}
          onToggleCollapse={vi.fn()}
        >
          <div>Content</div>
        </Panel>
      );
      const backdrop = container.querySelector('.bg-black\\/50');
      expect(backdrop).not.toBeInTheDocument();
    });
  });

  describe('Width Options', () => {
    it('should have medium width by default', () => {
      const { container } = render(
        <Panel isOpen={true} onClose={vi.fn()}>
          <div>Content</div>
        </Panel>
      );
      const panel = container.querySelector('aside');
      expect(panel).toHaveClass('w-96');
    });

    it('should have small width when width is sm', () => {
      const { container } = render(
        <Panel isOpen={true} onClose={vi.fn()} width="sm">
          <div>Content</div>
        </Panel>
      );
      const panel = container.querySelector('aside');
      expect(panel).toHaveClass('w-80');
    });

    it('should have large width when width is lg', () => {
      const { container } = render(
        <Panel isOpen={true} onClose={vi.fn()} width="lg">
          <div>Content</div>
        </Panel>
      );
      const panel = container.querySelector('aside');
      expect(panel).toHaveClass('w-[32rem]');
    });
  });

  describe('Styling', () => {
    it('should have dark theme colors', () => {
      const { container } = render(
        <Panel isOpen={true} onClose={vi.fn()}>
          <div>Content</div>
        </Panel>
      );
      const panel = container.querySelector('aside');
      expect(panel).toHaveClass('bg-background-primary');
      expect(panel).toHaveClass('border-border');
    });

    it('should have fixed positioning', () => {
      const { container } = render(
        <Panel isOpen={true} onClose={vi.fn()}>
          <div>Content</div>
        </Panel>
      );
      const panel = container.querySelector('aside');
      expect(panel).toHaveClass('fixed');
      expect(panel).toHaveClass('top-16');
      expect(panel).toHaveClass('right-0');
      expect(panel).toHaveClass('bottom-0');
    });

    it('should have high z-index', () => {
      const { container } = render(
        <Panel isOpen={true} onClose={vi.fn()}>
          <div>Content</div>
        </Panel>
      );
      const panel = container.querySelector('aside');
      expect(panel).toHaveClass('z-50');
    });

    it('should have slide animation', () => {
      const { container } = render(
        <Panel isOpen={true} onClose={vi.fn()}>
          <div>Content</div>
        </Panel>
      );
      const panel = container.querySelector('aside');
      expect(panel).toHaveClass('transition-transform');
      expect(panel).toHaveClass('duration-300');
    });

    it('should truncate long titles', () => {
      render(
        <Panel
          isOpen={true}
          onClose={vi.fn()}
          title="Very Long Panel Title That Should Be Truncated"
        >
          <div>Content</div>
        </Panel>
      );
      const title = screen.getByText('Very Long Panel Title That Should Be Truncated');
      expect(title).toHaveClass('truncate');
    });

    it('should accept additional className', () => {
      const { container } = render(
        <Panel isOpen={true} onClose={vi.fn()} className="custom-class">
          <div>Content</div>
        </Panel>
      );
      expect(container.querySelector('aside')).toHaveClass('custom-class');
    });
  });

  describe('Accessibility', () => {
    it('should have aria-label', () => {
      const { container } = render(
        <Panel isOpen={true} onClose={vi.fn()} title="Test Panel">
          <div>Content</div>
        </Panel>
      );
      const panel = container.querySelector('aside');
      expect(panel).toHaveAttribute('aria-label', 'Test Panel');
    });

    it('should have default aria-label when no title', () => {
      const { container } = render(
        <Panel isOpen={true} onClose={vi.fn()}>
          <div>Content</div>
        </Panel>
      );
      const panel = container.querySelector('aside');
      expect(panel).toHaveAttribute('aria-label', 'Context panel');
    });

    it('should have aria-hidden on backdrop', () => {
      const { container } = render(
        <Panel isOpen={true} onClose={vi.fn()}>
          <div>Content</div>
        </Panel>
      );
      const backdrop = container.querySelector('.bg-black\\/50');
      expect(backdrop).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Complex Scenarios', () => {
    it('should render complete panel with all features', () => {
      render(
        <Panel
          isOpen={true}
          onClose={vi.fn()}
          title="Test Panel"
          footer={<button>Footer Action</button>}
          collapsible
          onToggleCollapse={vi.fn()}
          width="lg"
          className="custom-class"
        >
          <div>Panel content</div>
        </Panel>
      );

      expect(screen.getByText('Test Panel')).toBeInTheDocument();
      expect(screen.getByText('Panel content')).toBeInTheDocument();
      expect(screen.getByText('Footer Action')).toBeInTheDocument();
      expect(screen.getByLabelText('Collapse panel')).toBeInTheDocument();
      expect(screen.getByLabelText('Close panel')).toBeInTheDocument();
    });

    it('should work with minimal props', () => {
      render(
        <Panel isOpen={true} onClose={vi.fn()}>
          <div>Content</div>
        </Panel>
      );
      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('should handle complex content', () => {
      render(
        <Panel isOpen={true} onClose={vi.fn()} title="Complex Panel">
          <div>
            <h3>Section 1</h3>
            <p>Content 1</p>
            <h3>Section 2</h3>
            <p>Content 2</p>
          </div>
        </Panel>
      );

      expect(screen.getByText('Section 1')).toBeInTheDocument();
      expect(screen.getByText('Content 1')).toBeInTheDocument();
      expect(screen.getByText('Section 2')).toBeInTheDocument();
      expect(screen.getByText('Content 2')).toBeInTheDocument();
    });

    it('should handle multiple footer actions', () => {
      render(
        <Panel
          isOpen={true}
          onClose={vi.fn()}
          footer={
            <>
              <button>Cancel</button>
              <button>Save</button>
            </>
          }
        >
          <div>Content</div>
        </Panel>
      );

      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Save')).toBeInTheDocument();
    });
  });
});
