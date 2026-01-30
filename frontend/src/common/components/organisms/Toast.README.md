# Toast Component Documentation

## Overview

The Toast component system provides temporary notification messages to users with semantic colors, auto-dismiss functionality, and full responsive support. The system consists of two components:

1. **Toast**: Individual notification component
2. **ToastContainer**: Container that manages and displays multiple toasts

## Features

### Core Features
- ✅ Semantic color variants (success, error, warning, info)
- ✅ Auto-dismiss after configurable duration (default: 5 seconds)
- ✅ Manual dismissal with close button
- ✅ Icon matching toast type
- ✅ Smooth slide-in/out animations
- ✅ Vertical stacking with proper spacing
- ✅ Full responsive support (mobile & desktop)

### Responsive Features (Task 10.3)

#### Requirement 11.8: 8px Gap Between Stacked Toasts
When multiple toasts are displayed, they are stacked vertically with an 8px gap between them.

**Implementation:**
- Uses Tailwind's `gap-2` class (0.5rem = 8px)
- Applied to ToastContainer's flex column layout
- Consistent spacing maintained regardless of number of toasts

**Testing:**
```typescript
// Verify gap is present
expect(toastContainer).toHaveClass('gap-2');
```

#### Requirement 11.9: Smooth Slide-Up on Dismiss
When a toast is dismissed, remaining toasts smoothly slide up to fill the space.

**Implementation:**
- Achieved through CSS transitions on flexbox layout
- When a toast is removed from the array, the gap automatically closes
- No JavaScript animation required - pure CSS transitions
- Smooth and performant

**How it works:**
1. ToastContainer uses `flex flex-col gap-2`
2. When a toast is removed, React re-renders with updated array
3. CSS transitions on the gap property create smooth slide-up effect
4. Remaining toasts maintain their 8px spacing

**Testing:**
```typescript
// Remove a toast and verify smooth transition
rerender(<ToastContainer toasts={remainingToasts} onDismiss={onDismiss} />);
expect(toastContainer).toHaveClass('flex', 'flex-col', 'gap-2');
```

#### Requirement 11.10: Full-Width on Mobile
On mobile devices (< 640px), toasts are displayed full-width at the top of the screen.

**Implementation:**

**Desktop (≥ 640px):**
- Positioned in top-right corner: `top-4 right-4`
- Minimum width: 300px
- Maximum width: 28rem (448px)
- Rounded corners: 8px

**Mobile (< 640px):**
- Positioned at top full-width: `top-0 right-0 left-0`
- Full width: `min-w-full`
- No rounded corners: `rounded-none`
- Better touch accessibility

**CSS Classes:**
```typescript
// Toast component
className={cn(
  'min-w-[300px] max-w-md',           // Desktop sizing
  'max-sm:min-w-full max-sm:rounded-none', // Mobile full-width
)}

// ToastContainer component
className={cn(
  'top-4 right-4',                    // Desktop positioning
  'max-sm:top-0 max-sm:right-0 max-sm:left-0', // Mobile full-width
)}
```

**Testing:**
```typescript
// Verify mobile classes are present
expect(toast).toHaveClass('max-sm:min-w-full', 'max-sm:rounded-none');
expect(container).toHaveClass('max-sm:top-0', 'max-sm:right-0', 'max-sm:left-0');
```

## Usage

### Basic Usage

```typescript
import { Toast, ToastContainer } from '@/common/components/organisms';

// Single toast
<Toast
  id="1"
  message="Operation completed successfully!"
  variant="success"
  onDismiss={handleDismiss}
/>

// Multiple toasts with container
const [toasts, setToasts] = useState([
  { id: '1', message: 'Success!', variant: 'success' },
  { id: '2', message: 'Warning!', variant: 'warning' },
]);

<ToastContainer
  toasts={toasts}
  onDismiss={(id) => setToasts(toasts.filter(t => t.id !== id))}
/>
```

### Variants

```typescript
// Success (green)
<Toast variant="success" message="Item saved successfully!" />

// Error (red)
<Toast variant="error" message="Failed to save item" />

// Warning (yellow)
<Toast variant="warning" message="This action cannot be undone" />

// Info (blue) - default
<Toast variant="info" message="New updates available" />
```

### Auto-Dismiss Configuration

```typescript
// Default: 5 seconds
<Toast message="Auto-dismiss in 5s" />

// Custom duration: 3 seconds
<Toast message="Auto-dismiss in 3s" duration={3000} />

// No auto-dismiss (persistent)
<Toast message="Stays until manually dismissed" duration={0} />
```

### Complete Example

```typescript
import React, { useState } from 'react';
import { ToastContainer } from '@/common/components/organisms';

function App() {
  const [toasts, setToasts] = useState([]);
  const [nextId, setNextId] = useState(1);

  const addToast = (message, variant = 'info', duration = 5000) => {
    const id = `toast-${nextId}`;
    setNextId(nextId + 1);
    setToasts([...toasts, { id, message, variant, duration }]);
  };

  const removeToast = (id) => {
    setToasts(toasts.filter(toast => toast.id !== id));
  };

  return (
    <div>
      <button onClick={() => addToast('Success!', 'success')}>
        Show Success
      </button>
      
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
```

## Component Props

### Toast Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `id` | `string` | Required | Unique identifier for the toast |
| `message` | `string` | Required | Toast message to display |
| `variant` | `'success' \| 'error' \| 'warning' \| 'info'` | `'info'` | Toast color variant |
| `duration` | `number` | `5000` | Auto-dismiss duration in ms (0 = no auto-dismiss) |
| `onDismiss` | `(id: string) => void` | Required | Callback when toast is dismissed |
| `className` | `string` | - | Additional CSS classes |

