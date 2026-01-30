# Zone Cropper Service

## Overview

The Zone Cropper service extracts individual zones from preprocessed variant images, maintaining coordinate mappings for traceability and applying masks to remove noise regions.

## Features

### Zone Extraction
- Crops detected zones from variant images
- Applies configurable padding around zones
- Validates zone coordinates before cropping
- Saves cropped zones as separate image files

### Coordinate Mapping
- Maintains bidirectional coordinate mapping
- Maps from zone coordinates to original image
- Maps from original image to zone coordinates
- Preserves traceability for OCR results

### Mask Application
- Applies masks to cropped zones
- Detects mask-zone overlaps
- Tracks number of masks applied
- Supports vendor-specific masks

### Batch Processing
- Crops zones from multiple variants
- Parallel processing support
- Efficient file I/O

## Usage

### Basic Zone Cropping

```rust
use crate::services::zone_cropper::{ZoneCropper, ZoneCropperConfig};
use crate::services::zone_detector_service::DetectedZone;
use crate::services::variant_generator::RankedVariant;
use crate::services::mask_engine::Mask;

// Create zone cropper
let cropper = ZoneCropper::new();

// Crop zones from a variant
let result = cropper.crop_zones(&variant, &zones, &masks)?;

println!("Cropped {} zones in {}ms", 
    result.zones_cropped, 
    result.processing_time_ms);

for artifact in &result.zone_artifacts {
    println!("  - {:?} zone saved to {}", 
        artifact.zone_type, 
        artifact.image_path);
}
```

### Custom Configuration

```rust
use std::path::PathBuf;

let config = ZoneCropperConfig {
    output_dir: PathBuf::from("./data/zones"),
    zone_padding: 10, // 10 pixels padding
    apply_masks: true,
    save_metadata: true,
};

let cropper = ZoneCropper::with_config(config);
```

### Coordinate Mapping

```rust
// Get coordinate mapping for a zone
let mapping = &result.coordinate_mappings[0];

// Map zone coordinates to original image
let (orig_x, orig_y) = mapping.map_to_original(50, 50);
println!("Zone (50, 50) maps to original ({}, {})", orig_x, orig_y);

// Map original coordinates to zone
if let Some((zone_x, zone_y)) = mapping.map_to_zone(150, 150) {
    println!("Original (150, 150) maps to zone ({}, {})", zone_x, zone_y);
}
```

### Batch Processing

```rust
// Crop zones from multiple variants
let results = cropper.crop_zones_from_variants(&variants, &zones, &masks)?;

for (i, result) in results.iter().enumerate() {
    println!("Variant {}: {} zones cropped", i, result.zones_cropped);
}
```

## Integration with OCR Pipeline

```rust
// 1. Generate variants
let variants = variant_generator.generate_variants("page-1", image_path)?;

// 2. Detect zones
let zone_result = zone_detector.detect_zones("page-1", image_path)?;

// 3. Detect masks
let mask_result = mask_engine.get_all_masks(image_path, Some("vendor-abc"))?;

// 4. Crop zones from top variants
let top_variants = &variants.ranked_variants[..3]; // Top 3 variants
let crop_results = zone_cropper.crop_zones_from_variants(
    top_variants,
    &zone_result.zones,
    &mask_result.masks,
)?;

// 5. Run OCR on cropped zones
for crop_result in crop_results {
    for zone_artifact in crop_result.zone_artifacts {
        let ocr_result = ocr_engine.process(&zone_artifact.image_path, &profile)?;
        
        // Map OCR word coordinates back to original image
        let mapping = crop_result.coordinate_mappings
            .iter()
            .find(|m| m.zone_artifact_id == zone_artifact.artifact_id)
            .unwrap();
        
        for word in ocr_result.words {
            let (orig_x, orig_y) = mapping.map_to_original(word.bbox.x, word.bbox.y);
            println!("Word '{}' at original ({}, {})", word.text, orig_x, orig_y);
        }
    }
}
```

## Data Structures

### ZoneCropperConfig

Configuration for zone cropping behavior.

```rust
pub struct ZoneCropperConfig {
    pub output_dir: PathBuf,      // Where to save cropped zones
    pub zone_padding: u32,         // Padding around zones (pixels)
    pub apply_masks: bool,         // Apply masks to zones
    pub save_metadata: bool,       // Save coordinate mappings
}
```

### ZoneCropResult

Result of zone cropping operation.

