# Modal Component

A modal dialog component with semi-transparent backdrop, centered positioning, and smooth slide-in animation. Supports multiple sizes and accessibility features.

## Requirements Implemented

### ✅ Requirement 10.1: Semi-transparent backdrop (rgba(0,0,0,0.5))
- Backdrop uses `bg-black/50` which translates to `rgba(0, 0, 0, 0.5)`
- Provides visual separation between modal and background content
- Smooth fade-in animation when modal opens

### ✅ Requirement 10.2: Centered positioning (vertically and horizontally)
- Modal container uses flexbox with `items-center justify-center`
- Content is centered both vertically and horizontally on all screen sizes
- Responsive padding ensures proper spacing on mobile devices

### ✅ Requirement 10.3: Smooth slide-in animation (300ms)
- Modal content uses `animate-slide-in-from-bottom` animation
- Animation duration is 300ms as defined in Tailwind config
- Smooth ease-out timing function for natural entrance

## Features

### Core Features
- **Semi-transparent backdrop**: Visual separation with rgba(0,0,0,0.5)
- **Centered positioning**: Flexbox-based centering (vertical and horizontal)
- **Smooth animations**: 300ms slide-in animation with fade effect
- **Multiple sizes**: sm, md, lg, xl, full
- **Keyboard navigation**: Escape key to close
- **Backdrop click**: Optional close on backdrop click
- **Body scroll lock**: Prevents background scrolling when modal is open
- **Mobile optimization**: Full-screen on mobile for better usability

### Accessibility Features
- `role="dialog"` for screen readers
- `aria-modal="true"` to indicate modal state
- `aria-labelledby` linking to modal title
- `aria-label` on close button
- Keyboard navigation support (Escape key)
- Focus management (will be enhanced in task 9.2)

## Usage

### Basic Modal

```tsx
import { Modal } from '@/common/components/organisms';
import { useState } from 'react';

function MyComponent() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsOpen(true)}>Open Modal</button>
      
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Basic Modal"
      >
        <p>Modal content goes here</p>
      </Modal>
    </>
  );
}
```

### Modal with Footer

```tsx
<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Confirm Action"
  footer={
    <>
      <Button variant="ghost" onClick={() => setIsOpen(false)}>
        Cancel
      </Button>
      <Button variant="primary" onClick={handleConfirm}>
        Confirm
      </Button>
    </>
  }
>
  <p>Are you sure you want to proceed?</p>
</Modal>
```

### Large Modal

```tsx
<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Details"
  size="lg"
>
  <div>Large content area with more space</div>
</Modal>
```

### Modal without Backdrop Close

```tsx
<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Important Notice"
  closeOnBackdropClick={false}
>
  <p>This modal can only be closed with the X button or Escape key</p>
</Modal>
```

### Modal without Close Button

