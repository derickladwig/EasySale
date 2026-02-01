# Work Order Invoice Integration

## Overview
This document describes the invoice creation functionality integrated into the Work Orders feature.

## Implementation Details

### Frontend Changes

#### 1. API Layer (`frontend/src/sales/api/index.ts`)
- Added `Invoice` interface with all invoice fields
- Updated `WorkOrder` interface to include invoice-related fields:
  - `invoicedAt?: string` - Timestamp when invoice was created
  - `invoiceId?: number` - ID of the created invoice
  - `invoiceNumber?: string` - Invoice number for display
- Added `createInvoice` method to `workOrderApi`:
  ```typescript
  createInvoice: async (id: string): Promise<Invoice> => {
    return apiClient.post(`/api/work-orders/${id}/invoice`);
  }
  ```

#### 2. Hooks Layer (`frontend/src/sales/hooks/useWorkOrders.ts`)
- Added `useCreateInvoiceFromWorkOrder` hook:
  - Calls the invoice creation API endpoint
  - Invalidates work order queries to refresh data
  - Shows success toast with invoice number
  - Shows error toast on failure
  - Properly typed with `Invoice` return type

#### 3. UI Layer (`frontend/src/sales/components/WorkOrdersTab.tsx`)
- Added `FileText` icon import from lucide-react
- Added `useCreateInvoiceFromWorkOrder` hook usage
- Added invoice information display section:
  - Shows when work order is completed AND has an invoice
  - Displays invoice number with FileText icon
  - Shows creation date in user-friendly format
  - Uses semantic theme tokens (`text-success`, `text-text-tertiary`, etc.)
- Added "Create Invoice" button:
  - Shows only when work order is completed AND not yet invoiced
  - Disabled during invoice creation (loading state)
  - Shows "Creating Invoice..." text during loading
  - Uses FileText icon for visual clarity
  - Follows EasySale UI patterns with semantic tokens

### Theme Compliance
All UI elements follow GLOBAL_RULES_EASYSALE.md:
- ✅ Uses semantic tokens: `text-success`, `text-text-tertiary`, `text-text-primary`, `text-text-disabled`
- ✅ No hardcoded colors
- ✅ No direct DOM manipulation
- ✅ Consistent with existing EasySale UI patterns

### Backend Integration
The frontend integrates with the existing backend endpoint:
- **Endpoint**: `POST /api/work-orders/{id}/invoice`
- **Handler**: `backend/crates/server/src/handlers/invoices.rs::create_invoice_from_work_order`
- **Service**: `backend/crates/server/src/services/invoice_service.rs::create_from_work_order`

### User Flow

#### Scenario 1: Create Invoice from Completed Work Order
1. User completes a work order (clicks "Complete" button)
2. Work order status changes to "completed"
3. "Create Invoice" button appears
4. User clicks "Create Invoice"
5. Button shows "Creating Invoice..." (disabled)
6. Backend creates invoice, reduces inventory, updates work order
7. Success toast shows: "Invoice INV-001 created successfully"
8. Work order refreshes, showing invoice information
9. "Create Invoice" button is replaced with invoice details

#### Scenario 2: View Existing Invoice
1. User views a completed work order that already has an invoice
2. Invoice information section displays:
   - Invoice icon (FileText)
   - "Invoice:" label
   - Invoice number (e.g., "INV-001")
   - Creation date (e.g., "(Created 1/30/2026)")
3. No "Create Invoice" button is shown

#### Scenario 3: Error Handling
1. User clicks "Create Invoice"
2. Backend returns error (e.g., insufficient inventory)
3. Error toast shows: "Failed to create invoice" or specific error message
4. Button returns to enabled state
5. User can retry or investigate the issue

### Error Handling
The implementation handles all backend error cases:
- Work order not found (404)
- Work order not completed (400)
- Already invoiced (400)
- Insufficient inventory (400)
- Invalid state (400)
- Database errors (500)

### Testing Recommendations
1. **Unit Tests**:
   - Test `useCreateInvoiceFromWorkOrder` hook
   - Test invoice display logic
   - Test button visibility conditions

2. **Integration Tests**:
   - Test complete work order → create invoice flow
   - Test error handling for various error cases
   - Test UI updates after invoice creation

3. **E2E Tests**:
   - Complete work order and create invoice
   - Verify invoice information displays correctly
   - Verify button states and loading indicators

## Files Modified
1. `frontend/src/sales/api/index.ts` - Added Invoice interface and createInvoice API method
2. `frontend/src/sales/hooks/useWorkOrders.ts` - Added useCreateInvoiceFromWorkOrder hook
3. `frontend/src/sales/components/WorkOrdersTab.tsx` - Added invoice UI and button

## Dependencies
- Existing backend invoice service (already implemented)
- React Query for data fetching and mutations
- Lucide React for icons
- EasySale theme system for styling

## Future Enhancements
1. Add link to view full invoice details
2. Add ability to download/print invoice
3. Add invoice status indicator
4. Add ability to void/cancel invoice
5. Add invoice preview before creation
