import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FormGroup } from './FormGroup';
import { FormField } from './FormField';

describe('FormGroup', () => {
  describe('Rendering', () => {
    it('should render the form group', () => {
      const { container } = render(
        <FormGroup>
          <FormField label="Field 1" type="text" />
        </FormGroup>
      );
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should render children', () => {
      render(
        <FormGroup>
          <FormField label="Email" type="email" />
          <FormField label="Password" type="password" />
        </FormGroup>
      );
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
    });

    it('should render multiple children', () => {
      render(
        <FormGroup>
          <FormField label="Field 1" type="text" />
          <FormField label="Field 2" type="text" />
          <FormField label="Field 3" type="text" />
        </FormGroup>
      );
      const inputs = screen.getAllByRole('textbox');
      expect(inputs).toHaveLength(3);
    });
  });

  describe('Title and Description', () => {
    it('should render title when provided', () => {
      render(
        <FormGroup title="Personal Information">
          <FormField label="Name" type="text" />
        </FormGroup>
      );
      expect(screen.getByText('Personal Information')).toBeInTheDocument();
    });

    it('should render description when provided', () => {
      render(
        <FormGroup description="Enter your contact details">
          <FormField label="Email" type="email" />
        </FormGroup>
      );
      expect(screen.getByText('Enter your contact details')).toBeInTheDocument();
    });

    it('should render both title and description', () => {
      render(
        <FormGroup title="Contact Information" description="We'll use this to reach you">
          <FormField label="Email" type="email" />
        </FormGroup>
      );
      expect(screen.getByText('Contact Information')).toBeInTheDocument();
      expect(screen.getByText("We'll use this to reach you")).toBeInTheDocument();
    });

    it('should not render title/description section when neither provided', () => {
      const { container } = render(
        <FormGroup>
          <FormField label="Email" type="email" />
        </FormGroup>
      );
      const heading = container.querySelector('h3');
      const description = container.querySelector('p');
      expect(heading).not.toBeInTheDocument();
      expect(description).not.toBeInTheDocument();
    });
  });

  describe('Layout', () => {
    it('should use vertical layout by default', () => {
      const { container } = render(
        <FormGroup>
          <FormField label="Field 1" type="text" />
          <FormField label="Field 2" type="text" />
        </FormGroup>
      );
      const fieldsContainer = container.querySelector('.flex-col');
      expect(fieldsContainer).toBeInTheDocument();
    });

    it('should apply vertical layout classes', () => {
      const { container } = render(
        <FormGroup layout="vertical">
          <FormField label="Field 1" type="text" />
        </FormGroup>
      );
      const fieldsContainer = container.querySelector('.flex-col.gap-4');
      expect(fieldsContainer).toBeInTheDocument();
    });

    it('should apply horizontal layout classes', () => {
      const { container } = render(
        <FormGroup layout="horizontal">
          <FormField label="Field 1" type="text" />
        </FormGroup>
      );
      const fieldsContainer = container.querySelector('.flex-row.gap-4');
      expect(fieldsContainer).toBeInTheDocument();
    });

    it('should add flex-wrap for horizontal layout', () => {
      const { container } = render(
        <FormGroup layout="horizontal">
          <FormField label="Field 1" type="text" />
        </FormGroup>
      );
      const fieldsContainer = container.querySelector('.flex-wrap');
      expect(fieldsContainer).toBeInTheDocument();
    });
  });

  describe('Spacing', () => {
    it('should have consistent spacing between fields in vertical layout', () => {
      const { container } = render(
        <FormGroup layout="vertical">
          <FormField label="Field 1" type="text" />
          <FormField label="Field 2" type="text" />
        </FormGroup>
      );
      const fieldsContainer = container.querySelector('.gap-4');
      expect(fieldsContainer).toBeInTheDocument();
    });

    it('should have consistent spacing between fields in horizontal layout', () => {
      const { container } = render(
        <FormGroup layout="horizontal">
          <FormField label="Field 1" type="text" />
          <FormField label="Field 2" type="text" />
        </FormGroup>
      );
      const fieldsContainer = container.querySelector('.gap-4');
      expect(fieldsContainer).toBeInTheDocument();
    });

    it('should have spacing between title and fields', () => {
      const { container } = render(
        <FormGroup title="Title">
          <FormField label="Field 1" type="text" />
        </FormGroup>
      );
      const titleContainer = container.querySelector('.mb-4');
      expect(titleContainer).toBeInTheDocument();
    });
  });

  describe('Custom Props', () => {
    it('should accept additional className', () => {
      const { container } = render(
        <FormGroup className="custom-class">
          <FormField label="Field 1" type="text" />
        </FormGroup>
      );
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('should merge custom className with default classes', () => {
      const { container } = render(
        <FormGroup className="mt-8">
          <FormField label="Field 1" type="text" />
        </FormGroup>
      );
      expect(container.firstChild).toHaveClass('w-full');
      expect(container.firstChild).toHaveClass('mt-8');
    });
  });

  describe('Integration', () => {
    it('should work with different field types', () => {
      render(
        <FormGroup title="User Information">
          <FormField label="Name" type="text" />
          <FormField label="Email" type="email" />
          <FormField label="Age" type="number" />
          <FormField label="Password" type="password" />
        </FormGroup>
      );

      expect(screen.getByLabelText('Name')).toHaveAttribute('type', 'text');
      expect(screen.getByLabelText('Email')).toHaveAttribute('type', 'email');
      expect(screen.getByLabelText('Age')).toHaveAttribute('type', 'number');
      expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
    });

    it('should work with fields that have errors', () => {
      render(
        <FormGroup title="Form with Errors">
          <FormField label="Email" type="email" error="Email is required" />
          <FormField label="Password" type="password" error="Password is too short" />
        </FormGroup>
      );

      expect(screen.getByText('Email is required')).toBeInTheDocument();
      expect(screen.getByText('Password is too short')).toBeInTheDocument();
    });

    it('should work with required fields', () => {
      render(
        <FormGroup>
          <FormField label="Name" type="text" required />
          <FormField label="Email" type="email" required />
        </FormGroup>
      );

      const asterisks = screen.getAllByText('*');
      expect(asterisks).toHaveLength(2);
    });

    it('should support nested form groups', () => {
      render(
        <FormGroup title="Main Group">
          <FormField label="Field 1" type="text" />
          <FormGroup title="Nested Group">
            <FormField label="Field 2" type="text" />
            <FormField label="Field 3" type="text" />
          </FormGroup>
        </FormGroup>
      );

      expect(screen.getByText('Main Group')).toBeInTheDocument();
      expect(screen.getByText('Nested Group')).toBeInTheDocument();
      const inputs = screen.getAllByRole('textbox');
      expect(inputs).toHaveLength(3);
    });

    it('should maintain layout with mixed content', () => {
      const { container } = render(
        <FormGroup layout="horizontal">
          <FormField label="City" type="text" size="sm" />
          <FormField label="State" type="text" size="md" />
          <FormField label="Zip" type="text" size="lg" />
        </FormGroup>
      );

      const fieldsContainer = container.querySelector('.flex-row');
      expect(fieldsContainer).toBeInTheDocument();
      const inputs = screen.getAllByRole('textbox');
      expect(inputs).toHaveLength(3);
    });
  });

  describe('Responsive Behavior', () => {
    it('should apply flex-wrap for horizontal layout to support wrapping', () => {
      const { container } = render(
        <FormGroup layout="horizontal">
          <FormField label="Field 1" type="text" />
          <FormField label="Field 2" type="text" />
          <FormField label="Field 3" type="text" />
          <FormField label="Field 4" type="text" />
        </FormGroup>
      );

      const fieldsContainer = container.querySelector('.flex-wrap');
      expect(fieldsContainer).toBeInTheDocument();
    });

    it('should maintain full width', () => {
      const { container } = render(
        <FormGroup>
          <FormField label="Field 1" type="text" />
        </FormGroup>
      );

      expect(container.firstChild).toHaveClass('w-full');
    });
  });
});
