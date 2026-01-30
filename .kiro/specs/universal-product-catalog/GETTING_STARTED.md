# Getting Started with Universal Product Catalog

## Quick Start

This guide helps you understand and implement the Universal Product Catalog System.

## What Is This?

A **configuration-driven product catalog** that adapts to any business type without code changes. Define your categories, attributes, and workflows in JSON configuration - the system handles the rest.

## Key Concepts

### 1. Categories
Product classifications defined in tenant configuration. Each category has:
- **Attributes**: Custom fields (text, number, dropdown, hierarchy, etc.)
- **Search Fields**: Which attributes to index for search
- **Filters**: UI filters for product browsing
- **Wizard**: Optional guided lookup workflow

**Example:** "Auto Parts" category with attributes like partNumber, vehicleFitment, partType.

### 2. Dynamic Attributes
Product-specific data stored as JSON, validated against category configuration. Allows unlimited customization without database schema changes.

**Example:** A cap has "size" and "color", an auto part has "vehicleFitment" and "partType".

### 3. Hierarchies
Multi-level selection systems (e.g., Make → Model → Year for vehicles). Defined once in configuration, reused across categories.

### 4. Wizards
Guided multi-step workflows for complex product lookups. Steps can depend on previous selections for smart filtering.

### 5. Variants
Parent-child product relationships. Variants inherit common attributes but have their own SKU and inventory.

**Example:** "Baseball Cap" (parent) with variants for each size/color combination.

## How It Works

### Configuration Flow
```
1. Define category in tenant config (JSON)
2. System loads and validates configuration
3. Frontend generates dynamic forms/filters
4. Backend validates attributes on save
5. Search index updated automatically
```

### Product Creation Flow
```
1. User selects category
2. Form generated from category attributes
3. User fills in required/optional fields
4. Frontend validates against config
5. Backend validates and saves
6. Search index updated
7. Audit log created
8. Sync queued to other stores
```

### Search Flow
```
1. User enters search query
2. System searches FTS5 index
3. Filters applied from category config
4. Results ranked by relevance
5. Paginated results returned (50 per page)
```

## Implementation Phases

### Phase 1: Database (2 hours)
Extend products table, create search index, add supporting tables.

**Start here:** `.kiro/specs/universal-product-catalog/tasks.md` - Tasks 1-2

### Phase 2: Backend Models (3 hours)
Create Rust models and attribute validation system.

**Start here:** Tasks 3-5

### Phase 3: Backend Services (4 hours)
Implement ProductService, SearchService, VariantService, BarcodeService.

**Start here:** Tasks 6-10

### Phase 4: Backend API (3 hours)
Create 8 REST API endpoints with permission checks.

**Start here:** Tasks 11-13

### Phase 5: Frontend (5 hours)
Build ProductGrid, ProductSearch, ProductForm, CategoryWizard, BulkOperations.

**Start here:** Tasks 14-21

### Phase 6: Integration (3 hours)
Integrate into main app, write tests, verify performance.

**Start here:** Tasks 22-26

## Configuration Examples

### Simple Category (Caps)
```json
{
  "id": "caps",
  "name": "Caps",
  "icon": "Tag",
  "attributes": [
    { "name": "name", "type": "text", "required": true },
    { "name": "sku", "type": "text", "required": true, "unique": true },
    { "name": "price", "type": "number", "required": true, "min": 0 },
    { "name": "size", "type": "dropdown", "values": ["S", "M", "L", "XL"] },
    { "name": "color", "type": "dropdown", "values": ["Black", "Navy", "Red"] }
  ],
  "searchFields": ["name", "sku"],
  "filters": [
    { "field": "size", "type": "dropdown" },
    { "field": "color", "type": "dropdown" }
  ]
}
```

### Complex Category with Wizard (Auto Parts)
```json
{
  "id": "auto-parts",
  "name": "Auto Parts",
  "icon": "Car",
  "attributes": [
    { "name": "name", "type": "text", "required": true },
    { "name": "sku", "type": "text", "required": true, "unique": true },
    { "name": "partNumber", "type": "text" },
    { "name": "price", "type": "number", "required": true, "min": 0 },
    { 
      "name": "vehicleFitment", 
      "type": "hierarchy", 
      "hierarchySource": "vehicle-hierarchy" 
    },
    { 
      "name": "partType", 
      "type": "dropdown", 
      "values": ["Engine", "Brakes", "Suspension"]
    }
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
      { "id": "year", "title": "Select Year", "fields": ["vehicleFitment.year"], "dependsOn": "model" },
      { "id": "part-type", "title": "Part Type", "fields": ["partType"] }
    ]
  }
}
```

### Hierarchy Definition (Vehicle)
```json
{
  "id": "vehicle-hierarchy",
  "name": "Vehicle Selection",
  "levels": [
    { "id": "make", "name": "Make" },
    { "id": "model", "name": "Model" },
    { "id": "year", "name": "Year" }
  ],
  "data": [
    { "make": "Toyota", "model": "Camry", "years": ["2020", "2021", "2022"] },
    { "make": "Toyota", "model": "Corolla", "years": ["2020", "2021", "2022"] },
    { "make": "Honda", "model": "Civic", "years": ["2019", "2020", "2021"] }
  ]
}
```

