# Roles and Permissions - Document Cleanup Engine

## Overview

This document defines the roles and permissions for the Document Cleanup Engine (DCE) features within EasySale.

## Roles

| Role | Description | Typical Users |
|------|-------------|---------------|
| `cashier` | Basic POS operations, view-only for documents | Sales staff |
| `reviewer` | Can review documents, adjust shields, approve | AP clerks, receiving staff |
| `manager` | Full review + can save vendor/template rules | Store managers |
| `admin` | All permissions + system configuration | System administrators |

## Capabilities

### Document Cleanup Engine Capabilities

| Capability Key | Description | Required Role |
|----------------|-------------|---------------|
| `cleanup.view` | View cleanup shields on documents | cashier |
| `cleanup.adjust_session` | Adjust shields for current session only | reviewer |
| `cleanup.save_vendor_rules` | Save cleanup rules for a vendor | manager |
| `cleanup.save_template_rules` | Save cleanup rules for a template | manager |
| `cleanup.configure_detection` | Configure auto-detection settings | admin |
| `cleanup.view_audit_log` | View cleanup audit history | manager |
| `cleanup.manage_thresholds` | Adjust detection thresholds per vendor | admin |

### Review Workspace Capabilities

| Capability Key | Description | Required Role |
|----------------|-------------|---------------|
| `review.view_queue` | View the review queue | reviewer |
| `review.claim_case` | Claim a case for review | reviewer |
| `review.approve_case` | Approve a reviewed case | reviewer |
| `review.reject_case` | Reject a case | reviewer |
| `review.rerun_extraction` | Trigger re-extraction with new shields | reviewer |
| `review.bulk_approve` | Bulk approve multiple cases | manager |

### Integration Capabilities

| Capability Key | Description | Required Role |
|----------------|-------------|---------------|
| `integration.inventory` | Push approved bills to inventory | manager |
| `integration.ap` | Create AP invoices from bills | manager |
| `integration.accounting` | Generate journal entries | admin |

## Feature Status Flags

Each capability can have a status that affects UI behavior:

| Status | UI Behavior |
|--------|-------------|
| `ready` | Fully functional, routes to implemented content |
| `beta` | Functional with beta badge, may have limitations |
| `comingSoon` | Shows badge + tooltip, click opens modal (no navigation) |
| `hidden` | Not rendered in UI |

## API Endpoint: GET /api/meta/capabilities

Returns capabilities for the authenticated user's tenant/store context.

### Response Schema

```json
{
  "tenant_id": "string",
  "store_id": "string",
  "user_role": "string",
  "capabilities": {
    "cleanup.view": {
      "status": "ready",
      "enabled": true,
      "reason": null
    },
    "cleanup.save_vendor_rules": {
      "status": "ready",
      "enabled": true,
      "reason": null
    },
    "cleanup.configure_detection": {
      "status": "comingSoon",
      "enabled": false,
      "reason": "Detection configuration coming in v4.1"
    }
  }
}
```

## Permission Checks

### Backend (Rust)

```rust
// Example permission check in handler
pub async fn save_vendor_rules(
    auth: AuthContext,
    req: SaveVendorRulesRequest,
) -> Result<impl Reply, Rejection> {
    // Verify capability
    auth.require_capability("cleanup.save_vendor_rules")?;
    
    // Verify tenant/store scope
    let tenant_id = auth.tenant_id();
    let store_id = auth.store_id();
    
    // Proceed with operation...
}
```

### Frontend (TypeScript)

```typescript
// Example capability check in component
import { useCapabilities } from '@/hooks/useCapabilities';

function CleanupShieldTool() {
  const { hasCapability, getStatus } = useCapabilities();
  
  const canSaveVendorRules = hasCapability('cleanup.save_vendor_rules');
  const saveStatus = getStatus('cleanup.save_vendor_rules');
  
  return (
    <Button 
      disabled={!canSaveVendorRules || saveStatus !== 'ready'}
      onClick={handleSaveVendorRules}
    >
      Save as Vendor Rule
    </Button>
  );
}
```

## Multi-Tenant Isolation

All capability checks are scoped to the authenticated user's tenant and store:

1. `tenant_id` is derived from the authentication token, never from client input
2. `store_id` is derived from the authentication context or session
3. All database queries include tenant_id and store_id filters
4. Cross-tenant access is impossible by design

## Audit Requirements

All permission-gated actions must be logged:

- User ID
- Action performed
- Tenant/Store context
- Timestamp
- Success/failure status
- Relevant entity IDs
