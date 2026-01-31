import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Card } from './Card';

describe('Card', () => {
  describe('Rendering', () => {
    it('should render the card', () => {
      const { container } = render(<Card>Content</Card>);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should render children', () => {
      render(<Card>Card content</Card>);
      expect(screen.getByText('Card content')).toBeInTheDocument();
    });

    it('should render header when provided', () => {
      render(<Card header={<h3>Card Title</h3>}>Content</Card>);
      expect(screen.getByText('Card Title')).toBeInTheDocument();
    });

    it('should render footer when provided', () => {
      render(<Card footer={<button>Action</button>}>Content</Card>);
      expect(screen.getByText('Action')).toBeInTheDocument();
    });

    it('should render header, body, and footer together', () => {
      render(
        <Card header={<h3>Title</h3>} footer={<button>Action</button>}>
          Body content
        </Card>
      );
      expect(screen.getByText('Title')).toBeInTheDocument();
      expect(screen.getByText('Body content')).toBeInTheDocument();
      expect(screen.getByText('Action')).toBeInTheDocument();
    });
  });

  describe('Variants', () => {
    it('should apply default variant styles', () => {
      const { container } = render(<Card>Content</Card>);
      const card = container.firstChild;
      expect(card).toHaveClass('bg-surface-base');
      expect(card).toHaveClass('border');
      expect(card).toHaveClass('border-border');
      expect(card).toHaveClass('shadow-md');
    });

    it('should apply elevated variant styles', () => {
      const { container } = render(<Card variant="elevated">Content</Card>);
      const card = container.firstChild;
      expect(card).toHaveClass('bg-surface-base');
      expect(card).toHaveClass('shadow-lg');
    });

    it('should apply outlined variant styles', () => {
      const { container } = render(<Card variant="outlined">Content</Card>);
      const card = container.firstChild;
      expect(card).toHaveClass('bg-transparent');
      expect(card).toHaveClass('border-2');
      expect(card).toHaveClass('border-border');
      expect(card).toHaveClass('shadow-md');
    });
  });

  describe('Interactive State', () => {
    it('should add cursor-pointer when interactive', () => {
      const { container } = render(<Card interactive>Content</Card>);
      expect(container.firstChild).toHaveClass('cursor-pointer');
    });

    it('should add cursor-pointer when onClick is provided', () => {
      const { container } = render(<Card onClick={vi.fn()}>Content</Card>);
      expect(container.firstChild).toHaveClass('cursor-pointer');
    });

    it('should not add cursor-pointer by default', () => {
      const { container } = render(<Card>Content</Card>);
      expect(container.firstChild).not.toHaveClass('cursor-pointer');
    });

    it('should call onClick when clicked', () => {
      const handleClick = vi.fn();
      render(<Card onClick={handleClick}>Content</Card>);

      fireEvent.click(screen.getByText('Content'));
      expect(handleClick).toHaveBeenCalled();
    });

    it('should call onClick on Enter key', () => {
      const handleClick = vi.fn();
      const { container } = render(<Card onClick={handleClick}>Content</Card>);

      const card = container.firstChild as HTMLElement;
      fireEvent.keyDown(card, { key: 'Enter' });
      expect(handleClick).toHaveBeenCalled();
    });

    it('should call onClick on Space key', () => {
      const handleClick = vi.fn();
      const { container } = render(<Card onClick={handleClick}>Content</Card>);

      const card = container.firstChild as HTMLElement;
      fireEvent.keyDown(card, { key: ' ' });
      expect(handleClick).toHaveBeenCalled();
    });

    it('should not call onClick on other keys', () => {
      const handleClick = vi.fn();
      const { container } = render(<Card onClick={handleClick}>Content</Card>);

      const card = container.firstChild as HTMLElement;
      fireEvent.keyDown(card, { key: 'a' });
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Hover Effects', () => {
    it('should add hover effect for interactive default variant', () => {
      const { container } = render(
        <Card variant="default" interactive>
          Content
        </Card>
      );
      expect(container.firstChild).toHaveClass('hover:border-primary-500');
      expect(container.firstChild).toHaveClass('hover:shadow-lg');
    });

    it('should add hover effect for interactive elevated variant', () => {
      const { container } = render(
        <Card variant="elevated" interactive>
          Content
        </Card>
      );
      expect(container.firstChild).toHaveClass('hover:shadow-xl');
      expect(container.firstChild).toHaveClass('hover:scale-[1.02]');
    });

    it('should add hover effect for interactive outlined variant', () => {
      const { container } = render(
        <Card variant="outlined" interactive>
          Content
        </Card>
      );
      expect(container.firstChild).toHaveClass('hover:border-primary-500');
      expect(container.firstChild).toHaveClass('hover:shadow-lg');
    });

    it('should not add hover effects when not interactive', () => {
      const { container } = render(<Card>Content</Card>);
      const classes = (container.firstChild as HTMLElement)?.className || '';
      expect(classes).not.toContain('hover:');
    });
  });

  describe('Accessibility', () => {
    it('should have button role when interactive', () => {
      render(<Card interactive>Content</Card>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should have button role when onClick is provided', () => {
      render(<Card onClick={vi.fn()}>Content</Card>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should not have button role when not interactive', () => {
      render(<Card>Content</Card>);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('should be keyboard accessible when interactive', () => {
      const { container } = render(<Card interactive>Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveAttribute('tabIndex', '0');
    });

    it('should not be keyboard accessible when not interactive', () => {
      const { container } = render(<Card>Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card).not.toHaveAttribute('tabIndex');
    });
  });

  describe('Layout', () => {
    it('should have proper spacing for body', () => {
      const { container } = render(<Card>Content</Card>);
      const body = container.querySelector('.px-4.sm\\:px-6.py-4');
      expect(body).toBeInTheDocument();
    });

    it('should have border between header and body', () => {
      const { container } = render(<Card header={<h3>Title</h3>}>Content</Card>);
      const header = container.querySelector('.border-b');
      expect(header).toBeInTheDocument();
    });

    it('should have border between body and footer', () => {
      const { container } = render(<Card footer={<button>Action</button>}>Content</Card>);
      const footer = container.querySelector('.border-t');
      expect(footer).toBeInTheDocument();
    });

    it('should have rounded corners', () => {
      const { container } = render(<Card>Content</Card>);
      expect(container.firstChild).toHaveClass('rounded-lg');
    });

    it('should have overflow hidden', () => {
      const { container } = render(<Card>Content</Card>);
      expect(container.firstChild).toHaveClass('overflow-hidden');
    });
  });

  describe('Custom Props', () => {
    it('should accept additional className', () => {
      const { container } = render(<Card className="custom-class">Content</Card>);
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('should merge custom className with default classes', () => {
      const { container } = render(<Card className="mt-4">Content</Card>);
      expect(container.firstChild).toHaveClass('rounded-lg');
      expect(container.firstChild).toHaveClass('mt-4');
    });
  });

  describe('Complex Content', () => {
    it('should render complex header content', () => {
      render(
        <Card
          header={
            <div>
              <h3>Title</h3>
              <p>Subtitle</p>
            </div>
          }
        >
          Content
        </Card>
      );
      expect(screen.getByText('Title')).toBeInTheDocument();
      expect(screen.getByText('Subtitle')).toBeInTheDocument();
    });

    it('should render complex footer content', () => {
      render(
        <Card
          footer={
            <div>
              <button>Cancel</button>
              <button>Save</button>
            </div>
          }
        >
          Content
        </Card>
      );
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Save')).toBeInTheDocument();
    });

    it('should render nested components', () => {
      render(
        <Card>
          <div>
            <h4>Section 1</h4>
            <p>Paragraph 1</p>
          </div>
          <div>
            <h4>Section 2</h4>
            <p>Paragraph 2</p>
          </div>
        </Card>
      );
      expect(screen.getByText('Section 1')).toBeInTheDocument();
      expect(screen.getByText('Section 2')).toBeInTheDocument();
    });
  });

  describe('Integration', () => {
    it('should work with multiple cards', () => {
      render(
        <div>
          <Card>Card 1</Card>
          <Card>Card 2</Card>
          <Card>Card 3</Card>
        </div>
      );
      expect(screen.getByText('Card 1')).toBeInTheDocument();
      expect(screen.getByText('Card 2')).toBeInTheDocument();
      expect(screen.getByText('Card 3')).toBeInTheDocument();
    });

    it('should work with different variants together', () => {
      const { container } = render(
        <div>
          <Card variant="default">Default</Card>
          <Card variant="elevated">Elevated</Card>
          <Card variant="outlined">Outlined</Card>
        </div>
      );
      const cards = container.querySelectorAll('.rounded-lg');
      expect(cards).toHaveLength(3);
    });
  });

  describe('Actions', () => {
    it('should render actions in header', () => {
      render(
        <Card header={<h3>Title</h3>} actions={<button>Edit</button>}>
          Content
        </Card>
      );
      expect(screen.getByText('Edit')).toBeInTheDocument();
    });

    it('should render actions without header', () => {
      render(<Card actions={<button>Edit</button>}>Content</Card>);
      expect(screen.getByText('Edit')).toBeInTheDocument();
    });

    it('should render multiple action buttons', () => {
      render(
        <Card
          header={<h3>Title</h3>}
          actions={
            <>
              <button>Edit</button>
              <button>Delete</button>
            </>
          }
        >
          Content
        </Card>
      );
      expect(screen.getByText('Edit')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    it('should right-align actions in header', () => {
      const { container } = render(
        <Card header={<h3>Title</h3>} actions={<button>Edit</button>}>
          Content
        </Card>
      );
      const headerContainer = container.querySelector('.flex.items-center.justify-between');
      expect(headerContainer).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should render skeleton when loading', () => {
      const { container } = render(<Card loading>Content</Card>);
      const skeleton = container.querySelector('.animate-pulse');
      expect(skeleton).toBeInTheDocument();
    });

    it('should not render children when loading', () => {
      render(<Card loading>Content</Card>);
      expect(screen.queryByText('Content')).not.toBeInTheDocument();
    });

    it('should render skeleton with header placeholder when header is provided', () => {
      const { container } = render(
        <Card loading header={<h3>Title</h3>}>
          Content
        </Card>
      );
      const skeleton = container.querySelector('.animate-pulse');
      expect(skeleton).toBeInTheDocument();
      // Check for header border
      const headerBorder = container.querySelector('.border-b');
      expect(headerBorder).toBeInTheDocument();
    });

    it('should render skeleton with footer placeholder when footer is provided', () => {
      const { container } = render(
        <Card loading footer={<button>Action</button>}>
          Content
        </Card>
      );
      const skeleton = container.querySelector('.animate-pulse');
      expect(skeleton).toBeInTheDocument();
      // Check for footer border
      const footerBorder = container.querySelector('.border-t');
      expect(footerBorder).toBeInTheDocument();
    });

    it('should render content when not loading', () => {
      render(<Card loading={false}>Content</Card>);
      expect(screen.getByText('Content')).toBeInTheDocument();
    });
  });

  describe('Responsive Padding', () => {
    it('should have responsive padding classes', () => {
      const { container } = render(<Card>Content</Card>);
      const body = container.querySelector('.px-4.sm\\:px-6');
      expect(body).toBeInTheDocument();
    });

    it('should have responsive padding in header', () => {
      const { container } = render(<Card header={<h3>Title</h3>}>Content</Card>);
      const header = container.querySelector('.px-4.sm\\:px-6.py-4');
      expect(header).toBeInTheDocument();
    });

    it('should have responsive padding in footer', () => {
      const { container } = render(<Card footer={<button>Action</button>}>Content</Card>);
      const footer = container.querySelector('.px-4.sm\\:px-6.py-4');
      expect(footer).toBeInTheDocument();
    });
  });
});
