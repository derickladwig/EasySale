import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Select } from '../Select';

const mockOptions = [
  { value: 'option1', label: 'Option 1' },
  { value: 'option2', label: 'Option 2' },
  { value: 'option3', label: 'Option 3' },
];

describe('Select', () => {
  it('should render select field with options', () => {
    render(<Select options={mockOptions} />);
    
    const select = screen.getByTestId('select');
    expect(select).toBeInTheDocument();
    
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(3);
    expect(options[0]).toHaveTextContent('Option 1');
    expect(options[1]).toHaveTextContent('Option 2');
    expect(options[2]).toHaveTextContent('Option 3');
  });

  it('should render label when provided', () => {
    render(<Select label="Choose option" options={mockOptions} />);
    
    expect(screen.getByText('Choose option')).toBeInTheDocument();
  });

  it('should associate label with select', () => {
    render(<Select label="Country" id="country-select" options={mockOptions} />);
    
    const label = screen.getByText('Country');
    const select = screen.getByTestId('select');
    
    expect(label).toHaveAttribute('for', 'country-select');
    expect(select).toHaveAttribute('id', 'country-select');
  });

  it('should generate id if not provided', () => {
    render(<Select label="Status" options={mockOptions} />);
    
    const select = screen.getByTestId('select');
    expect(select).toHaveAttribute('id');
    expect(select.id).toMatch(/^select-/);
  });

  it('should render placeholder option', () => {
    render(<Select placeholder="Select an option" options={mockOptions} />);
    
    const placeholderOption = screen.getByText('Select an option');
    expect(placeholderOption).toBeInTheDocument();
    expect(placeholderOption).toHaveAttribute('value', '');
    expect(placeholderOption).toHaveAttribute('disabled');
  });

  it('should display error message', () => {
    render(<Select options={mockOptions} error="This field is required" />);
    
    const errorText = screen.getByTestId('select-error');
    expect(errorText).toBeInTheDocument();
    expect(errorText).toHaveTextContent('This field is required');
  });

  it('should apply error styling when error is present', () => {
    render(<Select options={mockOptions} error="Invalid selection" />);
    
    const select = screen.getByTestId('select');
    expect(select.className).toContain('error');
    expect(select).toHaveAttribute('aria-invalid', 'true');
  });

  it('should display helper text', () => {
    render(<Select options={mockOptions} helperText="Choose your preferred option" />);
    
    const helperText = screen.getByTestId('select-helper');
    expect(helperText).toBeInTheDocument();
    expect(helperText).toHaveTextContent('Choose your preferred option');
  });

  it('should not display helper text when error is present', () => {
    render(
      <Select 
        options={mockOptions}
        helperText="This is helper text" 
        error="This is an error"
      />
    );
    
    expect(screen.getByTestId('select-error')).toBeInTheDocument();
    expect(screen.queryByTestId('select-helper')).not.toBeInTheDocument();
  });

  it('should handle value changes', () => {
    const handleChange = vi.fn();
    render(<Select options={mockOptions} onChange={handleChange} />);
    
    const select = screen.getByTestId('select') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'option2' } });
    
    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(select.value).toBe('option2');
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Select options={mockOptions} disabled />);
    
    const select = screen.getByTestId('select');
    expect(select).toBeDisabled();
  });

  it('should support disabled options', () => {
    const optionsWithDisabled = [
      { value: 'option1', label: 'Option 1' },
      { value: 'option2', label: 'Option 2', disabled: true },
      { value: 'option3', label: 'Option 3' },
    ];
    
    render(<Select options={optionsWithDisabled} />);
    
    const options = screen.getAllByRole('option');
    expect(options[1]).toBeDisabled();
  });

  it('should support custom className', () => {
    render(<Select options={mockOptions} className="custom-class" />);
    
    const wrapper = screen.getByTestId('select-wrapper');
    expect(wrapper.className).toContain('custom-class');
  });

  it('should pass through native select props', () => {
    render(
      <Select 
        options={mockOptions}
        name="status"
        required
      />
    );
    
    const select = screen.getByTestId('select');
    expect(select).toHaveAttribute('name', 'status');
    expect(select).toHaveAttribute('required');
  });

  it('should have aria-describedby for error', () => {
    render(<Select id="test-select" options={mockOptions} error="Error message" />);
    
    const select = screen.getByTestId('select');
    expect(select).toHaveAttribute('aria-describedby', 'test-select-error');
  });

  it('should have aria-describedby for helper text', () => {
    render(<Select id="test-select" options={mockOptions} helperText="Helper message" />);
    
    const select = screen.getByTestId('select');
    expect(select).toHaveAttribute('aria-describedby', 'test-select-helper');
  });

  it('should have role="alert" on error message', () => {
    render(<Select options={mockOptions} error="Error message" />);
    
    const errorText = screen.getByTestId('select-error');
    expect(errorText).toHaveAttribute('role', 'alert');
  });
});
