# Design Document: Themeable Login System

## Overview

The Themeable Login System transforms EasySale's authentication interface from a single hardcoded layout into a flexible, configuration-driven system supporting multiple visual presentations. The architecture separates concerns into three layers: theme configuration (tokens and presets), layout templates (slot-based composition), and reusable components (cards, inputs, status displays).

This design enables runtime switching between three distinct presets—Minimal Dark Split (current), Glass + Waves (modern card-focused), and Ambient Photo (location-forward)—without code changes, while maintaining consistent authentication logic and offline-first operational clarity.

The system prioritizes:
- **Configuration over code**: All visual decisions driven by JSON tokens
- **Resilient defaults**: Safe fallback preset when configuration fails
- **Performance**: Optimized rendering with low-power mode for resource-constrained devices
- **Accessibility**: WCAG AA compliance across all presets and backgrounds
- **Tenant isolation**: Independent theme configuration per tenant/store/device

## Architecture

### High-Level Component Structure

```
┌─────────────────────────────────────────────────────────────┐
│                      LoginShell                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              BackgroundRenderer                        │  │
│  │  (gradient / waves / photo + overlay + effects)       │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              HeaderSlot                                │  │
│  │  [Logo] [Environment Pill] [Help Menu]                │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌──────────────────┬────────────────────────────────────┐  │
│  │   LeftSlot       │       MainSlot                     │  │
│  │                  │                                    │  │
│  │  Marketing Hero  │      AuthCard                     │  │
│  │  OR              │      - Method Tabs                │  │
│  │  SystemStatus    │      - Store/Station Pickers      │  │
│  │  Card            │      - Credential Inputs          │  │
│  │                  │      - Error Callout              │  │
│  │                  │      - Demo Accounts Accordion    │  │
│  └──────────────────┴────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              FooterSlot                                │  │
│  │  [Version] [Build] [Copyright]                        │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### System Layers


**Layer 1: Theme Configuration**
- JSON schema-validated theme files
- Token categories: colors, typography, spacing, shadows, blur, radius, background
- Preset files combining tokens + layout template + component variants
- Configuration loader with precedence: device > store > tenant > default

**Layer 2: Layout Templates**
- Slot-based composition system (Header, Left, Main, Footer, Background)
- Three templates: splitHeroCompactForm, leftStatusRightAuthCard, leftStatusRightAuthCardPhoto
- Template selection drives slot content and arrangement
- Responsive breakpoints adapt slot layout for mobile/tablet/desktop/kiosk

**Layer 3: Reusable Components**
- AuthCard: credential collection with method tabs, pickers, inputs
- SystemStatusCard: operational status display with two variants
- BackgroundRenderer: background style rendering with effects
- ErrorCallout: error presentation with actions
- Header/Footer: branding and metadata display

### Data Flow

```
Configuration Load → Theme Provider → CSS Variables → Component Rendering
     ↓                    ↓                ↓                  ↓
  JSON Files         Token Parsing    Style Application   UI Update
  (tenant/store/     Validation       (colors, spacing,   (re-render
   device/default)   Caching          typography, etc.)    with tokens)
```

## Components and Interfaces

### ThemeProvider

**Responsibilities:**
- Load theme configuration from multiple sources with precedence
- Validate configuration against JSON schema
- Apply tokens to CSS custom properties
- Cache configuration in localStorage for offline access
- Handle runtime preset switching
- Provide fallback to default preset on failure

**Interface:**
```typescript
interface ThemeProvider {
  loadTheme(): Promise<ThemeConfig>;
  applyTheme(config: ThemeConfig): void;
  switchPreset(presetName: string): void;
  getCachedTheme(): ThemeConfig | null;
  validateTheme(config: unknown): ThemeConfig;
}

interface ThemeConfig {
  name: string;
  version: string;
  layout: LayoutConfig;
  tokens: TokenConfig;
  components: ComponentConfig;
  background: BackgroundConfig;
}
```


### LoginShell

**Responsibilities:**
- Orchestrate slot rendering based on active template
- Manage responsive layout breakpoints
- Coordinate background and foreground layers
- Handle template transitions

**Interface:**
```typescript
interface LoginShell {
  template: LayoutTemplate;
  slots: {
    header?: React.ReactNode;
    left?: React.ReactNode;
    main: React.ReactNode;
    footer?: React.ReactNode;
    background?: React.ReactNode;
  };
  render(): React.ReactElement;
}

