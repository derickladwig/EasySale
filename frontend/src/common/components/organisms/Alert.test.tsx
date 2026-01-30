import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Alert } from './Alert';

describe('Alert', () => {
  describe('Rendering', () => {
    it('should render the alert', () => {
      const { container } = render(<Alert variant="success" title="Success" />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should render title', () => {
      render(<Alert variant="success" title="Success message" />);
      expect(screen.getByText('Success message')).toBeInTheDocument();
    });

    it('should render description when provided', () => {
      render(
        <Alert variant="success" title="Success" description="Operation completed successfully" />
      );
      expect(screen.getByText('Operation completed successfully')).toBeInTheDocument();
    });

    it('should not render description when not provided', () => {
      const { container } = render(<Alert variant="success" title="Success" />);
      const descriptions = container.querySelectorAll('p');
      expect(descriptions.length).toBe(0);
    });

    it('should have alert role', () => {
      render(<Alert variant="success" title="Success" />);
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  describe('Variants', () => {
    it('should render success variant', () => {
      const { container } = render(<Alert variant="success" title="Success" />);
      expect(container.querySelector('.bg-success-900\\/20')).toBeInTheDocument();
      expect(container.querySelector('.border-success-500')).toBeInTheDocument();
    });

    it('should render error variant', () => {
      const { container } = render(<Alert variant="error" title="Error" />);
      expect(container.querySelector('.bg-error-900\\/20')).toBeInTheDocument();
      expect(container.querySelector('.border-error-500')).toBeInTheDocument();
    });

    it('should render warning variant', () => {
      const { container } = render(<Alert variant="warning" title="Warning" />);
      expect(container.querySelector('.bg-warning-900\\/20')).toBeInTheDocument();
      expect(container.querySelector('.border-warning-500')).toBeInTheDocument();
    });

    it('should render info variant', () => {
      const { container } = render(<Alert variant="info" title="Info" />);
      expect(container.querySelector('.bg-info-900\\/20')).toBeInTheDocument();
      expect(container.querySelector('.border-info-500')).toBeInTheDocument();
    });
  });

  describe('Icons', () => {
    it('should render success icon', () => {
      const { container } = render(<Alert variant="success" title="Success" />);
      const icon = container.querySelector('.text-success-500 svg');
      expect(icon).toBeInTheDocument();
    });

    it('should render error icon', () => {
      const { container } = render(<Alert variant="error" title="Error" />);
      const icon = container.querySelector('.text-error-500 svg');
      expect(icon).toBeInTheDocument();
    });

    it('should render warning icon', () => {
      const { container } = render(<Alert variant="warning" title="Warning" />);
      const icon = container.querySelector('.text-warning-500 svg');
      expect(icon).toBeInTheDocument();
    });

    it('should render info icon', () => {
      const { container } = render(<Alert variant="info" title="Info" />);
      const icon = container.querySelector('.text-info-500 svg');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Dismissible', () => {
    it('should not render close button by default', () => {
      render(<Alert variant="success" title="Success" />);
      expect(screen.queryByLabelText('Dismiss alert')).not.toBeInTheDocument();
    });

    it('should render close button when dismissible is true', () => {
      render(<Alert variant="success" title="Success" dismissible />);
      expect(screen.getByLabelText('Dismiss alert')).toBeInTheDocument();
    });

    it('should call onDismiss when close button is clicked', () => {
      const handleDismiss = vi.fn();
      render(<Alert variant="success" title="Success" dismissible onDismiss={handleDismiss} />);

      const closeButton = screen.getByLabelText('Dismiss alert');
      closeButton.click();

      expect(handleDismiss).toHaveBeenCalled();
    });

    it('should not call onDismiss when not dismissible', () => {
      const handleDismiss = vi.fn();
      render(<Alert variant="success" title="Success" onDismiss={handleDismiss} />);

      expect(screen.queryByLabelText('Dismiss alert')).not.toBeInTheDocument();
      expect(handleDismiss).not.toHaveBeenCalled();
    });
  });

  describe('Layout', () => {
    it('should have proper spacing', () => {
      const { container } = render(<Alert variant="success" title="Success" />);
      const alert = container.firstChild as HTMLElement;
      expect(alert).toHaveClass('gap-3');
      expect(alert).toHaveClass('p-4');
    });

    it('should have border-l-4', () => {
      const { container } = render(<Alert variant="success" title="Success" />);
      const alert = container.firstChild as HTMLElement;
      expect(alert).toHaveClass('border-l-4');
    });

    it('should have rounded corners', () => {
      const { container } = render(<Alert variant="success" title="Success" />);
      const alert = container.firstChild as HTMLElement;
      expect(alert).toHaveClass('rounded-lg');
    });
  });

  describe('Custom Props', () => {
    it('should accept additional className', () => {
      const { container } = render(
        <Alert variant="success" title="Success" className="custom-class" />
      );
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Complex Scenarios', () => {
    it('should render complete alert with all features', () => {
      const handleDismiss = vi.fn();
      render(
        <Alert
          variant="error"
          title="Error occurred"
          description="Please check your input and try again"
          dismissible
          onDismiss={handleDismiss}
        />
      );

      expect(screen.getByText('Error occurred')).toBeInTheDocument();
      expect(screen.getByText('Please check your input and try again')).toBeInTheDocument();
      expect(screen.getByLabelText('Dismiss alert')).toBeInTheDocument();
    });

    it('should work with multiple alerts', () => {
      render(
        <div>
          <Alert variant="success" title="Success" />
          <Alert variant="error" title="Error" />
          <Alert variant="warning" title="Warning" />
        </div>
      );

      expect(screen.getByText('Success')).toBeInTheDocument();
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('Warning')).toBeInTheDocument();
    });

    it('should handle long text content', () => {
      const longTitle = 'This is a very long title that might wrap to multiple lines';
      const longDescription =
        'This is a very long description that contains a lot of text and might wrap to multiple lines in the alert component';

      render(<Alert variant="info" title={longTitle} description={longDescription} />);

      expect(screen.getByText(longTitle)).toBeInTheDocument();
      expect(screen.getByText(longDescription)).toBeInTheDocument();
    });
  });
});