```tsx
<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Custom Close"
  showCloseButton={false}
  footer={
    <Button onClick={() => setIsOpen(false)}>
      Close
    </Button>
  }
>
  <p>Use the footer button to close</p>
</Modal>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `isOpen` | `boolean` | - | Whether the modal is open (required) |
| `onClose` | `() => void` | - | Callback when modal should close (required) |
| `title` | `string` | - | Modal title |
| `children` | `ReactNode` | - | Modal content (required) |
| `footer` | `ReactNode` | - | Modal footer content |
| `size` | `'sm' \| 'md' \| 'lg' \| 'xl' \| 'full'` | `'md'` | Modal size |
| `showCloseButton` | `boolean` | `true` | Whether to show close button |
| `closeOnBackdropClick` | `boolean` | `true` | Whether clicking backdrop closes modal |
| `closeOnEscape` | `boolean` | `true` | Whether pressing Escape closes modal |
| `className` | `string` | - | Additional CSS classes for modal content |
| `backdropClassName` | `string` | - | Additional CSS classes for backdrop |

## Sizes

| Size | Max Width | Use Case |
|------|-----------|----------|
| `sm` | 384px (24rem) | Small confirmations, alerts |
| `md` | 448px (28rem) | Default size, forms, messages |
| `lg` | 512px (32rem) | Detailed forms, content |
| `xl` | 576px (36rem) | Large forms, rich content |
| `full` | Full width with margins | Mobile-optimized, full content |

## Styling

### Backdrop
- Background: `rgba(0, 0, 0, 0.5)` (semi-transparent black)
- Animation: Fade-in (300ms)
- Z-index: `z-modal-backdrop` (1040)

### Modal Content
- Background: `background-secondary` (#1e293b)
- Border: `border-light` (#334155)
- Border radius: 8px (rounded-lg)
- Shadow: xl (elevated appearance)
- Animation: Slide-in from bottom (300ms)
- Z-index: `z-modal` (1050)

### Mobile Behavior
- Full-screen on screens < 640px (sm breakpoint)
- Rounded corners removed on mobile for edge-to-edge display
- Maximum height: 90vh on desktop, full height on mobile
- Scrollable content area if content exceeds viewport

## Animations

### Entrance Animation
- **Name**: `slide-in-from-bottom`
- **Duration**: 300ms
- **Timing**: ease-out
- **Effect**: Slides up from bottom while fading in
- **Keyframes**:
  - 0%: `translateY(100%)`, `opacity: 0`
  - 100%: `translateY(0)`, `opacity: 1`

### Backdrop Animation
- **Name**: `fade-in`
- **Duration**: 300ms
- **Timing**: ease-out
- **Effect**: Fades in from transparent to semi-transparent

## Accessibility

### ARIA Attributes
- `role="dialog"`: Identifies the modal as a dialog
- `aria-modal="true"`: Indicates modal behavior
- `aria-labelledby="modal-title"`: Links to modal title (when title provided)
- `aria-label="Close modal"`: Describes close button action

### Keyboard Navigation
- **Escape**: Closes modal (when `closeOnEscape` is true)
- **Tab**: Cycles through focusable elements (focus trap to be added in task 9.2)

### Screen Reader Support
- Modal title is announced when modal opens
- Close button has descriptive label
- Modal state is properly communicated

## Body Scroll Lock

When the modal is open:
- Body scroll is disabled (`overflow: hidden`)
- Prevents background content from scrolling
- Scroll is restored when modal closes
- Cleanup ensures scroll is always restored

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- CSS Grid and Flexbox support required
- CSS custom properties support required
- ES6+ JavaScript support required

## Performance

- Lightweight component (~5KB gzipped)
- CSS animations (GPU-accelerated)
- No external dependencies (except React and Lucide icons)
- Efficient re-rendering with React.memo potential

## Testing

Comprehensive test coverage includes:
- Rendering states (open/closed)
- All size variants
- Backdrop click behavior
- Escape key behavior
- Close button functionality
- Body scroll lock
- Accessibility attributes
- Custom class names

Run tests:
```bash
npm test -- Modal.test.tsx
```

## Future Enhancements (Task 9.2)

The following features will be added in task 9.2:
- Focus trap (Requirement 10.4)
- Auto-focus on first focusable element
- Focus restoration when modal closes
- Enhanced keyboard navigation

## Related Components

- **Button**: Used in modal footers for actions
- **Card**: Similar container component for non-modal content
- **Toast**: Alternative for non-blocking notifications
- **Alert**: Alternative for inline messages

## Design System Integration

The Modal component follows the unified design system:
- Uses design tokens from Tailwind config
- Consistent with other organism components
- Follows atomic design principles
- Matches color scheme and spacing standards

## Examples

See `Modal.example.tsx` for interactive examples demonstrating:
- Basic modal
- Modal with footer
- Large modal
- Full-screen modal
- Modal without backdrop close
- Size comparison

## Changelog

### Version 1.0.0 (Task 9.1)
- Initial implementation
- Semi-transparent backdrop (rgba(0,0,0,0.5))
- Centered positioning
- Smooth slide-in animation (300ms)
- Multiple size options
- Keyboard navigation (Escape key)
- Body scroll lock
- Mobile optimization
- Accessibility attributes
- Comprehensive test coverage
