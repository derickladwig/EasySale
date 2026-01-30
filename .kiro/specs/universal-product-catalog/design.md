# Design Document: Universal Product Catalog System

## Overview

The Universal Product Catalog System is a configuration-driven product management solution that leverages the existing multi-tenant platform to provide flexible, extensible product catalogs for any business type. The system stores category-specific attributes as JSON, enabling unlimited customization without database schema changes.

**Key Design Principles:**
1. **Configuration Over Code**: All category definitions, attributes, and workflows come from tenant configuration
2. **Dynamic Schema**: Product attributes stored as JSON, validated against configuration
3. **Offline-First**: Full CRUD operations work offline with automatic synchronization
4. **Performance**: Sub-200ms search, supports 100K+ products per tenant
5. **Universal**: Works for retail, automotive, restaurant, service businesses, etc.

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                         │
├─────────────────────────────────────────────────────────────┤
│  Product Catalog UI                                          │
│  ├── ProductGrid (category-aware display)                    │
│  ├── ProductSearch (full-text + filters)                     │
│  ├── ProductForm (dynamic form from config)                  │
│  ├── CategoryWizard (guided product lookup)                  │
│  ├── BulkOperations (import/export/update)                   │
│  └── VariantManager (parent-child products)                  │
├─────────────────────────────────────────────────────────────┤
│  Configuration System (existing)                             │
│  ├── ConfigProvider (loads tenant config)                    │
│  ├── CategoryConfig (category definitions)                   │
│  └── AttributeValidator (validates dynamic attributes)       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend API (Rust)                        │
├─────────────────────────────────────────────────────────────┤
│  Product Handlers                                            │
│  ├── list_products (pagination, filters, search)             │
│  ├── get_product (by ID or SKU)                              │
│  ├── create_product (validate + save)                        │
│  ├── update_product (validate + save)                        │
│  ├── delete_product (soft delete)                            │
│  ├── search_products (full-text search)                      │
│  └── bulk_operations (import/export/update)                  │
├─────────────────────────────────────────────────────────────┤
│  Product Service Layer                                       │
│  ├── ProductService (business logic)                         │
│  ├── AttributeValidator (validates against config)           │
│  ├── SearchIndexer (full-text search)                        │
│  ├── VariantManager (parent-child relationships)             │
│  └── BarcodeGenerator (generates unique barcodes)            │
├─────────────────────────────────────────────────────────────┤
│  Configuration Loader (existing)                             │
│  └── Loads category definitions from tenant config           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Database (SQLite)                         │
├─────────────────────────────────────────────────────────────┤
│  products (extended with dynamic attributes)                 │
│  ├── id, sku, name, description                              │
│  ├── category, subcategory                                   │
│  ├── unit_price, cost, quantity_on_hand                      │
│  ├── attributes (JSONB - dynamic per category)               │
│  ├── parent_id (for variants)                                │
│  ├── barcode, barcode_type                                   │
│  ├── images (JSON array of image URLs)                       │
│  ├── is_active, tenant_id, store_id                          │
│  └── created_at, updated_at, sync_version                    │
├─────────────────────────────────────────────────────────────┤
│  product_search_index (full-text search)                     │
│  ├── product_id, searchable_text                             │
│  └── FTS5 virtual table for fast search                      │
├─────────────────────────────────────────────────────────────┤
│  product_variants (parent-child relationships)               │
│  ├── parent_id, variant_id                                   │
│  └── variant_attributes (JSON - differentiating attributes)  │
├─────────────────────────────────────────────────────────────┤
│  product_relationships (related products)                    │
│  ├── product_id, related_product_id                          │
│  ├── relationship_type (related, accessory, alternative)     │
│  └── display_order                                           │
├─────────────────────────────────────────────────────────────┤
│  product_price_history (price change tracking)               │
│  ├── product_id, old_price, new_price                        │
│  ├── changed_by, changed_at                                  │
│  └── reason                                                  │
├─────────────────────────────────────────────────────────────┤
│  product_templates (reusable product templates)              │
│  ├── id, name, category                                      │
│  ├── template_attributes (JSON)                              │
│  └── created_by, tenant_id                                   │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

