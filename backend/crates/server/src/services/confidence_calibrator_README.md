# Confidence Calibrator Service

## Overview

The Confidence Calibrator Service calibrates confidence scores to real accuracy using historical data. It tracks predicted confidence vs actual correctness and adjusts future predictions accordingly. Supports both global and vendor-specific calibration.

## Requirements

**Validates:** Requirements 4.3 (Confidence Calibration)

## Features

### 1. Data Collection
- Tracks predicted confidence vs actual correctness
- Stores calibration data points with field name and vendor ID
- Maintains separate global and vendor-specific datasets
- Accumulates data over time for improved calibration

### 2. Calibration Statistics
- Calculates accuracy by confidence bucket (10% intervals)
- Computes overall accuracy across all predictions
- Measures calibration error (difference between predicted and actual)
- Provides detailed statistics for analysis

### 3. Confidence Adjustment
- Calibrates confidence scores based on historical accuracy
- Uses vendor-specific calibration when available
- Falls back to global calibration if insufficient vendor data
- Returns original confidence if insufficient data overall

### 4. Automatic Recalibration
- Detects when calibration drift exceeds threshold
- Triggers recalibration automatically
- Configurable drift threshold (default: 5%)
- Supports manual recalibration on demand

### 5. Vendor-Specific Calibration
- Maintains separate calibration per vendor
- Learns vendor-specific patterns
- Improves accuracy for frequently processed vendors
- Falls back to global when vendor data insufficient

## Architecture

```
Data Collection → Statistics Calculation → Confidence Calibration → Drift Detection → Recalibration
```

### Data Flow

1. **Data Point Addition**: Add (predicted_confidence, actual_correct) pairs
2. **Statistics Calculation**: Group by confidence buckets, calculate accuracy
3. **Calibration**: Map predicted confidence to actual accuracy
4. **Drift Detection**: Monitor calibration error over time
5. **Recalibration**: Trigger when drift exceeds threshold

## Usage

### Basic Usage

```rust
use crate::services::confidence_calibrator::{ConfidenceCalibrator, CalibrationDataPoint};

let mut calibrator = ConfidenceCalibrator::new();

// Add calibration data points
let data_point = CalibrationDataPoint {
    predicted_confidence: 90,
    actual_correct: true,
    field_name: "invoice_number".to_string(),
    vendor_id: Some("vendor-abc".to_string()),
};

calibrator.add_data_point(data_point);

// Calibrate a confidence score
let calibrated = calibrator.calibrate_confidence(90, Some("vendor-abc"));
println!("Calibrated confidence: {}", calibrated);
```

### Custom Settings

```rust
let calibrator = ConfidenceCalibrator::with_settings(
    50,    // min_samples_for_calibration
    0.10,  // recalibration_threshold (10%)
);
```

### Getting Statistics

```rust
// Global statistics
let global_stats = calibrator.get_global_stats();
println!("Overall accuracy: {:.2}%", global_stats.overall_accuracy * 100.0);
println!("Calibration error: {:.2}%", global_stats.calibration_error * 100.0);

// Vendor-specific statistics
if let Some(vendor_stats) = calibrator.get_vendor_stats("vendor-abc") {
    println!("Vendor accuracy: {:.2}%", vendor_stats.overall_accuracy * 100.0);
}
```

### Checking for Drift

```rust
// Check if recalibration is needed
if calibrator.needs_recalibration(Some("vendor-abc")) {
    println!("Recalibration needed for vendor-abc");
    // Trigger recalibration process
}
```

### Exporting Data

```rust
// Export all calibration data
let exported = calibrator.export_calibration_data();

for (key, data_points) in exported {
    println!("{}: {} data points", key, data_points.len());
}
```

## Data Structures

### CalibrationDataPoint

```rust
pub struct CalibrationDataPoint {
    pub predicted_confidence: u8,
    pub actual_correct: bool,
    pub field_name: String,
    pub vendor_id: Option<String>,
}
```

### CalibrationStats

```rust
pub struct CalibrationStats {
    pub total_samples: usize,
    pub accuracy_by_confidence: HashMap<u8, f64>,
    pub overall_accuracy: f64,
    pub calibration_error: f64,
}
```

## Calibration Algorithm

### Confidence Buckets

Confidence scores are grouped into buckets of 10:
- 0-9 → bucket 0
- 10-19 → bucket 10
- 20-29 → bucket 20
- ...
- 90-99 → bucket 90

### Accuracy Calculation

For each bucket:
```
accuracy = correct_count / total_count
```

### Calibration Mapping

```
calibrated_confidence = actual_accuracy_for_bucket * 100
```

Example:
- Predicted: 90% confidence
- Actual: 80% accuracy (8 out of 10 correct)
- Calibrated: 80% confidence

### Calibration Error

```
calibration_error = avg(|predicted - actual|) across all buckets
```

## Integration with Golden Set

The calibrator integrates with the golden set testing framework:

```rust
use crate::tests::golden_set::GoldenSetLoader;
use crate::tests::metrics_runner::MetricsRunner;

// Load golden set
let loader = GoldenSetLoader::new("tests/fixtures");
let cases = loader.load_all_cases()?;

// Run metrics
let metrics_runner = MetricsRunner::new();
let metrics = metrics_runner.run_golden_set(&cases)?;

// Add to calibrator
for case_result in metrics.case_results {
    for (field_name, comparison) in case_result.field_comparisons {
        let data_point = CalibrationDataPoint {
            predicted_confidence: comparison.predicted_confidence,
            actual_correct: comparison.matches,
            field_name: field_name.clone(),
            vendor_id: case_result.vendor_id.clone(),
        };
        
        calibrator.add_data_point(data_point);
    }
}

// Get updated stats
let stats = calibrator.get_global_stats();
println!("Calibration updated: {} samples", stats.total_samples);
```

