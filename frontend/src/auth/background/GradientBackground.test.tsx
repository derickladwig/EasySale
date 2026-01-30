/**
 * GradientBackground Unit Tests
 *
 * Tests gradient rendering with multi-stop configurations.
 * Validates Requirements 4.2
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { GradientBackground } from './GradientBackground';
import type { GradientBackgroundConfig } from '../theme/types';

// ============================================================================
// Gradient Background Tests
// ============================================================================

describe('GradientBackground', () => {
  it('should render gradient with two color stops', () => {
    const config: GradientBackgroundConfig = {
      stops: [
        { color: '#1e293b', position: 0 },
        { color: '#0f172a', position: 100 },
      ],
    };

    const { container } = render(<GradientBackground config={config} />);

    const gradient = container.querySelector('[data-testid="gradient-background"]') as HTMLElement;
    expect(gradient).toBeTruthy();
    expect(gradient.style.background).toContain('linear-gradient');
    // Browser converts hex to RGB
    expect(gradient.style.background).toContain('rgb(30, 41, 59)'); // #1e293b
    expect(gradient.style.background).toContain('rgb(15, 23, 42)'); // #0f172a
  });

  it('should render gradient with multiple color stops', () => {
    const config: GradientBackgroundConfig = {
      stops: [
        { color: '#1e293b', position: 0 },
        { color: '#334155', position: 50 },
        { color: '#0f172a', position: 100 },
      ],
    };

    const { container } = render(<GradientBackground config={config} />);

    const gradient = container.querySelector('[data-testid="gradient-background"]') as HTMLElement;
    expect(gradient).toBeTruthy();
    expect(gradient.style.background).toContain('linear-gradient');
    // Browser converts hex to RGB
    expect(gradient.style.background).toContain('rgb(30, 41, 59)'); // #1e293b
    expect(gradient.style.background).toContain('rgb(51, 65, 85)'); // #334155
    expect(gradient.style.background).toContain('rgb(15, 23, 42)'); // #0f172a
  });

  it('should sort color stops by position', () => {
    const config: GradientBackgroundConfig = {
      stops: [
        { color: '#0f172a', position: 100 },
        { color: '#334155', position: 50 },
        { color: '#1e293b', position: 0 },
      ],
    };

    const { container } = render(<GradientBackground config={config} />);

    const gradient = container.querySelector('[data-testid="gradient-background"]') as HTMLElement;
    expect(gradient).toBeTruthy();

    // Verify gradient string has correct order (browser converts to RGB)
    const gradientStr = gradient.style.background;
    const pos1e293b = gradientStr.indexOf('rgb(30, 41, 59)'); // #1e293b
    const pos334155 = gradientStr.indexOf('rgb(51, 65, 85)'); // #334155
    const pos0f172a = gradientStr.indexOf('rgb(15, 23, 42)'); // #0f172a

    // Colors should appear in order by position
    expect(pos1e293b).toBeLessThan(pos334155);
    expect(pos334155).toBeLessThan(pos0f172a);
  });

  it('should include position percentages in gradient', () => {
    const config: GradientBackgroundConfig = {
      stops: [
        { color: '#1e293b', position: 0 },
        { color: '#334155', position: 33 },
        { color: '#0f172a', position: 100 },
      ],
    };

    const { container } = render(<GradientBackground config={config} />);

    const gradient = container.querySelector('[data-testid="gradient-background"]') as HTMLElement;
    expect(gradient.style.background).toContain('0%');
    expect(gradient.style.background).toContain('33%');
    expect(gradient.style.background).toContain('100%');
  });

  it('should use 135deg angle for gradient', () => {
    const config: GradientBackgroundConfig = {
      stops: [
        { color: '#1e293b', position: 0 },
        { color: '#0f172a', position: 100 },
      ],
    };

    const { container } = render(<GradientBackground config={config} />);

    const gradient = container.querySelector('[data-testid="gradient-background"]') as HTMLElement;
    expect(gradient.style.background).toContain('135deg');
  });

  it('should handle single color stop', () => {
    const config: GradientBackgroundConfig = {
      stops: [{ color: '#1e293b', position: 0 }],
    };

    const { container } = render(<GradientBackground config={config} />);

    const gradient = container.querySelector('[data-testid="gradient-background"]') as HTMLElement;
    expect(gradient).toBeTruthy();
    // Gradient element renders even with single stop
    expect(gradient.className).toBe('gradient-background');
  });
});