type LayoutTemplate = 
  | 'splitHeroCompactForm'
  | 'leftStatusRightAuthCard'
  | 'leftStatusRightAuthCardPhoto';
```

### AuthCard

**Responsibilities:**
- Render authentication form with configured methods
- Display store/station pickers when enabled
- Show device identity and remember station option
- Present demo accounts in collapsible accordion
- Handle credential input validation and submission
- Display inline or callout errors

**Interface:**
```typescript
interface AuthCard {
  methods: AuthMethod[];
  showStorePicker: boolean;
  showStationPicker: boolean;
  showDeviceIdentity: boolean;
  showDemoAccounts: boolean;
  errorPresentation: 'inline' | 'callout';
  onSubmit: (credentials: Credentials) => Promise<void>;
  onMethodChange: (method: AuthMethod) => void;
}

type AuthMethod = 'pin' | 'password' | 'badge';

interface Credentials {
  method: AuthMethod;
  username?: string;
  password?: string;
  pin?: string;
  badgeId?: string;
  storeId?: string;
  stationId?: string;
  rememberStation: boolean;
}
```


### SystemStatusCard

**Responsibilities:**
- Display local database connection status
- Show sync status and last sync timestamp
- Present store and station identity
- Provide offline guidance and actions
- Support two variants: systemForward (emphasize DB/sync) and locationForward (emphasize store/station)

**Interface:**
```typescript
interface SystemStatusCard {
  variant: 'systemForward' | 'locationForward';
  databaseStatus: DatabaseStatus;
  syncStatus: SyncStatus;
  lastSyncTime: Date | null;
  storeInfo: StoreInfo;
  stationInfo: StationInfo;
}

interface DatabaseStatus {
  connected: boolean;
  path: string;
  size: number;
}

interface SyncStatus {
  state: 'online' | 'offline' | 'syncing' | 'error';
  pendingOperations: number;
  lastError?: string;
}

interface StoreInfo {
  id: string;
  name: string;
  location: string;
}

interface StationInfo {
  id: string;
  name: string;
  type: 'pos' | 'kiosk' | 'mobile';
}
```

### BackgroundRenderer

**Responsibilities:**
- Render background based on configured type
- Apply overlay for readability
- Handle blur and effects
- Optimize performance with low-power mode
- Provide fallback on rendering failure

**Interface:**
```typescript
interface BackgroundRenderer {
  type: BackgroundType;
  config: BackgroundConfig;
  lowPowerMode: boolean;
  render(): React.ReactElement;
}

type BackgroundType = 'solid' | 'gradient' | 'waves' | 'photo';

interface BackgroundConfig {
  solid?: { color: string };
  gradient?: { stops: ColorStop[] };
  waves?: { 
    intensity: number;
    dotGrid: boolean;
    colors: string[];
  };
  photo?: {
    url: string;
    blur: number;
    overlayOpacity: number;
    position: 'center' | 'top' | 'bottom';
  };
}

interface ColorStop {
  color: string;
  position: number; // 0-100
}
```


### ErrorCallout

**Responsibilities:**
- Display error messages with appropriate severity styling
- Provide actionable buttons (Retry, Diagnostics)
- Support inline and callout presentation modes
- Show offline indicators

**Interface:**
```typescript
interface ErrorCallout {
  presentation: 'inline' | 'callout';
  severity: 'error' | 'warning' | 'info';
  message: string;
  details?: string;
  actions: ErrorAction[];
  onAction: (action: ErrorAction) => void;
}

interface ErrorAction {
  type: 'retry' | 'diagnostics' | 'dismiss';
  label: string;
  icon?: string;
}
```

## Data Models

### Theme Configuration Schema

```typescript
interface ThemeConfig {
  name: string;
  version: string;
  layout: LayoutConfig;
  tokens: TokenConfig;
  components: ComponentConfig;
  background: BackgroundConfig;
}

