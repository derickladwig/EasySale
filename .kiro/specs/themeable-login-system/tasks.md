# Implementation Plan: Themeable Login System

## Overview

This implementation plan transforms the EasySale login interface from a single hardcoded layout into a flexible, configuration-driven system. The approach follows a layered architecture: first establishing the theme infrastructure (tokens, validation, provider), then building the slot-based layout system, followed by componentization of UI elements, and finally wiring everything together with configuration loading and visual proof.

The implementation prioritizes incremental validation—each epic includes checkpoint tasks to ensure tests pass and the system remains functional before proceeding to the next layer.

## Tasks

- [x] 1. Set up theme system foundation
  - Create JSON schema for theme configuration
  - Implement ThemeProvider with CSS variable binding
  - Create three preset configuration files
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 1.1 Create theme configuration JSON schema
  - Define TypeScript interfaces for ThemeConfig, TokenConfig, LayoutConfig, ComponentConfig, BackgroundConfig
  - Implement Zod schema for runtime validation
  - Add schema validation tests for valid and invalid configurations
  - _Requirements: 1.2_

- [x] 1.2 Write property test for configuration validation
  - **Property 1: Configuration Loading and Validation**
  - **Validates: Requirements 1.1, 1.2, 1.3**

- [x] 1.3 Implement ThemeProvider component
  - Create ThemeProvider React context
  - Implement loadTheme() method with schema validation
  - Implement applyTheme() method to map tokens to CSS custom properties
  - Add fallback to default Minimal Dark Split preset on validation failure
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 1.4 Write property test for token application
  - **Property 2: Token Application Consistency**
  - **Validates: Requirements 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8**

- [x] 1.5 Create preset configuration files
  - Create minimalDark.json with splitHeroCompactForm template
  - Create glassWaves.json with leftStatusRightAuthCard template
  - Create ambientPhoto.json with leftStatusRightAuthCardPhoto template
  - _Requirements: 1.1_

- [x] 1.6 Write property test for preset switching
  - **Property 3: Preset Switching Without Reload**
  - **Validates: Requirements 1.5, 1.6**

- [x] 2. Checkpoint - Verify theme system foundation
  - Ensure all tests pass, ask the user if questions arise.


- [x] 3. Build slot-based layout system
  - Implement LoginShell component with five configurable slots
  - Create three layout templates
  - Wire slots to render appropriate content based on template
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 3.1 Implement LoginShell component
  - Create LoginShell component with HeaderSlot, LeftSlot, MainSlot, FooterSlot, BackgroundSlot
  - Add responsive layout logic for mobile/tablet/desktop/kiosk breakpoints
  - Implement slot rendering with conditional display based on template
  - _Requirements: 2.2, 2.3_

- [x] 3.2 Write property test for template slot rendering
  - **Property 4: Template Slot Rendering**
  - **Validates: Requirements 2.2, 2.6**

- [x] 3.3 Implement Template A (splitHeroCompactForm)
  - Create template configuration with marketing hero in LeftSlot
  - Configure compact auth panel in MainSlot
  - Set dark gradient background
  - _Requirements: 2.1, 2.4_

- [x] 3.4 Implement Template B/C structure (leftStatusRightAuthCard)
  - Create template configuration with SystemStatusCard in LeftSlot
  - Configure AuthCard in MainSlot
  - Add environment selector to HeaderSlot
  - _Requirements: 2.1, 2.5_

- [x] 3.5 Write unit tests for template rendering
  - Test Template A renders marketing hero and compact form
  - Test Template B/C renders status card and auth card
  - Test empty slots render without errors
  - _Requirements: 2.1, 2.4, 2.5, 2.6_

- [x] 4. Checkpoint - Verify layout system
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement BackgroundRenderer component
  - Create background rendering system supporting four types
  - Add overlay and blur effects
  - Implement low-power mode
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

- [x] 5.1 Create BackgroundRenderer component structure
  - Implement base BackgroundRenderer component with type switching
  - Add overlay layer with configurable opacity
  - Implement fallback to solid dark background on error
  - _Requirements: 4.1, 4.7_

- [x] 5.2 Implement gradient background mode
  - Create GradientBackground component
  - Support multi-stop gradients from token configuration
  - _Requirements: 4.2_

- [x] 5.3 Implement waves background mode
  - Create WavesBackground component with SVG wave shapes
  - Add optional dot-grid texture overlay
  - Make wave intensity configurable via tokens
  - _Requirements: 4.3, 4.6_

