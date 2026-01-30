import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from '../Input';

describe('Input', () => {
  it('should render input field', () => {
    render(<Input placeholder="Enter text" />);
    
    const input = screen.getByTestId('input');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('placeholder', 'Enter text');
  });

  it('should render label when provided', () => {
    render(<Input label="Username" />);
    
    expect(screen.getByText('Username')).toBeInTheDocument();
  });

  it('should associate label with input', () => {
    render(<Input label="Email" id="email-input" />);
    
    const label = screen.getByText('Email');
    const input = screen.getByTestId('input');
    
    expect(label).toHaveAttribute('for', 'email-input');
    expect(input).toHaveAttribute('id', 'email-input');
  });

  it('should generate id if not provided', () => {
    render(<Input label="Name" />);
    
    const input = screen.getByTestId('input');
    expect(input).toHaveAttribute('id');
    expect(input.id).toMatch(/^input-/);
  });

  it('should display error message', () => {
    render(<Input error="This field is required" />);
    
    const errorText = screen.getByTestId('input-error');
    expect(errorText).toBeInTheDocument();
    expect(errorText).toHaveTextContent('This field is required');
  });

  it('should apply error styling when error is present', () => {
    render(<Input error="Invalid input" />);
    
    const input = screen.getByTestId('input');
    expect(input.className).toContain('error');
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('should display helper text', () => {
    render(<Input helperText="Enter your full name" />);
    
    const helperText = screen.getByTestId('input-helper');
    expect(helperText).toBeInTheDocument();
    expect(helperText).toHaveTextContent('Enter your full name');
  });

  it('should not display helper text when error is present', () => {
    render(
      <Input 
        helperText="This is helper text" 
        error="This is an error"
      />
    );
    
    expect(screen.getByTestId('input-error')).toBeInTheDocument();
    expect(screen.queryByTestId('input-helper')).not.toBeInTheDocument();
  });

  it('should handle value changes', () => {
    const handleChange = vi.fn();
    render(<Input onChange={handleChange} />);
    
    const input = screen.getByTestId('input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'test value' } });
    
    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(input.value).toBe('test value');
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Input disabled />);
    
    const input = screen.getByTestId('input');
    expect(input).toBeDisabled();
  });

  it('should support custom className', () => {
    render(<Input className="custom-class" />);
    
    const wrapper = screen.getByTestId('input-wrapper');
    expect(wrapper.className).toContain('custom-class');
  });

  it('should pass through native input props', () => {
    render(
      <Input 
        type="email"
        name="email"
        required
        maxLength={50}
      />
    );
    
    const input = screen.getByTestId('input');
    expect(input).toHaveAttribute('type', 'email');
    expect(input).toHaveAttribute('name', 'email');
    expect(input).toHaveAttribute('required');
    expect(input).toHaveAttribute('maxLength', '50');
  });

  it('should have aria-describedby for error', () => {
    render(<Input id="test-input" error="Error message" />);
    
    const input = screen.getByTestId('input');
    expect(input).toHaveAttribute('aria-describedby', 'test-input-error');
  });

  it('should have aria-describedby for helper text', () => {
    render(<Input id="test-input" helperText="Helper message" />);
    
    const input = screen.getByTestId('input');
    expect(input).toHaveAttribute('aria-describedby', 'test-input-helper');
  });

  it('should have role="alert" on error message', () => {
    render(<Input error="Error message" />);
    
    const errorText = screen.getByTestId('input-error');
    expect(errorText).toHaveAttribute('role', 'alert');
  });
});
