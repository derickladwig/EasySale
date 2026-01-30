# Review API Documentation

## Overview

The Review API provides endpoints for managing review cases, queues, and approval workflows.

**Base URL:** `/api`  
**Authentication:** Required (Bearer token)  
**Rate Limits:** 200 requests/minute per user

---

## Endpoints

### GET /api/cases

Query review cases with filters and sorting.

**Request:**
```http
GET /api/cases?state=pending&min_confidence=80&sort=priority&order=desc&page=0&per_page=20
Authorization: Bearer <token>
```

**Query Parameters:**
- `state` (optional): Filter by state (pending, in_review, approved, rejected, archived)
- `vendor_id` (optional): Filter by vendor
- `min_confidence` (optional): Minimum confidence (0-100)
- `max_confidence` (optional): Maximum confidence (0-100)
- `date_from` (optional): Filter by creation date (ISO 8601)
- `date_to` (optional): Filter by creation date (ISO 8601)
- `sort` (optional): Sort field (created_at, updated_at, confidence, priority)
- `order` (optional): Sort order (asc, desc)
- `page` (optional): Page number (default: 0)
- `per_page` (optional): Items per page (default: 20, max: 100)

**Response:**
```json
{
  "cases": [
    {
      "case_id": "case-abc123",
      "state": "pending",
      "confidence": 85,
      "vendor_name": "Acme Corp",
      "invoice_number": "INV-001",
      "total": 1250.00,
      "created_at": "2026-01-25T10:00:00Z",
      "has_flags": false
    }
  ],
  "total": 45,
  "page": 0,
  "per_page": 20,
  "total_pages": 3
}
```

**Status Codes:**
- `200 OK`: Query successful
- `400 Bad Request`: Invalid query parameters
- `401 Unauthorized`: Missing or invalid authentication

---

### GET /api/cases/:id

Get detailed information for a specific case.

**Request:**
```http
GET /api/cases/case-abc123
Authorization: Bearer <token>
```

**Response:**
```json
{
  "case_id": "case-abc123",
  "state": "in_review",
  "confidence": 85,
  "fields": [
    {
      "name": "invoice_number",
      "value": "INV-001",
      "confidence": 95,
      "alternatives": ["INV-OO1", "INV-001"],
      "evidence": "Found in header zone, matched lexicon pattern"
    },
    {
      "name": "total",
      "value": "1250.00",
      "confidence": 90,
      "alternatives": ["1250.00", "1250.0"],
      "evidence": "Found in totals box, validated against subtotal+tax"
    }
  ],
  "validation_report": {
    "overall_passed": true,
    "hard_failures": [],
    "soft_failures": [],
    "warnings": []
  },
  "approval_result": {
    "can_auto_approve": false,
    "requires_review": true,
    "blocking_reasons": ["Confidence below threshold for critical field: vendor_name"]
  },
  "created_at": "2026-01-25T10:00:00Z",
  "updated_at": "2026-01-25T10:15:00Z"
}
```

---

### POST /api/cases/:id/decide

Make a decision on a case (approve or reject).

**Request:**
```http
POST /api/cases/case-abc123/decide
Content-Type: application/json
Authorization: Bearer <token>

{
  "decision": "approve",
  "field_corrections": {
    "vendor_name": "Acme Corporation"
  },
  "notes": "Verified vendor name manually"
}
```

**Response:**
```json
{
  "case_id": "case-abc123",
  "state": "approved",
  "reviewed_by": "user-123",
  "reviewed_at": "2026-01-25T10:30:00Z"
}
```

**Status Codes:**
- `200 OK`: Decision recorded
- `400 Bad Request`: Invalid decision or corrections
- `404 Not Found`: Case not found
- `409 Conflict`: Case already decided

---

### POST /api/cases/:id/approve

Quick approve a case (shortcut for decide with approve).

**Request:**
```http
POST /api/cases/case-abc123/approve
Content-Type: application/json
Authorization: Bearer <token>

{
  "notes": "All fields verified"
}
```

**Response:**
```json
{
  "case_id": "case-abc123",
  "state": "approved",
  "reviewed_by": "user-123",
  "reviewed_at": "2026-01-25T10:30:00Z"
}
```

---

### POST /api/cases/:id/undo

Undo the last action on a case.

**Request:**
```http
POST /api/cases/case-abc123/undo
Authorization: Bearer <token>
```

**Response:**
```json
{
  "case_id": "case-abc123",
  "previous_state": "approved",
  "current_state": "in_review",
  "undone_at": "2026-01-25T10:35:00Z"
}
```

**Status Codes:**
- `200 OK`: Action undone
- `404 Not Found`: Case not found
- `400 Bad Request`: No action to undo

---

### GET /api/queue/stats

Get queue statistics.

**Request:**
```http
GET /api/queue/stats
Authorization: Bearer <token>
```

**Response:**
```json
{
  "total_cases": 150,
  "pending": 45,
  "in_review": 12,
  "approved": 85,
  "rejected": 5,
  "archived": 3,
  "avg_confidence": 87.5,
  "cases_with_flags": 8
}
```

---

## Review States

**State Transitions:**
```
Pending → InReview → Approved/Rejected → Archived
            ↓
      (can reopen)
```

**Valid Transitions:**
- `Pending` → `InReview`, `Archived`
- `InReview` → `Approved`, `Rejected`, `Pending`, `Archived`
- `Approved` → `InReview`, `Archived`
- `Rejected` → `InReview`, `Archived`
- `Archived` → `InReview`

---

## Field Corrections

When approving a case, you can provide field corrections:

```json
{
  "field_corrections": {
    "vendor_name": "Corrected Vendor Name",
    "invoice_date": "2026-01-25",
    "total": "1250.00"
  }
}
```

Corrections are:
- Applied to the final approved values
- Logged in audit trail
- Used for confidence calibration

---

## Keyboard Shortcuts

The review UI supports keyboard shortcuts:

- `A`: Approve case
- `R`: Reject case
- `N`: Next case
- `P`: Previous case
- `U`: Undo last action
- `E`: Edit field
- `?`: Show help

---

## Best Practices

1. **Batch Review**: Use queue filters to group similar cases
2. **Field Corrections**: Always provide corrections for low-confidence fields
3. **Notes**: Add notes for rejected cases to help with future processing
4. **Undo**: Use undo sparingly, as it affects audit trail
5. **Session Management**: Complete review sessions to track throughput

---

**Version:** 3.0  
**Last Updated:** January 25, 2026