## Vendor-Specific Calibration

### When to Use

Use vendor-specific calibration when:
- Processing invoices from the same vendor repeatedly
- Vendor has unique invoice format or quality
- Sufficient data points collected (default: 100+)

### Fallback Behavior

```
1. Try vendor-specific calibration (if >= min_samples)
2. Fall back to global calibration (if >= min_samples)
3. Return original confidence (if insufficient data)
```

### Example

```rust
// Add vendor-specific data
for _ in 0..150 {
    let data_point = CalibrationDataPoint {
        predicted_confidence: 90,
        actual_correct: true,
        field_name: "total".to_string(),
        vendor_id: Some("vendor-abc".to_string()),
    };
    calibrator.add_data_point(data_point);
}

// Calibrate with vendor-specific data
let calibrated = calibrator.calibrate_confidence(90, Some("vendor-abc"));
// Uses vendor-abc's calibration data

// Calibrate for unknown vendor
let calibrated = calibrator.calibrate_confidence(90, Some("vendor-xyz"));
// Falls back to global calibration
```

## Drift Detection

### Calibration Error Threshold

Default threshold: 5% (0.05)

Example:
- Predicted: 90% confidence
- Actual: 85% accuracy
- Error: |0.90 - 0.85| = 0.05 (5%)

If average error across all buckets exceeds threshold, recalibration is needed.

### Checking for Drift

```rust
// Check global drift
if calibrator.needs_recalibration(None) {
    println!("Global recalibration needed");
}

// Check vendor-specific drift
if calibrator.needs_recalibration(Some("vendor-abc")) {
    println!("Vendor-abc recalibration needed");
}
```

## Performance

- **Data Point Addition**: O(1)
- **Statistics Calculation**: O(N) where N = data points
- **Calibration**: O(N) for bucket lookup
- **Memory Usage**: O(N) for storing data points

## Configuration

### Minimum Samples

Default: 100 samples

Minimum number of data points required before calibration is applied.

```rust
let calibrator = ConfidenceCalibrator::with_settings(50, 0.05);
```

### Recalibration Threshold

Default: 0.05 (5%)

Maximum acceptable calibration error before recalibration is triggered.

```rust
let calibrator = ConfidenceCalibrator::with_settings(100, 0.10);
```

## Testing

The service includes comprehensive unit tests:

```bash
cargo test confidence_calibrator
```

**Test Coverage:**
- Calibrator creation
- Data point addition
- Vendor-specific data
- Statistics calculation
- Confidence calibration
- Insufficient data handling
- Drift detection
- Data export
- Sample counting
- Data clearing

## Best Practices

### 1. Collect Sufficient Data

Collect at least 100 data points before relying on calibration:

```rust
if calibrator.get_sample_count(None) < 100 {
    println!("Warning: Insufficient calibration data");
}
```

### 2. Monitor Calibration Error

Regularly check calibration error:

```rust
let stats = calibrator.get_global_stats();
if stats.calibration_error > 0.10 {
    println!("High calibration error: {:.2}%", stats.calibration_error * 100.0);
}
```

### 3. Use Vendor-Specific When Available

Prefer vendor-specific calibration for better accuracy:

```rust
let vendor_count = calibrator.get_sample_count(Some("vendor-abc"));
if vendor_count >= 100 {
    // Use vendor-specific calibration
    let calibrated = calibrator.calibrate_confidence(90, Some("vendor-abc"));
} else {
    // Fall back to global
    let calibrated = calibrator.calibrate_confidence(90, None);
}
```

### 4. Export Data Periodically

Export calibration data for backup and analysis:

```rust
let exported = calibrator.export_calibration_data();
// Save to file or database
```

### 5. Clear Stale Data

Clear old calibration data when patterns change:

```rust
// Clear vendor-specific data
calibrator.clear_data(Some("vendor-abc"));

// Clear all data
calibrator.clear_data(None);
```

## Error Handling

```rust
use crate::services::confidence_calibrator::ConfidenceCalibratorError;

match calibrator.calibrate_confidence(90, Some("vendor-abc")) {
    calibrated if calibrated != 90 => {
        println!("Calibrated: {} → {}", 90, calibrated);
    }
    _ => {
        println!("No calibration applied (insufficient data)");
    }
}
```

## Future Enhancements

1. **Time-Weighted Calibration**: Give more weight to recent data
2. **Field-Specific Calibration**: Separate calibration per field type
3. **Confidence Intervals**: Provide uncertainty bounds
4. **Automatic Threshold Adjustment**: Learn optimal thresholds
5. **Calibration Visualization**: Generate calibration curves

## Related Services

- **FieldResolver**: Uses calibrated confidence scores
- **MetricsRunner**: Provides calibration data from golden set
- **ReviewCaseService**: Benefits from calibrated confidence
- **ValidationEngine**: Uses confidence for approval decisions

## References

- Design Document: `.kiro/specs/invoice-ocr-enhancement/design.md`
- Requirements: `.kiro/specs/invoice-ocr-enhancement/requirements.md`
- Tasks: `.kiro/specs/invoice-ocr-enhancement/tasks.md`
- Golden Set Tests: `backend/crates/server/tests/golden_set.rs`
- Metrics Runner: `backend/crates/server/tests/metrics_runner.rs`
