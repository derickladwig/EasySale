import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Grid } from './Grid';

describe('Grid Component', () => {
  describe('Basic Rendering', () => {
    it('should render children correctly', () => {
      render(
        <Grid data-testid="test-grid">
          <div>Item 1</div>
          <div>Item 2</div>
          <div>Item 3</div>
        </Grid>
      );
      
      const grid = screen.getByTestId('test-grid');
      expect(grid).toBeInTheDocument();
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
      expect(screen.getByText('Item 3')).toBeInTheDocument();
    });
    
    it('should apply grid display class', () => {
      render(
        <Grid data-testid="test-grid">
          <div>Item</div>
        </Grid>
      );
      
      const grid = screen.getByTestId('test-grid');
      expect(grid).toHaveClass('grid');
    });
  });
  
  describe('Responsive Column Counts (Requirement 5.1)', () => {
    it('should apply default 3-column responsive grid', () => {
      render(
        <Grid data-testid="test-grid">
          <div>Item</div>
        </Grid>
      );
      
      const grid = screen.getByTestId('test-grid');
      // Default is 3 columns: 1 on mobile, 2 on tablet, 3 on desktop
      expect(grid).toHaveClass('grid-cols-responsive');
    });
    
    it('should apply 1-column grid', () => {
      render(
        <Grid columns={1} data-testid="test-grid">
          <div>Item</div>
        </Grid>
      );
      
      const grid = screen.getByTestId('test-grid');
      expect(grid).toHaveClass('grid-cols-1');
    });
    
    it('should apply 2-column responsive grid', () => {
      render(
        <Grid columns={2} data-testid="test-grid">
          <div>Item</div>
        </Grid>
      );
      
      const grid = screen.getByTestId('test-grid');
      // 2 columns: 1 on mobile, 2 on tablet+
      expect(grid).toHaveClass('grid-cols-responsive-2');
    });
    
    it('should apply 4-column responsive grid', () => {
      render(
        <Grid columns={4} data-testid="test-grid">
          <div>Item</div>
        </Grid>
      );
      
      const grid = screen.getByTestId('test-grid');
      // 4 columns: 1 on mobile, 2 on tablet, 4 on desktop
      expect(grid).toHaveClass('grid-cols-responsive-4');
    });
    
    it('should apply 6-column responsive grid', () => {
      render(
        <Grid columns={6} data-testid="test-grid">
          <div>Item</div>
        </Grid>
      );
      
      const grid = screen.getByTestId('test-grid');
      // 6 columns: 2 on mobile, 3 on tablet, 6 on desktop
      expect(grid).toHaveClass('grid-cols-responsive-6');
    });
  });
  
  describe('Consistent Gaps (Requirement 5.2)', () => {
    it('should apply responsive gap by default (16px mobile, 24px desktop)', () => {
      render(
        <Grid data-testid="test-grid">
          <div>Item</div>
        </Grid>
      );
      
      const grid = screen.getByTestId('test-grid');
      expect(grid).toHaveClass('gap-responsive');
    });
    
    it('should apply small gap (8px)', () => {
      render(
        <Grid gap="sm" data-testid="test-grid">
          <div>Item</div>
        </Grid>
      );
      
      const grid = screen.getByTestId('test-grid');
      expect(grid).toHaveClass('gap-2');
    });
    
    it('should apply medium gap (16px)', () => {
      render(
        <Grid gap="md" data-testid="test-grid">
          <div>Item</div>
        </Grid>
      );
      
      const grid = screen.getByTestId('test-grid');
      expect(grid).toHaveClass('gap-4');
    });
    
    it('should apply large gap (24px)', () => {
      render(
        <Grid gap="lg" data-testid="test-grid">
          <div>Item</div>
        </Grid>
      );
      
      const grid = screen.getByTestId('test-grid');
      expect(grid).toHaveClass('gap-6');
    });
  });
  
  describe('Auto-fit for Flexible Layouts (Requirement 5.4)', () => {
    it('should apply auto-fit with default medium min-width (250px)', () => {
      render(
        <Grid autoFit data-testid="test-grid">
          <div>Item</div>
        </Grid>
      );
      
      const grid = screen.getByTestId('test-grid');
      expect(grid).toHaveClass('grid-auto-fit');
    });
    
    it('should apply auto-fit with small min-width (200px)', () => {
      render(
        <Grid autoFit minColumnWidth="sm" data-testid="test-grid">
          <div>Item</div>
        </Grid>
      );
      
      const grid = screen.getByTestId('test-grid');
      expect(grid).toHaveClass('grid-auto-fit-sm');
    });
    
    it('should apply auto-fit with large min-width (350px)', () => {
      render(
        <Grid autoFit minColumnWidth="lg" data-testid="test-grid">
          <div>Item</div>
        </Grid>
      );
      
      const grid = screen.getByTestId('test-grid');
      expect(grid).toHaveClass('grid-auto-fit-lg');
    });
    
    it('should prioritize auto-fit over columns prop', () => {
      render(
        <Grid autoFit columns={4} data-testid="test-grid">
          <div>Item</div>
        </Grid>
      );
      
      const grid = screen.getByTestId('test-grid');
      // Auto-fit should take precedence
      expect(grid).toHaveClass('grid-auto-fit');
      expect(grid).not.toHaveClass('grid-cols-responsive-4');
    });
  });
  
  describe('Custom Styling', () => {
    it('should apply custom className', () => {
      render(
        <Grid className="custom-class" data-testid="test-grid">
          <div>Item</div>
        </Grid>
      );
      
      const grid = screen.getByTestId('test-grid');
      expect(grid).toHaveClass('custom-class');
      // Should still have base grid classes
      expect(grid).toHaveClass('grid');
      expect(grid).toHaveClass('grid-cols-responsive');
    });
    
    it('should merge multiple classes correctly', () => {
      render(
        <Grid className="bg-background-secondary p-4" columns={2} gap="lg" data-testid="test-grid">
          <div>Item</div>
        </Grid>
      );
      
      const grid = screen.getByTestId('test-grid');
      expect(grid).toHaveClass('grid');
      expect(grid).toHaveClass('grid-cols-responsive-2');
      expect(grid).toHaveClass('gap-6');
      expect(grid).toHaveClass('bg-background-secondary');
      expect(grid).toHaveClass('p-4');
    });
  });
  
  describe('Accessibility', () => {
    it('should support data-testid attribute', () => {
      render(
        <Grid data-testid="custom-test-id">
          <div>Item</div>
        </Grid>
      );
      
      expect(screen.getByTestId('custom-test-id')).toBeInTheDocument();
    });
  });
  
  describe('Edge Cases', () => {
    it('should handle empty children', () => {
      render(<Grid data-testid="test-grid">{null}</Grid>);
      
      const grid = screen.getByTestId('test-grid');
      expect(grid).toBeInTheDocument();
      expect(grid).toHaveClass('grid');
    });
    
    it('should handle single child', () => {
      render(
        <Grid data-testid="test-grid">
          <div>Single Item</div>
        </Grid>
      );
      
      const grid = screen.getByTestId('test-grid');
      expect(grid).toBeInTheDocument();
      expect(screen.getByText('Single Item')).toBeInTheDocument();
    });
    
    it('should handle many children', () => {
      const items = Array.from({ length: 20 }, (_, i) => (
        <div key={i}>Item {i + 1}</div>
      ));
      
      render(
        <Grid data-testid="test-grid">
          {items}
        </Grid>
      );
      
      const grid = screen.getByTestId('test-grid');
      expect(grid).toBeInTheDocument();
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 20')).toBeInTheDocument();
    });
  });
  
  describe('Integration with Design System', () => {
    it('should work with Card components', () => {
      render(
        <Grid data-testid="test-grid">
          <div className="bg-background-secondary rounded-lg p-4">Card 1</div>
          <div className="bg-background-secondary rounded-lg p-4">Card 2</div>
          <div className="bg-background-secondary rounded-lg p-4">Card 3</div>
        </Grid>
      );
      
      const grid = screen.getByTestId('test-grid');
      expect(grid).toBeInTheDocument();
      expect(screen.getByText('Card 1')).toBeInTheDocument();
      expect(screen.getByText('Card 2')).toBeInTheDocument();
      expect(screen.getByText('Card 3')).toBeInTheDocument();
    });
    
    it('should maintain responsive behavior with complex children', () => {
      render(
        <Grid columns={4} gap="responsive" data-testid="test-grid">
          <div className="bg-background-secondary p-responsive">
            <h3 className="text-h3 text-text-primary">Title</h3>
            <p className="text-base text-text-secondary">Description</p>
          </div>
        </Grid>
      );
      
      const grid = screen.getByTestId('test-grid');
      expect(grid).toHaveClass('grid-cols-responsive-4');
      expect(grid).toHaveClass('gap-responsive');
    });
  });
  
  describe('Minimum and Maximum Column Widths (Requirement 5.5)', () => {
    it('should apply inline style for max column width with auto-fit', () => {
      render(
        <Grid autoFit minColumnWidth="md" maxColumnWidth="400px" data-testid="test-grid">
          <div>Item</div>
        </Grid>
      );
      
      const grid = screen.getByTestId('test-grid');
      expect(grid).toHaveStyle({
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, min(400px, 1fr)))',
      });
    });
    
    it('should apply inline style for max column width with small min-width', () => {
      render(
        <Grid autoFit minColumnWidth="sm" maxColumnWidth="300px" data-testid="test-grid">
          <div>Item</div>
        </Grid>
      );
      
      const grid = screen.getByTestId('test-grid');
      expect(grid).toHaveStyle({
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, min(300px, 1fr)))',
      });
    });
    
    it('should apply inline style for max column width with large min-width', () => {
      render(
        <Grid autoFit minColumnWidth="lg" maxColumnWidth="500px" data-testid="test-grid">
          <div>Item</div>
        </Grid>
      );
      
      const grid = screen.getByTestId('test-grid');
      expect(grid).toHaveStyle({
        gridTemplateColumns: 'repeat(auto-fit, minmax(350px, min(500px, 1fr)))',
      });
    });
    
    it('should not apply inline style when maxColumnWidth is not provided', () => {
      render(
        <Grid autoFit minColumnWidth="md" data-testid="test-grid">
          <div>Item</div>
        </Grid>
      );
      
      const grid = screen.getByTestId('test-grid');
      expect(grid).toHaveClass('grid-auto-fit');
      expect(grid).not.toHaveAttribute('style');
    });
    
    it('should not apply inline style when autoFit is false', () => {
      render(
        <Grid columns={3} maxColumnWidth="400px" data-testid="test-grid">
          <div>Item</div>
        </Grid>
      );
      
      const grid = screen.getByTestId('test-grid');
      expect(grid).toHaveClass('grid-cols-responsive');
      expect(grid).not.toHaveAttribute('style');
    });
  });
  
  describe('Aspect Ratio for Consistent Heights (Requirement 5.7)', () => {
    it('should wrap children in aspect-ratio containers for square ratio', () => {
      render(
        <Grid aspectRatio="square" data-testid="test-grid">
          <div>Item 1</div>
          <div>Item 2</div>
        </Grid>
      );
      
      const grid = screen.getByTestId('test-grid');
      const wrappers = grid.querySelectorAll('.aspect-square');
      expect(wrappers).toHaveLength(2);
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
    });
    
    it('should wrap children in aspect-ratio containers for video ratio', () => {
      render(
        <Grid aspectRatio="video" data-testid="test-grid">
          <div>Item 1</div>
          <div>Item 2</div>
        </Grid>
      );
      
      const grid = screen.getByTestId('test-grid');
      const wrappers = grid.querySelectorAll('.aspect-video');
      expect(wrappers).toHaveLength(2);
    });
    
    it('should wrap children in aspect-ratio containers for portrait ratio', () => {
      render(
        <Grid aspectRatio="portrait" data-testid="test-grid">
          <div>Item 1</div>
        </Grid>
      );
      
      const grid = screen.getByTestId('test-grid');
      const wrappers = grid.querySelectorAll('.aspect-portrait');
      expect(wrappers).toHaveLength(1);
    });
    
    it('should wrap children in aspect-ratio containers for photo ratio', () => {
      render(
        <Grid aspectRatio="photo" data-testid="test-grid">
          <div>Item 1</div>
        </Grid>
      );
      
      const grid = screen.getByTestId('test-grid');
      const wrappers = grid.querySelectorAll('.aspect-photo');
      expect(wrappers).toHaveLength(1);
    });
    
    it('should not wrap children when aspectRatio is auto', () => {
      render(
        <Grid aspectRatio="auto" data-testid="test-grid">
          <div>Item 1</div>
          <div>Item 2</div>
        </Grid>
      );
      
      const grid = screen.getByTestId('test-grid');
      // Children should be direct children, not wrapped
      expect(grid.children).toHaveLength(2);
      expect(grid.querySelector('.aspect-square')).not.toBeInTheDocument();
    });
    
    it('should not wrap children when aspectRatio is not provided', () => {
      render(
        <Grid data-testid="test-grid">
          <div>Item 1</div>
          <div>Item 2</div>
        </Grid>
      );
      
      const grid = screen.getByTestId('test-grid');
      // Children should be direct children, not wrapped
      expect(grid.children).toHaveLength(2);
      expect(grid.querySelector('.aspect-square')).not.toBeInTheDocument();
    });
    
    it('should work with aspect ratio and auto-fit together', () => {
      render(
        <Grid autoFit minColumnWidth="md" aspectRatio="square" data-testid="test-grid">
          <div>Item 1</div>
          <div>Item 2</div>
        </Grid>
      );
      
      const grid = screen.getByTestId('test-grid');
      expect(grid).toHaveClass('grid-auto-fit');
      const wrappers = grid.querySelectorAll('.aspect-square');
      expect(wrappers).toHaveLength(2);
    });
    
    it('should work with aspect ratio and max column width together', () => {
      render(
        <Grid 
          autoFit 
          minColumnWidth="md" 
          maxColumnWidth="400px" 
          aspectRatio="video" 
          data-testid="test-grid"
        >
          <div>Item 1</div>
          <div>Item 2</div>
        </Grid>
      );
      
      const grid = screen.getByTestId('test-grid');
      expect(grid).toHaveStyle({
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, min(400px, 1fr)))',
      });
      const wrappers = grid.querySelectorAll('.aspect-video');
      expect(wrappers).toHaveLength(2);
    });
  });
  
  describe('Vertical Stacking on Narrow Screens (Requirement 5.6)', () => {
    it('should use responsive column classes that stack on mobile', () => {
      render(
        <Grid columns={3} data-testid="test-grid">
          <div>Item 1</div>
          <div>Item 2</div>
          <div>Item 3</div>
        </Grid>
      );
      
      const grid = screen.getByTestId('test-grid');
      // grid-cols-responsive class stacks to 1 column on mobile (<640px)
      expect(grid).toHaveClass('grid-cols-responsive');
    });
    
    it('should stack 2-column grid on mobile', () => {
      render(
        <Grid columns={2} data-testid="test-grid">
          <div>Item 1</div>
          <div>Item 2</div>
        </Grid>
      );
      
      const grid = screen.getByTestId('test-grid');
      // grid-cols-responsive-2 class stacks to 1 column on mobile (<640px)
      expect(grid).toHaveClass('grid-cols-responsive-2');
    });
    
    it('should stack 4-column grid on mobile', () => {
      render(
        <Grid columns={4} data-testid="test-grid">
          <div>Item 1</div>
          <div>Item 2</div>
          <div>Item 3</div>
          <div>Item 4</div>
        </Grid>
      );
      
      const grid = screen.getByTestId('test-grid');
      // grid-cols-responsive-4 class stacks to 1 column on mobile (<640px)
      expect(grid).toHaveClass('grid-cols-responsive-4');
    });
    
    it('should handle 6-column grid stacking (2 on mobile)', () => {
      render(
        <Grid columns={6} data-testid="test-grid">
          <div>Item 1</div>
          <div>Item 2</div>
          <div>Item 3</div>
          <div>Item 4</div>
          <div>Item 5</div>
          <div>Item 6</div>
        </Grid>
      );
      
      const grid = screen.getByTestId('test-grid');
      // grid-cols-responsive-6 class stacks to 2 columns on mobile (<640px)
      expect(grid).toHaveClass('grid-cols-responsive-6');
    });
  });
  
  describe('Prevent Horizontal Scrolling (Requirement 5.3)', () => {
    it('should apply overflow-x-hidden to prevent horizontal scrolling', () => {
      render(
        <Grid data-testid="test-grid">
          <div>Item 1</div>
          <div>Item 2</div>
        </Grid>
      );
      
      const grid = screen.getByTestId('test-grid');
      expect(grid).toHaveClass('overflow-x-hidden');
    });
    
    it('should apply w-full to ensure grid takes full width', () => {
      render(
        <Grid data-testid="test-grid">
          <div>Item 1</div>
          <div>Item 2</div>
        </Grid>
      );
      
      const grid = screen.getByTestId('test-grid');
      expect(grid).toHaveClass('w-full');
    });
    
    it('should prevent horizontal scrolling with auto-fit', () => {
      render(
        <Grid autoFit minColumnWidth="md" data-testid="test-grid">
          <div>Item 1</div>
          <div>Item 2</div>
        </Grid>
      );
      
      const grid = screen.getByTestId('test-grid');
      expect(grid).toHaveClass('overflow-x-hidden');
      expect(grid).toHaveClass('w-full');
    });
    
    it('should prevent horizontal scrolling with max column width', () => {
      render(
        <Grid autoFit minColumnWidth="md" maxColumnWidth="400px" data-testid="test-grid">
          <div>Item 1</div>
          <div>Item 2</div>
        </Grid>
      );
      
      const grid = screen.getByTestId('test-grid');
      expect(grid).toHaveClass('overflow-x-hidden');
      expect(grid).toHaveClass('w-full');
    });
  });
  
  describe('Center Content on Ultrawide Displays (Requirement 5.9)', () => {
    it('should not center by default', () => {
      render(
        <Grid data-testid="test-grid">
          <div>Item 1</div>
          <div>Item 2</div>
        </Grid>
      );
      
      const grid = screen.getByTestId('test-grid');
      expect(grid).not.toHaveClass('mx-auto');
      expect(grid).not.toHaveClass('max-w-screen-2xl');
    });
    
    it('should center content when centerOnUltrawide is true', () => {
      render(
        <Grid centerOnUltrawide data-testid="test-grid">
          <div>Item 1</div>
          <div>Item 2</div>
        </Grid>
      );
      
      const grid = screen.getByTestId('test-grid');
      expect(grid).toHaveClass('mx-auto');
      expect(grid).toHaveClass('max-w-screen-2xl'); // Default max-width
    });
    
    it('should apply custom max-width preset (screen-xl)', () => {
      render(
        <Grid centerOnUltrawide maxWidth="screen-xl" data-testid="test-grid">
          <div>Item 1</div>
          <div>Item 2</div>
        </Grid>
      );
      
      const grid = screen.getByTestId('test-grid');
      expect(grid).toHaveClass('mx-auto');
      expect(grid).toHaveClass('max-w-screen-xl');
    });
    
    it('should apply custom max-width preset (screen-lg)', () => {
      render(
        <Grid centerOnUltrawide maxWidth="screen-lg" data-testid="test-grid">
          <div>Item 1</div>
          <div>Item 2</div>
        </Grid>
      );
      
      const grid = screen.getByTestId('test-grid');
      expect(grid).toHaveClass('mx-auto');
      expect(grid).toHaveClass('max-w-screen-lg');
    });
    
    it('should apply custom max-width value via inline style', () => {
      render(
        <Grid centerOnUltrawide maxWidth="1400px" data-testid="test-grid">
          <div>Item 1</div>
          <div>Item 2</div>
        </Grid>
      );
      
      const grid = screen.getByTestId('test-grid');
      expect(grid).toHaveClass('mx-auto');
      expect(grid).toHaveStyle({ maxWidth: '1400px' });
    });
    
    it('should work with auto-fit and ultrawide centering', () => {
      render(
        <Grid autoFit centerOnUltrawide maxWidth="screen-xl" data-testid="test-grid">
          <div>Item 1</div>
          <div>Item 2</div>
        </Grid>
      );
      
      const grid = screen.getByTestId('test-grid');
      expect(grid).toHaveClass('grid-auto-fit');
      expect(grid).toHaveClass('mx-auto');
      expect(grid).toHaveClass('max-w-screen-xl');
    });
    
    it('should work with max column width and ultrawide centering', () => {
      render(
        <Grid 
          autoFit 
          minColumnWidth="md" 
          maxColumnWidth="400px" 
          centerOnUltrawide 
          maxWidth="screen-2xl" 
          data-testid="test-grid"
        >
          <div>Item 1</div>
          <div>Item 2</div>
        </Grid>
      );
      
      const grid = screen.getByTestId('test-grid');
      expect(grid).toHaveClass('mx-auto');
      expect(grid).toHaveClass('max-w-screen-2xl');
      expect(grid).toHaveStyle({
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, min(400px, 1fr)))',
      });
    });
    
    it('should work with aspect ratio and ultrawide centering', () => {
      render(
        <Grid 
          aspectRatio="video" 
          centerOnUltrawide 
          maxWidth="screen-lg" 
          data-testid="test-grid"
        >
          <div>Item 1</div>
          <div>Item 2</div>
        </Grid>
      );
      
      const grid = screen.getByTestId('test-grid');
      expect(grid).toHaveClass('mx-auto');
      expect(grid).toHaveClass('max-w-screen-lg');
      const wrappers = grid.querySelectorAll('.aspect-video');
      expect(wrappers).toHaveLength(2);
    });
  });
});
