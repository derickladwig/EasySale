import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from './Input';

describe('Input', () => {
  describe('Rendering', () => {
    it('renders with placeholder', () => {
      render(<Input placeholder="Enter text" />);
      expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
    });

    it('renders with label', () => {
      render(<Input label="Email" />);
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
    });

    it('renders with default type (text)', () => {
      render(<Input />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('type', 'text');
    });

    it('renders with default variant (default)', () => {
      render(<Input />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('border-border-DEFAULT');
    });

    it('renders with default size (md)', () => {
      render(<Input />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('px-4', 'py-2.5', 'h-11');
    });
  });

  describe('Types', () => {
    it('renders text input', () => {
      render(<Input type="text" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('type', 'text');
    });

    it('renders email input', () => {
      render(<Input type="email" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('type', 'email');
    });

    it('renders password input', () => {
      render(<Input type="password" />);
      const input = document.querySelector('input[type="password"]');
      expect(input).toBeInTheDocument();
    });

    it('renders number input', () => {
      render(<Input type="number" />);
      const input = screen.getByRole('spinbutton');
      expect(input).toHaveAttribute('type', 'number');
    });

    it('renders search input', () => {
      render(<Input type="search" />);
      const input = screen.getByRole('searchbox');
      expect(input).toHaveAttribute('type', 'search');
    });
  });

  describe('Variants', () => {
    it('renders default variant', () => {
      render(<Input variant="default" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('border-border-DEFAULT');
    });

    it('renders error variant', () => {
      render(<Input variant="error" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('border-error-DEFAULT');
    });

    it('renders success variant', () => {
      render(<Input variant="success" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('border-success-DEFAULT');
    });

    it('uses error variant when error prop provided', () => {
      render(<Input variant="default" error="Error message" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('border-error-DEFAULT');
    });
  });

  describe('Sizes', () => {
    it('renders small size', () => {
      render(<Input size="sm" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('px-3', 'py-2', 'text-sm', 'h-10');
    });

    it('renders medium size', () => {
      render(<Input size="md" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('px-4', 'py-2.5', 'text-base', 'h-11');
    });

    it('renders large size', () => {
      render(<Input size="lg" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('px-6', 'py-3', 'text-lg', 'h-14');
    });
  });

  describe('States', () => {
    it('renders disabled state', () => {
      render(<Input disabled />);
      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
      expect(input).toHaveClass('opacity-50', 'cursor-not-allowed');
    });

    it('renders with value', () => {
      render(<Input value="test value" onChange={() => {}} />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveValue('test value');
    });

    it('renders focus state with blue border and glow', () => {
      render(<Input />);
      const input = screen.getByRole('textbox');
      // Check for focus ring classes
      expect(input).toHaveClass('focus:border-primary-500', 'focus:ring-primary-500/20');
    });

    it('renders error state with red border', () => {
      render(<Input error="Error message" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('border-error-DEFAULT', 'focus:border-error-DEFAULT');
    });

    it('renders error state with shake animation', () => {
      render(<Input error="Error message" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('animate-shake');
    });

    it('renders success state with green border', () => {
      render(<Input variant="success" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('border-success-DEFAULT', 'focus:border-success-DEFAULT');
    });

    it('renders success state with green checkmark icon', () => {
      render(<Input variant="success" value="valid@email.com" onChange={() => {}} />);
      // Check for CheckCircle icon in the DOM
      const container = screen.getByRole('textbox').parentElement;
      const checkIcon = container?.querySelector('.text-success-DEFAULT');
      expect(checkIcon).toBeInTheDocument();
    });

    it('renders error state with alert icon in message', () => {
      render(<Input error="Error message" />);
      const errorMessage = screen.getByText('Error message');
      // Check that the error message paragraph has the correct classes
      const errorParagraph = errorMessage.closest('p');
      expect(errorParagraph).toHaveClass('flex', 'items-center', 'gap-1');
    });

    it('does not show success icon when custom right icon is provided', () => {
      render(
        <Input 
          variant="success" 
          rightIcon={<span data-testid="custom-icon">Custom</span>}
        />
      );
      // Custom icon should be present
      expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
      // Success checkmark should not be present (only one right icon)
      const input = screen.getByRole('textbox');
      const rightIcons = input.parentElement?.querySelectorAll('.absolute.right-3');
      expect(rightIcons?.length).toBe(1);
    });

    it('shows required indicator when required prop is true', () => {
      render(<Input label="Email" required />);
      const asterisk = screen.getByText('*');
      expect(asterisk).toBeInTheDocument();
      expect(asterisk).toHaveClass('text-error-DEFAULT');
    });

    it('disabled label has disabled text color', () => {
      render(<Input label="Disabled Field" disabled />);
      const label = screen.getByText('Disabled Field');
      expect(label).toHaveClass('text-text-disabled');
    });
  });

  describe('Helper Text', () => {
    it('renders helper text', () => {
      render(<Input helperText="This is helper text" />);
      expect(screen.getByText('This is helper text')).toBeInTheDocument();
    });

    it('renders error message', () => {
      render(<Input error="This is an error" />);
      expect(screen.getByText('This is an error')).toBeInTheDocument();
    });

    it('error message takes precedence over helper text', () => {
      render(<Input helperText="Helper" error="Error" />);
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.queryByText('Helper')).not.toBeInTheDocument();
    });

    it('error message has error styling', () => {
      render(<Input error="Error message" />);
      const errorText = screen.getByText('Error message');
      const errorParagraph = errorText.closest('p');
      expect(errorParagraph).toHaveClass('text-error-DEFAULT');
    });

    it('helper text has secondary styling', () => {
      render(<Input helperText="Helper text" />);
      const helperText = screen.getByText('Helper text');
      const helperParagraph = helperText.closest('p');
      expect(helperParagraph).toHaveClass('text-text-secondary');
    });
  });

  describe('Icons', () => {
    it('renders left icon', () => {
      render(<Input leftIcon={<span data-testid="left-icon">L</span>} />);
      expect(screen.getByTestId('left-icon')).toBeInTheDocument();
    });

    it('renders right icon', () => {
      render(<Input rightIcon={<span data-testid="right-icon">R</span>} />);
      expect(screen.getByTestId('right-icon')).toBeInTheDocument();
    });

    it('renders both left and right icons', () => {
      render(
        <Input
          leftIcon={<span data-testid="left-icon">L</span>}
          rightIcon={<span data-testid="right-icon">R</span>}
        />
      );
      expect(screen.getByTestId('left-icon')).toBeInTheDocument();
      expect(screen.getByTestId('right-icon')).toBeInTheDocument();
    });

    it('adds padding for left icon', () => {
      render(<Input leftIcon={<span>L</span>} />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('pl-10');
    });

    it('adds padding for right icon', () => {
      render(<Input rightIcon={<span>R</span>} />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('pr-10');
    });
  });

  describe('Layout', () => {
    it('renders full width input', () => {
      render(<Input fullWidth />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('w-full');
    });

    it('renders inline input by default', () => {
      render(<Input />);
      const input = screen.getByRole('textbox');
      expect(input).not.toHaveClass('w-full');
    });
  });

  describe('Label Association', () => {
    it('associates label with input via htmlFor', () => {
      render(<Input label="Username" id="username-input" />);
      const label = screen.getByText('Username');
      const input = screen.getByLabelText('Username');
      expect(label).toHaveAttribute('for', 'username-input');
      expect(input).toHaveAttribute('id', 'username-input');
    });

    it('generates unique ID when not provided', () => {
      const { container } = render(<Input label="Email" />);
      const input = container.querySelector('input');
      const label = container.querySelector('label');
      expect(input).toHaveAttribute('id');
      expect(label).toHaveAttribute('for', input?.getAttribute('id') || '');
    });
  });

  describe('Interactions', () => {
    it('calls onChange when value changes', () => {
      const handleChange = vi.fn();
      render(<Input onChange={handleChange} />);

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'new value' } });

      expect(handleChange).toHaveBeenCalledTimes(1);
    });

    it('input is disabled when disabled prop is true', () => {
      const handleChange = vi.fn();
      render(<Input onChange={handleChange} disabled />);

      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();

      // Note: React Testing Library still fires onChange on disabled inputs in tests
      // In real browsers, disabled inputs don't fire onChange
      // We verify the input is disabled, which is the important part
    });

    it('calls onFocus when focused', () => {
      const handleFocus = vi.fn();
      render(<Input onFocus={handleFocus} />);

      const input = screen.getByRole('textbox');
      fireEvent.focus(input);

      expect(handleFocus).toHaveBeenCalledTimes(1);
    });

    it('calls onBlur when blurred', () => {
      const handleBlur = vi.fn();
      render(<Input onBlur={handleBlur} />);

      const input = screen.getByRole('textbox');
      fireEvent.blur(input);

      expect(handleBlur).toHaveBeenCalledTimes(1);
    });
  });

  describe('Custom Props', () => {
    it('applies custom className', () => {
      render(<Input className="custom-class" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('custom-class');
    });

    it('forwards ref', () => {
      const ref = React.createRef<HTMLInputElement>();
      render(<Input ref={ref} />);
      expect(ref.current).toBeInstanceOf(HTMLInputElement);
    });

    it('passes through HTML input attributes', () => {
      render(<Input name="email" required maxLength={50} />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('name', 'email');
      expect(input).toHaveAttribute('required');
      expect(input).toHaveAttribute('maxLength', '50');
    });
  });

  describe('Character Count', () => {
    it('does not show character count by default', () => {
      render(<Input value="test" maxLength={100} onChange={() => {}} />);
      expect(screen.queryByText(/\/100/)).not.toBeInTheDocument();
    });

    it('shows character count when showCharacterCount is true', () => {
      render(<Input value="test" maxLength={100} showCharacterCount onChange={() => {}} />);
      expect(screen.getByText('4/100')).toBeInTheDocument();
    });

    it('does not show character count without maxLength', () => {
      render(<Input value="test" showCharacterCount onChange={() => {}} />);
      expect(screen.queryByText(/\//)).not.toBeInTheDocument();
    });

    it('updates character count as value changes', () => {
      const { rerender } = render(
        <Input value="hello" maxLength={50} showCharacterCount onChange={() => {}} />
      );
      expect(screen.getByText('5/50')).toBeInTheDocument();

      rerender(<Input value="hello world" maxLength={50} showCharacterCount onChange={() => {}} />);
      expect(screen.getByText('11/50')).toBeInTheDocument();
    });

    it('shows 0 count for empty value', () => {
      render(<Input value="" maxLength={100} showCharacterCount onChange={() => {}} />);
      expect(screen.getByText('0/100')).toBeInTheDocument();
    });

    it('shows error color when exceeding maxLength', () => {
      const longValue = 'a'.repeat(101);
      render(<Input value={longValue} maxLength={100} showCharacterCount onChange={() => {}} />);
      const countText = screen.getByText('101/100');
      expect(countText).toHaveClass('text-error-DEFAULT');
    });

    it('shows normal color when within maxLength', () => {
      render(<Input value="test" maxLength={100} showCharacterCount onChange={() => {}} />);
      const countText = screen.getByText('4/100');
      expect(countText).toHaveClass('text-text-tertiary');
      expect(countText).not.toHaveClass('text-error-DEFAULT');
    });

    it('shows character count alongside helper text', () => {
      render(
        <Input
          value="test"
          maxLength={100}
          showCharacterCount
          helperText="Enter a description"
          onChange={() => {}}
        />
      );
      expect(screen.getByText('Enter a description')).toBeInTheDocument();
      expect(screen.getByText('4/100')).toBeInTheDocument();
    });

    it('shows character count alongside error message', () => {
      render(
        <Input
          value="test"
          maxLength={100}
          showCharacterCount
          error="This field is required"
          onChange={() => {}}
        />
      );
      expect(screen.getByText('This field is required')).toBeInTheDocument();
      expect(screen.getByText('4/100')).toBeInTheDocument();
    });

    it('character count has whitespace-nowrap class', () => {
      render(<Input value="test" maxLength={100} showCharacterCount onChange={() => {}} />);
      const countText = screen.getByText('4/100');
      expect(countText).toHaveClass('whitespace-nowrap');
    });
  });
});
