import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DisplaySettings } from './DisplaySettings';

// Mock the useDisplaySettings hook
const mockUpdateSettings = vi.fn();
const mockResetSettings = vi.fn();

vi.mock('../../../common/hooks/useDisplaySettings', () => ({
  useDisplaySettings: () => ({
    settings: {
      textSize: 'medium',
      density: 'comfortable',
      sidebarWidth: 'medium',
      theme: 'dark',
      animationSpeed: 'normal',
      reducedMotion: false,
    },
    updateSettings: mockUpdateSettings,
    resetSettings: mockResetSettings,
  }),
}));

describe('DisplaySettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render all settings sections', () => {
      render(<DisplaySettings />);

      expect(screen.getByText('Text Size')).toBeInTheDocument();
      expect(screen.getByText('Spacing Density')).toBeInTheDocument();
      expect(screen.getByText('Sidebar Width')).toBeInTheDocument();
      expect(screen.getAllByText('Theme')[0]).toBeInTheDocument();
      expect(screen.getByText('Animation Speed')).toBeInTheDocument();
    });

    it('should render reset button', () => {
      render(<DisplaySettings />);

      expect(screen.getByText('Reset to Defaults')).toBeInTheDocument();
    });

    it('should render all text size options', () => {
      render(<DisplaySettings />);

      expect(screen.getByText('Small')).toBeInTheDocument();
      expect(screen.getAllByText('Medium')[0]).toBeInTheDocument();
      expect(screen.getByText('Large')).toBeInTheDocument();
      expect(screen.getByText('Extra large')).toBeInTheDocument();
    });

    it('should render all density options', () => {
      render(<DisplaySettings />);

      expect(screen.getByText('Compact')).toBeInTheDocument();
      expect(screen.getByText('Comfortable')).toBeInTheDocument();
      expect(screen.getByText('Spacious')).toBeInTheDocument();
    });

    it('should render all sidebar width options', () => {
      render(<DisplaySettings />);

      const widthButtons = screen.getAllByText(/Narrow|Medium|Wide/);
      expect(widthButtons.length).toBeGreaterThanOrEqual(3);
    });

    it('should render all theme options', () => {
      render(<DisplaySettings />);

      const themeButtons = screen.getAllByText(/Light|Dark|Auto/);
      expect(themeButtons.length).toBeGreaterThanOrEqual(3);
    });

    it('should render all animation speed options', () => {
      render(<DisplaySettings />);

      expect(screen.getByText('None')).toBeInTheDocument();
      expect(screen.getByText('Reduced')).toBeInTheDocument();
      expect(screen.getByText('Normal')).toBeInTheDocument();
      expect(screen.getByText('Enhanced')).toBeInTheDocument();
    });
  });

  describe('Text Size', () => {
    it('should call updateSettings when text size is changed', () => {
      render(<DisplaySettings />);

      const largeButton = screen.getByText('Large');
      fireEvent.click(largeButton);

      expect(mockUpdateSettings).toHaveBeenCalledWith({ textSize: 'large' });
    });

    it('should show preview component', () => {
      const { container } = render(<DisplaySettings />);

      // Check that preview section exists
      expect(screen.getByText('Sample Heading')).toBeInTheDocument();
    });

    it('should update all text size options', () => {
      render(<DisplaySettings />);

      const sizes = ['Small', 'Large', 'Extra large'];
      sizes.forEach((size) => {
        const button = screen.getByText(size);
        fireEvent.click(button);
        expect(mockUpdateSettings).toHaveBeenCalled();
      });

      // Test Medium separately since there are multiple
      const mediumButton = screen.getAllByText('Medium')[0];
      fireEvent.click(mediumButton);
      expect(mockUpdateSettings).toHaveBeenCalled();
    });
  });

  describe('Density', () => {
    it('should call updateSettings when density is changed', () => {
      render(<DisplaySettings />);

      const compactButton = screen.getByText('Compact');
      fireEvent.click(compactButton);

      expect(mockUpdateSettings).toHaveBeenCalledWith({ density: 'compact' });
    });

    it('should show density preview', () => {
      const { container } = render(<DisplaySettings />);

      // Check for preview elements
      const previews = container.querySelectorAll('.bg-surface-elevated.rounded');
      expect(previews.length).toBeGreaterThan(0);
    });

    it('should update all density options', () => {
      render(<DisplaySettings />);

      const densities = ['Compact', 'Comfortable', 'Spacious'];
      densities.forEach((density) => {
        const button = screen.getByText(density);
        fireEvent.click(button);
        expect(mockUpdateSettings).toHaveBeenCalled();
      });
    });
  });

  describe('Sidebar Width', () => {
    it('should call updateSettings when sidebar width is changed', () => {
      render(<DisplaySettings />);

      const wideButton = screen.getAllByText('Wide')[0];
      fireEvent.click(wideButton);

      expect(mockUpdateSettings).toHaveBeenCalledWith({ sidebarWidth: 'wide' });
    });

    it('should show sidebar width preview', () => {
      const { container } = render(<DisplaySettings />);

      // Check for preview elements in sidebar section
      const previews = container.querySelectorAll('.bg-surface-elevated.rounded');
      expect(previews.length).toBeGreaterThan(0);
    });
  });

  describe('Theme', () => {
    it('should call updateSettings when theme is changed', () => {
      render(<DisplaySettings />);

      const lightButton = screen.getAllByText('Light')[0];
      fireEvent.click(lightButton);

      expect(mockUpdateSettings).toHaveBeenCalledWith({ theme: 'light' });
    });

    it('should show theme description for dark theme', () => {
      render(<DisplaySettings />);

      expect(screen.getByText('Currently using dark theme')).toBeInTheDocument();
    });

    it('should update all theme options', () => {
      render(<DisplaySettings />);

      const themes = ['Light', 'Dark', 'Auto'];
      themes.forEach((theme) => {
        const button = screen.getAllByText(theme)[0];
        fireEvent.click(button);
        expect(mockUpdateSettings).toHaveBeenCalled();
      });
    });
  });

  describe('Animation Speed', () => {
    it('should call updateSettings when animation speed is changed', () => {
      render(<DisplaySettings />);

      const enhancedButton = screen.getByText('Enhanced');
      fireEvent.click(enhancedButton);

      expect(mockUpdateSettings).toHaveBeenCalledWith({ animationSpeed: 'enhanced' });
    });

    it('should update all animation speed options', () => {
      render(<DisplaySettings />);

      const speeds = ['None', 'Reduced', 'Normal', 'Enhanced'];
      speeds.forEach((speed) => {
        const button = screen.getByText(speed);
        fireEvent.click(button);
        expect(mockUpdateSettings).toHaveBeenCalled();
      });
    });
  });

  describe('Reset Functionality', () => {
    it('should call resetSettings when reset button is clicked', () => {
      render(<DisplaySettings />);

      const resetButton = screen.getByText('Reset to Defaults');
      fireEvent.click(resetButton);

      expect(mockResetSettings).toHaveBeenCalledTimes(1);
    });
  });

  describe('Active State Styling', () => {
    it('should highlight active text size', () => {
      const { container } = render(<DisplaySettings />);

      const mediumButton = screen.getAllByText('Medium')[0];
      expect(mediumButton).toHaveClass('bg-primary-600');
    });

    it('should highlight active density', () => {
      const { container } = render(<DisplaySettings />);

      const comfortableButton = screen.getByText('Comfortable');
      expect(comfortableButton).toHaveClass('bg-primary-600');
    });

    it('should highlight active theme', () => {
      const { container } = render(<DisplaySettings />);

      const darkButton = screen.getAllByText('Dark')[0];
      expect(darkButton).toHaveClass('bg-primary-600');
    });
  });

  describe('Custom className', () => {
    it('should accept custom className', () => {
      const { container } = render(<DisplaySettings className="custom-class" />);

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('custom-class');
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels', () => {
      render(<DisplaySettings />);

      // Use more specific queries to avoid multiple matches
      const sizeLabel = screen.getAllByText('Size')[0];
      const densityLabel = screen.getAllByText('Density')[0];
      const widthLabel = screen.getAllByText('Width')[0];
      const themeLabel = screen.getAllByText('Theme')[0];
      const speedLabel = screen.getAllByText('Speed')[0];

      expect(sizeLabel).toBeInTheDocument();
      expect(densityLabel).toBeInTheDocument();
      expect(widthLabel).toBeInTheDocument();
      expect(themeLabel).toBeInTheDocument();
      expect(speedLabel).toBeInTheDocument();
    });

    it('should have clickable buttons', () => {
      render(<DisplaySettings />);

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('Preview Sections', () => {
    it('should show preview sections', () => {
      render(<DisplaySettings />);

      // Check for preview components
      expect(screen.getByText('Sample Heading')).toBeInTheDocument();
      expect(screen.getByText(/Field Label/)).toBeInTheDocument();
    });

    it('should render preview components', () => {
      const { container } = render(<DisplaySettings />);

      // Check that preview sections exist
      const previews = container.querySelectorAll('.bg-surface-base.rounded-lg');
      expect(previews.length).toBeGreaterThan(0);
    });
  });
});
