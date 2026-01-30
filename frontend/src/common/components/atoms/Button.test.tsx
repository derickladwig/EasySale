import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  describe('Rendering', () => {
    it('renders with children', () => {
      render(<Button>Click me</Button>);
      expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
    });

    it('renders with default variant (primary)', () => {
      render(<Button>Primary</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-primary-500');
    });

    it('renders with default size (md)', () => {
      render(<Button>Medium</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('px-4', 'py-2');
    });
  });

  describe('Variants', () => {
    it('renders primary variant', () => {
      render(<Button variant="primary">Primary</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-primary-500', 'text-white', 'shadow-md');
    });

    it('renders secondary variant', () => {
      render(<Button variant="secondary">Secondary</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-background-tertiary', 'text-text-primary', 'shadow-sm');
    });

    it('renders outline variant', () => {
      render(<Button variant="outline">Outline</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('border-2', 'border-primary-500', 'text-primary-500', 'bg-transparent');
    });

    it('renders ghost variant', () => {
      render(<Button variant="ghost">Ghost</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('text-text-secondary', 'bg-transparent');
    });

    it('renders danger variant', () => {
      render(<Button variant="danger">Danger</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-error-DEFAULT', 'text-white', 'shadow-md');
    });
  });

  describe('Sizes', () => {
    it('renders small size', () => {
      render(<Button size="sm">Small</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('px-3', 'py-1.5', 'text-sm');
    });

    it('renders medium size', () => {
      render(<Button size="md">Medium</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('px-4', 'py-2', 'text-base');
    });

    it('renders large size', () => {
      render(<Button size="lg">Large</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('px-6', 'py-3', 'text-lg');
    });

    it('renders extra large size', () => {
      render(<Button size="xl">Extra Large</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('px-8', 'py-4', 'text-xl');
    });
  });

  describe('States', () => {
    it('renders disabled state', () => {
      render(<Button disabled>Disabled</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveClass('opacity-50', 'cursor-not-allowed');
    });

    it('renders loading state', () => {
      render(<Button loading>Loading</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button.querySelector('svg')).toBeInTheDocument();
    });

    it('hides icons when loading', () => {
      render(
        <Button loading leftIcon={<span data-testid="left-icon">L</span>}>
          Loading
        </Button>
      );
      expect(screen.queryByTestId('left-icon')).not.toBeInTheDocument();
    });

    it('has hover state with brightness increase (Req 7.3)', () => {
      render(<Button variant="primary">Hover Me</Button>);
      const button = screen.getByRole('button');
      // Check that hover:brightness-110 class is present
      expect(button.className).toContain('hover:brightness-110');
    });

    it('has active state with scale transform (Req 7.4)', () => {
      render(<Button variant="primary">Press Me</Button>);
      const button = screen.getByRole('button');
      // Check that active:scale-[0.98] class is present
      expect(button.className).toContain('active:scale-[0.98]');
    });

    it('has focus state with ring (Req 7.10)', () => {
      render(<Button variant="primary">Focus Me</Button>);
      const button = screen.getByRole('button');
      // Check that focus ring classes are present
      expect(button).toHaveClass('focus:outline-none', 'focus:ring-2');
    });

    it('disabled state has 50% opacity (Req 7.8)', () => {
      render(<Button disabled>Disabled</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('opacity-50');
    });

    it('calls haptic feedback on touch devices when clicked (Req 7.9)', () => {
      // Mock navigator.vibrate
      const vibrateMock = vi.fn();
      Object.defineProperty(navigator, 'vibrate', {
        value: vibrateMock,
        writable: true,
        configurable: true,
      });

      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click me</Button>);

      fireEvent.click(screen.getByRole('button'));
      
      // Verify vibrate was called with 10ms
      expect(vibrateMock).toHaveBeenCalledWith(10);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('does not call haptic feedback when disabled', () => {
      // Mock navigator.vibrate
      const vibrateMock = vi.fn();
      Object.defineProperty(navigator, 'vibrate', {
        value: vibrateMock,
        writable: true,
        configurable: true,
      });

      render(<Button disabled>Disabled</Button>);

      fireEvent.click(screen.getByRole('button'));
      
      // Verify vibrate was not called
      expect(vibrateMock).not.toHaveBeenCalled();
    });
  });

  describe('Icons', () => {
    it('renders left icon', () => {
      render(<Button leftIcon={<span data-testid="left-icon">L</span>}>With Icon</Button>);
      expect(screen.getByTestId('left-icon')).toBeInTheDocument();
    });

    it('renders right icon', () => {
      render(<Button rightIcon={<span data-testid="right-icon">R</span>}>With Icon</Button>);
      expect(screen.getByTestId('right-icon')).toBeInTheDocument();
    });

    it('renders both left and right icons', () => {
      render(
        <Button
          leftIcon={<span data-testid="left-icon">L</span>}
          rightIcon={<span data-testid="right-icon">R</span>}
        >
          With Icons
        </Button>
      );
      expect(screen.getByTestId('left-icon')).toBeInTheDocument();
      expect(screen.getByTestId('right-icon')).toBeInTheDocument();
    });

    it('renders icon-only button with left icon (Req 7.6)', () => {
      render(
        <Button leftIcon={<span data-testid="icon">Icon</span>} aria-label="Icon button" />
      );
      const button = screen.getByRole('button', { name: 'Icon button' });
      expect(screen.getByTestId('icon')).toBeInTheDocument();
      expect(button).toHaveClass('aspect-square', 'p-0');
    });

    it('renders icon-only button with right icon (Req 7.6)', () => {
      render(
        <Button rightIcon={<span data-testid="icon">Icon</span>} aria-label="Icon button" />
      );
      const button = screen.getByRole('button', { name: 'Icon button' });
      expect(screen.getByTestId('icon')).toBeInTheDocument();
      expect(button).toHaveClass('aspect-square', 'p-0');
    });

    it('icon-only button has aria-label for accessibility (Req 18.4)', () => {
      render(
        <Button leftIcon={<span data-testid="icon">Icon</span>} aria-label="Settings" />
      );
      const button = screen.getByRole('button', { name: 'Settings' });
      expect(button).toHaveAttribute('aria-label', 'Settings');
    });

    it('left icon has proper spacing with text (Req 7.6)', () => {
      render(<Button leftIcon={<span data-testid="icon">Icon</span>}>Text</Button>);
      const iconWrapper = screen.getByTestId('icon').parentElement;
      expect(iconWrapper).toHaveClass('mr-2', '-ml-1');
    });

    it('right icon has proper spacing with text (Req 7.6)', () => {
      render(<Button rightIcon={<span data-testid="icon">Icon</span>}>Text</Button>);
      const iconWrapper = screen.getByTestId('icon').parentElement;
      expect(iconWrapper).toHaveClass('ml-2', '-mr-1');
    });

    it('icon-only button does not have text spacing classes (Req 7.6)', () => {
      render(
        <Button leftIcon={<span data-testid="icon">Icon</span>} aria-label="Icon only" />
      );
      const iconWrapper = screen.getByTestId('icon').parentElement;
      // Should not have mr-2 or -ml-1 classes when there's no text
      expect(iconWrapper).not.toHaveClass('mr-2');
      expect(iconWrapper).not.toHaveClass('-ml-1');
    });

    it('warns in development when icon-only button lacks aria-label', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      render(<Button leftIcon={<span data-testid="icon">Icon</span>} />);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Icon-only buttons should have an aria-label')
      );

      process.env.NODE_ENV = originalEnv;
      consoleSpy.mockRestore();
    });
  });

  describe('Layout', () => {
    it('renders full width button', () => {
      render(<Button fullWidth>Full Width</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('w-full');
    });

    it('renders inline button by default', () => {
      render(<Button>Inline</Button>);
      const button = screen.getByRole('button');
      expect(button).not.toHaveClass('w-full');
    });
  });

  describe('Interactions', () => {
    it('calls onClick when clicked', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click me</Button>);

      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('does not call onClick when disabled', () => {
      const handleClick = vi.fn();
      render(
        <Button onClick={handleClick} disabled>
          Disabled
        </Button>
      );

      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('does not call onClick when loading', () => {
      const handleClick = vi.fn();
      render(
        <Button onClick={handleClick} loading>
          Loading
        </Button>
      );

      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Custom Props', () => {
    it('applies custom className', () => {
      render(<Button className="custom-class">Custom</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
    });

    it('forwards ref', () => {
      const ref = React.createRef<HTMLButtonElement>();
      render(<Button ref={ref}>With Ref</Button>);
      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });

    it('passes through HTML button attributes', () => {
      render(
        <Button type="submit" name="submit-btn">
          Submit
        </Button>
      );
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'submit');
      expect(button).toHaveAttribute('name', 'submit-btn');
    });
  });
});