interface LayoutConfig {
  template: LayoutTemplate;
  slots: {
    header: { enabled: boolean; components: string[] };
    left: { variant: 'marketing' | 'status' };
    main: { variant: 'compact' | 'card' };
    footer: { enabled: boolean; components: string[] };
  };
  responsive: {
    breakpoints: { mobile: number; tablet: number; desktop: number; kiosk: number };
    stackOnMobile: boolean;
  };
}

interface TokenConfig {
  colors: ColorTokens;
  typography: TypographyTokens;
  spacing: SpacingTokens;
  shadows: ShadowTokens;
  blur: BlurTokens;
  radius: RadiusTokens;
}

interface ColorTokens {
  surface: { primary: string; secondary: string; tertiary: string };
  text: { primary: string; secondary: string; tertiary: string; inverse: string };
  border: { default: string; focus: string; error: string };
  accent: { primary: string; hover: string; active: string };
  status: { success: string; warning: string; error: string; info: string };
}

interface TypographyTokens {
  fontFamily: { primary: string; monospace: string };
  fontSize: { xs: string; sm: string; base: string; lg: string; xl: string; xxl: string };
  fontWeight: { normal: number; medium: number; semibold: number; bold: number };
  lineHeight: { tight: number; normal: number; relaxed: number };
}

interface SpacingTokens {
  scale: { xs: string; sm: string; md: string; lg: string; xl: string; xxl: string };
  density: 'compact' | 'comfortable' | 'spacious';
}

