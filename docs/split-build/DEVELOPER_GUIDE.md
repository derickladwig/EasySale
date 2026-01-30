# Split Build Developer Guide

This guide explains how to work with EasySale's split build architecture and how to add new features without bloating the lite build.

## Overview

EasySale supports three build variants:

| Variant | Features | Target Users |
|---------|----------|--------------|
| **Lite** | Core POS only | Basic retail, minimal footprint |
| **Export** | + CSV export | QuickBooks integration |
| **Full** | + OCR, document processing | Enterprise, vendor bills |

## Feature Hierarchy

```
lite (no features)
  └── export (adds: csv_export_pack)
        └── full (adds: document-processing, ocr, document-cleanup)
```

## Adding a New Feature

### Step 1: Determine Feature Placement

Ask yourself:
- Is this core POS functionality? → No feature gate needed
- Does it require heavy dependencies (image processing, PDF, etc.)? → Gate it
- Is it an optional enterprise feature? → Gate it

### Step 2: Add Feature Definition

In `backend/crates/server/Cargo.toml`:

```toml
[features]
# Your new feature
my-feature = ["dep:some-heavy-dep"]

# Update full to include it
full = ["export", "ocr", "document-cleanup", "my-feature"]
```

### Step 3: Gate the Service Module

In `backend/crates/server/src/services/mod.rs`:

```rust
#[cfg(feature = "my-feature")]
pub mod my_feature_service;

#[cfg(feature = "my-feature")]
pub use my_feature_service::MyFeatureService;
```

### Step 4: Gate the Handler Module

In `backend/crates/server/src/handlers/mod.rs`:

```rust
#[cfg(feature = "my-feature")]
pub mod my_feature;
```

### Step 5: Gate Route Registration

In `backend/crates/server/src/main.rs`:

```rust
// Inside the App::new() builder
.configure(|cfg| {
    #[cfg(feature = "my-feature")]
    {
        cfg.service(
            web::scope("/api/my-feature")
                .route("", web::get().to(handlers::my_feature::list))
        );
    }
})
```

### Step 6: Update Capabilities

In `backend/crates/server/src/handlers/capabilities.rs`:

```rust
pub struct FeatureFlags {
    // ... existing fields
    pub my_feature: bool,
}

impl FeatureFlags {
    pub fn detect() -> Self {
        Self {
            // ... existing fields
            my_feature: cfg!(feature = "my-feature"),
        }
    }
}
```

### Step 7: Gate Tests

In your test file:

```rust
#![cfg(feature = "my-feature")]

// ... test code
```

### Step 8: Update Frontend (if needed)

In `frontend/src/common/utils/buildVariant.ts`:

```typescript
export const ENABLE_MY_FEATURE =
  import.meta.env.VITE_ENABLE_MY_FEATURE !== 'false' && IS_FULL_MODE;
```

In `frontend/src/App.tsx`:

```tsx
{ENABLE_MY_FEATURE && (
  <Route path="my-feature" element={<MyFeaturePage />} />
)}
```

## Verification Checklist

Before submitting a PR with a new feature:

- [ ] Lite build compiles: `cargo build --no-default-features -p EasySale-server`
- [ ] Export build compiles: `cargo build --no-default-features --features export -p EasySale-server`
- [ ] Full build compiles: `cargo build --no-default-features --features full -p EasySale-server`
- [ ] Lite tests pass: `cargo test --no-default-features -p EasySale-server`
- [ ] Full tests pass: `cargo test --features full -p EasySale-server`
- [ ] `/api/capabilities` reports the new feature correctly
- [ ] Frontend type-checks: `cd frontend && npm run type-check`

## Common Mistakes

### 1. Forgetting to gate re-exports

```rust
// WRONG - will fail lite build
pub use my_feature_service::MyFeatureService;

// CORRECT
#[cfg(feature = "my-feature")]
pub use my_feature_service::MyFeatureService;
```

### 2. Using inline cfg in Actix builder

```rust
// WRONG - cfg doesn't work inline in builder pattern
.route("/api/my-feature", web::get().to(handler))
    .cfg(feature = "my-feature")  // This doesn't exist!

// CORRECT - use .configure() block
.configure(|cfg| {
    #[cfg(feature = "my-feature")]
    {
        cfg.route("/api/my-feature", web::get().to(handler));
    }
})
```

### 3. Not gating test files

```rust
// WRONG - test will fail on lite build
use EasySale_server::services::MyFeatureService;

// CORRECT - gate the entire test file
#![cfg(feature = "my-feature")]
use EasySale_server::services::MyFeatureService;
```

## Binary Size Guidelines

| Variant | Target Size | Warning Threshold |
|---------|-------------|-------------------|
| Lite | < 25 MB | > 30 MB |
| Export | < 30 MB | > 35 MB |
| Full | < 40 MB | > 45 MB |

If your feature adds more than 5 MB to the binary, consider:
1. Making the dependency optional
2. Using dynamic linking
3. Splitting into a separate crate

## Questions?

- Check `docs/split-build/DESIGN.md` for architecture details
- Check `docs/split-build/TASKS.md` for implementation examples
- Check `docs/split-build/BUILD_MATRIX.md` for quick reference
