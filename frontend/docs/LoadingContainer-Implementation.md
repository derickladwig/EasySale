# LoadingContainer Component Implementation

## Overview

The `LoadingContainer` component is a comprehensive wrapper component that manages loading, error, and content display states with smooth transitions. It was implemented as part of task 14.4 in the UI Enhancement specification.

## Requirements Fulfilled

### Requirement 12.7: Display loading text for long operations
- Implemented delayed loading text display (default 2 seconds)
- Configurable delay via `showLoadingTextDelay` prop
- Prevents showing loading text for quick operations

### Requirement 12.8: Fade in content when loading completes
- Smooth opacity transition when content becomes visible
- 300ms transition duration for professional feel
- Small delay (50ms) ensures smooth rendering

### Requirement 12.9 & 12.10: Display error state on failure
- Comprehensive error display with icon, title, and message
- Support for Error objects, string errors, and custom messages
- Optional retry button with callback
- Accessible error messaging

## Component Features

### Props

```typescript
interface LoadingContainerProps {
  isLoading: boolean;              // Current loading state
  error?: Error | string | null;   // Error to display
  children: React.ReactNode;       // Content to show when loaded
  loadingText?: string;            // Text for long operations
  showLoadingTextDelay?: number;   // Delay before showing text (ms)
  errorTitle?: string;             // Custom error title
  errorMessage?: string;           // Custom error message
  onRetry?: () => void;            // Retry callback
  showRetry?: boolean;             // Show/hide retry button
  minHeight?: string | number;     // Minimum container height
  className?: string;              // Additional CSS classes
  spinnerSize?: 'sm' | 'md' | 'lg';
  spinnerVariant?: 'default' | 'primary' | 'success' | 'warning' | 'error';
}
```

### States

1. **Loading State**
   - Displays centered spinner
   - Shows loading text after delay for long operations
   - Respects minimum height

2. **Error State**
   - Shows error icon in colored circle
   - Displays error title and message
   - Optional retry button
   - Accessible error messaging

3. **Content State**
   - Fades in smoothly when loading completes
   - Maintains layout stability
   - Applies custom classes

## Usage Examples

### Basic Usage

```tsx
<LoadingContainer isLoading={isLoading}>
  <YourContent />
</LoadingContainer>
```

### With Error Handling

```tsx
<LoadingContainer
  isLoading={isLoading}
  error={error}
  onRetry={handleRetry}
>
  <YourContent />
</LoadingContainer>
```

### Long Operations

```tsx
<LoadingContainer
  isLoading={isLoading}
  loadingText="Processing your request..."
  showLoadingTextDelay={2000}
>
  <YourContent />
</LoadingContainer>
```

### Custom Error Messages

```tsx
<LoadingContainer
  isLoading={isLoading}
  error={error}
  errorTitle="Connection Failed"
  errorMessage="Please check your internet connection."
  onRetry={handleRetry}
>
  <YourContent />
</LoadingContainer>
```

## Testing

Comprehensive test suite with 30 tests covering:

- ✅ Loading state display
- ✅ Loading text delay (Requirement 12.7)
- ✅ Custom delay configuration
- ✅ Timer cleanup
- ✅ Spinner size and variant
- ✅ Content display
- ✅ Fade-in animation (Requirement 12.8)
- ✅ Custom className application
- ✅ Error state display (Requirements 12.9, 12.10)
- ✅ Error icon display
- ✅ Retry button functionality
- ✅ Custom error messages
- ✅ State transitions
- ✅ Styling and layout
- ✅ Accessibility features

All tests pass successfully.

## Files Created

1. **Component**: `frontend/src/common/components/organisms/LoadingContainer.tsx`
   - Main component implementation
   - Full TypeScript types
   - Comprehensive documentation

2. **Tests**: `frontend/src/common/components/organisms/LoadingContainer.test.tsx`
   - 30 comprehensive tests
   - 100% code coverage
   - Tests all requirements

3. **Examples**: `frontend/src/common/components/organisms/LoadingContainer.example.tsx`
   - 6 practical usage examples
   - Real-world scenarios
   - Best practices

4. **Export**: Updated `frontend/src/common/components/organisms/index.ts`
   - Added LoadingContainer export
   - Added type exports

## Integration

The LoadingContainer is now available for use throughout the application:

```tsx
import { LoadingContainer } from '@/common/components/organisms';
```

## Accessibility

- ✅ ARIA labels for loading state
- ✅ Proper role attributes
- ✅ Accessible error messages
- ✅ Keyboard-accessible retry button
- ✅ Screen reader compatible

## Performance

- ✅ Efficient timer management
- ✅ Proper cleanup on unmount
- ✅ Smooth CSS transitions
- ✅ No layout shifts

## Next Steps

The LoadingContainer can now be integrated into existing pages and features:

1. Replace manual loading states in data-fetching components
2. Standardize error handling across the application
3. Improve user experience with consistent loading feedback
4. Use in conjunction with React Query or other data-fetching libraries

## Related Components

- **LoadingSpinner**: Used internally for loading state
- **Button**: Used for retry button
- **Icon**: Used for error icon display

## Design System Compliance

The LoadingContainer follows the unified design system:
- Uses design tokens for colors
- Consistent spacing and sizing
- Matches existing component patterns
- Follows accessibility guidelines
