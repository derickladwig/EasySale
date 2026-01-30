import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Stack } from '../Stack';
import { Inline } from '../Inline';
import { Grid } from '../Grid';

describe('Stack', () => {
  it('should render children vertically', () => {
    render(
      <Stack>
        <div>Item 1</div>
        <div>Item 2</div>
        <div>Item 3</div>
      </Stack>
    );
    
    const stack = screen.getByTestId('stack');
    expect(stack).toBeInTheDocument();
    expect(stack).toHaveStyle({ display: 'flex', flexDirection: 'column' });
  });

  it('should apply gap using design tokens', () => {
    render(
      <Stack gap="4">
        <div>Item 1</div>
        <div>Item 2</div>
      </Stack>
    );
    
    const stack = screen.getByTestId('stack');
    expect(stack.className).toContain('gap-4');
  });

  it('should apply alignment', () => {
    render(
      <Stack align="center">
        <div>Item 1</div>
      </Stack>
    );
    
    const stack = screen.getByTestId('stack');
    expect(stack.className).toContain('align-center');
  });

  it('should support all gap sizes', () => {
    const gaps = ['1', '2', '3', '4', '6', '8', '12', '16'] as const;
    
    gaps.forEach(gap => {
      const { unmount } = render(
        <Stack gap={gap}>
          <div>Item</div>
        </Stack>
      );
      
      const stack = screen.getByTestId('stack');
      expect(stack.className).toContain(`gap-${gap}`);
      unmount();
    });
  });
});

describe('Inline', () => {
  it('should render children horizontally', () => {
    render(
      <Inline>
        <div>Item 1</div>
        <div>Item 2</div>
        <div>Item 3</div>
      </Inline>
    );
    
    const inline = screen.getByTestId('inline');
    expect(inline).toBeInTheDocument();
    expect(inline).toHaveStyle({ display: 'flex', flexDirection: 'row' });
  });

  it('should apply gap using design tokens', () => {
    render(
      <Inline gap="4">
        <div>Item 1</div>
        <div>Item 2</div>
      </Inline>
    );
    
    const inline = screen.getByTestId('inline');
    expect(inline.className).toContain('gap-4');
  });

  it('should apply alignment and justification', () => {
    render(
      <Inline align="center" justify="between">
        <div>Item 1</div>
        <div>Item 2</div>
      </Inline>
    );
    
    const inline = screen.getByTestId('inline');
    expect(inline.className).toContain('align-center');
    expect(inline.className).toContain('justify-between');
  });

  it('should support wrapping', () => {
    render(
      <Inline wrap>
        <div>Item 1</div>
        <div>Item 2</div>
      </Inline>
    );
    
    const inline = screen.getByTestId('inline');
    expect(inline.className).toContain('wrap');
  });
});

describe('Grid', () => {
  it('should render children in grid layout', () => {
    render(
      <Grid>
        <div>Item 1</div>
        <div>Item 2</div>
        <div>Item 3</div>
      </Grid>
    );
    
    const grid = screen.getByTestId('grid');
    expect(grid).toBeInTheDocument();
    expect(grid).toHaveStyle({ display: 'grid' });
  });

  it('should apply gap using design tokens', () => {
    render(
      <Grid gap="4">
        <div>Item 1</div>
        <div>Item 2</div>
      </Grid>
    );
    
    const grid = screen.getByTestId('grid');
    expect(grid.className).toContain('gap-4');
  });

  it('should apply column count', () => {
    render(
      <Grid columns="3">
        <div>Item 1</div>
        <div>Item 2</div>
        <div>Item 3</div>
      </Grid>
    );
    
    const grid = screen.getByTestId('grid');
    expect(grid.className).toContain('columns-3');
  });

  it('should support auto-fit columns', () => {
    render(
      <Grid columns="auto-fit" minColumnWidth="200px">
        <div>Item 1</div>
        <div>Item 2</div>
      </Grid>
    );
    
    const grid = screen.getByTestId('grid');
    expect(grid.style.gridTemplateColumns).toContain('auto-fit');
    expect(grid.style.gridTemplateColumns).toContain('200px');
  });

  it('should support auto-fill columns', () => {
    render(
      <Grid columns="auto-fill" minColumnWidth="150px">
        <div>Item 1</div>
        <div>Item 2</div>
      </Grid>
    );
    
    const grid = screen.getByTestId('grid');
    expect(grid.style.gridTemplateColumns).toContain('auto-fill');
    expect(grid.style.gridTemplateColumns).toContain('150px');
  });
});
