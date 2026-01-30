# POST /api/cases/{id}/decide Endpoint Implementation

## Overview

This document describes the implementation of the `POST /api/cases/{id}/decide` endpoint for task 1.3 of the document-workflow-wiring specification.

## Implementation Details

### Endpoint: `POST /api/cases/{id}/decide`

**Location**: `backend/crates/server/src/handlers/review_cases.rs`

### Key Features Implemented

1. **User ID Extraction**
   - Extracts `user_id` from `UserContext` in request extensions
   - Falls back to "system" if context is not available
   - Uses the `HttpMessage` trait to access request extensions

2. **Decision Persistence**
   - Inserts decision record into `review_case_decisions` table
   - Records:
     - `field_name`: The field being decided
     - `original_value`: The original OCR value (retrieved from case)
     - `chosen_value`: The user's chosen value
     - `source`: Source of the decision (e.g., "user", "template")
     - `decided_at`: Timestamp of the decision
     - `decided_by`: User ID who made the decision

3. **Confidence Recalculation**
   - Implemented `recalculate_case_confidence()` helper function
   - Algorithm:
     - Decided fields count as 100% confidence (human verified)
     - Undecided fields use their original OCR confidence
     - Weighted average: `(decided_count * 100 + undecided_sum) / total_fields`
   - Updates the `confidence` column in `review_cases` table

4. **Validation Result Update**
   - Implemented `recalculate_validation()` helper function
   - Validation rules:
     - **Hard flags**: Missing or very low confidence (<50%) on required fields (invoice_number, total)
     - **Soft flags**: Missing or low confidence (<70%) on recommended fields (invoice_date, vendor_name)
   - Decisions resolve flags for their respective fields
   - Sets `can_approve` to true only when no hard flags remain
   - Updates the `validation_result` JSON column in `review_cases` table

5. **Timestamp Update**
   - Updates the `updated_at` timestamp on the case after each decision

## Request/Response Format

### Request Body
```json
{
  "field": "invoice_number",
  "chosen_value": "INV-12345",
  "source": "user"
}
```

### Response Body
```json
{
  "updated_confidence": 92,
  "validation_result": {
    "hard_flags": [],
    "soft_flags": ["Low confidence on field: invoice_date (68%)"],
    "can_approve": true
  }
}
```

## Database Schema

### review_case_decisions Table
```sql
CREATE TABLE review_case_decisions (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL REFERENCES review_cases(id),
    field_name TEXT NOT NULL,
    original_value TEXT,
    chosen_value TEXT NOT NULL,
    source TEXT NOT NULL,
    decided_at TEXT NOT NULL,
    decided_by TEXT
);
```

## Testing

### Unit Tests Added

1. **test_recalculate_confidence_all_decided**
   - Verifies confidence = 100% when all fields are decided

2. **test_recalculate_confidence_partial_decided**
   - Verifies weighted average calculation with partial decisions

3. **test_recalculate_validation_hard_flags**
   - Verifies hard flags are generated for missing required fields

4. **test_recalculate_validation_resolved_by_decision**
   - Verifies decisions resolve validation flags

### Integration Test
- Created `review_cases_decide_test.rs` for endpoint integration testing
- Tests database setup and decision recording with user_id

## Requirements Satisfied

✅ **Requirement 5.4**: Persist decisions to review_case_decisions table
✅ **Requirement 5.4**: Recalculate case confidence after decision
✅ **Requirement 5.4**: Record user_id and timestamp

## Code Changes

### Files Modified
1. `backend/crates/server/src/handlers/review_cases.rs`
   - Added `HttpMessage` import
   - Enhanced `decide_field()` function
   - Added `recalculate_case_confidence()` helper
   - Added `recalculate_validation()` helper
   - Added comprehensive unit tests

### Files Created
1. `backend/crates/server/tests/review_cases_decide_test.rs`
   - Integration tests for the decide endpoint

## Usage Example

```bash
# Make a field decision
curl -X POST http://localhost:7945/api/cases/abc-123/decide \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "field": "invoice_number",
    "chosen_value": "INV-12345",
    "source": "user"
  }'
```

## Notes

- The implementation follows the existing patterns in the codebase
- User context extraction matches the pattern used in `product.rs`
- Confidence calculation is deterministic and testable
- Validation rules can be easily extended for additional field types
- All database operations use parameterized queries to prevent SQL injection

## Future Enhancements

Potential improvements for future iterations:
1. Configurable validation rules per tenant
2. Field-level confidence tracking in decisions
3. Audit trail for confidence changes
4. Batch decision API for multiple fields
5. Undo/redo support for decisions
