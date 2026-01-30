import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toggle } from './Toggle';

describe('Toggle', () => {
  describe('Basic Rendering', () => {
    it('should render a toggle switch', () => {
      render(<Toggle checked={false} onChange={() => {}} />);
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeTruthy();
    });

    it('should render with label', () => {
      render(<Toggle checked={false} onChange={() => {}} label="Enable Feature" />);
      expect(screen.getByText('Enable Feature')).toBeTruthy();
    });

    it('should render with description', () => {
      render(
        <Toggle
          checked={false}
          onChange={() => {}}
          label="Enable Feature"
          description="Turn this feature on or off"
        />
      );
      expect(screen.getByText('Turn this feature on or off')).toBeTruthy();
    });

    it('should render without label and description', () => {
      render(<Toggle checked={false} onChange={() => {}} />);
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeTruthy();
      expect(screen.queryByText(/./)).toBeFalsy(); // No text content
    });
  });

  describe('Checked State', () => {
    it('should render as unchecked when checked is false', () => {
      render(<Toggle checked={false} onChange={() => {}} />);
      const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      expect(checkbox.checked).toBe(false);
    });

    it('should render as checked when checked is true', () => {
      render(<Toggle checked={true} onChange={() => {}} />);
      const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      expect(checkbox.checked).toBe(true);
    });
  });

  describe('User Interaction', () => {
    it('should call onChange when clicked', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<Toggle checked={false} onChange={handleChange} />);

      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);

      expect(handleChange).toHaveBeenCalledWith(true);
    });

    it('should call onChange with correct value when toggling', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<Toggle checked={true} onChange={handleChange} />);

      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);

      expect(handleChange).toHaveBeenCalledWith(false);
    });

    it('should not call onChange when disabled', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<Toggle checked={false} onChange={handleChange} disabled={true} />);

      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);

      expect(handleChange).not.toHaveBeenCalled();
    });
  });

  describe('Disabled State', () => {
    it('should render as disabled when disabled prop is true', () => {
      render(<Toggle checked={false} onChange={() => {}} disabled={true} />);
      const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      expect(checkbox.disabled).toBe(true);
    });

    it('should not be disabled by default', () => {
      render(<Toggle checked={false} onChange={() => {}} />);
      const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      expect(checkbox.disabled).toBe(false);
    });
  });

  describe('Sizes', () => {
    it('should render with small size', () => {
      const { container } = render(<Toggle checked={false} onChange={() => {}} size="sm" />);
      const switchElement = container.querySelector('.w-9');
      expect(switchElement).toBeTruthy();
    });

    it('should render with medium size by default', () => {
      const { container } = render(<Toggle checked={false} onChange={() => {}} />);
      const switchElement = container.querySelector('.w-11');
      expect(switchElement).toBeTruthy();
    });

    it('should render with large size', () => {
      const { container } = render(<Toggle checked={false} onChange={() => {}} size="lg" />);
      const switchElement = container.querySelector('.w-14');
      expect(switchElement).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have proper role', () => {
      render(<Toggle checked={false} onChange={() => {}} />);
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeTruthy();
    });

    it('should associate label with input', () => {
      render(<Toggle checked={false} onChange={() => {}} label="Enable Feature" id="test-toggle" />);
      const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      const label = screen.getByText('Enable Feature') as HTMLLabelElement;
      expect(checkbox.id).toBe('test-toggle');
      expect(label.htmlFor).toBe('test-toggle');
    });

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<Toggle checked={false} onChange={handleChange} />);

      const checkbox = screen.getByRole('checkbox');
      checkbox.focus();
      await user.keyboard(' '); // Space key

      expect(handleChange).toHaveBeenCalledWith(true);
    });
  });

  describe('Custom Props', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <Toggle checked={false} onChange={() => {}} className="custom-class" />
      );
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('custom-class');
    });

    it('should use custom id', () => {
      render(<Toggle checked={false} onChange={() => {}} id="custom-id" />);
      const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      expect(checkbox.id).toBe('custom-id');
    });
  });
});