- [x] 5.4 Implement photo background mode
  - Create PhotoBackground component
  - Add progressive image loading (placeholder → low-res → high-res)
  - Implement configurable blur and overlay for readability
  - _Requirements: 4.4, 4.5_

- [x] 5.5 Write property test for background rendering
  - **Property 5: Background Rendering Based on Type**
  - **Validates: Requirements 4.2, 4.3, 4.4, 4.5, 4.7**

- [x] 5.6 Write property test for image loading optimization
  - **Property 18: Image Loading Optimization**
  - **Validates: Requirements 11.3**

- [x] 5.7 Write unit tests for background modes
  - Test gradient renders with configured color stops
  - Test waves render with dot-grid when enabled
  - Test photo renders with overlay and blur
  - Test fallback to solid background on error
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.6, 4.7_

- [x] 6. Checkpoint - Verify background rendering
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement AuthCard component
  - Create authentication card with all features
  - Add method tabs, pickers, and inputs
  - Implement glassmorphism styling
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

- [x] 7.1 Create AuthCard component structure
  - Implement base AuthCard with configurable elevation, blur, radius, padding
  - Add glassmorphism styling when enabled
  - Display headline, credential inputs, and submit button
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 7.2 Add authentication method tabs
  - Create AuthMethodTabs component (PIN / Password / Badge)
  - Implement tab switching logic
  - Show/hide tabs based on configuration
  - _Requirements: 5.4_

- [x] 7.3 Add store and station pickers
  - Create StoreStationPicker component
  - Display pickers above credential inputs when enabled
  - Implement selection logic
  - _Requirements: 5.5_

- [x] 7.4 Add device identity display
  - Create DeviceIdentityRow component
  - Display device name and "remember station" checkbox
  - Show only when enabled in configuration
  - _Requirements: 5.6_

- [x] 7.5 Add demo accounts accordion
  - Create DemoAccountsAccordion component
  - Display demo accounts in collapsible section
  - Show only when demo accounts are configured
  - _Requirements: 5.7_

- [x] 7.6 Write property test for auth card configuration rendering
  - **Property 15: Auth Card Configuration Rendering**
  - **Validates: Requirements 5.1, 5.4, 5.7**

- [x] 7.7 Write unit tests for AuthCard features
  - Test glassmorphism applies backdrop blur and transparency
  - Test method tabs display when multiple methods configured
  - Test store/station pickers display when enabled
  - Test device identity displays when enabled
  - Test demo accounts accordion displays when configured
  - _Requirements: 5.2, 5.4, 5.5, 5.6, 5.7_

- [x] 8. Checkpoint - Verify AuthCard component
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement SystemStatusCard component
  - Create operational status display
  - Support two variants (systemForward, locationForward)
  - Display database, sync, and location information
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

- [x] 9.1 Create SystemStatusCard component
  - Implement base card with database status indicator
  - Add sync status indicator
  - Display last sync timestamp with human-readable formatting
  - Show store name and station identifier
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 9.2 Implement variant support
  - Create systemForward variant emphasizing database and sync
  - Create locationForward variant emphasizing store and station
  - Apply variant-specific styling and hierarchy
  - _Requirements: 6.5, 6.6_

- [x] 9.3 Add offline status handling
  - Display offline indicator when sync status is offline
  - Apply warning styling to offline state
  - Show offline guidance text
  - _Requirements: 6.7_

- [x] 9.4 Write property test for timestamp formatting
  - **Property 16: Timestamp Formatting**
  - **Validates: Requirements 6.3**

- [x] 9.5 Write unit tests for SystemStatusCard
  - Test systemForward variant emphasizes database/sync
  - Test locationForward variant emphasizes store/station
  - Test offline indicator displays with warning styling
  - Test timestamp formats correctly
  - _Requirements: 6.3, 6.5, 6.6, 6.7_

- [x] 10. Checkpoint - Verify SystemStatusCard component
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Implement ErrorCallout component
  - Create error display with inline and callout modes
  - Add action buttons (Retry, Diagnostics)
  - Support different severity levels
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

- [x] 11.1 Create ErrorCallout component
  - Implement base component with severity styling (error, warning, info)
  - Support inline and callout presentation modes
  - Display error message and optional details
  - _Requirements: 7.1, 7.3, 7.4_

- [x] 11.2 Add action buttons
  - Create Retry and Diagnostics action buttons
  - Implement click handlers for actions
  - Show buttons based on configuration
  - _Requirements: 7.5, 7.6, 7.7_

- [x] 11.3 Add offline indicator
  - Display offline indicator when network is unavailable
  - Apply appropriate styling
  - _Requirements: 7.2_

