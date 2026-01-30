/**
 * Waves Background Component - Unit Tests
 *
 * Tests wave rendering with configurable intensity and dot-grid overlay.
 *
 * Validates Requirements 4.3, 4.6
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WavesBackground } from './WavesBackground';
import type { WavesBackgroundConfig } from '../theme/types';

describe('WavesBackground', () => {
  it('renders waves with base color', () => {
    const config: WavesBackgroundConfig = {
      baseColor: '#0f172a',
      waveColor: '#1e293b',
      intensity: 0.5,
      showDotGrid: false,
      dotGridOpacity: 0,
    };

    const { container } = render(<WavesBackground config={config} />);

    const base = container.querySelector('.waves-background__base') as HTMLElement;
    expect(base).toBeTruthy();
    expect(base.style.backgroundColor).toBe('rgb(15, 23, 42)');
  });

  it('renders SVG waves with configured wave color', () => {
    const config: WavesBackgroundConfig = {
      baseColor: '#0f172a',
      waveColor: '#1e293b',
      intensity: 0.5,
      showDotGrid: false,
      dotGridOpacity: 0,
    };

    const { container } = render(<WavesBackground config={config} />);

    const svg = container.querySelector('.waves-background__svg');
    expect(svg).toBeTruthy();

    const waves = container.querySelectorAll('.waves-background__wave');
    expect(waves.length).toBe(3);

    // Check wave color (browser converts hex to RGB)
    waves.forEach((wave) => {
      expect(wave.getAttribute('fill')).toBe('#1e293b');
    });
  });

  it('renders dot-grid overlay when enabled', () => {
    const config: WavesBackgroundConfig = {
      baseColor: '#0f172a',
      waveColor: '#1e293b',
      intensity: 0.5,
      showDotGrid: true,
      dotGridOpacity: 0.3,
    };

    render(<WavesBackground config={config} />);

    const dotGrid = screen.getByTestId('waves-dot-grid');
    expect(dotGrid).toBeTruthy();
    expect(dotGrid.style.opacity).toBe('0.3');
  });

  it('does not render dot-grid when disabled', () => {
    const config: WavesBackgroundConfig = {
      baseColor: '#0f172a',
      waveColor: '#1e293b',
      intensity: 0.5,
      showDotGrid: false,
      dotGridOpacity: 0,
    };

    render(<WavesBackground config={config} />);

    const dotGrid = screen.queryByTestId('waves-dot-grid');
    expect(dotGrid).toBeNull();
  });

  it('adjusts wave amplitude based on intensity', () => {
    const lowIntensityConfig: WavesBackgroundConfig = {
      baseColor: '#0f172a',
      waveColor: '#1e293b',
      intensity: 0.2,
      showDotGrid: false,
      dotGridOpacity: 0,
    };

    const highIntensityConfig: WavesBackgroundConfig = {
      baseColor: '#0f172a',
      waveColor: '#1e293b',
      intensity: 0.8,
      showDotGrid: false,
      dotGridOpacity: 0,
    };

    const { container: lowContainer } = render(<WavesBackground config={lowIntensityConfig} />);
    const { container: highContainer } = render(<WavesBackground config={highIntensityConfig} />);

    const lowWave = lowContainer.querySelector('.waves-background__wave--1');
    const highWave = highContainer.querySelector('.waves-background__wave--1');

    expect(lowWave?.getAttribute('d')).toBeTruthy();
    expect(highWave?.getAttribute('d')).toBeTruthy();

    // High intensity should have larger amplitude values in path
    const lowPath = lowWave?.getAttribute('d') || '';
    const highPath = highWave?.getAttribute('d') || '';

    expect(lowPath).not.toBe(highPath);
  });

  it('renders three wave layers with different opacities', () => {
    const config: WavesBackgroundConfig = {
      baseColor: '#0f172a',
      waveColor: '#1e293b',
      intensity: 0.5,
      showDotGrid: false,
      dotGridOpacity: 0,
    };

    const { container } = render(<WavesBackground config={config} />);

    const wave1 = container.querySelector('.waves-background__wave--1');
    const wave2 = container.querySelector('.waves-background__wave--2');
    const wave3 = container.querySelector('.waves-background__wave--3');

    expect(wave1?.getAttribute('opacity')).toBe('0.3');
    expect(wave2?.getAttribute('opacity')).toBe('0.2');
    expect(wave3?.getAttribute('opacity')).toBe('0.15');
  });

  it('applies correct dot-grid opacity', () => {
    const config: WavesBackgroundConfig = {
      baseColor: '#0f172a',
      waveColor: '#1e293b',
      intensity: 0.5,
      showDotGrid: true,
      dotGridOpacity: 0.7,
    };

    render(<WavesBackground config={config} />);

    const dotGrid = screen.getByTestId('waves-dot-grid');
    expect(dotGrid.style.opacity).toBe('0.7');
  });

  it('renders with zero intensity', () => {
    const config: WavesBackgroundConfig = {
      baseColor: '#0f172a',
      waveColor: '#1e293b',
      intensity: 0,
      showDotGrid: false,
      dotGridOpacity: 0,
    };

    const { container } = render(<WavesBackground config={config} />);

    const waves = container.querySelectorAll('.waves-background__wave');
    expect(waves.length).toBe(3);
  });

  it('renders with maximum intensity', () => {
    const config: WavesBackgroundConfig = {
      baseColor: '#0f172a',
      waveColor: '#1e293b',
      intensity: 1,
      showDotGrid: false,
      dotGridOpacity: 0,
    };

    const { container } = render(<WavesBackground config={config} />);

    const waves = container.querySelectorAll('.waves-background__wave');
    expect(waves.length).toBe(3);
  });
});
