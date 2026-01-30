import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card } from '../Card';

describe('Card', () => {
  it('should render children', () => {
    render(
      <Card>
        <p>Card content</p>
      </Card>
    );
    
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('should apply default variant by default', () => {
    render(<Card>Content</Card>);
    
    const card = screen.getByTestId('card');
    expect(card.className).toContain('default');
  });

  it('should apply outlined variant', () => {
    render(<Card variant="outlined">Content</Card>);
    
    const card = screen.getByTestId('card');
    expect(card.className).toContain('outlined');
  });

  it('should apply elevated variant', () => {
    render(<Card variant="elevated">Content</Card>);
    
    const card = screen.getByTestId('card');
    expect(card.className).toContain('elevated');
  });

  it('should apply medium padding by default', () => {
    render(<Card>Content</Card>);
    
    const card = screen.getByTestId('card');
    expect(card.className).toContain('padding-md');
  });

  it('should apply no padding', () => {
    render(<Card padding="none">Content</Card>);
    
    const card = screen.getByTestId('card');
    expect(card.className).toContain('padding-none');
  });

  it('should apply small padding', () => {
    render(<Card padding="sm">Content</Card>);
    
    const card = screen.getByTestId('card');
    expect(card.className).toContain('padding-sm');
  });

  it('should apply large padding', () => {
    render(<Card padding="lg">Content</Card>);
    
    const card = screen.getByTestId('card');
    expect(card.className).toContain('padding-lg');
  });

  it('should support custom className', () => {
    render(<Card className="custom-class">Content</Card>);
    
    const card = screen.getByTestId('card');
    expect(card.className).toContain('custom-class');
  });

  it('should combine variant and padding classes', () => {
    render(
      <Card variant="elevated" padding="lg">
        Content
      </Card>
    );
    
    const card = screen.getByTestId('card');
    expect(card.className).toContain('elevated');
    expect(card.className).toContain('padding-lg');
  });
});
