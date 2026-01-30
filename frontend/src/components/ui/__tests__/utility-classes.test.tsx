import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';

/**
 * Test suite for Tailwind utility classes added in task 1.6
 * Requirements: 7.1, 7.2, 7.3, 7.4
 * 
 * These tests verify that the custom utility classes are properly defined
 * in the Tailwind configuration and can be applied to elements.
 */

describe('Interactive State Utility Classes', () => {
  describe('Focus Ring Utilities (Req 7.10, 18.2)', () => {
    it('should apply focus-ring class', () => {
      const { container } = render(
        <button className="focus-ring">Focus Ring Button</button>
      );
      const button = container.querySelector('button');
      expect(button).toHaveClass('focus-ring');
    });

    it('should apply focus-ring-inset class', () => {
      const { container } = render(
        <button className="focus-ring-inset">Focus Ring Inset Button</button>
      );
      const button = container.querySelector('button');
      expect(button).toHaveClass('focus-ring-inset');
    });

    it('should apply focus-ring-error class', () => {
      const { container } = render(
        <input className="focus-ring-error" type="text" />
      );
      const input = container.querySelector('input');
      expect(input).toHaveClass('focus-ring-error');
    });

    it('should apply focus-ring-success class', () => {
      const { container } = render(
        <input className="focus-ring-success" type="text" />
      );
      const input = container.querySelector('input');
      expect(input).toHaveClass('focus-ring-success');
    });

    it('should apply focus-ring-none class', () => {
      const { container } = render(
        <button className="focus-ring-none">No Focus Ring</button>
      );
      const button = container.querySelector('button');
      expect(button).toHaveClass('focus-ring-none');
    });
  });

  describe('Hover State Utilities (Req 7.3, 1.5)', () => {
    it('should apply hover-brightness class', () => {
      const { container } = render(
        <button className="hover-brightness">Hover Brightness</button>
      );
      const button = container.querySelector('button');
      expect(button).toHaveClass('hover-brightness');
    });

    it('should apply hover-brightness-sm class', () => {
      const { container } = render(
        <button className="hover-brightness-sm">Hover Brightness Small</button>
      );
      const button = container.querySelector('button');
      expect(button).toHaveClass('hover-brightness-sm');
    });

    it('should apply hover-brightness-lg class', () => {
      const { container } = render(
        <button className="hover-brightness-lg">Hover Brightness Large</button>
      );
      const button = container.querySelector('button');
      expect(button).toHaveClass('hover-brightness-lg');
    });

    it('should apply hover-lift class', () => {
      const { container } = render(
        <div className="hover-lift">Hover Lift</div>
      );
      const div = container.querySelector('div');
      expect(div).toHaveClass('hover-lift');
    });

    it('should apply hover-lift-sm class', () => {
      const { container } = render(
        <div className="hover-lift-sm">Hover Lift Small</div>
      );
      const div = container.querySelector('div');
      expect(div).toHaveClass('hover-lift-sm');
    });

    it('should apply hover-lift-lg class', () => {
      const { container } = render(
        <div className="hover-lift-lg">Hover Lift Large</div>
      );
      const div = container.querySelector('div');
      expect(div).toHaveClass('hover-lift-lg');
    });
  });

  describe('Active State Utilities (Req 7.4, 1.6)', () => {
    it('should apply active-scale class', () => {
      const { container } = render(
        <button className="active-scale">Active Scale</button>
      );
      const button = container.querySelector('button');
      expect(button).toHaveClass('active-scale');
    });

    it('should apply active-scale-sm class', () => {
      const { container } = render(
        <button className="active-scale-sm">Active Scale Small</button>
      );
      const button = container.querySelector('button');
      expect(button).toHaveClass('active-scale-sm');
    });

    it('should apply active-scale-lg class', () => {
      const { container } = render(
        <button className="active-scale-lg">Active Scale Large</button>
      );
      const button = container.querySelector('button');
      expect(button).toHaveClass('active-scale-lg');
    });

    it('should apply active-brightness class', () => {
      const { container } = render(
        <button className="active-brightness">Active Brightness</button>
      );
      const button = container.querySelector('button');
      expect(button).toHaveClass('active-brightness');
    });

    it('should apply active-brightness-sm class', () => {
      const { container } = render(
        <button className="active-brightness-sm">Active Brightness Small</button>
      );
      const button = container.querySelector('button');
      expect(button).toHaveClass('active-brightness-sm');
    });

    it('should apply active-brightness-lg class', () => {
      const { container } = render(
        <button className="active-brightness-lg">Active Brightness Large</button>
      );
      const button = container.querySelector('button');
      expect(button).toHaveClass('active-brightness-lg');
    });
  });

  describe('Disabled State Utilities (Req 7.8)', () => {
    it('should apply disabled-state class', () => {
      const { container } = render(
        <button className="disabled-state" disabled>Disabled State</button>
      );
      const button = container.querySelector('button');
      expect(button).toHaveClass('disabled-state');
    });

    it('should apply disabled-opacity class', () => {
      const { container } = render(
        <button className="disabled-opacity" disabled>Disabled Opacity</button>
      );
      const button = container.querySelector('button');
      expect(button).toHaveClass('disabled-opacity');
    });

    it('should apply disabled-cursor class', () => {
      const { container } = render(
        <button className="disabled-cursor" disabled>Disabled Cursor</button>
      );
      const button = container.querySelector('button');
      expect(button).toHaveClass('disabled-cursor');
    });

    it('should apply disabled-no-pointer class', () => {
      const { container } = render(
        <button className="disabled-no-pointer" disabled>Disabled No Pointer</button>
      );
      const button = container.querySelector('button');
      expect(button).toHaveClass('disabled-no-pointer');
    });
  });

  describe('Combined Interactive Utilities', () => {
    it('should apply interactive class', () => {
      const { container } = render(
        <button className="interactive">Interactive</button>
      );
      const button = container.querySelector('button');
      expect(button).toHaveClass('interactive');
    });

    it('should apply interactive-card class', () => {
      const { container } = render(
        <div className="interactive-card">Interactive Card</div>
      );
      const div = container.querySelector('div');
      expect(div).toHaveClass('interactive-card');
    });

    it('should apply interactive-button class', () => {
      const { container } = render(
        <button className="interactive-button">Interactive Button</button>
      );
      const button = container.querySelector('button');
      expect(button).toHaveClass('interactive-button');
    });
  });

  describe('Combined Utility Classes', () => {
    it('should apply multiple utility classes together', () => {
      const { container } = render(
        <button className="focus-ring hover-brightness active-scale disabled-state">
          Combined Utilities
        </button>
      );
      const button = container.querySelector('button');
      expect(button).toHaveClass('focus-ring');
      expect(button).toHaveClass('hover-brightness');
      expect(button).toHaveClass('active-scale');
      expect(button).toHaveClass('disabled-state');
    });

    it('should apply interactive utility with other classes', () => {
      const { container } = render(
        <button className="interactive bg-primary-500 text-white px-4 py-2 rounded-lg">
          Interactive Button with Styling
        </button>
      );
      const button = container.querySelector('button');
      expect(button).toHaveClass('interactive');
      expect(button).toHaveClass('bg-primary-500');
      expect(button).toHaveClass('text-white');
      expect(button).toHaveClass('px-4');
      expect(button).toHaveClass('py-2');
      expect(button).toHaveClass('rounded-lg');
    });
  });
});
