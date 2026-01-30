# Field Resolver Service

## Overview

The Field Resolver Service resolves final field values from candidates using consensus, cross-field validation, and contradiction detection. It implements the resolution logic for the Invoice OCR Enhancement v3.0 system.

## Requirements

**Validates:** Requirements 4.2 (Field Resolver - Consensus + Cross-Checks)

## Features

### 1. Consensus-Based Resolution
- Combines multiple candidates for each field
- Applies consensus boost when same value appears across multiple sources
- Selects best candidate based on score + consensus
- Preserves top alternatives for review

### 2. Cross-Field Validation
- **Total = Subtotal + Tax**: Validates arithmetic consistency
- **Date Not in Future**: Ensures invoice date is not beyond today
- **Invoice Number Format**: Validates format and length
- **Vendor Name Present**: Ensures vendor name exists and is valid

### 3. Contradiction Detection
- Detects critical contradictions that block approval
- Identifies warnings that reduce confidence
- Provides plain-language descriptions
- Categorizes by severity (Critical/Warning)

### 4. Confidence Calibration
- Applies penalties for failed validations
- Adjusts confidence scores based on cross-field checks
- Calculates overall document confidence
- Flags fields with issues

### 5. Plain-Language Explanations
- Generates human-readable explanations for each field
- Describes evidence types used
- Indicates consensus strength
- Provides confidence level descriptions

## Architecture

```
Candidates → Consensus Boost → Resolution → Cross-Validation → Contradiction Detection → Final Fields
```

### Data Flow

1. **Input**: HashMap of field candidates from CandidateGenerator
2. **Consensus Boost**: Apply +10 points per additional occurrence (max +20)
3. **Resolution**: Select best candidate per field
4. **Cross-Validation**: Validate relationships between fields
5. **Contradiction Detection**: Identify critical issues
6. **Penalty Application**: Reduce confidence for failed validations
7. **Output**: ResolutionResult with resolved fields and validations

## Usage

### Basic Usage

```rust
use crate::services::field_resolver::FieldResolver;
use std::collections::HashMap;

let resolver = FieldResolver::new();

let mut candidates_by_field = HashMap::new();
// ... populate candidates ...

let result = resolver.resolve_fields(candidates_by_field)?;

println!("Overall confidence: {}", result.overall_confidence);
println!("Fields resolved: {}", result.fields.len());
println!("Contradictions: {}", result.contradictions.len());
```

### Custom Settings

```rust
let resolver = FieldResolver::with_settings(
    0.8,    // consensus_threshold
    true,   // cross_validation_enabled
);
```

### Accessing Results

```rust
let result = resolver.resolve_fields(candidates_by_field)?;

// Access resolved fields
for (field_name, field_value) in &result.fields {
    println!("{}: {} (confidence: {})", 
        field_name, 
        field_value.value, 
        field_value.confidence
    );
    
    // Check for flags
    if !field_value.flags.is_empty() {
        println!("  Flags: {:?}", field_value.flags);
    }
    
    // View alternatives
    for alt in &field_value.alternatives {
        println!("  Alternative: {} (score: {})", alt.value_raw, alt.score);
    }
}

// Check cross-field validations
for validation in &result.cross_field_validations {
    if !validation.passed {
        println!("Validation failed: {}", validation.message);
        println!("  Penalty: {}", validation.penalty);
    }
}

// Check contradictions
for contradiction in &result.contradictions {
    println!("Contradiction: {}", contradiction.description);
    println!("  Severity: {:?}", contradiction.severity);
}
```

## Data Structures

### FieldValue

```rust
pub struct FieldValue {
    pub field_name: String,
    pub value: String,
    pub normalized: Option<String>,
    pub confidence: u8, // 0-100
    pub chosen_sources: Vec<String>, // Artifact IDs
    pub alternatives: Vec<FieldCandidate>,
    pub flags: Vec<String>,
    pub explanation: String,
}
```

### ResolutionResult

```rust
pub struct ResolutionResult {
    pub fields: HashMap<String, FieldValue>,
    pub cross_field_validations: Vec<CrossFieldValidation>,
    pub contradictions: Vec<Contradiction>,
    pub overall_confidence: u8,
    pub processing_time_ms: u64,
}
```

### CrossFieldValidation

```rust
pub struct CrossFieldValidation {
    pub validation_type: ValidationType,
    pub passed: bool,
    pub message: String,
    pub penalty: u8,
}

pub enum ValidationType {
    TotalEqualsSubtotalPlusTax,
    DateNotInFuture,
    InvoiceNumberFormat,
    VendorNamePresent,
}
```

### Contradiction

```rust
pub struct Contradiction {
    pub fields: Vec<String>,
    pub description: String,
    pub severity: ContradictionSeverity,
}

pub enum ContradictionSeverity {
    Critical, // Blocks approval
    Warning,  // Reduces confidence
}
```

## Consensus Boost Algorithm