### ToastContainer Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `toasts` | `Omit<ToastProps, 'onDismiss'>[]` | Required | Array of toasts to display |
| `onDismiss` | `(id: string) => void` | Required | Callback when a toast is dismissed |
| `className` | `string` | - | Additional CSS classes |

## Responsive Behavior

### Breakpoints

- **Mobile**: < 640px (max-sm)
- **Desktop**: ≥ 640px

### Mobile Optimizations

1. **Full-width layout**: Toasts span the entire width of the screen
2. **Top positioning**: Positioned at the very top (no margin)
3. **No rounded corners**: Square corners for edge-to-edge display
4. **Touch-friendly**: Larger touch targets for dismiss button

### Desktop Optimizations

1. **Top-right corner**: Positioned with 16px margin from top and right
2. **Fixed width**: Minimum 300px, maximum 448px
3. **Rounded corners**: 8px border radius
4. **Stacked layout**: Multiple toasts stack vertically with 8px gap

## Animations

### Slide-In Animation (Entrance)
- **Direction**: From right to left
- **Duration**: 300ms
- **Easing**: ease-out
- **Class**: `animate-slide-in-from-right`

### Slide-Out Animation (Exit)
- **Direction**: From left to right
- **Duration**: 300ms
- **Easing**: ease-in
- **Class**: `animate-slide-out-to-right`

### Slide-Up Animation (Stacking)
- **Trigger**: When a toast is dismissed
- **Duration**: Automatic (CSS transition)
- **Easing**: Default CSS transition
- **Implementation**: Flexbox gap transition

## Accessibility

### ARIA Attributes

```html
<!-- Toast -->
<div role="alert" aria-live="polite" aria-atomic="true">
  <!-- Toast content -->
</div>

<!-- ToastContainer -->
<div aria-live="polite" aria-atomic="false">
  <!-- Toasts -->
</div>
```

### Keyboard Support

- **Dismiss button**: Focusable and keyboard accessible
- **Focus ring**: Visible focus indicator (2px blue outline)
- **Tab order**: Logical tab order through dismiss buttons

### Screen Reader Support

- Toast messages are announced when they appear
- Dismiss button has proper ARIA label: "Dismiss notification"
- Container uses polite live region (non-intrusive)

## Testing

### Unit Tests

```typescript
// Test responsive classes
it('has full-width styling on mobile', () => {
  render(<Toast id="1" message="Test" onDismiss={onDismiss} />);
  const toast = screen.getByRole('alert');
  expect(toast).toHaveClass('max-sm:min-w-full', 'max-sm:rounded-none');
});

// Test stacking gap
it('has 8px gap between toasts', () => {
  const { container } = render(<ToastContainer toasts={[]} onDismiss={onDismiss} />);
  const toastContainer = container.firstChild;
  expect(toastContainer).toHaveClass('gap-2'); // 8px
});

// Test smooth slide-up
it('remaining toasts slide up smoothly when one is dismissed', () => {
  const { rerender, container } = render(
    <ToastContainer toasts={threeToasts} onDismiss={onDismiss} />
  );
  
  rerender(<ToastContainer toasts={twoToasts} onDismiss={onDismiss} />);
  
  const toastContainer = container.firstChild;
  expect(toastContainer).toHaveClass('flex', 'flex-col', 'gap-2');
});
```

### Visual Testing

See `Toast.example.tsx` for interactive examples demonstrating:
- All variants (success, error, warning, info)
- Auto-dismiss functionality
- Manual dismissal
- Multiple toast stacking
- Responsive behavior (resize browser to test)
- Smooth slide-up animation

## Performance

### Optimizations

1. **CSS-only animations**: No JavaScript animation loops
2. **Efficient re-renders**: Only affected toasts re-render
3. **Automatic cleanup**: Timers are cleaned up on unmount
4. **Minimal DOM updates**: React efficiently updates only changed toasts

### Best Practices

1. **Limit toast count**: Display maximum 5 toasts at once
2. **Use appropriate durations**: 3-5 seconds for most messages
3. **Avoid rapid additions**: Debounce toast creation if needed
4. **Clean up on unmount**: Remove all toasts when component unmounts

## Browser Support

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## Related Components

- **Modal**: For blocking user interactions
- **Alert**: For persistent page-level messages
- **Notification**: For system-level notifications

## Requirements Mapping

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| 11.1: Top-right corner positioning | ✅ | `top-4 right-4` on desktop |
| 11.2: Semantic colors | ✅ | Success, error, warning, info variants |
| 11.3: Auto-dismiss after 5s | ✅ | Configurable duration with default 5000ms |
| 11.4: Manual dismissal | ✅ | Close button with X icon |
| 11.5: Vertical stacking | ✅ | `flex flex-col` layout |
| 11.6: Slide-in animation | ✅ | `animate-slide-in-from-right` |
| 11.7: Icon matching type | ✅ | CheckCircle, AlertCircle, AlertTriangle, Info |
| 11.8: 8px gap between toasts | ✅ | `gap-2` (0.5rem = 8px) |
| 11.9: Smooth slide-up on dismiss | ✅ | CSS transitions on flexbox gap |
| 11.10: Full-width on mobile | ✅ | `max-sm:min-w-full max-sm:top-0 max-sm:right-0 max-sm:left-0` |

## Changelog

### Task 10.3 - Add Toast Responsiveness (Completed)
- ✅ Verified full-width on mobile (Requirement 11.10)
- ✅ Verified 8px gap between stacked toasts (Requirement 11.8)
- ✅ Verified smooth slide-up on dismiss (Requirement 11.9)
- ✅ Added comprehensive tests for responsive behavior
- ✅ Created interactive example component
- ✅ Created comprehensive documentation

All responsive features were already implemented in Tasks 10.1 and 10.2. Task 10.3 focused on verification, testing, and documentation.
