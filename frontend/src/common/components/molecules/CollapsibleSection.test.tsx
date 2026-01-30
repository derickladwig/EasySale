import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CollapsibleSection } from './CollapsibleSection';
import { User } from 'lucide-react';

describe('CollapsibleSection', () => {
  it('should render with title', () => {
    render(
      <CollapsibleSection title="Test Section">
        <div>Test Content</div>
      </CollapsibleSection>
    );

    expect(screen.getByText('Test Section')).toBeTruthy();
  });

  it('should render with icon', () => {
    render(
      <CollapsibleSection title="Test Section" icon={User}>
        <div>Test Content</div>
      </CollapsibleSection>
    );

    // Icon should be rendered
    const button = screen.getByRole('button');
    expect(button).toBeTruthy();
  });

  it('should be open by default when defaultOpen is true', () => {
    render(
      <CollapsibleSection title="Test Section" defaultOpen={true}>
        <div>Test Content</div>
      </CollapsibleSection>
    );

    expect(screen.getByText('Test Content')).toBeTruthy();
  });

  it('should be closed by default when defaultOpen is false', () => {
    render(
      <CollapsibleSection title="Test Section" defaultOpen={false}>
        <div>Test Content</div>
      </CollapsibleSection>
    );

    // Content should not be visible (opacity 0)
    const content = screen.getByText('Test Content');
    const wrapper = content.parentElement?.parentElement;
    expect(wrapper?.className).toContain('opacity-0');
  });

  it('should toggle open/closed when clicked', async () => {
    const user = userEvent.setup();

    render(
      <CollapsibleSection title="Test Section" defaultOpen={true}>
        <div>Test Content</div>
      </CollapsibleSection>
    );

    const button = screen.getByRole('button');
    const content = screen.getByText('Test Content');
    const wrapper = content.parentElement?.parentElement;

    // Initially open
    expect(wrapper?.className).toContain('opacity-100');

    // Click to close
    await user.click(button);
    expect(wrapper?.className).toContain('opacity-0');

    // Click to open again
    await user.click(button);
    expect(wrapper?.className).toContain('opacity-100');
  });

  it('should toggle with keyboard (Enter key)', async () => {
    const user = userEvent.setup();

    render(
      <CollapsibleSection title="Test Section" defaultOpen={true}>
        <div>Test Content</div>
      </CollapsibleSection>
    );

    const button = screen.getByRole('button');
    const content = screen.getByText('Test Content');
    const wrapper = content.parentElement?.parentElement;

    // Focus the button
    button.focus();

    // Initially open
    expect(wrapper?.className).toContain('opacity-100');

    // Press Enter to close
    await user.keyboard('{Enter}');
    expect(wrapper?.className).toContain('opacity-0');

    // Press Enter to open again
    await user.keyboard('{Enter}');
    expect(wrapper?.className).toContain('opacity-100');
  });

  it('should toggle with keyboard (Space key)', async () => {
    const user = userEvent.setup();

    render(
      <CollapsibleSection title="Test Section" defaultOpen={true}>
        <div>Test Content</div>
      </CollapsibleSection>
    );

    const button = screen.getByRole('button');
    const content = screen.getByText('Test Content');
    const wrapper = content.parentElement?.parentElement;

    // Focus the button
    button.focus();

    // Initially open
    expect(wrapper?.className).toContain('opacity-100');

    // Press Space to close
    await user.keyboard(' ');
    expect(wrapper?.className).toContain('opacity-0');

    // Press Space to open again
    await user.keyboard(' ');
    expect(wrapper?.className).toContain('opacity-100');
  });

  it('should have proper aria attributes', () => {
    render(
      <CollapsibleSection title="Test Section" defaultOpen={true}>
        <div>Test Content</div>
      </CollapsibleSection>
    );

    const button = screen.getByRole('button');
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(button.getAttribute('aria-controls')).toBe('section-test-section');
  });
});
