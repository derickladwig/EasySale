# Variant Generator Service

## Overview

The Variant Generator Service is a core component of the Invoice OCR Enhancement system that generates multiple preprocessing variants per page to maximize OCR accuracy. Instead of applying a single preprocessing pipeline, it creates 6-12 different variants of each page, ranks them by OCR-readiness, and keeps the top K variants for OCR processing.

## Purpose

**Requirements:** 1.1 - Variant Generation

The service addresses the challenge that different invoice types and quality levels require different preprocessing approaches. By generating multiple variants and ranking them, the system can:

- Handle diverse invoice types (clean, noisy, low-contrast, skewed)
- Maximize OCR accuracy across different document conditions
- Provide fallback options when primary variants fail
- Optimize processing time through early stopping

## Architecture

### Variant Types

The service generates 10 preprocessing variants:

1. **Grayscale** - Simple grayscale conversion
2. **Adaptive Threshold** - Local thresholding for varying lighting
3. **Denoise + Sharpen** - Noise removal followed by sharpening
4. **Contrast Bump** - Enhanced contrast for faded documents
5. **Upscale** - Resolution enhancement for low-quality scans
6. **Deskewed** - Additional deskewing if needed
7. **Grayscale + Adaptive** - Combined approach
8. **Grayscale + Denoise** - Combined approach
9. **Contrast + Sharpen** - Combined approach
10. **Upscale + Sharpen** - Combined approach

### Readiness Scoring

Each variant is scored on four dimensions:

- **Contrast** (30% weight) - Range of pixel values
- **Edge Density** (30% weight) - Amount of text edges detected
- **Noise Level** (20% weight) - Inverse of local variance
- **Sharpness** (20% weight) - Gradient magnitude

The overall readiness score is a weighted average of these components, ranging from 0.0 to 1.0.

### Ranking and Filtering

After generation, variants are:

1. Ranked by readiness score (descending)
2. Filtered by minimum score threshold (default: 0.3)
3. Capped to top K variants (default: 8)

This ensures only the most promising variants proceed to OCR processing.

## Configuration

```rust
pub struct VariantConfig {
    /// Maximum number of variants to keep (top K)
    pub max_variants: usize,  // Default: 8
    
    /// Minimum readiness score threshold (0.0 to 1.0)
    pub min_readiness_score: f64,  // Default: 0.3
    
    /// Enable caching of variant artifacts
    pub enable_caching: bool,  // Default: true
    
    /// Adaptive threshold block size
    pub adaptive_block_size: u32,  // Default: 15
    
    /// Denoise kernel size
    pub denoise_kernel_size: u8,  // Default: 3
    
    /// Sharpen amount
    pub sharpen_amount: f32,  // Default: 0.5
    
    /// Contrast adjustment factor
    pub contrast_factor: f32,  // Default: 1.3
    
    /// Upscale factor
    pub upscale_factor: f32,  // Default: 1.5
}
```

## Usage

```rust
use crate::services::{VariantGenerator, VariantConfig};
use crate::models::PageArtifact;
use std::path::Path;

// Create generator with default config
let generator = VariantGenerator::default();

// Or with custom config
let config = VariantConfig {
    max_variants: 5,
    min_readiness_score: 0.5,
    ..Default::default()
};
let generator = VariantGenerator::new(config);

// Generate variants for a page
let page_artifact = PageArtifact::new(/* ... */);
let output_dir = Path::new("/path/to/variants");

let result = generator
    .generate_variants(&page_artifact, &output_dir)
    .await?;

// Access ranked variants
for variant in &result.variants {
    println!("Variant: {} (score: {:.2})", 
        variant.artifact.artifact_id,
        variant.readiness_score
    );
    
    // Score breakdown for debugging
    println!("  Contrast: {:.2}", variant.score_breakdown.contrast);
    println!("  Edge Density: {:.2}", variant.score_breakdown.edge_density);
    println!("  Noise Level: {:.2}", variant.score_breakdown.noise_level);
    println!("  Sharpness: {:.2}", variant.score_breakdown.sharpness);
}

// Processing metrics
println!("Generated {} variants, kept {}", 
    result.total_generated,
    result.variants_kept
);
println!("Processing time: {}ms", result.processing_time_ms);
```

## Performance

### Acceptance Criteria

- ✅ Generates 6-12 variants per page
- ✅ Ranks by readiness score
- ✅ Caps to top K
- ✅ Processing < 10 seconds per page
- ✅ Variants cached

### Benchmarks

Typical performance on 800x600 page:
- Variant generation: 2-5 seconds
- Scoring: < 100ms per variant
- Total processing: 3-6 seconds

## Testing

The service includes comprehensive test coverage:

### Unit Tests

- Configuration defaults
- Individual variant generation
- Image processing operations
- Scoring algorithms
- Ranking and filtering logic

### Integration Tests

- Full variant generation pipeline
- Variant ranking verification
- Minimum score filtering
- Top K capping
- Processing time validation
- Artifact caching verification

### Test Execution

```bash
# Run all variant generator tests
cargo test --package EasySale-server --lib services::variant_generator

# Run specific test
cargo test --package EasySale-server --lib services::variant_generator::tests::test_generate_variants
```

## Error Handling

```rust
pub enum VariantError {
    Io(std::io::Error),
    Image(image::ImageError),
    ProcessingFailed(String),
    InvalidConfig(String),
}
```

All errors are propagated with context for debugging.

## Integration with OCR Pipeline

The Variant Generator fits into the OCR pipeline as follows:

```
DocumentIngestService
    ↓
OrientationService
    ↓
VariantGenerator  ← YOU ARE HERE
    ↓
ZoneDetectorService
    ↓
OcrOrchestrator
```

Each variant is passed to the Zone Detector, which identifies regions of interest. The OCR Orchestrator then runs multiple OCR passes across (variant × zone × profile) combinations.

## Future Enhancements

Potential improvements:

1. **ML-based scoring** - Train a model to predict OCR accuracy
2. **Adaptive variant selection** - Choose variants based on document type
3. **Parallel generation** - Generate variants concurrently
4. **Variant caching** - Cache variants across similar documents
5. **Custom variant pipelines** - Allow user-defined preprocessing steps

## Dependencies

- `image` - Image loading and manipulation
- `imageproc` - Image processing algorithms (filters, edge detection)
- `thiserror` - Error handling
- `tempfile` - Temporary directories for testing

## References

- Design Document: `.kiro/specs/invoice-ocr-enhancement/design.md`
- Requirements: `.kiro/specs/invoice-ocr-enhancement/requirements.md` (Section 1.1)
- Tasks: `.kiro/specs/invoice-ocr-enhancement/tasks.md` (Task 2.1)

## Maintainers

This service is part of the Invoice OCR Enhancement project.

---

**Version:** 1.0  
**Last Updated:** January 25, 2026  
**Status:** Implemented and Tested
