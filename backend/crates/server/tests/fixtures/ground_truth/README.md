# Golden Set Ground Truth

This directory contains ground truth JSON files for the golden set of test invoices.

## Format

Each JSON file corresponds to an invoice fixture and contains the expected extracted values:

```json
{
  "invoice_number": "string",
  "invoice_date": "YYYY-MM-DD",
  "vendor_name": "string",
  "vendor_address": "string (optional)",
  "subtotal": number,
  "tax": number,
  "total": number,
  "line_items": [
    {
      "sku": "string",
      "description": "string",
      "quantity": number,
      "unit_price": number,
      "line_total": number
    }
  ]
}
```

## Validation

Ground truth files are validated against the schema on load. All numeric values must be accurate to 2 decimal places.

## Coverage

The golden set should include:
- Clean, high-quality invoices
- Rotated invoices (90°, 180°, 270°)
- Noisy/low-quality scans
- Multi-page invoices
- Handwritten invoices
- Various vendor formats
- Edge cases (missing fields, unusual layouts)

Target: 20+ diverse invoice samples