**Product Creation Flow:**
```
1. User fills dynamic form (generated from category config)
2. Frontend validates attributes against category config
3. POST /api/products with product data + dynamic attributes
4. Backend validates attributes against category config
5. Backend saves to products table (attributes as JSON)
6. Backend updates search index with searchable fields
7. Backend logs creation to audit log
8. Backend queues sync to other stores
9. Frontend updates UI with new product
```

**Product Search Flow:**
```
1. User enters search query
2. Frontend sends GET /api/products/search with query + filters
3. Backend searches FTS5 index for matching products
4. Backend applies category filters from config
5. Backend applies hierarchy filters (e.g., vehicle fitment)
6. Backend returns paginated results (50 per page)
7. Frontend displays results with category-specific display template
```

**Wizard Flow:**
```
1. User clicks wizard button for category
2. Frontend loads wizard steps from category config
3. User selects options in each step
4. Frontend filters next step options based on previous selections
5. User completes all steps
6. Frontend searches products matching all wizard criteria
7. Frontend displays matching products
```

## Components and Interfaces

### Backend Models

```rust
// Product model with dynamic attributes
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Product {
    pub id: String,
    pub sku: String,
    pub name: String,
    pub description: Option<String>,
    pub category: String,
    pub subcategory: Option<String>,
    pub unit_price: f64,
    pub cost: f64,
    pub quantity_on_hand: f64,
    pub reorder_point: Option<f64>,
    
    // Dynamic attributes (validated against category config)
    pub attributes: serde_json::Value,
    
    // Variant support
    pub parent_id: Option<String>,
    
    // Barcode support
    pub barcode: Option<String>,
    pub barcode_type: Option<String>,
    
    // Images
    pub images: Vec<String>,
    
    // Multi-tenant
    pub tenant_id: String,
    pub store_id: String,
    
    // Status and sync
    pub is_active: bool,
    pub sync_version: i64,
    pub created_at: String,
    pub updated_at: String,
}

// Product search request
#[derive(Debug, Deserialize)]
pub struct ProductSearchRequest {
    pub query: Option<String>,
    pub category: Option<String>,
    pub filters: Option<serde_json::Value>,
    pub page: Option<u32>,
    pub page_size: Option<u32>,
    pub sort_by: Option<String>,
    pub sort_order: Option<String>,
}

// Product search response
#[derive(Debug, Serialize)]
pub struct ProductSearchResponse {
    pub products: Vec<Product>,
    pub total: u32,
    pub page: u32,
    pub page_size: u32,
    pub has_more: bool,
}

// Bulk operation request
#[derive(Debug, Deserialize)]
pub struct BulkOperationRequest {
    pub operation: BulkOperation,
    pub product_ids: Option<Vec<String>>,
    pub updates: Option<serde_json::Value>,
    pub import_data: Option<Vec<serde_json::Value>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum BulkOperation {
    Update,
    Delete,
    Import,
    Export,
}
```

### Frontend Components

```typescript
// ProductGrid - displays products in grid/list view
interface ProductGridProps {
  category?: string;
  filters?: Record<string, any>;
  onProductSelect?: (product: Product) => void;
}

// ProductForm - dynamic form based on category config
interface ProductFormProps {
  category: string;
  product?: Product;
  onSave: (product: Product) => void;
  onCancel: () => void;
}

// ProductSearch - search with filters
interface ProductSearchProps {
  category?: string;
  onResultsChange?: (products: Product[]) => void;
}

// CategoryWizard - guided product lookup
interface CategoryWizardProps {
  category: string;
  onComplete: (filters: Record<string, any>) => void;
}

// BulkOperations - import/export/update
interface BulkOperationsProps {
  selectedProducts: Product[];
  onComplete: () => void;
}

// Product type
interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  category: string;
  subcategory?: string;
  unitPrice: number;
  cost: number;
  quantityOnHand: number;
  reorderPoint?: number;
  attributes: Record<string, any>; // Dynamic attributes
  parentId?: string;
  barcode?: string;
  barcodeType?: string;
  images: string[];
  tenantId: string;
  storeId: string;
  isActive: boolean;
  syncVersion: number;
  createdAt: string;
  updatedAt: string;
}
```

## Data Models

### Database Schema Extensions

