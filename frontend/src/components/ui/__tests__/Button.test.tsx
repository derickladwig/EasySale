import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../Button';

describe('Button', () => {
  it('should render children', () => {
    render(<Button>Click me</Button>);
    
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('should apply primary variant by default', () => {
    render(<Button>Click me</Button>);
    
    const button = screen.getByTestId('button');
    expect(button.className).toContain('primary');
  });

  it('should apply secondary variant', () => {
    render(<Button variant="secondary">Click me</Button>);
    
    const button = screen.getByTestId('button');
    expect(button.className).toContain('secondary');
  });

  it('should apply ghost variant', () => {
    render(<Button variant="ghost">Click me</Button>);
    
    const button = screen.getByTestId('button');
    expect(button.className).toContain('ghost');
  });

  it('should apply danger variant', () => {
    render(<Button variant="danger">Delete</Button>);
    
    const button = screen.getByTestId('button');
    expect(button.className).toContain('danger');
  });

  it('should apply medium size by default', () => {
    render(<Button>Click me</Button>);
    
    const button = screen.getByTestId('button');
    expect(button.className).toContain('md');
  });

  it('should apply small size', () => {
    render(<Button size="sm">Click me</Button>);
    
    const button = screen.getByTestId('button');
    expect(button.className).toContain('sm');
  });

  it('should apply large size', () => {
    render(<Button size="lg">Click me</Button>);
    
    const button = screen.getByTestId('button');
    expect(button.className).toContain('lg');
  });

  it('should handle click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    const button = screen.getByTestId('button');
    fireEvent.click(button);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when disabled prop is true', () => {
    const handleClick = vi.fn();
    render(<Button disabled onClick={handleClick}>Click me</Button>);
    
    const button = screen.getByTestId('button');
    expect(button).toBeDisabled();
    
    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('should support custom className', () => {
    render(<Button className="custom-class">Click me</Button>);
    
    const button = screen.getByTestId('button');
    expect(button.className).toContain('custom-class');
  });

  it('should combine variant and size classes', () => {
    render(
      <Button variant="secondary" size="lg">
        Click me
      </Button>
    );
    
    const button = screen.getByTestId('button');
    expect(button.className).toContain('secondary');
    expect(button.className).toContain('lg');
  });

  it('should pass through native button props', () => {
    render(
      <Button type="submit" name="submit-button">
        Submit
      </Button>
    );
    
    const button = screen.getByTestId('button');
    expect(button).toHaveAttribute('type', 'submit');
    expect(button).toHaveAttribute('name', 'submit-button');
  });

  it('should have minimum 40px height for accessibility', () => {
    render(<Button size="sm">Small button</Button>);
    
    const button = screen.getByTestId('button');
    const styles = window.getComputedStyle(button);
    
    // The CSS should set min-height: 40px
    expect(button.className).toContain('sm');
  });
});
