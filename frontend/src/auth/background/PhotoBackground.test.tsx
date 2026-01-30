/**
 * Photo Background Component - Unit Tests
 *
 * Tests progressive image loading (placeholder → low-res → high-res) and overlay rendering.
 *
 * Validates Requirements 4.4, 4.5
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { PhotoBackground } from './PhotoBackground';
import type { PhotoBackgroundConfig } from '../theme/types';

describe('PhotoBackground', () => {
  // Mock Image constructor
  let mockImages: Array<{
    src: string;
    onload: (() => void) | null;
    onerror: (() => void) | null;
  }> = [];

  beforeEach(() => {
    mockImages = [];

    // Mock Image constructor
    global.Image = class MockImage {
      src = '';
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;

      constructor() {
        const img = { src: this.src, onload: this.onload, onerror: this.onerror };
        mockImages.push(img);

        // Bind setters to update the mock
        Object.defineProperty(this, 'src', {
          get: () => img.src,
          set: (value: string) => {
            img.src = value;
          },
        });
        Object.defineProperty(this, 'onload', {
          get: () => img.onload,
          set: (value: (() => void) | null) => {
            img.onload = value;
          },
        });
        Object.defineProperty(this, 'onerror', {
          get: () => img.onerror,
          set: (value: (() => void) | null) => {
            img.onerror = value;
          },
        });
      }
    } as any;
  });

  afterEach(() => {
    mockImages = [];
  });

  it('renders placeholder initially', () => {
    const config: PhotoBackgroundConfig = {
      url: '/high-res.jpg',
      placeholderColor: '#1e293b',
      blur: 0,
      overlay: {
        enabled: false,
        color: '#000000',
        opacity: 0,
      },
    };

    render(<PhotoBackground config={config} />);

    const placeholder = screen.getByTestId('photo-placeholder');
    expect(placeholder).toBeTruthy();
    expect(placeholder.style.backgroundColor).toBe('rgb(30, 41, 59)');
  });

  it('loads high-res image directly when no low-res provided', async () => {
    const config: PhotoBackgroundConfig = {
      url: '/high-res.jpg',
      placeholderColor: '#1e293b',
      blur: 0,
      overlay: {
        enabled: false,
        color: '#000000',
        opacity: 0,
      },
    };

    render(<PhotoBackground config={config} />);

    // Wait for image to be created
    await waitFor(() => {
      expect(mockImages.length).toBe(1);
    });

    // Simulate successful load
    const img = mockImages[0];
    expect(img.src).toBe('/high-res.jpg');
    img.onload?.();

    // Wait for state update
    await waitFor(() => {
      const highResImage = screen.getByTestId('photo-image-high-res');
      expect(highResImage).toBeTruthy();
    });
  });

  it('loads low-res first, then high-res when both provided', async () => {
    const config: PhotoBackgroundConfig = {
      url: '/high-res.jpg',
      lowResUrl: '/low-res.jpg',
      placeholderColor: '#1e293b',
      blur: 0,
      overlay: {
        enabled: false,
        color: '#000000',
        opacity: 0,
      },
    };

    render(<PhotoBackground config={config} />);

    // Wait for low-res image to be created
    await waitFor(() => {
      expect(mockImages.length).toBe(1);
    });

    // Simulate low-res load
    const lowResImg = mockImages[0];
    expect(lowResImg.src).toBe('/low-res.jpg');
    lowResImg.onload?.();

    // Wait for low-res to display
    await waitFor(() => {
      const lowResImage = screen.getByTestId('photo-image-low-res');
      expect(lowResImage).toBeTruthy();
    });

    // Wait for high-res image to be created
    await waitFor(() => {
      expect(mockImages.length).toBe(2);
    });

    // Simulate high-res load
    const highResImg = mockImages[1];
    expect(highResImg.src).toBe('/high-res.jpg');
    highResImg.onload?.();

    // Wait for high-res to display
    await waitFor(() => {
      const highResImage = screen.getByTestId('photo-image-high-res');
      expect(highResImage).toBeTruthy();
    });
  });

  it('applies blur filter when configured', async () => {
    const config: PhotoBackgroundConfig = {
      url: '/high-res.jpg',
      placeholderColor: '#1e293b',
      blur: 8,
      overlay: {
        enabled: false,
        color: '#000000',
        opacity: 0,
      },
    };

    render(<PhotoBackground config={config} />);

    await waitFor(() => {
      expect(mockImages.length).toBe(1);
    });

    mockImages[0].onload?.();

    await waitFor(() => {
      const image = screen.getByTestId('photo-image-high-res');
      expect(image.style.filter).toBe('blur(8px)');
    });
  });

  it('does not apply blur when blur is 0', async () => {
    const config: PhotoBackgroundConfig = {
      url: '/high-res.jpg',
      placeholderColor: '#1e293b',
      blur: 0,
      overlay: {
        enabled: false,
        color: '#000000',
        opacity: 0,
      },
    };

    render(<PhotoBackground config={config} />);

    await waitFor(() => {
      expect(mockImages.length).toBe(1);
    });

    mockImages[0].onload?.();

    await waitFor(() => {
      const image = screen.getByTestId('photo-image-high-res');
      expect(image.style.filter).toBe('none');
    });
  });

  it('renders overlay when enabled', async () => {
    const config: PhotoBackgroundConfig = {
      url: '/high-res.jpg',
      placeholderColor: '#1e293b',
      blur: 0,
      overlay: {
        enabled: true,
        color: '#000000',
        opacity: 0.5,
      },
    };

    render(<PhotoBackground config={config} />);

    const overlay = screen.getByTestId('photo-overlay');
    expect(overlay).toBeTruthy();
    expect(overlay.style.backgroundColor).toBe('rgb(0, 0, 0)');
    expect(overlay.style.opacity).toBe('0.5');
  });

  it('does not render overlay when disabled', () => {
    const config: PhotoBackgroundConfig = {
      url: '/high-res.jpg',
      placeholderColor: '#1e293b',
      blur: 0,
      overlay: {
        enabled: false,
        color: '#000000',
        opacity: 0,
      },
    };

    render(<PhotoBackground config={config} />);

    const overlay = screen.queryByTestId('photo-overlay');
    expect(overlay).toBeNull();
  });

  it('shows error fallback when image fails to load', async () => {
    const config: PhotoBackgroundConfig = {
      url: '/invalid.jpg',
      placeholderColor: '#1e293b',
      blur: 0,
      overlay: {
        enabled: false,
        color: '#000000',
        opacity: 0,
      },
    };

    render(<PhotoBackground config={config} />);

    await waitFor(() => {
      expect(mockImages.length).toBe(1);
    });

    // Simulate error
    mockImages[0].onerror?.();

    await waitFor(() => {
      const error = screen.getByTestId('photo-error');
      expect(error).toBeTruthy();
      expect(error.style.backgroundColor).toBe('rgb(30, 41, 59)');
    });
  });

  it('skips to high-res if low-res fails to load', async () => {
    const config: PhotoBackgroundConfig = {
      url: '/high-res.jpg',
      lowResUrl: '/invalid-low-res.jpg',
      placeholderColor: '#1e293b',
      blur: 0,
      overlay: {
        enabled: false,
        color: '#000000',
        opacity: 0,
      },
    };

    render(<PhotoBackground config={config} />);

    await waitFor(() => {
      expect(mockImages.length).toBe(1);
    });

    // Simulate low-res error
    mockImages[0].onerror?.();

    // Wait for high-res to be created
    await waitFor(() => {
      expect(mockImages.length).toBe(2);
    });

    // Simulate high-res success
    mockImages[1].onload?.();

    await waitFor(() => {
      const highResImage = screen.getByTestId('photo-image-high-res');
      expect(highResImage).toBeTruthy();
    });
  });

  it('resets to placeholder when config changes', async () => {
    const config1: PhotoBackgroundConfig = {
      url: '/image1.jpg',
      placeholderColor: '#1e293b',
      blur: 0,
      overlay: {
        enabled: false,
        color: '#000000',
        opacity: 0,
      },
    };

    const { rerender } = render(<PhotoBackground config={config1} />);

    await waitFor(() => {
      expect(mockImages.length).toBe(1);
    });

    mockImages[0].onload?.();

    await waitFor(() => {
      screen.getByTestId('photo-image-high-res');
    });

    // Change config
    const config2: PhotoBackgroundConfig = {
      url: '/image2.jpg',
      placeholderColor: '#0f172a',
      blur: 0,
      overlay: {
        enabled: false,
        color: '#000000',
        opacity: 0,
      },
    };

    rerender(<PhotoBackground config={config2} />);

    // Should show placeholder again
    await waitFor(() => {
      const placeholder = screen.getByTestId('photo-placeholder');
      expect(placeholder).toBeTruthy();
    });
  });
});
