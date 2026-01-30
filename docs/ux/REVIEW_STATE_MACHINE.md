# Review State Machine

## Overview

The Review State Machine manages the state transitions for the Document Cleanup Engine's review workflow. It ensures that user-drawn shields are never lost due to API failures and that the UI provides clear feedback during all operations.

## States

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Review State Machine                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌──────────────┐                                                       │
│   │ loading_case │ ──────────────────────────────────────────────────┐   │
│   └──────────────┘                                                   │   │
│          │                                                           │   │
│          │ success                                                   │   │
│          ▼                                                           │   │
│   ┌──────────────┐                                                   │   │
│   │    ready     │ ◄─────────────────────────────────────────────────┤   │
│   └──────────────┘                                                   │   │
│     │    │    │                                                      │   │
│     │    │    │ save_vendor_rules                                    │   │
│     │    │    ▼                                                      │   │
│     │    │  ┌─────────────────────┐                                  │   │
│     │    │  │ saving_rules_vendor │ ─────────────────────────────────┤   │
│     │    │  └─────────────────────┘                                  │   │
│     │    │                                                           │   │
│     │    │ save_template_rules                                       │   │
│     │    ▼                                                           │   │
│     │  ┌───────────────────────┐                                     │   │
│     │  │ saving_rules_template │ ────────────────────────────────────┤   │
│     │  └───────────────────────┘                                     │   │
│     │                                                                │   │
│     │ rerun_extraction                                               │   │
│     ▼                                                                │   │
│   ┌───────────────────────┐                                          │   │
│   │ rerunning_extraction  │ ─────────────────────────────────────────┤   │
│   └───────────────────────┘                                          │   │
│                                                                      │   │
│   ┌───────────────────────┐                                          │   │
│   │  error_nonblocking    │ ─────────────────────────────────────────┘   │
│   └───────────────────────┘                                              │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## State Definitions

### `loading_case`
- **Entry**: When user opens a review case
- **Actions**: Fetch case data, shields, vendor/template rules
- **Transitions**:
  - `success` → `ready`
  - `error` → `error_nonblocking` (with retry option)

### `ready`
- **Entry**: Case loaded, shields resolved, UI interactive
- **User Actions Available**:
  - Draw new shield
  - Adjust existing shield
  - Toggle shield apply mode (Applied/Suggested/Disabled)
  - Change page/zone targeting
  - Save as Vendor Rule
  - Save as Template Rule
  - Re-run extraction
- **Transitions**:
  - `save_vendor_rules` → `saving_rules_vendor`
  - `save_template_rules` → `saving_rules_template`
  - `rerun_extraction` → `rerunning_extraction`

### `saving_rules_vendor`
- **Entry**: User clicked "Save as Vendor Rule"
- **Actions**: 
  - Show "Saving..." indicator
  - POST to `/api/cleanup/vendors/{vendor_id}/rules`
  - Preserve session overrides locally until success
- **Transitions**:
  - `success` → `ready` (with success toast)
  - `error` → `error_nonblocking` (session overrides preserved)

### `saving_rules_template`
- **Entry**: User clicked "Save as Template Rule"
- **Actions**:
  - Show "Saving..." indicator
  - POST to `/api/cleanup/templates/{template_id}/rules`
  - Preserve session overrides locally until success
- **Transitions**:
  - `success` → `ready` (with success toast)
  - `error` → `error_nonblocking` (session overrides preserved)

### `rerunning_extraction`
- **Entry**: User clicked "Re-run Extraction"
- **Actions**:
  - Show "Processing..." indicator
  - POST to extraction pipeline with current resolved shields
  - Preserve all user edits
- **Transitions**:
  - `success` → `ready` (with updated extraction results)
  - `error` → `error_nonblocking` (user edits preserved)

### `error_nonblocking`
- **Entry**: Any API operation failed
- **Characteristics**:
  - UI remains interactive
  - User-drawn shields preserved in session storage
  - Error toast displayed with retry option
  - User can continue editing or retry
- **Transitions**:
  - `retry` → previous operation state
  - `dismiss` → `ready`

## Session Override Persistence

User edits are preserved in session storage to prevent data loss:

```typescript
interface SessionOverrides {
  caseId: string;
  shields: CleanupShield[];
  lastModified: string;
  pendingAction?: 'save_vendor' | 'save_template' | 'rerun';
}

// Stored in sessionStorage under key: `cleanup_overrides_${caseId}`
```

### Persistence Rules

1. **On shield draw/edit**: Immediately save to session storage
2. **On API success**: Clear session storage for that case
3. **On API failure**: Keep session storage, show error
4. **On page reload**: Restore from session storage if exists
5. **On case close**: Prompt if unsaved changes exist

## UI Feedback Requirements

### Loading States
- Skeleton loaders for shield list
- Disabled controls during operations
- Progress indicator for long operations

### Success States
- Toast notification with action summary
- Visual confirmation (checkmark animation)
- Updated shield list reflects changes

### Error States
- Non-blocking error toast
- Retry button in toast
- Error details expandable
- Session overrides indicator ("Unsaved changes")

## Implementation Notes

### TypeScript State Type

```typescript
type ReviewState =
  | { type: 'loading_case' }
  | { type: 'ready'; shields: CleanupShield[]; sessionOverrides: CleanupShield[] }
  | { type: 'saving_rules_vendor'; shields: CleanupShield[] }
  | { type: 'saving_rules_template'; shields: CleanupShield[] }
  | { type: 'rerunning_extraction'; shields: CleanupShield[] }
  | { type: 'error_nonblocking'; previousState: ReviewState; error: string };
```

### State Transition Function

```typescript
type ReviewAction =
  | { type: 'LOAD_SUCCESS'; shields: CleanupShield[] }
  | { type: 'LOAD_ERROR'; error: string }
  | { type: 'SAVE_VENDOR_START' }
  | { type: 'SAVE_TEMPLATE_START' }
  | { type: 'RERUN_START' }
  | { type: 'OPERATION_SUCCESS' }
  | { type: 'OPERATION_ERROR'; error: string }
  | { type: 'RETRY' }
  | { type: 'DISMISS_ERROR' }
  | { type: 'UPDATE_SHIELD'; shield: CleanupShield }
  | { type: 'ADD_SHIELD'; shield: CleanupShield }
  | { type: 'REMOVE_SHIELD'; shieldId: string };

function reviewReducer(state: ReviewState, action: ReviewAction): ReviewState {
  // Implementation in CleanupShieldTool.tsx
}
```

## Testing Requirements

### Property: Fail-Open Preservation
- **Given**: User has drawn shields in session
- **When**: API call fails
- **Then**: Session overrides are preserved and recoverable

### Property: State Consistency
- **Given**: Any valid state
- **When**: Any valid action
- **Then**: Resulting state is valid and UI reflects it

### Manual Test Scenarios
1. Draw shield → API fails → Reload page → Shield restored
2. Save vendor rule → Network timeout → Retry → Success
3. Multiple rapid edits → Single save → All edits preserved