interface ShadowTokens {
  elevation: {
    none: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
}

interface BlurTokens {
  backdrop: { none: string; sm: string; md: string; lg: string };
  enabled: boolean;
}

interface RadiusTokens {
  card: string;
  input: string;
  button: string;
  pill: string;
}
```


### Component Configuration Schema

```typescript
interface ComponentConfig {
  authCard: AuthCardConfig;
  statusCard: StatusCardConfig;
  header: HeaderConfig;
  footer: FooterConfig;
  errorCallout: ErrorCalloutConfig;
}

interface AuthCardConfig {
  methods: AuthMethod[];
  showStorePicker: boolean;
  showStationPicker: boolean;
  showDeviceIdentity: boolean;
  showDemoAccounts: boolean;
  glassmorphism: boolean;
  elevation: 'none' | 'sm' | 'md' | 'lg';
}

interface StatusCardConfig {
  variant: 'systemForward' | 'locationForward';
  showDatabaseStatus: boolean;
  showSyncStatus: boolean;
  showLastSync: boolean;
  showStoreInfo: boolean;
  showStationInfo: boolean;
}

interface HeaderConfig {
  showLogo: boolean;
  showEnvironmentSelector: boolean;
  showHelpMenu: boolean;
  logoUrl?: string;
  companyName: string;
}

interface FooterConfig {
  showVersion: boolean;
  showBuild: boolean;
  showCopyright: boolean;
  copyrightText: string;
}

interface ErrorCalloutConfig {
  presentation: 'inline' | 'callout';
  showRetryAction: boolean;
  showDiagnosticsAction: boolean;
}
```

### Preset Files

**Preset A: Minimal Dark Split (minimalDark.json)**
```json
{
  "name": "Minimal Dark Split",
  "version": "1.0.0",
  "layout": {
    "template": "splitHeroCompactForm",
    "slots": {
      "header": { "enabled": true, "components": ["logo"] },
      "left": { "variant": "marketing" },
      "main": { "variant": "compact" },
      "footer": { "enabled": false, "components": [] }
    }
  },
  "tokens": {
    "colors": {
      "surface": { "primary": "#0f172a", "secondary": "#1e293b", "tertiary": "#334155" },
      "text": { "primary": "#f1f5f9", "secondary": "#cbd5e1", "tertiary": "#94a3b8" },
      "accent": { "primary": "#3b82f6", "hover": "#2563eb", "active": "#1d4ed8" }
    },
    "spacing": { "density": "compact" },
    "shadows": { "elevation": { "none": "none" } },
    "blur": { "enabled": false }
  },
  "background": {
    "type": "gradient",
    "gradient": {
      "stops": [
        { "color": "#0f172a", "position": 0 },
        { "color": "#1e293b", "position": 100 }
      ]
    }
  },
  "components": {
    "authCard": {
      "glassmorphism": false,
      "elevation": "none",
      "showStorePicker": false,
      "showStationPicker": false
    }
  }
}
```


**Preset B: Glass + Waves (glassWaves.json)**
```json
{
  "name": "Glass + Waves",
  "version": "1.0.0",
  "layout": {
    "template": "leftStatusRightAuthCard",
    "slots": {
      "header": { "enabled": true, "components": ["logo", "environmentSelector"] },
      "left": { "variant": "status" },
      "main": { "variant": "card" },
      "footer": { "enabled": true, "components": ["version", "copyright"] }
    }
  },
  "tokens": {
    "colors": {
      "surface": { "primary": "rgba(15, 23, 42, 0.7)", "secondary": "rgba(30, 41, 59, 0.8)" },
      "text": { "primary": "#f1f5f9", "secondary": "#cbd5e1" },
      "accent": { "primary": "#3b82f6", "hover": "#2563eb" }
    },
    "spacing": { "density": "comfortable" },
    "shadows": { "elevation": { "md": "0 4px 6px rgba(0, 0, 0, 0.1)" } },
    "blur": { "enabled": true, "backdrop": { "md": "blur(12px)" } },
    "radius": { "card": "16px", "input": "8px" }
  },
  "background": {
    "type": "waves",
    "waves": {
      "intensity": 0.6,
      "dotGrid": true,
      "colors": ["#1e293b", "#334155", "#475569"]
    }
  },
  "components": {
    "authCard": {
      "glassmorphism": true,
      "elevation": "md",
      "methods": ["pin", "password"],
      "showStorePicker": true,
      "showStationPicker": true
    },
    "statusCard": {
      "variant": "systemForward"
    },
    "errorCallout": {
      "presentation": "callout"
    }
  }
}
```

**Preset C: Ambient Photo (ambientPhoto.json)**
```json
{
  "name": "Ambient Photo",
  "version": "1.0.0",
  "layout": {
    "template": "leftStatusRightAuthCardPhoto",
    "slots": {
      "header": { "enabled": true, "components": ["logo", "environmentSelector"] },
      "left": { "variant": "status" },
      "main": { "variant": "card" },
      "footer": { "enabled": true, "components": ["version", "copyright"] }
    }
  },
  "tokens": {
    "colors": {
      "surface": { "primary": "rgba(15, 23, 42, 0.85)", "secondary": "rgba(30, 41, 59, 0.9)" },
      "text": { "primary": "#ffffff", "secondary": "#e2e8f0" },
      "accent": { "primary": "#3b82f6", "hover": "#2563eb" }
    },
    "spacing": { "density": "comfortable" },
    "shadows": { "elevation": { "lg": "0 10px 15px rgba(0, 0, 0, 0.3)" } },
    "blur": { "enabled": true, "backdrop": { "lg": "blur(16px)" } },
    "radius": { "card": "20px", "input": "10px" }
  },
  "background": {
    "type": "photo",
    "photo": {
      "url": "/assets/backgrounds/register-ambient.jpg",
      "blur": 4,
      "overlayOpacity": 0.6,
      "position": "center"
    }
  },
  "components": {
    "authCard": {
      "glassmorphism": true,
      "elevation": "lg",
      "methods": ["pin", "password", "badge"],
      "showStorePicker": true,
      "showStationPicker": true,
      "showDeviceIdentity": true
    },
    "statusCard": {
      "variant": "locationForward"
    },
    "errorCallout": {
      "presentation": "callout"
    }
  }
}
```


## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property 1: Configuration Loading and Validation

*For any* JSON configuration file, when the Theme_Provider loads it, the configuration should either pass schema validation and be applied, or fail validation and trigger fallback to the default Minimal Dark Split preset.

**Validates: Requirements 1.1, 1.2, 1.3**

### Property 2: Token Application Consistency

*For any* valid theme configuration containing tokens (colors, typography, spacing, shadows, blur, radius, background), when the Theme_Provider applies the configuration, all specified tokens should be reflected in the corresponding CSS custom properties and rendered UI elements.

**Validates: Requirements 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8**

### Property 3: Preset Switching Without Reload

*For any* two valid presets A and B, when switching from preset A to preset B at runtime, the Login_System should re-render with preset B's tokens within 200ms without requiring a page reload.

**Validates: Requirements 1.5, 1.6**

### Property 4: Template Slot Rendering

*For any* valid layout template, when the template is selected, the Login_System should render the appropriate slot arrangement as defined in the template configuration, and any empty or undefined slots should render nothing without throwing errors.

**Validates: Requirements 2.2, 2.6**

### Property 5: Background Rendering Based on Type

*For any* valid background configuration (solid, gradient, waves, or photo), when the Background_Renderer processes the configuration, it should render the specified background type with all configured effects (overlay, blur, dot-grid), or fall back to solid dark background if rendering fails.

**Validates: Requirements 4.2, 4.3, 4.4, 4.5, 4.7**

### Property 6: Configuration Precedence

*For any* combination of tenant default, store override, and device override configurations, when the Theme_Provider loads configurations from multiple sources, the final applied configuration should respect the precedence order: device override > store override > tenant default.

**Validates: Requirements 8.2**

### Property 7: Configuration Caching and Offline Access

*For any* valid theme configuration, when the configuration is successfully loaded, it should be cached in localStorage, and when network connectivity is unavailable, the cached configuration should be used.

**Validates: Requirements 8.3, 8.5**

### Property 8: Keyboard Navigation Accessibility

*For any* interactive element in the Login_System (inputs, buttons, tabs, pickers), when a user navigates using keyboard, the element should be reachable via Tab key and should display a visible focus indicator meeting WCAG standards.

**Validates: Requirements 10.1, 10.2**

### Property 9: ARIA Label Completeness

*For any* interactive element in the Login_System, the element should have an appropriate ARIA label or aria-labelledby attribute that describes its purpose to screen readers.

**Validates: Requirements 10.3**

### Property 10: Text Contrast Compliance

*For any* text element rendered in the Login_System, the contrast ratio between text color and background color should be at least 4.5:1, including when glassmorphism or photo backgrounds are used.

**Validates: Requirements 10.4, 10.5**

### Property 11: Responsive Rendering

*For any* viewport width between 320px and 3840px, when the Login_System renders, all content should be visible, readable, and interactive without horizontal scrolling or layout breakage.

**Validates: Requirements 10.7**

### Property 12: Render Performance

*For any* theme configuration, when the Login_System performs initial render, it should complete within 1000ms on standard hardware, or within 300ms when using cached configuration.

**Validates: Requirements 11.1, 11.6**

### Property 13: Animation Performance

*For any* preset transition or glassmorphism effect, when rendered on a 60Hz display, the Login_System should maintain 60fps without frame drops.

**Validates: Requirements 11.2, 11.5**

### Property 14: Error Display

*For any* authentication failure or network error, when the error occurs, the Login_System should display an error message with the failure reason, using either inline or callout presentation based on configuration.

**Validates: Requirements 7.1**

### Property 15: Auth Card Configuration Rendering

*For any* Auth_Card configuration specifying elevation, blur, radius, padding, and enabled features (store picker, station picker, device identity, demo accounts), when the Auth_Card renders, all configured properties and features should be visible in the rendered output.

**Validates: Requirements 5.1, 5.4, 5.7**

### Property 16: Timestamp Formatting

*For any* valid timestamp value, when the System_Status_Card displays the last sync time, the timestamp should be formatted in a human-readable format (e.g., "2 minutes ago", "1 hour ago", "Jan 15, 2026 3:45 PM").

**Validates: Requirements 6.3**

### Property 17: Screen Reader Announcements

*For any* status change (sync status, database status, authentication state) or error occurrence, when the change happens, the Login_System should trigger a screen reader announcement describing the change.

**Validates: Requirements 10.6**

### Property 18: Image Loading Optimization

*For any* photo background configuration, when the Background_Renderer loads the image, it should use progressive enhancement (loading placeholder → low-res → high-res) to optimize perceived performance.

**Validates: Requirements 11.3**


## Error Handling

### Configuration Loading Errors

**Scenario**: Theme configuration file is malformed, missing, or fails schema validation

**Handling**:
1. Log detailed error with file path and validation failure reason
2. Display user-friendly notification: "Theme configuration could not be loaded. Using default theme."
3. Fall back to built-in Minimal Dark Split preset
4. Cache the fallback preset to enable offline operation
5. Retry configuration load on next application start

**Recovery**: System remains fully functional with default theme; user can manually fix configuration file

### Background Rendering Errors

**Scenario**: Photo background fails to load, wave rendering throws exception, or gradient parsing fails

**Handling**:
1. Log error with background type and failure details
2. Fall back to solid dark background (#0f172a)
3. Display subtle notification in footer: "Background effect unavailable"
4. Continue with all other theme elements applied normally

**Recovery**: System remains fully functional; background is the only affected element

### Token Application Errors

**Scenario**: CSS variable assignment fails, token value is invalid, or browser doesn't support a feature

**Handling**:
1. Log error with token path and invalid value
2. Skip the invalid token and continue with remaining tokens
3. Use browser default or previous value for the failed token
4. Display warning in developer console (not visible to end users)

**Recovery**: System remains functional; only the specific invalid token is affected

### Preset Switching Errors

**Scenario**: Preset switch is interrupted, new preset fails to load, or rendering throws exception

**Handling**:
1. Log error with source preset, target preset, and failure reason
2. Revert to previous working preset
3. Display error notification: "Could not switch to [preset name]. Reverted to previous theme."
4. Clear any partially applied styles from failed preset

**Recovery**: System reverts to last known good state; user can retry or select different preset

### Network Connectivity Errors

**Scenario**: Remote configuration cannot be fetched due to network unavailability

**Handling**:
1. Check localStorage for cached configuration
2. If cache exists: use cached configuration and display "Offline mode" indicator
3. If no cache: fall back to built-in default preset
4. Queue configuration fetch for retry when connectivity returns
5. Display status in System_Status_Card: "Using cached theme (offline)"

**Recovery**: System operates normally with cached or default configuration; automatically updates when online

### Performance Degradation

**Scenario**: Glassmorphism effects cause frame drops, photo background is too large, or device is low-power

**Handling**:
1. Detect frame rate drops using requestAnimationFrame timing
2. If FPS < 30 for 3 consecutive seconds: automatically enable low-power mode
3. Disable blur effects, reduce shadow complexity, remove particle effects
4. Display notification: "Performance mode enabled for smoother experience"
5. Allow user to manually re-enable effects via settings

**Recovery**: System maintains functionality with reduced visual effects; user can adjust settings

### Accessibility Violations

**Scenario**: Contrast ratio falls below 4.5:1, focus indicators are invisible, or ARIA labels are missing

**Handling**:
1. Run automated contrast checks on theme application
2. If violations detected: adjust text colors to meet minimum contrast
3. Force visible focus indicators regardless of theme tokens
4. Log accessibility warnings with specific violations
5. Provide "High Contrast Mode" toggle in settings

**Recovery**: System automatically adjusts to meet accessibility standards; user can enable high contrast mode

## Testing Strategy

### Dual Testing Approach

The Themeable Login System requires both unit tests and property-based tests to ensure comprehensive coverage:

**Unit Tests**: Verify specific examples, edge cases, and error conditions
- Specific preset rendering (Minimal Dark Split, Glass + Waves, Ambient Photo)
- Component integration (AuthCard with SystemStatusCard)
- User interactions (clicking retry button, switching environments)
- Edge cases (empty slots, missing configuration fields)
- Error conditions (invalid JSON, network failures, rendering exceptions)

**Property-Based Tests**: Verify universal properties across all inputs
- Configuration validation for any JSON input
- Token application for any valid token configuration
- Preset switching for any two valid presets
- Responsive rendering for any viewport width
- Contrast compliance for any color combination
- Performance requirements for any configuration

Together, unit tests catch concrete bugs in specific scenarios, while property-based tests verify general correctness across the entire input space.

### Property-Based Testing Configuration

**Library**: fast-check (JavaScript/TypeScript property-based testing library)

**Test Configuration**:
- Minimum 100 iterations per property test
- Each test tagged with feature name and property number
- Tag format: `Feature: themeable-login-system, Property N: [property description]`

**Example Property Test Structure**:
```typescript
import fc from 'fast-check';

// Feature: themeable-login-system, Property 1: Configuration Loading and Validation
test('any JSON config either validates or falls back to default', () => {
  fc.assert(
    fc.property(
      fc.jsonValue(), // Generate arbitrary JSON
      (config) => {
        const result = themeProvider.loadTheme(config);
        // Either valid config is applied OR default preset is used
        expect(
          result.isValid || result.preset.name === 'Minimal Dark Split'
        ).toBe(true);
      }
    ),
    { numRuns: 100 }
  );
});
```

### Unit Testing Focus Areas

**Component Rendering**:
- AuthCard renders with all configured features
- SystemStatusCard displays correct variant emphasis
- BackgroundRenderer produces expected output for each type
- ErrorCallout displays with correct severity styling
- Header and Footer show configured content

**Configuration Loading**:
- Tenant default loads correctly
- Store override takes precedence over tenant default
- Device override takes precedence over store override
- Cached configuration is used when offline
- Default preset is used when all sources fail

**User Interactions**:
- Clicking retry button re-attempts failed operation
- Clicking diagnostics button shows error details
- Switching environment pill changes environment
- Collapsing demo accounts accordion hides accounts
- Tabbing through inputs follows logical order

**Error Handling**:
- Invalid JSON triggers fallback
- Missing background image shows solid color
- Network failure uses cached config
- Performance degradation enables low-power mode
- Contrast violations trigger automatic adjustment

### Integration Testing

**End-to-End Scenarios**:
1. Fresh install → load default preset → authenticate successfully
2. Configure custom preset → restart app → verify custom preset loads
3. Go offline → verify cached preset works → go online → verify sync
4. Switch between all three presets → verify each renders correctly
5. Enable low-power mode → verify effects are disabled → disable mode → verify effects return

**Cross-Browser Testing**:
- Chrome/Edge (Chromium)
- Firefox
- Safari
- Electron (desktop app)

**Device Testing**:
- Desktop (1920x1080, 1366x768)
- Tablet (768x1024)
- Mobile (375x667, 414x896)
- Kiosk (1080x1920 portrait, 1920x1080 landscape)

### Visual Regression Testing

**Tool**: Playwright with screenshot comparison

**Test Cases**:
- Preset A (Minimal Dark Split) at 1920x1080, 1366x768, 768x1024
- Preset B (Glass + Waves) at 1920x1080, 1366x768, 768x1024
- Preset C (Ambient Photo) at 1920x1080, 1366x768, 768x1024
- Each preset in states: normal, loading, error, offline
- Focus states for all interactive elements
- Hover states for buttons and links

**Acceptance Criteria**:
- Pixel-perfect match for baseline screenshots (allowing 0.1% difference for anti-aliasing)
- No layout shifts or content overflow
- All text readable and properly aligned
- Focus indicators visible and correctly positioned

### Performance Testing

**Metrics**:
- Initial render time (target: < 1000ms standard, < 300ms cached)
- Preset switch time (target: < 200ms)
- Frame rate during animations (target: 60fps)
- Memory usage (target: < 50MB for login screen)
- Network payload size (target: < 500KB for theme config + assets)

**Tools**:
- Chrome DevTools Performance profiler
- Lighthouse performance audit
- React DevTools Profiler
- Custom performance markers

**Test Scenarios**:
- Cold start with network load
- Warm start with cached config
- Preset switching under load
- Glassmorphism rendering on low-end device
- Photo background loading on slow network

### Accessibility Testing

**Automated Tools**:
- axe-core (automated accessibility testing)
- WAVE (web accessibility evaluation tool)
- Lighthouse accessibility audit

**Manual Testing**:
- Keyboard-only navigation through entire flow
- Screen reader testing (NVDA, JAWS, VoiceOver)
- High contrast mode compatibility
- Color blindness simulation (protanopia, deuteranopia, tritanopia)
- Zoom testing (up to 200%)

**Acceptance Criteria**:
- Zero critical accessibility violations
- All interactive elements keyboard accessible
- All status changes announced to screen readers
- Minimum 4.5:1 contrast ratio maintained
- Focus indicators visible at all zoom levels

### Test Coverage Goals

- **Unit test coverage**: 85% of business logic
- **Property test coverage**: All 18 correctness properties implemented
- **Integration test coverage**: All user workflows and error scenarios
- **Visual regression coverage**: All presets at all breakpoints
- **Accessibility coverage**: WCAG 2.1 Level AA compliance
