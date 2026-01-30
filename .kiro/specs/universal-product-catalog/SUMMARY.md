# Universal Product Catalog System - Specification Summary

## Overview

The Universal Product Catalog System is a **configuration-driven product management solution** that adapts to any business type through the existing multi-tenant platform. It provides unlimited customization without code changes by storing category-specific attributes as JSON and validating them against tenant configuration.

## Key Features

### 1. Configuration-Driven Categories
- Define unlimited product categories in tenant config
- Each category has custom attributes (text, number, dropdown, hierarchy, etc.)
- Attributes validated automatically against configuration
- No database schema changes needed for new attributes

### 2. Dynamic Attribute Storage
- Product attributes stored as JSON in `attributes` column
- Validated against category configuration on save
- Supports all attribute types: text, number, dropdown, multi-select, date, boolean, hierarchy
- Enforces constraints: required, unique, min/max, pattern

### 3. Advanced Search & Filtering
- Full-text search using SQLite FTS5
- Category-specific filters from configuration
- Hierarchy filtering (e.g., vehicle Make → Model → Year)
- Autocomplete suggestions
- Fuzzy matching for typos
- Sub-200ms search performance

### 4. Category-Specific Wizards
- Guided product lookup workflows
- Steps defined in category configuration
- Dependent filtering (next step filtered by previous selection)
- Perfect for complex lookups (vehicle parts, paint matching)

### 5. Bulk Operations
- Import products from CSV/Excel/JSON
- Export products in multiple formats
- Bulk update selected products
- Bulk delete with confirmation
- Validation before processing
- Progress indication for large operations

### 6. Product Variants
- Parent-child product relationships
- Variants inherit common attributes
- Track variant-specific attributes
- Separate inventory per variant

### 7. Offline-First Operation
- Full CRUD operations work offline
- Changes queued for synchronization
- Automatic sync when connectivity returns
- Conflict resolution with last-write-wins

### 8. Multi-Store Synchronization
- Product changes sync across all locations
- Tenant isolation (no cross-tenant access)
- Optimistic concurrency control
- Audit trail for all changes

## Architecture Highlights

### Database Schema
- **Extends existing `products` table** with new columns:
  - `attributes TEXT` - JSON for dynamic attributes
  - `parent_id TEXT` - For product variants
  - `barcode TEXT` - Barcode support
  - `images TEXT` - JSON array of image URLs
  - `tenant_id TEXT` - Multi-tenant isolation

- **New tables:**
  - `product_search_index` - FTS5 full-text search
  - `product_variants` - Parent-child relationships
  - `product_relationships` - Related products
  - `product_price_history` - Price change tracking
  - `product_templates` - Reusable templates

### Backend Services
- **ProductService** - Core CRUD operations with validation
- **SearchService** - Full-text search with filters
- **VariantService** - Variant management
- **BarcodeService** - Barcode generation and validation
- **AttributeValidator** - Validates attributes against config

### Frontend Components
- **ProductGrid** - Grid/list view with filtering
- **ProductSearch** - Search with autocomplete and filters
- **ProductForm** - Dynamic form generated from config
- **CategoryWizard** - Guided product lookup
- **BulkOperations** - Import/export/update
- **VariantManager** - Variant management

## Configuration Example

```json
{
  "categories": [
    {
      "id": "auto-parts",
      "name": "Auto Parts",
      "icon": "Car",
      "attributes": [
        { "name": "name", "type": "text", "required": true },
        { "name": "sku", "type": "text", "required": true, "unique": true },
        { "name": "partNumber", "type": "text" },
        { "name": "price", "type": "number", "required": true, "min": 0 },
        { "name": "vehicleFitment", "type": "hierarchy", "hierarchySource": "vehicle-hierarchy" },
        { "name": "partType", "type": "dropdown", "values": ["Engine", "Brakes", "Suspension"] }
      ],
      "searchFields": ["name", "sku", "partNumber"],
      "filters": [
        { "field": "vehicleFitment", "type": "hierarchy" },
        { "field": "partType", "type": "dropdown" }
      ],
      "wizard": {
        "enabled": true,
        "steps": [
          { "id": "make", "title": "Select Make", "fields": ["vehicleFitment.make"] },
          { "id": "model", "title": "Select Model", "fields": ["vehicleFitment.model"], "dependsOn": "make" },
          { "id": "year", "title": "Select Year", "fields": ["vehicleFitment.year"], "dependsOn": "model" }
        ]
      }
    }
  ]
}
```

## API Endpoints

- `GET /api/products` - List products with pagination and filters
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Soft delete product
- `POST /api/products/search` - Advanced search with filters
- `POST /api/products/bulk` - Bulk operations
- `GET /api/products/categories` - Get category configurations

## Requirements Coverage

- **20 major requirements** with 100+ acceptance criteria
- **15 correctness properties** for property-based testing
- **Complete EARS patterns** for all requirements
- **Full traceability** from requirements to tasks

## Implementation Plan

### Phase 1: Database Schema & Migrations (2 hours)
- 6 migrations to extend products table and create new tables
- FTS5 search index
- Indexes for performance

### Phase 2: Backend Models & Validation (3 hours)
- Rust models for all entities
- AttributeValidator with comprehensive validation
- Unit tests for all validation logic

### Phase 3: Backend Service Layer (4 hours)
- ProductService, SearchService, VariantService, BarcodeService
- Business logic with error handling
- Audit logging integration

### Phase 4: Backend API Handlers (3 hours)
- 8 REST API endpoints
- Permission-based access control
- Proper HTTP status codes

### Phase 5: Frontend Components (5 hours)
- ProductGrid, ProductSearch, ProductForm
- CategoryWizard, BulkOperations, VariantManager
- Dynamic form generation from config

### Phase 6: Integration & Testing (3 hours)
- Integration into main app
- Integration tests for all workflows
- Performance tests (100K products)
- Optional property-based tests

**Total: 20 hours (2.5 days)**

## Success Metrics

- ✅ Supports 100,000+ products per tenant
- ✅ Search results in < 200ms (95th percentile)
- ✅ Bulk import at 1000+ products/minute
- ✅ 100% offline functionality
- ✅ Zero code changes for new categories
- ✅ Complete audit trail
- ✅ Multi-tenant isolation

## Benefits

### For Business Owners
- Adapt system to any business type through configuration
- No developer needed for category changes
- Complete product catalog out of the box

### For Developers
- Clean, maintainable architecture
- Comprehensive test coverage
- Clear separation of concerns
- Extensible design

### For Users
- Fast, responsive product search
- Intuitive guided wizards
- Bulk operations for efficiency
- Works offline without limitations

## Next Steps

1. Review and approve this specification
2. Begin Phase 1: Database Schema & Migrations
3. Implement systematically through all 6 phases
4. Test thoroughly at each checkpoint
5. Deploy to production

## Related Specifications

- **Multi-Tenant Platform** - Configuration system foundation
- **Sales & Customer Management** - Integrates with product catalog
- **Backup & Sync** - Handles product synchronization
- **Settings Consolidation** - Product catalog settings

## Questions?

This specification is ready for implementation. All requirements are clear, design is complete, and tasks are actionable. The system leverages existing infrastructure (multi-tenant config, auth, sync) and extends it with powerful product catalog capabilities.

**Ready to build? Let's start with Phase 1!** 🚀