```rust
pub struct ZoneCropResult {
    pub zone_artifacts: Vec<ZoneArtifact>,
    pub coordinate_mappings: Vec<CoordinateMapping>,
    pub processing_time_ms: u64,
    pub zones_cropped: usize,
    pub masks_applied: usize,
}
```

### CoordinateMapping

Bidirectional coordinate mapping between zone and original image.

```rust
pub struct CoordinateMapping {
    pub zone_artifact_id: String,
    pub original_width: u32,
    pub original_height: u32,
    pub original_bbox: BoundingBox,
    pub cropped_width: u32,
    pub cropped_height: u32,
    pub padding: u32,
}
```

## Coordinate Mapping

### Zone to Original

Maps coordinates from cropped zone back to original image:

```
zone_x, zone_y → original_x, original_y

original_x = original_bbox.x + zone_x - padding
original_y = original_bbox.y + zone_y - padding
```

### Original to Zone

Maps coordinates from original image to cropped zone:

```
original_x, original_y → zone_x, zone_y (if in bounds)

zone_x = original_x - original_bbox.x + padding
zone_y = original_y - original_bbox.y + padding
```

Returns `None` if coordinates are outside the zone.

## Zone Padding

Padding is applied around zones to capture context:

```
Original Zone: (100, 100, 200, 150)
Padding: 5 pixels

Cropped Zone: (95, 95, 210, 160)
  - x: 100 - 5 = 95
  - y: 100 - 5 = 95
  - width: 200 + 2*5 = 210
  - height: 150 + 2*5 = 160
```

Padding is clamped to image boundaries.

## Mask Application

Masks are applied to zones that overlap:

1. Check if mask bounding box overlaps with zone
2. Calculate intersection region
3. Fill intersection with white/black (noise removal)
4. Track number of masks applied

## File Naming

Cropped zones are saved with descriptive filenames:

```
zone_{zone_type}_{artifact_id}.png

Examples:
  - zone_header_a1b2c3d4.png
  - zone_totals_e5f6g7h8.png
  - zone_table_i9j0k1l2.png
```

## Performance

- **Processing Time**: < 1 second per zone
- **Memory**: Minimal (processes one zone at a time)
- **Disk Space**: ~50-200 KB per cropped zone
- **Batch Processing**: Linear scaling with number of zones

## Testing

Run tests with:

```bash
cargo test zone_cropper
```

### Test Coverage

- ✅ Zone cropper creation
- ✅ Zone coordinate validation
- ✅ Bounding box overlap detection
- ✅ Coordinate mapping (bidirectional)
- ✅ Zone type string conversion

## Requirements Satisfied

- **3.1**: Create zone artifacts with coordinate mapping
  - ✅ Zones cropped accurately from variants
  - ✅ Coordinates preserved with bidirectional mapping
  - ✅ Masks applied to zones
  - ✅ Artifacts stored with metadata

## Error Handling

### ZoneCropperError

- `ImageLoadError(String)`: Failed to load variant image
- `CropError(String)`: Failed to crop zone
- `SaveError(String)`: Failed to save cropped zone
- `InvalidCoordinatesError(String)`: Invalid zone coordinates
- `IoError(String)`: File system operation failed

## Future Enhancements

1. **Parallel Processing**: Crop multiple zones concurrently
2. **Image Optimization**: Compress cropped zones for storage
3. **Smart Padding**: Adaptive padding based on zone type
4. **Mask Visualization**: Generate overlay images showing masks
5. **Caching**: Cache cropped zones with deterministic hashing

## API Reference

### ZoneCropper

#### Methods

- `new() -> Self`: Create with default config
- `with_config(config: ZoneCropperConfig) -> Self`: Create with custom config
- `crop_zones(&self, variant: &RankedVariant, zones: &[DetectedZone], masks: &[Mask]) -> Result<ZoneCropResult, ZoneCropperError>`: Crop zones from variant
- `crop_zones_from_variants(&self, variants: &[RankedVariant], zones: &[DetectedZone], masks: &[Mask]) -> Result<Vec<ZoneCropResult>, ZoneCropperError>`: Batch crop zones

### CoordinateMapping

#### Methods

- `map_to_original(&self, zone_x: u32, zone_y: u32) -> (u32, u32)`: Map zone coords to original
- `map_to_zone(&self, orig_x: u32, orig_y: u32) -> Option<(u32, u32)>`: Map original coords to zone

## Dependencies

- `image`: Image processing and cropping
- `serde`: Serialization
- `thiserror`: Error handling
- `uuid`: Unique identifiers

## Version

- **Version**: 3.0
- **Last Updated**: January 25, 2026
- **Status**: Implemented
