import { describe, it, expect, beforeEach, vi } from 'vitest';
import { updateFavicon, getFaviconUrl, getAppIconUrl, getPageTitle } from '../favicon';

// Mock DOM methods
const mockQuerySelector = vi.fn();
const mockRemove = vi.fn();
const mockAppendChild = vi.fn();
const mockCreateElement = vi.fn();

Object.defineProperty(document, 'querySelector', {
  value: mockQuerySelector,
});

Object.defineProperty(document, 'createElement', {
  value: mockCreateElement,
});

Object.defineProperty(document.head, 'appendChild', {
  value: mockAppendChild,
});

describe('Favicon Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQuerySelector.mockReturnValue(null);
    mockCreateElement.mockReturnValue({
      rel: '',
      href: '',
      type: '',
    });
  });

  describe('updateFavicon', () => {
    it('should update favicon when provided', () => {
      const mockLink = { rel: '', href: '', type: '', remove: mockRemove };
      mockQuerySelector.mockReturnValue(mockLink);
      mockCreateElement.mockReturnValue(mockLink);

      updateFavicon({ favicon: '/test-favicon.png' });

      expect(mockQuerySelector).toHaveBeenCalledWith('link[rel="icon"]');
      expect(mockCreateElement).toHaveBeenCalledWith('link');
      expect(mockAppendChild).toHaveBeenCalled();
    });

    it('should update page title when provided', () => {
      updateFavicon({ title: 'Test App' });

      expect(document.title).toBe('Test App');
    });

    it('should update app icon when provided', () => {
      const mockLink = { rel: '', href: '', type: '', remove: mockRemove };
      mockQuerySelector.mockReturnValue(mockLink);
      mockCreateElement.mockReturnValue(mockLink);

      updateFavicon({ icon: '/test-icon.png' });

      expect(mockQuerySelector).toHaveBeenCalledWith('link[rel="apple-touch-icon"]');
    });
  });

  describe('getFaviconUrl', () => {
    it('should return configured favicon URL', () => {
      const config = {
        branding: {
          company: {
            favicon: '/custom-favicon.png'
          }
        }
      };

      expect(getFaviconUrl(config)).toBe('/custom-favicon.png');
    });

    it('should return default favicon URL when not configured', () => {
      const config = {};

      expect(getFaviconUrl(config)).toBe('/assets/icons/favicon.png');
    });
  });

  describe('getAppIconUrl', () => {
    it('should return configured icon URL', () => {
      const config = {
        branding: {
          company: {
            icon: '/custom-icon.png'
          }
        }
      };

      expect(getAppIconUrl(config)).toBe('/custom-icon.png');
    });

    it('should fallback to logo when icon not configured', () => {
      const config = {
        branding: {
          company: {
            logo: '/custom-logo.png'
          }
        }
      };

      expect(getAppIconUrl(config)).toBe('/custom-logo.png');
    });

    it('should return default icon URL when nothing configured', () => {
      const config = {};

      expect(getAppIconUrl(config)).toBe('/assets/icons/icon.png');
    });
  });

  describe('getPageTitle', () => {
    it('should return configured company name', () => {
      const config = {
        branding: {
          company: {
            name: 'Custom Company'
          }
        }
      };

      expect(getPageTitle(config)).toBe('Custom Company');
    });

    it('should return default title when not configured', () => {
      const config = {};

      expect(getPageTitle(config)).toBe('EasySale');
    });
  });
});