## API Usage Examples

### Create Product
```bash
POST /api/products
Authorization: Bearer <token>
Content-Type: application/json

{
  "sku": "CAP-001",
  "name": "Baseball Cap - Black",
  "category": "caps",
  "unit_price": 19.99,
  "cost": 10.00,
  "quantity_on_hand": 50,
  "attributes": {
    "size": "L",
    "color": "Black",
    "brand": "Nike"
  }
}
```

### Search Products
```bash
POST /api/products/search
Authorization: Bearer <token>
Content-Type: application/json

{
  "query": "brake pads",
  "category": "auto-parts",
  "filters": {
    "vehicleFitment": {
      "make": "Toyota",
      "model": "Camry",
      "year": "2020"
    },
    "partType": "Brakes"
  },
  "page": 1,
  "page_size": 50
}
```

### Bulk Import
```bash
POST /api/products/bulk
Authorization: Bearer <token>
Content-Type: application/json

{
  "operation": "import",
  "import_data": [
    {
      "sku": "CAP-002",
      "name": "Trucker Hat - Navy",
      "category": "caps",
      "unit_price": 24.99,
      "cost": 12.00,
      "attributes": {
        "size": "One Size",
        "color": "Navy"
      }
    }
  ]
}
```

## Testing Strategy

### Unit Tests
- Attribute validation (all types, constraints)
- Search query parsing
- Barcode generation
- Price calculations

### Integration Tests
- End-to-end product CRUD
- Search with filters
- Wizard flow
- Bulk operations
- Offline sync

### Property-Based Tests (Optional)
- 15 properties covering correctness guarantees
- 100 iterations per property
- Validates universal behaviors

### Performance Tests
- Search with 100K products (< 200ms)
- Bulk import (1000+ products/minute)
- Concurrent operations (50 users)

## Common Patterns

### Adding a New Category
1. Add category definition to tenant config
2. Define attributes with types and constraints
3. Specify searchFields for indexing
4. Add filters for UI
5. Optional: Add wizard for guided lookup
6. Restart backend to reload config
7. Frontend automatically generates forms/filters

### Creating a Product Variant
1. Create parent product with common attributes
2. Create variant with parent_id
3. Specify variant-specific attributes
4. System inherits common attributes
5. Each variant has own SKU and inventory

### Implementing a Wizard
1. Define wizard steps in category config
2. Specify field dependencies (dependsOn)
3. System handles filtering automatically
4. User completes steps
5. System searches with all criteria

## Troubleshooting

### Validation Errors
**Problem:** Product won't save, validation errors shown.

**Solution:** Check category configuration for required fields, data types, and constraints. Ensure all required attributes are provided and match expected types.

### Search Not Finding Products
**Problem:** Products exist but don't appear in search results.

**Solution:** Verify searchFields are configured in category. Check that search index is up to date. Rebuild index if needed.

### Wizard Steps Not Filtering
**Problem:** Wizard shows all options instead of filtering by previous selection.

**Solution:** Verify dependsOn is set correctly in wizard step configuration. Check that hierarchy data includes all levels.

### Bulk Import Failing
**Problem:** Import fails with validation errors.

**Solution:** Check import mapping matches category attributes. Verify all required fields are present. Check data types match configuration.

## Best Practices

### Configuration
- Use descriptive attribute names (camelCase)
- Provide clear labels for UI display
- Set appropriate constraints (min/max, pattern)
- Mark truly required fields as required
- Use hierarchies for complex relationships

### Performance
- Limit searchFields to essential attributes
- Use indexes on frequently filtered fields
- Paginate large result sets
- Cache category configurations

### Data Quality
- Enforce unique constraints on SKU
- Validate prices are non-negative
- Use patterns for formatted fields (phone, email)
- Provide helpful error messages

### User Experience
- Use wizards for complex lookups
- Provide autocomplete for search
- Show clear validation errors
- Enable bulk operations for efficiency

## Next Steps

1. **Review Specification**
   - Read `requirements.md` for complete requirements
   - Read `design.md` for architecture details
   - Read `tasks.md` for implementation plan

2. **Start Implementation**
   - Begin with Phase 1: Database Schema
   - Follow tasks sequentially
   - Test at each checkpoint

3. **Customize Configuration**
   - Define your business categories
   - Specify attributes and constraints
   - Configure search and filters
   - Add wizards if needed

4. **Test Thoroughly**
   - Unit tests for validation
   - Integration tests for workflows
   - Performance tests with realistic data
   - User acceptance testing

5. **Deploy**
   - Run migrations
   - Load configuration
   - Train users
   - Monitor performance

## Resources

- **Requirements:** `requirements.md` - 20 requirements, 100+ criteria
- **Design:** `design.md` - Complete architecture, 15 properties
- **Tasks:** `tasks.md` - 26 tasks, 6 phases, 20 hours
- **Summary:** `SUMMARY.md` - Executive overview
- **Blog:** `blog/2026-01-12-universal-product-catalog-spec.md` - Planning session

## Questions?

This specification is comprehensive and ready for implementation. All requirements are clear, design is complete, and tasks are actionable.

**Ready to build? Start with Phase 1!** 🚀
