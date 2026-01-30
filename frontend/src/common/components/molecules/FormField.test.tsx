import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FormField } from './FormField';

describe('FormField', () => {
  describe('Rendering', () => {
    it('should render the form field', () => {
      render(<FormField label="Email" type="email" />);
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
    });

    it('should render label', () => {
      render(<FormField label="Username" type="text" />);
      expect(screen.getByText('Username')).toBeInTheDocument();
    });

    it('should render input', () => {
      render(<FormField label="Email" type="email" />);
      const input = screen.getByLabelText('Email');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('type', 'email');
    });
  });

  describe('Required Field', () => {
    it('should show required indicator when required is true', () => {
      render(<FormField label="Email" type="email" required />);
      expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('should not show required indicator by default', () => {
      render(<FormField label="Email" type="email" />);
      expect(screen.queryByText('*')).not.toBeInTheDocument();
    });

    it('should have aria-required when required', () => {
      render(<FormField label="Email" type="email" required />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-required', 'true');
    });
  });

  describe('Helper Text', () => {
    it('should display helper text', () => {
      render(
        <FormField label="Password" type="password" helperText="Must be at least 8 characters" />
      );
      expect(screen.getByText('Must be at least 8 characters')).toBeInTheDocument();
    });

    it('should not display helper text when not provided', () => {
      const { container } = render(<FormField label="Email" type="email" />);
      const helperText = container.querySelector('.text-text-tertiary');
      expect(helperText).not.toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should display error message', () => {
      render(<FormField label="Email" type="email" error="Email is required" />);
      expect(screen.getByText('Email is required')).toBeInTheDocument();
    });

    it('should apply error variant to input', () => {
      const { container } = render(
        <FormField label="Email" type="email" error="Email is required" />
      );
      const input = container.querySelector('input');
      expect(input).toHaveClass('border-error-500');
    });

    it('should have aria-invalid when error exists', () => {
      render(<FormField label="Email" type="email" error="Email is required" />);
      const input = screen.getByLabelText('Email');
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it('should hide helper text when error is shown', () => {
      render(
        <FormField
          label="Email"
          type="email"
          helperText="Enter your email address"
          error="Email is required"
        />
      );
      expect(screen.getByText('Email is required')).toBeInTheDocument();
      expect(screen.queryByText('Enter your email address')).not.toBeInTheDocument();
    });
  });

  describe('Input Types', () => {
    it('should support text input', () => {
      render(<FormField label="Name" type="text" />);
      const input = screen.getByLabelText('Name');
      expect(input).toHaveAttribute('type', 'text');
    });

    it('should support email input', () => {
      render(<FormField label="Email" type="email" />);
      const input = screen.getByLabelText('Email');
      expect(input).toHaveAttribute('type', 'email');
    });

    it('should support password input', () => {
      render(<FormField label="Password" type="password" />);
      const input = screen.getByLabelText('Password');
      expect(input).toHaveAttribute('type', 'password');
    });

    it('should support number input', () => {
      render(<FormField label="Age" type="number" />);
      const input = screen.getByLabelText('Age');
      expect(input).toHaveAttribute('type', 'number');
    });

    it('should support search input', () => {
      render(<FormField label="Search" type="search" />);
      const input = screen.getByLabelText('Search');
      expect(input).toHaveAttribute('type', 'search');
    });
  });

  describe('Sizes', () => {
    it('should support sm size', () => {
      const { container } = render(<FormField label="Email" type="email" size="sm" />);
      const input = container.querySelector('input');
      expect(input).toHaveClass('min-h-11');
    });

    it('should support md size', () => {
      const { container } = render(<FormField label="Email" type="email" size="md" />);
      const input = container.querySelector('input');
      expect(input).toHaveClass('min-h-11');
    });

    it('should support lg size', () => {
      const { container } = render(<FormField label="Email" type="email" size="lg" />);
      const input = container.querySelector('input');
      expect(input).toHaveClass('min-h-14');
    });
  });

  describe('Accessibility', () => {
    it('should associate label with input', () => {
      render(<FormField label="Email" type="email" />);
      const input = screen.getByLabelText('Email');
      expect(input).toBeInTheDocument();
    });

    it('should have unique ID', () => {
      const { container } = render(
        <div>
          <FormField label="Email" type="email" />
          <FormField label="Password" type="password" />
        </div>
      );
      const inputs = container.querySelectorAll('input');
      const ids = Array.from(inputs).map((input) => input.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('should accept custom ID', () => {
      render(<FormField label="Email" type="email" id="custom-email" />);
      const input = screen.getByLabelText('Email');
      expect(input).toHaveAttribute('id', 'custom-email');
    });

    it('should have aria-describedby for helper text', () => {
      render(<FormField label="Email" type="email" helperText="Enter your email" />);
      const input = screen.getByLabelText('Email');
      expect(input).toHaveAttribute('aria-describedby');
    });

    it('should have aria-describedby for error', () => {
      render(<FormField label="Email" type="email" error="Email is required" />);
      const input = screen.getByLabelText('Email');
      expect(input).toHaveAttribute('aria-describedby');
    });
  });

  describe('Custom Props', () => {
    it('should accept placeholder', () => {
      render(<FormField label="Email" type="email" placeholder="Enter your email" />);
      const input = screen.getByLabelText('Email');
      expect(input).toHaveAttribute('placeholder', 'Enter your email');
    });

    it('should accept disabled prop', () => {
      render(<FormField label="Email" type="email" disabled />);
      const input = screen.getByLabelText('Email');
      expect(input).toBeDisabled();
    });

    it('should accept value prop', () => {
      render(<FormField label="Email" type="email" value="test@example.com" readOnly />);
      const input = screen.getByLabelText('Email') as HTMLInputElement;
      expect(input.value).toBe('test@example.com');
    });

    it('should accept containerClassName', () => {
      const { container } = render(
        <FormField label="Email" type="email" containerClassName="custom-container" />
      );
      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('custom-container');
    });
  });

  describe('Integration', () => {
    it('should work in a form with multiple fields', () => {
      render(
        <form>
          <FormField label="Name" type="text" required />
          <FormField label="Email" type="email" required />
          <FormField label="Password" type="password" required />
        </form>
      );

      const inputs = screen.getAllByRole('textbox');
      expect(inputs).toHaveLength(2); // text and email are textboxes

      const passwordInput = screen.getByLabelText(/Password/);
      expect(passwordInput).toBeInTheDocument();
    });

    it('should maintain state independently', () => {
      const { rerender } = render(
        <div>
          <FormField label="Field 1" type="text" error="Error 1" />
          <FormField label="Field 2" type="text" />
        </div>
      );

      expect(screen.getByText('Error 1')).toBeInTheDocument();
      expect(screen.queryByText('Error 2')).not.toBeInTheDocument();

      rerender(
        <div>
          <FormField label="Field 1" type="text" />
          <FormField label="Field 2" type="text" error="Error 2" />
        </div>
      );

      expect(screen.queryByText('Error 1')).not.toBeInTheDocument();
      expect(screen.getByText('Error 2')).toBeInTheDocument();
    });
  });
});