```sql
-- Extend existing products table with new columns
ALTER TABLE products ADD COLUMN attributes TEXT; -- JSON column for dynamic attributes
ALTER TABLE products ADD COLUMN parent_id TEXT; -- For product variants
ALTER TABLE products ADD COLUMN barcode TEXT;
ALTER TABLE products ADD COLUMN barcode_type TEXT;
ALTER TABLE products ADD COLUMN images TEXT; -- JSON array of image URLs
ALTER TABLE products ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_tenant_id ON products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_parent_id ON products(parent_id);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_category_tenant ON products(category, tenant_id);

-- Full-text search index (FTS5)
CREATE VIRTUAL TABLE IF NOT EXISTS product_search_index USING fts5(
    product_id UNINDEXED,
    searchable_text,
    category UNINDEXED,
    tenant_id UNINDEXED
);

-- Product variants table
CREATE TABLE IF NOT EXISTS product_variants (
    id TEXT PRIMARY KEY,
    parent_id TEXT NOT NULL,
    variant_id TEXT NOT NULL,
    variant_attributes TEXT, -- JSON - attributes that differ from parent
    display_order INTEGER DEFAULT 0,
    tenant_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (parent_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (variant_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_variants_parent ON product_variants(parent_id);
CREATE INDEX IF NOT EXISTS idx_variants_tenant ON product_variants(tenant_id);

-- Product relationships table
CREATE TABLE IF NOT EXISTS product_relationships (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    related_product_id TEXT NOT NULL,
    relationship_type TEXT NOT NULL, -- 'related', 'accessory', 'alternative', 'bundle'
    display_order INTEGER DEFAULT 0,
    tenant_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (related_product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_relationships_product ON product_relationships(product_id);
CREATE INDEX IF NOT EXISTS idx_relationships_tenant ON product_relationships(tenant_id);

-- Product price history table
CREATE TABLE IF NOT EXISTS product_price_history (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    old_price REAL NOT NULL,
    new_price REAL NOT NULL,
    changed_by TEXT NOT NULL,
    changed_at TEXT NOT NULL DEFAULT (datetime('now')),
    reason TEXT,
    tenant_id TEXT NOT NULL,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_price_history_product ON product_price_history(product_id);
CREATE INDEX IF NOT EXISTS idx_price_history_tenant ON product_price_history(tenant_id);

-- Product templates table
CREATE TABLE IF NOT EXISTS product_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    template_attributes TEXT NOT NULL, -- JSON
    created_by TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_templates_category ON product_templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_tenant ON product_templates(tenant_id);
```

### Attribute Validation Logic