- [x] 11.4 Write property test for error display
  - **Property 14: Error Display**
  - **Validates: Requirements 7.1**

- [x] 11.5 Write unit tests for ErrorCallout
  - Test inline presentation renders adjacent to inputs
  - Test callout presentation renders in dedicated panel
  - Test Retry button triggers re-attempt
  - Test Diagnostics button shows error details
  - Test offline indicator displays when network unavailable
  - _Requirements: 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

- [x] 12. Checkpoint - Verify ErrorCallout component
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Implement Header and Footer components
  - Create header with logo, environment selector, and help menu
  - Create footer with version, build, and copyright
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

- [x] 13.1 Create HeaderSlot component
  - Display company logo and name from configuration
  - Add environment selector pill (Demo/Production)
  - Add optional help and settings icons
  - _Requirements: 9.1, 9.2, 9.6_

- [x] 13.2 Implement environment switching
  - Create environment pill dropdown
  - Implement switching logic between Demo and Production
  - Update UI to reflect current environment
  - _Requirements: 9.3_

- [x] 13.3 Create FooterSlot component
  - Display version number and build identifier
  - Display copyright text from configuration
  - _Requirements: 9.4, 9.5_

- [x] 13.4 Write unit tests for Header and Footer
  - Test header displays logo and company name
  - Test environment selector displays when enabled
  - Test environment switching works correctly
  - Test footer displays version, build, and copyright
  - Test help icons display when enabled
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

- [x] 14. Checkpoint - Verify Header and Footer components
  - Ensure all tests pass, ask the user if questions arise.

- [x] 15. Implement configuration loading and distribution
  - Create configuration loader with precedence rules
  - Add caching for offline access
  - Implement remote configuration updates
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

- [x] 15.1 Implement configuration loader
  - Create loadConfiguration() method supporting three sources
  - Implement precedence: device override > store override > tenant default
  - Add fallback to built-in default preset on failure
  - _Requirements: 8.1, 8.2, 8.5_

- [x] 15.2 Add configuration caching
  - Implement localStorage caching for loaded configurations
  - Use cached configuration when network is unavailable
  - _Requirements: 8.3, 8.4_

- [x] 15.3 Implement remote configuration updates
  - Add change detection for remote configuration
  - Prompt user to reload when configuration changes
  - _Requirements: 8.6_

- [x] 15.4 Write property test for configuration precedence
  - **Property 6: Configuration Precedence**
  - **Validates: Requirements 8.2**

- [x] 15.5 Write property test for configuration caching
  - **Property 7: Configuration Caching and Offline Access**
  - **Validates: Requirements 8.3, 8.5**

- [x] 15.6 Write unit tests for configuration loading
  - Test tenant default loads correctly
  - Test store override takes precedence
  - Test device override takes precedence
  - Test cached configuration used when offline
  - Test default preset used when all sources fail
  - Test change detection prompts for reload
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

- [x] 16. Checkpoint - Verify configuration loading
  - Ensure all tests pass, ask the user if questions arise.

- [x] 17. Implement accessibility features
  - Add keyboard navigation support
  - Implement ARIA labels and screen reader announcements
  - Ensure contrast compliance
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

- [x] 17.1 Add keyboard navigation
  - Ensure all interactive elements are keyboard accessible
  - Implement visible focus indicators
  - Test tab order follows logical flow
  - _Requirements: 10.1, 10.2_

- [x] 17.2 Add ARIA labels
  - Add aria-label or aria-labelledby to all interactive elements
  - Implement screen reader announcements for status changes
  - Test with screen readers (NVDA, JAWS, VoiceOver)
  - _Requirements: 10.3, 10.6_

- [x] 17.3 Ensure contrast compliance
  - Validate contrast ratios meet WCAG AA standards (4.5:1)
  - Adjust text colors when glassmorphism or photo backgrounds are used
  - Provide high contrast mode option
  - _Requirements: 10.4, 10.5_

- [x] 17.4 Add responsive rendering
  - Test rendering at viewport widths from 320px to 3840px
  - Ensure no horizontal scrolling or layout breakage
  - Adjust layout for mobile/tablet/desktop/kiosk
  - _Requirements: 10.7_

- [x] 17.5 Write property test for keyboard navigation
  - **Property 8: Keyboard Navigation Accessibility**
  - **Validates: Requirements 10.1, 10.2**

- [x] 17.6 Write property test for ARIA labels
  - **Property 9: ARIA Label Completeness**
  - **Validates: Requirements 10.3**

