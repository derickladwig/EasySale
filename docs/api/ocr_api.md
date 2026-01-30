# OCR API Documentation

## Overview

The OCR API provides endpoints for document ingestion, processing, and artifact management.

**Base URL:** `/api`  
**Authentication:** Required (Bearer token)  
**Rate Limits:** 100 requests/minute per tenant

---

## Endpoints

### POST /api/ingest

Upload and process a document (PDF or image).

**Request:**
```http
POST /api/ingest
Content-Type: multipart/form-data
Authorization: Bearer <token>

file: <binary data>
tenant_id: <string>
```

**Response:**
```json
{
  "case_id": "case-abc123",
  "status": "processing",
  "estimated_time_ms": 15000
}
```

**Status Codes:**
- `200 OK`: Document accepted for processing
- `400 Bad Request`: Invalid file format or missing parameters
- `401 Unauthorized`: Missing or invalid authentication
- `413 Payload Too Large`: File exceeds size limit (10MB)
- `429 Too Many Requests`: Rate limit exceeded

**Supported Formats:**
- PDF (single or multi-page)
- JPG/JPEG
- PNG
- TIFF

**Example:**
```bash
curl -X POST https://api.example.com/api/ingest \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@invoice.pdf" \
  -F "tenant_id=tenant-123"
```

---

### POST /api/cases/:id/reocr

Trigger targeted re-OCR for specific regions.

**Request:**
```http
POST /api/cases/:id/reocr
Content-Type: application/json
Authorization: Bearer <token>

{
  "region": {
    "x": 100,
    "y": 200,
    "width": 300,
    "height": 150
  },
  "profile": "high_accuracy"
}
```

**Response:**
```json
{
  "case_id": "case-abc123",
  "status": "reprocessing",
  "estimated_time_ms": 5000
}
```

**Status Codes:**
- `200 OK`: Re-OCR triggered
- `404 Not Found`: Case not found
- `400 Bad Request`: Invalid region or profile

---

### POST /api/cases/:id/masks

Add or remove masks for noise regions.

**Request (Add Mask):**
```http
POST /api/cases/:id/masks
Content-Type: application/json
Authorization: Bearer <token>

{
  "action": "add",
  "region": {
    "x": 50,
    "y": 50,
    "width": 200,
    "height": 100
  },
  "mask_type": "logo",
  "remember_for_vendor": true
}
```

**Request (Remove Mask):**
```http
POST /api/cases/:id/masks
Content-Type: application/json
Authorization: Bearer <token>

{
  "action": "remove",
  "mask_id": "mask-xyz789"
}
```

**Response:**
```json
{
  "case_id": "case-abc123",
  "mask_id": "mask-xyz789",
  "status": "applied"
}
```

**Mask Types:**
- `logo`: Company logo
- `watermark`: Document watermark
- `header`: Repetitive header
- `footer`: Repetitive footer
- `custom`: User-defined region

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "error": {
    "code": "INVALID_FILE_FORMAT",
    "message": "Unsupported file format. Supported: PDF, JPG, PNG, TIFF",
    "details": {
      "provided_format": "docx"
    }
  }
}
```

**Common Error Codes:**
- `INVALID_FILE_FORMAT`: Unsupported file type
- `FILE_TOO_LARGE`: File exceeds size limit
- `CASE_NOT_FOUND`: Case ID not found
- `INVALID_REGION`: Invalid region coordinates
- `PROFILE_NOT_FOUND`: OCR profile not found
- `RATE_LIMIT_EXCEEDED`: Too many requests

---

## Rate Limiting

**Limits:**
- 100 requests/minute per tenant
- 1000 requests/hour per tenant

**Headers:**
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1643723400
```

---

## Webhooks

Configure webhooks to receive notifications when processing completes:

**Webhook Payload:**
```json
{
  "event": "case.completed",
  "case_id": "case-abc123",
  "status": "approved",
  "confidence": 95,
  "timestamp": "2026-01-25T10:30:00Z"
}
```

**Events:**
- `case.completed`: Processing finished
- `case.approved`: Case auto-approved
- `case.review_required`: Manual review needed
- `case.failed`: Processing failed

---

## Best Practices

1. **File Size**: Keep files under 5MB for optimal performance
2. **Retry Logic**: Implement exponential backoff for failed requests
3. **Webhooks**: Use webhooks instead of polling for status updates
4. **Batch Processing**: Process multiple files concurrently (up to 5)
5. **Error Handling**: Always check error codes and handle appropriately

---

**Version:** 3.0  
**Last Updated:** January 25, 2026