```rust
// Validates product attributes against category configuration
pub fn validate_attributes(
    category_config: &CategoryConfig,
    attributes: &serde_json::Value,
) -> Result<(), Vec<ValidationError>> {
    let mut errors = Vec::new();
    
    for attr_config in &category_config.attributes {
        let value = attributes.get(&attr_config.name);
        
        // Check required
        if attr_config.required && value.is_none() {
            errors.push(ValidationError {
                field: attr_config.name.clone(),
                message: format!("{} is required", attr_config.label.as_ref().unwrap_or(&attr_config.name)),
            });
            continue;
        }
        
        if let Some(value) = value {
            // Type validation
            match attr_config.type_ {
                AttributeType::Number => {
                    if !value.is_number() {
                        errors.push(ValidationError {
                            field: attr_config.name.clone(),
                            message: format!("{} must be a number", attr_config.label.as_ref().unwrap_or(&attr_config.name)),
                        });
                    } else {
                        // Min/max validation
                        if let Some(min) = attr_config.min {
                            if value.as_f64().unwrap() < min {
                                errors.push(ValidationError {
                                    field: attr_config.name.clone(),
                                    message: format!("{} must be at least {}", attr_config.label.as_ref().unwrap_or(&attr_config.name), min),
                                });
                            }
                        }
                        if let Some(max) = attr_config.max {
                            if value.as_f64().unwrap() > max {
                                errors.push(ValidationError {
                                    field: attr_config.name.clone(),
                                    message: format!("{} must be at most {}", attr_config.label.as_ref().unwrap_or(&attr_config.name), max),
                                });
                            }
                        }
                    }
                }
                AttributeType::Dropdown => {
                    if let Some(values) = &attr_config.values {
                        if !values.contains(&value.as_str().unwrap_or("").to_string()) {
                            errors.push(ValidationError {
                                field: attr_config.name.clone(),
                                message: format!("{} must be one of: {}", attr_config.label.as_ref().unwrap_or(&attr_config.name), values.join(", ")),
                            });
                        }
                    }
                }
                AttributeType::Text => {
                    if !value.is_string() {
                        errors.push(ValidationError {
                            field: attr_config.name.clone(),
                            message: format!("{} must be text", attr_config.label.as_ref().unwrap_or(&attr_config.name)),
                        });
                    } else if let Some(pattern) = &attr_config.pattern {
                        let regex = Regex::new(pattern).unwrap();
                        if !regex.is_match(value.as_str().unwrap()) {
                            errors.push(ValidationError {
                                field: attr_config.name.clone(),
                                message: format!("{} format is invalid", attr_config.label.as_ref().unwrap_or(&attr_config.name)),
                            });
                        }
                    }
                }
                _ => {}
            }
        }
    }
    
    if errors.is_empty() {
        Ok(())
    } else {
        Err(errors)
    }
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Attribute Validation Consistency
*For any* product and category configuration, if the product's attributes pass validation, then saving and reloading the product should pass validation again with the same configuration.

**Validates: Requirements 2.2, 17.1, 17.6**

### Property 2: SKU Uniqueness
*For any* two products in the same tenant, their SKUs must be different.

**Validates: Requirements 17.2**

### Property 3: Search Index Consistency
*For any* product, if it's saved with searchable attributes, then searching for those attribute values should return that product in the results.

**Validates: Requirements 3.1, 18.1**

### Property 4: Category Configuration Compliance
*For any* product in a category, all required attributes defined in the category configuration must be present in the product's attributes.

**Validates: Requirements 1.2, 2.2**

### Property 5: Price Non-Negativity
*For any* product, the unit_price and cost must be non-negative numbers.

**Validates: Requirements 17.3, 17.4**

### Property 6: Variant Parent Relationship
*For any* product variant, if it has a parent_id, then a product with that ID must exist and must not itself be a variant.

**Validates: Requirements 6.1, 6.3**

### Property 7: Hierarchy Filter Correctness
*For any* hierarchy filter (e.g., vehicle fitment), products returned must match all levels of the hierarchy path.

**Validates: Requirements 3.4, 4.3**

### Property 8: Bulk Operation Atomicity
*For any* bulk update operation, either all products are updated successfully, or none are updated (all-or-nothing).

**Validates: Requirements 5.2**

### Property 9: Offline Queue Consistency
*For any* product operation performed offline, when connectivity returns, the operation must be replicated to other stores with the same result.

**Validates: Requirements 12.3, 12.4**

### Property 10: Tenant Isolation
*For any* two products from different tenants, operations on one product must never affect the other product.

**Validates: Requirements 13.1, 13.2**

### Property 11: Search Result Relevance Ordering
*For any* search query, results must be ordered by relevance (exact match > starts with > contains).

**Validates: Requirements 18.6**

### Property 12: Import Validation Before Processing
*For any* import operation, if any row has validation errors, no products should be created or updated.

**Validates: Requirements 5.4, 19.3**

### Property 13: Barcode Uniqueness
*For any* two products in the same tenant, if both have barcodes, the barcodes must be different.

**Validates: Requirements 8.6**

### Property 14: Price History Completeness
*For any* product price change, a record must exist in price history with old price, new price, user, and timestamp.

**Validates: Requirements 9.4**

### Property 15: Audit Log Completeness
*For any* product create, update, or delete operation, a corresponding audit log entry must exist.

**Validates: Requirements 15.1, 15.2, 15.3**

## Error Handling

### Validation Errors
- **Invalid Attributes**: Return 400 with detailed field-level errors
- **Missing Required Fields**: Return 400 with list of missing fields
- **Duplicate SKU**: Return 409 with conflict message
- **Duplicate Barcode**: Return 409 with conflict message
- **Invalid Category**: Return 400 with available categories

### Database Errors
- **Connection Failure**: Retry 3 times with exponential backoff
- **Constraint Violation**: Return 409 with constraint details
- **Transaction Failure**: Rollback and return 500 with error details

### Search Errors
- **Index Corruption**: Rebuild index automatically
- **Query Timeout**: Return 504 with partial results
- **Invalid Query Syntax**: Return 400 with syntax error details

### Sync Errors
- **Conflict Detection**: Flag for manual resolution, preserve both versions
- **Network Timeout**: Queue for retry with exponential backoff
- **Version Mismatch**: Use last-write-wins with timestamp + store_id

## Testing Strategy

### Unit Tests
- Attribute validation logic (all attribute types, constraints)
- Search query parsing and execution
- Barcode generation and validation
- Price calculation and margin computation
- Variant relationship management
- Import/export data transformation

### Property-Based Tests
- Property 1: Attribute validation consistency (100 iterations)
- Property 2: SKU uniqueness (100 iterations)
- Property 3: Search index consistency (100 iterations)
- Property 4: Category configuration compliance (100 iterations)
- Property 5: Price non-negativity (100 iterations)
- Property 6: Variant parent relationship (100 iterations)
- Property 7: Hierarchy filter correctness (100 iterations)
- Property 8: Bulk operation atomicity (100 iterations)
- Property 9: Offline queue consistency (100 iterations)
- Property 10: Tenant isolation (100 iterations)
- Property 11: Search result relevance ordering (100 iterations)
- Property 12: Import validation before processing (100 iterations)
- Property 13: Barcode uniqueness (100 iterations)
- Property 14: Price history completeness (100 iterations)
- Property 15: Audit log completeness (100 iterations)

### Integration Tests
- End-to-end product creation with dynamic attributes
- Search with multiple filters and pagination
- Wizard flow with hierarchy selection
- Bulk import with validation errors
- Offline operation and sync
- Multi-store synchronization
- Variant creation and management

### Performance Tests
- Search performance with 100K products (target: < 200ms)
- Product detail load time (target: < 100ms)
- Bulk import speed (target: 1000 products/minute)
- Concurrent user operations (target: 50 users)

## Performance Considerations

### Database Optimization
- Indexes on sku, name, category, tenant_id, barcode
- FTS5 virtual table for full-text search
- Pagination for all list queries (50 items per page)
- Connection pooling (10 connections)
- Prepared statements for all queries

### Caching Strategy
- Category configurations cached in memory (reload on change)
- Search results cached for 5 minutes
- Product details cached for 1 minute
- Invalidate cache on product update

### Search Optimization
- FTS5 index rebuilt nightly
- Autocomplete limited to 10 suggestions
- Search results limited to 1000 items
- Fuzzy matching only for queries > 3 characters

### Bulk Operation Optimization
- Process in batches of 1000 products
- Use transactions for atomicity
- Progress updates every 100 products
- Background processing for large imports

## Security Considerations

### Authentication & Authorization
- All endpoints require JWT authentication
- Product operations require appropriate permissions:
  - `view_products`: View products
  - `create_products`: Create products
  - `update_products`: Update products
  - `delete_products`: Delete products
  - `manage_catalog`: Full catalog management

### Data Validation
- Sanitize all user input
- Validate JSON attributes against schema
- Prevent SQL injection (use parameterized queries)
- Limit file upload sizes (5MB per image)

### Tenant Isolation
- All queries filtered by tenant_id
- No cross-tenant data access
- Audit logs per tenant
- Separate search indexes per tenant

### API Rate Limiting
- 100 requests per minute per user
- 10 bulk operations per hour per user
- 1000 search queries per hour per user

## Deployment Considerations

### Database Migrations
- Migration 010: Add new columns to products table
- Migration 011: Create product_search_index (FTS5)
- Migration 012: Create product_variants table
- Migration 013: Create product_relationships table
- Migration 014: Create product_price_history table
- Migration 015: Create product_templates table

### Configuration Updates
- No configuration changes required (uses existing tenant config)
- Example configurations provided for common business types

### Backward Compatibility
- Existing products table extended (no breaking changes)
- New columns have default values
- Existing products work without attributes column

### Rollback Plan
- Migrations are reversible
- Backup database before migration
- Rollback script provided for each migration