- [x] 17.7 Write property test for contrast compliance
  - **Property 10: Text Contrast Compliance**
  - **Validates: Requirements 10.4, 10.5**

- [x] 17.8 Write property test for responsive rendering
  - **Property 11: Responsive Rendering**
  - **Validates: Requirements 10.7**

- [x] 17.9 Write property test for screen reader announcements
  - **Property 17: Screen Reader Announcements**
  - **Validates: Requirements 10.6**

- [x] 18. Checkpoint - Verify accessibility features
  - Ensure all tests pass, ask the user if questions arise.

- [x] 19. Implement performance optimizations
  - Add render performance monitoring
  - Implement low-power mode
  - Optimize animation performance
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

- [x] 19.1 Add performance monitoring
  - Implement render time tracking
  - Add frame rate monitoring for animations
  - Log performance metrics
  - _Requirements: 11.1, 11.2, 11.5, 11.6_

- [x] 19.2 Implement low-power mode
  - Detect frame rate drops (< 30fps for 3 seconds)
  - Automatically enable low-power mode on degradation
  - Disable blur, shadows, and particle effects in low-power mode
  - Allow manual toggle in settings
  - _Requirements: 11.4_

- [x] 19.3 Optimize image loading
  - Implement progressive enhancement for photo backgrounds
  - Use placeholder → low-res → high-res loading strategy
  - _Requirements: 11.3_

- [x] 19.4 Write property test for render performance
  - **Property 12: Render Performance**
  - **Validates: Requirements 11.1, 11.6**

- [x] 19.5 Write property test for animation performance
  - **Property 13: Animation Performance**
  - **Validates: Requirements 11.2, 11.5**

- [x] 19.6 Write unit tests for performance features
  - Test low-power mode disables effects
  - Test frame rate monitoring detects drops
  - Test progressive image loading works correctly
  - _Requirements: 11.3, 11.4_

- [x] 20. Checkpoint - Verify performance optimizations
  - Ensure all tests pass, ask the user if questions arise.

- [x] 21. Create visual regression tests and proof
  - Set up Playwright visual regression testing
  - Capture screenshots for all presets and states
  - Document visual differences
  - _Requirements: 12.1, 12.2, 12.3, 12.4_

- [x] 21.1 Set up Playwright visual regression
  - Configure Playwright for screenshot comparison
  - Create baseline screenshots for all presets
  - Set up CI/CD integration for visual regression
  - _Requirements: 12.4_

- [x] 21.2 Create preset screenshots
  - Capture Preset A (Minimal Dark Split) at 1920x1080, 1366x768, 768x1024
  - Capture Preset B (Glass + Waves) at 1920x1080, 1366x768, 768x1024
  - Capture Preset C (Ambient Photo) at 1920x1080, 1366x768, 768x1024
  - _Requirements: 12.1, 12.2, 12.3, 12.4_

- [x] 21.3 Capture state variations
  - Screenshot each preset in normal, loading, error, and offline states
  - Capture focus states for all interactive elements
  - Capture hover states for buttons and links
  - _Requirements: 12.4_

- [x] 21.4 Write unit tests for preset rendering
  - Test Preset A renders with marketing hero and compact form
  - Test Preset B renders with status card and glass auth card
  - Test Preset C renders with photo background and location-forward status
  - _Requirements: 12.1, 12.2, 12.3_

- [x] 22. Final checkpoint - Complete system integration
  - Ensure all tests pass, ask the user if questions arise.

- [x] 23. Integration and wiring
  - Wire all components together in LoginShell
  - Connect ThemeProvider to application root
  - Test end-to-end flows
  - _Requirements: All_

- [x] 23.1 Wire components in LoginShell
  - Connect BackgroundRenderer to BackgroundSlot
  - Connect Header and Footer to respective slots
  - Connect AuthCard and SystemStatusCard to MainSlot and LeftSlot
  - Ensure all components receive theme tokens from ThemeProvider
  - _Requirements: All_

- [x] 23.2 Connect ThemeProvider to application
  - Wrap application root with ThemeProvider
  - Load initial theme configuration on app start
  - Test preset switching in running application
  - _Requirements: 1.1, 1.5, 1.6_

- [x] 23.3 Write integration tests
  - Test fresh install loads default preset
  - Test custom preset loads after configuration
  - Test offline mode uses cached configuration
  - Test preset switching updates UI correctly
  - Test low-power mode activates on performance degradation
  - _Requirements: All_

- [x] 24. Final verification and documentation
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Integration tests validate end-to-end workflows
- Visual regression tests validate preset rendering accuracy
