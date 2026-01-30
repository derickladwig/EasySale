import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchBar } from './SearchBar';

describe('SearchBar', () => {
  describe('Rendering', () => {
    it('should render the search bar', () => {
      render(<SearchBar />);
      const input = screen.getByRole('searchbox');
      expect(input).toBeInTheDocument();
    });

    it('should render with placeholder', () => {
      render(<SearchBar placeholder="Search products..." />);
      expect(screen.getByPlaceholderText('Search products...')).toBeInTheDocument();
    });

    it('should render with default placeholder', () => {
      render(<SearchBar />);
      expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
    });

    it('should render search icon', () => {
      const { container } = render(<SearchBar />);
      const searchIcon = container.querySelector('svg');
      expect(searchIcon).toBeInTheDocument();
    });
  });

  describe('Value Control', () => {
    it('should display the provided value', () => {
      render(<SearchBar value="test query" readOnly />);
      const input = screen.getByRole('searchbox') as HTMLInputElement;
      expect(input.value).toBe('test query');
    });

    it('should call onValueChange when typing', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<SearchBar value="" onValueChange={handleChange} />);

      const input = screen.getByRole('searchbox');
      await user.type(input, 'test');

      expect(handleChange).toHaveBeenCalled();
    });

    it('should update value on change', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<SearchBar value="" onValueChange={handleChange} />);

      const input = screen.getByRole('searchbox');
      await user.type(input, 'a');

      expect(handleChange).toHaveBeenCalledWith('a');
    });
  });

  describe('Clear Button', () => {
    it('should show clear button when value is not empty', () => {
      render(<SearchBar value="test" onValueChange={vi.fn()} />);
      const clearButton = screen.getByLabelText('Clear search');
      expect(clearButton).toBeInTheDocument();
    });

    it('should not show clear button when value is empty', () => {
      render(<SearchBar value="" onValueChange={vi.fn()} />);
      const clearButton = screen.queryByLabelText('Clear search');
      expect(clearButton).not.toBeInTheDocument();
    });

    it('should call onValueChange with empty string when clear is clicked', () => {
      const handleChange = vi.fn();
      render(<SearchBar value="test" onValueChange={handleChange} />);

      const clearButton = screen.getByLabelText('Clear search');
      fireEvent.click(clearButton);

      expect(handleChange).toHaveBeenCalledWith('');
    });

    it('should call onClear when clear button is clicked', () => {
      const handleClear = vi.fn();
      render(<SearchBar value="test" onValueChange={vi.fn()} onClear={handleClear} />);

      const clearButton = screen.getByLabelText('Clear search');
      fireEvent.click(clearButton);

      expect(handleClear).toHaveBeenCalled();
    });

    it('should focus input after clearing', () => {
      render(<SearchBar value="test" onValueChange={vi.fn()} />);

      const input = screen.getByRole('searchbox');
      const clearButton = screen.getByLabelText('Clear search');

      fireEvent.click(clearButton);

      expect(input).toHaveFocus();
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner when loading', () => {
      const { container } = render(<SearchBar value="test" loading />);
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should hide clear button when loading', () => {
      render(<SearchBar value="test" loading onValueChange={vi.fn()} />);
      const clearButton = screen.queryByLabelText('Clear search');
      expect(clearButton).not.toBeInTheDocument();
    });

    it('should not show loading spinner by default', () => {
      const { container } = render(<SearchBar value="test" />);
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).not.toBeInTheDocument();
    });
  });

  describe('Keyboard Shortcut', () => {
    it('should show keyboard hint when enableShortcut is true and value is empty', () => {
      const { container } = render(<SearchBar value="" enableShortcut />);
      const kbd = container.querySelector('kbd');
      expect(kbd).toBeInTheDocument();
    });

    it('should hide keyboard hint when value is not empty', () => {
      const { container } = render(<SearchBar value="test" enableShortcut />);
      const kbd = container.querySelector('kbd');
      expect(kbd).not.toBeInTheDocument();
    });

    it('should not show keyboard hint when enableShortcut is false', () => {
      const { container } = render(<SearchBar value="" />);
      const kbd = container.querySelector('kbd');
      expect(kbd).not.toBeInTheDocument();
    });

    it('should focus input on Cmd+K', () => {
      render(<SearchBar value="" enableShortcut />);
      const input = screen.getByRole('searchbox');

      fireEvent.keyDown(document, { key: 'k', metaKey: true });

      expect(input).toHaveFocus();
    });

    it('should focus input on Ctrl+K', () => {
      render(<SearchBar value="" enableShortcut />);
      const input = screen.getByRole('searchbox');

      fireEvent.keyDown(document, { key: 'k', ctrlKey: true });

      expect(input).toHaveFocus();
    });

    it('should not focus input on Cmd+K when enableShortcut is false', () => {
      render(<SearchBar value="" />);
      const input = screen.getByRole('searchbox');

      fireEvent.keyDown(document, { key: 'k', metaKey: true });

      expect(input).not.toHaveFocus();
    });
  });

  describe('Sizes', () => {
    it('should support sm size', () => {
      const { container } = render(<SearchBar size="sm" />);
      const input = container.querySelector('input');
      expect(input).toHaveClass('min-h-11');
    });

    it('should support md size by default', () => {
      const { container } = render(<SearchBar />);
      const input = container.querySelector('input');
      expect(input).toHaveClass('min-h-11');
    });

    it('should support lg size', () => {
      const { container } = render(<SearchBar size="lg" />);
      const input = container.querySelector('input');
      expect(input).toHaveClass('min-h-14');
    });
  });

  describe('Custom Props', () => {
    it('should accept additional className', () => {
      const { container } = render(<SearchBar className="custom-class" />);
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('should accept disabled prop', () => {
      render(<SearchBar disabled />);
      const input = screen.getByRole('searchbox');
      expect(input).toBeDisabled();
    });

    it('should accept autoFocus prop', () => {
      render(<SearchBar autoFocus />);
      const input = screen.getByRole('searchbox');
      expect(input).toHaveFocus();
    });

    it('should forward additional input props', () => {
      render(<SearchBar aria-label="Product search" />);
      const input = screen.getByRole('searchbox');
      expect(input).toHaveAttribute('aria-label', 'Product search');
    });
  });

  describe('Integration', () => {
    it('should work in a controlled component', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();

      const { rerender } = render(<SearchBar value="" onValueChange={handleChange} />);

      const input = screen.getByRole('searchbox');
      await user.type(input, 'test');

      expect(handleChange).toHaveBeenCalled();
    });

    it('should handle rapid typing', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<SearchBar value="" onValueChange={handleChange} />);

      const input = screen.getByRole('searchbox');
      await user.type(input, 'quick');

      expect(handleChange).toHaveBeenCalledTimes(5);
    });

    it('should work with form submission', () => {
      const handleSubmit = vi.fn((e) => e.preventDefault());
      render(
        <form onSubmit={handleSubmit}>
          <SearchBar value="test" onValueChange={vi.fn()} />
          <button type="submit">Search</button>
        </form>
      );

      const button = screen.getByText('Search');
      fireEvent.click(button);

      expect(handleSubmit).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have searchbox role', () => {
      render(<SearchBar />);
      expect(screen.getByRole('searchbox')).toBeInTheDocument();
    });

    it('should have accessible clear button', () => {
      render(<SearchBar value="test" onValueChange={vi.fn()} />);
      const clearButton = screen.getByLabelText('Clear search');
      expect(clearButton).toBeInTheDocument();
    });

    it('should support aria-label', () => {
      render(<SearchBar aria-label="Search products" />);
      const input = screen.getByRole('searchbox');
      expect(input).toHaveAttribute('aria-label', 'Search products');
    });
  });
});