The consensus boost algorithm rewards values that appear multiple times across different sources:

1. Count occurrences of each normalized value
2. For values seen N times (N > 1):
   - Apply boost: `(N - 1) * 10` points (max +20)
   - Add consensus evidence with weight `0.2 * N`
3. Re-sort candidates by updated scores

Example:
- Value "INV-12345" seen 3 times: +20 points boost
- Value "INV-12346" seen 1 time: no boost

## Cross-Field Validation Rules

### 1. Total = Subtotal + Tax

**Tolerance:** ±$0.02

**Penalty:** 20 points if failed

**Example:**
```
Total: $110.00
Subtotal: $100.00
Tax: $10.00
Result: PASS (110.00 = 100.00 + 10.00)
```

### 2. Date Not in Future

**Tolerance:** None (must be <= today)

**Penalty:** 30 points if failed

**Example:**
```
Invoice Date: 2026-01-25
Today: 2026-01-25
Result: PASS
```

### 3. Invoice Number Format

**Rules:**
- Must have alphanumeric content
- Length >= 3 characters
- Length <= 50 characters

**Penalty:** 15 points if failed

### 4. Vendor Name Present

**Rules:**
- Not empty
- Length >= 2 characters

**Penalty:** 20 points if failed

## Field Flags

The resolver automatically detects and flags issues:

- `low_confidence`: Confidence < 70
- `future_date`: Date field is in the future
- `invalid_amount`: Amount <= 0
- `unusually_large_amount`: Amount > $1,000,000
- `cross_validation_failed`: Failed cross-field validation
- `validation_failed`: Failed field-specific validation

## Explanation Generation

The resolver generates plain-language explanations:

**Confidence Level:**
- Very confident: >= 95
- Confident: >= 85
- Moderately confident: >= 70
- Low confidence: < 70

**Evidence Summary:**
- Lists evidence types used (OcrMatch, LabelProximity, etc.)

**Consensus Indicator:**
- Shows how many times value was seen

**Example:**
```
"Very confident based on OcrMatch, LabelProximity, Consensus (seen 3 times)"
```

## Performance

- **Resolution Time**: < 100ms for typical invoice (10-15 fields)
- **Memory Usage**: O(N * M) where N = fields, M = candidates per field
- **Consensus Boost**: O(N * M) for counting + sorting

## Testing

The service includes comprehensive unit tests:

```bash
cargo test field_resolver
```

**Test Coverage:**
- Resolver creation
- Single field resolution
- Consensus boost application
- Field flag detection
- Cross-field validations
- Contradiction detection
- Penalty application
- Overall confidence calculation

## Integration

### With CandidateGenerator

```rust
let lexicon = Lexicon::load_from_file("config/lexicon.yml")?;
let generator = CandidateGenerator::new(lexicon);
let resolver = FieldResolver::new();

// Generate candidates
let candidate_result = generator.generate_candidates(&ocr_artifacts, None, None)?;

// Resolve fields
let resolution_result = resolver.resolve_fields(candidate_result.candidates)?;
```

### With ValidationEngine

```rust
let resolution_result = resolver.resolve_fields(candidates)?;

// Check if approval is blocked
let has_critical_contradictions = resolution_result.contradictions.iter()
    .any(|c| matches!(c.severity, ContradictionSeverity::Critical));

if has_critical_contradictions {
    // Block approval, require review
}
```

## Error Handling

```rust
match resolver.resolve_fields(candidates) {
    Ok(result) => {
        // Process result
    }
    Err(FieldResolverError::NoCandidatesError(field)) => {
        eprintln!("No candidates for field: {}", field);
    }
    Err(FieldResolverError::ValidationError(msg)) => {
        eprintln!("Validation error: {}", msg);
    }
    Err(FieldResolverError::CrossFieldError(msg)) => {
        eprintln!("Cross-field error: {}", msg);
    }
}
```

## Configuration

The resolver can be configured with:

- `consensus_threshold`: Minimum score for consensus boost (default: 0.7)
- `cross_validation_enabled`: Enable/disable cross-field validation (default: true)

## Future Enhancements

1. **Vendor-Specific Validation Rules**: Custom rules per vendor
2. **Machine Learning Calibration**: Learn optimal thresholds from feedback
3. **Advanced Contradiction Detection**: More sophisticated logic
4. **Configurable Validation Rules**: YAML-based rule configuration
5. **Explanation Templates**: Customizable explanation formats

## Related Services

- **CandidateGenerator**: Generates field candidates
- **ConfidenceCalibrator**: Calibrates confidence scores
- **ValidationEngine**: Applies business rules
- **ReviewCaseService**: Manages review workflow

## References

- Design Document: `.kiro/specs/invoice-ocr-enhancement/design.md`
- Requirements: `.kiro/specs/invoice-ocr-enhancement/requirements.md`
- Tasks: `.kiro/specs/invoice-ocr-enhancement/tasks.md`
