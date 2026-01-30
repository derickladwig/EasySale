# Requirements Document: Vendor Bill Receiving with OCR

## Introduction

The Vendor Bill Receiving system enables automated ingestion of vendor invoices/bills through OCR scanning, intelligent mapping of vendor line items to internal SKUs, and seamless posting of receiving transactions that update inventory levels and costs. This system integrates with the existing offline-first POS architecture, leveraging the current inventory transaction model, product catalog, and multi-tenant configuration system.

The system addresses the challenge of reconciling vendor-specific SKUs and descriptions with internal product identifiers through a learning-based matching engine that improves over time. It provides human-in-the-loop review for low-confidence matches while automating high-confidence mappings to streamline the receiving workflow.

## Glossary

- **Vendor_Bill**: A scanned or uploaded invoice/bill document from a supplier containing line items to be received into inventory
- **OCR_Engine**: Optical Character Recognition service that extracts text and structured data from bill images/PDFs
- **Vendor_SKU**: The product identifier used by the vendor on their invoice (may differ from internal SKU)
- **SKU_Alias**: A mapping between a vendor's product identifier and the internal SKU
- **Matching_Engine**: Service that maps vendor line items to internal products using rules, history, and fuzzy matching
- **Confidence_Score**: A numeric value (0-1) indicating the certainty of a vendor item to internal SKU match
- **Receiving_Transaction**: An inventory transaction that increases stock levels and updates costs based on vendor bill
- **Vendor_Template**: Configuration defining how to parse bills from a specific vendor (layout, keywords, field locations)
- **Parse_Cache**: Stored OCR results to avoid re-processing the same document
- **Unit_Conversion**: Mapping between vendor units (case, box, liter) and internal units (each, quart)
- **Cost_Policy**: Rules for updating product costs (average cost, last cost, vendor-specific cost)
- **Duplicate_Detection**: Logic to prevent receiving the same vendor invoice multiple times
- **Bill_History**: Audit trail of all processed vendor bills with links to receiving transactions

## Requirements

### Requirement 1: Document Capture and Storage

**User Story:** As a receiving clerk, I want to scan or upload vendor bills, so that I can process inventory receipts without manual data entry.

#### Acceptance Criteria

1. WHEN a user uploads a vendor bill file, THE Vendor_Bill_System SHALL accept PDF, JPG, PNG, and TIFF formats up to 10MB
2. WHEN a file is uploaded, THE Vendor_Bill_System SHALL store the raw file with a unique identifier and timestamp
3. WHEN a bill is scanned, THE Vendor_Bill_System SHALL store metadata including upload user, timestamp, and file hash
4. WHEN a bill is stored, THE Vendor_Bill_System SHALL associate it with the current tenant and store location
5. THE Vendor_Bill_System SHALL retain original bill files for minimum 7 years for audit purposes
6. WHEN a bill file is stored, THE Vendor_Bill_System SHALL generate a thumbnail preview for quick identification
7. THE Vendor_Bill_System SHALL support batch upload of multiple bills at once

### Requirement 2: OCR Processing and Text Extraction

**User Story:** As a receiving clerk, I want the system to automatically extract data from vendor bills, so that I don't have to manually type invoice details.

#### Acceptance Criteria

1. WHEN a bill is uploaded, THE Vendor_Bill_System SHALL queue it for OCR processing
2. WHEN OCR processing completes, THE Vendor_Bill_System SHALL extract text content and store it with the bill record
3. WHEN OCR fails or produces low-quality results, THE Vendor_Bill_System SHALL flag the bill for manual review
4. THE Vendor_Bill_System SHALL cache OCR results to avoid reprocessing the same document
5. WHEN OCR is cached, THE Vendor_Bill_System SHALL include cache version and OCR engine version in metadata
6. THE Vendor_Bill_System SHALL process OCR asynchronously without blocking the UI
7. WHEN OCR completes, THE Vendor_Bill_System SHALL notify the user and update the bill status

### Requirement 3: Structured Data Parsing

**User Story:** As a receiving clerk, I want the system to identify invoice numbers, dates, and line items from bills, so that I can quickly review and confirm the data.

#### Acceptance Criteria

1. WHEN OCR text is available, THE Vendor_Bill_System SHALL parse header fields: vendor name, invoice number, date, PO number, subtotal, tax, total
2. WHEN parsing line items, THE Vendor_Bill_System SHALL extract: vendor SKU, description, quantity, unit, unit price, extended price
3. WHEN parsing fails to find required fields, THE Vendor_Bill_System SHALL flag missing fields for manual entry
4. THE Vendor_Bill_System SHALL store parsed data as structured JSON with confidence scores per field
5. WHEN a vendor template exists, THE Vendor_Bill_System SHALL use template rules to improve parsing accuracy
6. WHEN no template exists, THE Vendor_Bill_System SHALL use generic parsing with keyword detection
7. THE Vendor_Bill_System SHALL validate parsed totals match line item sums within a configurable tolerance

### Requirement 4: Vendor Template System

**User Story:** As a system administrator, I want to configure vendor-specific parsing templates, so that the system accurately extracts data from different bill formats.

#### Acceptance Criteria

1. THE Vendor_Bill_System SHALL support vendor templates defining invoice keywords, layout hints, and field extraction rules
2. WHEN a template defines field zones (bounding boxes), THE Vendor_Bill_System SHALL prioritize zone-based extraction
3. WHEN zone extraction fails, THE Vendor_Bill_System SHALL fall back to regex and keyword-based parsing
4. WHEN a vendor is detected, THE Vendor_Bill_System SHALL automatically apply the matching template
5. THE Vendor_Bill_System SHALL support template versioning to track parsing rule changes over time
6. WHEN a template is updated, THE Vendor_Bill_System SHALL allow reprocessing old bills with the new template
7. THE Vendor_Bill_System SHALL provide a template editor UI for administrators to create and modify templates

### Requirement 5: Vendor Detection and Identification

**User Story:** As a receiving clerk, I want the system to automatically identify which vendor sent a bill, so that the correct parsing template and SKU mappings are applied.

#### Acceptance Criteria

1. WHEN a bill is parsed, THE Vendor_Bill_System SHALL attempt to detect the vendor from invoice text
2. WHEN vendor detection succeeds, THE Vendor_Bill_System SHALL apply the vendor's template and SKU aliases
3. WHEN vendor detection fails or is ambiguous, THE Vendor_Bill_System SHALL prompt the user to select the vendor
4. THE Vendor_Bill_System SHALL use vendor identifiers including: name, tax ID, address, phone, email, website
5. WHEN a vendor is manually selected, THE Vendor_Bill_System SHALL learn from the selection to improve future detection
6. THE Vendor_Bill_System SHALL support vendor aliases for companies with multiple legal names or divisions
7. WHEN a new vendor is encountered, THE Vendor_Bill_System SHALL allow creating a vendor profile on-the-fly

### Requirement 6: SKU Matching Engine

**User Story:** As a receiving clerk, I want the system to automatically match vendor line items to our internal products, so that I can quickly confirm receiving without manual lookups.

#### Acceptance Criteria

1. WHEN a line item is parsed, THE Matching_Engine SHALL attempt to match it to an internal SKU using multiple strategies
2. THE Matching_Engine SHALL try matching in order: exact vendor SKU alias, exact internal SKU, OEM/alt SKU, fuzzy description match, historical mapping
3. WHEN a match is found, THE Matching_Engine SHALL calculate a confidence score (0-1) and provide an explanation
4. WHEN multiple candidates exist, THE Matching_Engine SHALL rank them by confidence and present top 5 alternatives
5. WHEN no match is found, THE Matching_Engine SHALL flag the line for manual SKU selection
6. THE Matching_Engine SHALL use vendor-specific stopwords to improve description matching accuracy
7. THE Matching_Engine SHALL learn from confirmed matches to improve future matching for the same vendor

### Requirement 7: SKU Alias Management

**User Story:** As a receiving clerk, I want to create permanent mappings between vendor SKUs and our internal SKUs, so that future bills from the same vendor match automatically.

#### Acceptance Criteria

1. WHEN a user confirms a vendor SKU to internal SKU match, THE Vendor_Bill_System SHALL create a permanent alias mapping
2. WHEN an alias exists, THE Matching_Engine SHALL use it for exact matching with 1.0 confidence
3. WHEN a vendor changes their SKU for a product, THE Vendor_Bill_System SHALL allow updating the alias
4. THE Vendor_Bill_System SHALL track alias history including creation date, creator, and last used date
5. WHEN an alias conflicts with a new mapping, THE Vendor_Bill_System SHALL prompt for resolution
6. THE Vendor_Bill_System SHALL support one-to-many aliases (multiple vendor SKUs mapping to one internal SKU)
7. THE Vendor_Bill_System SHALL prevent many-to-one aliases (one vendor SKU mapping to multiple internal SKUs)

### Requirement 8: Unit and Pack Size Handling

**User Story:** As a receiving clerk, I want the system to handle different units and pack sizes, so that quantities are correctly converted to our internal units.

#### Acceptance Criteria

1. WHEN a vendor uses different units than internal units, THE Vendor_Bill_System SHALL apply unit conversion rules
2. THE Vendor_Bill_System SHALL support common unit conversions: case/each, box/each, liter/quart, kg/lb
3. WHEN a product has a defined pack size, THE Vendor_Bill_System SHALL convert vendor quantities to internal quantities
4. WHEN unit conversion is ambiguous, THE Vendor_Bill_System SHALL prompt the user to specify the conversion
5. THE Vendor_Bill_System SHALL store conversion rules per vendor-SKU pair for future use
6. WHEN displaying quantities, THE Vendor_Bill_System SHALL show both vendor quantity and converted internal quantity
7. THE Vendor_Bill_System SHALL validate that converted quantities are reasonable (not negative, not excessively large)

### Requirement 9: Review and Confirmation UI

**User Story:** As a receiving clerk, I want to review and confirm matched line items before posting, so that I can catch errors and make corrections.

#### Acceptance Criteria

1. WHEN a bill is parsed and matched, THE Vendor_Bill_System SHALL display a review screen with all line items
2. WHEN displaying line items, THE Vendor_Bill_System SHALL show: vendor SKU, description, quantity, unit, cost, matched internal SKU, confidence, explanation
3. WHEN a match has low confidence, THE Vendor_Bill_System SHALL highlight it for attention
4. WHEN a user clicks a line item, THE Vendor_Bill_System SHALL allow searching for alternative SKUs
5. WHEN a user changes a match, THE Vendor_Bill_System SHALL offer to create a permanent alias
6. THE Vendor_Bill_System SHALL provide quick actions: accept all high confidence, reject all low confidence, split line, merge lines
7. WHEN all lines are reviewed, THE Vendor_Bill_System SHALL enable the "Post Receiving" button

### Requirement 10: Confidence Scoring and Thresholds

**User Story:** As a system administrator, I want to configure confidence thresholds, so that the system automatically accepts high-confidence matches and flags low-confidence ones.

#### Acceptance Criteria

1. THE Vendor_Bill_System SHALL calculate confidence scores for all matches using a consistent algorithm
2. THE Vendor_Bill_System SHALL support configurable thresholds: auto-accept (≥0.95), review (0.70-0.94), manual (< 0.70)
3. WHEN all line items are above auto-accept threshold, THE Vendor_Bill_System SHALL allow posting without review
4. WHEN any line item is below review threshold, THE Vendor_Bill_System SHALL require user review before posting
5. THE Vendor_Bill_System SHALL display confidence scores visually (color coding, icons, progress bars)
6. WHEN a user overrides a high-confidence match, THE Vendor_Bill_System SHALL log the override for analysis
7. THE Vendor_Bill_System SHALL provide analytics on match accuracy to help tune thresholds

### Requirement 11: Duplicate Detection

**User Story:** As a receiving clerk, I want the system to prevent receiving the same invoice twice, so that inventory counts remain accurate.

#### Acceptance Criteria

1. WHEN a bill is uploaded, THE Vendor_Bill_System SHALL check for duplicates using vendor + invoice number + date
2. WHEN a potential duplicate is detected, THE Vendor_Bill_System SHALL warn the user and show the previous receiving transaction
3. WHEN totals differ significantly, THE Vendor_Bill_System SHALL allow proceeding as a corrected invoice
4. THE Vendor_Bill_System SHALL support marking a bill as "corrected" or "replacement" for a previous bill
5. WHEN a duplicate is confirmed, THE Vendor_Bill_System SHALL prevent posting and link to the original transaction
6. THE Vendor_Bill_System SHALL use fuzzy matching on invoice numbers to catch OCR errors (e.g., "INV-001" vs "INV-OO1")
7. THE Vendor_Bill_System SHALL allow administrators to override duplicate detection with a reason

### Requirement 12: Receiving Transaction Posting

**User Story:** As a receiving clerk, I want to post confirmed bills as receiving transactions, so that inventory levels and costs are updated automatically.

#### Acceptance Criteria

1. WHEN a user posts a receiving, THE Vendor_Bill_System SHALL create inventory transactions using the existing transaction model
2. WHEN posting, THE Vendor_Bill_System SHALL increase quantity_on_hand for each matched product
3. WHEN posting, THE Vendor_Bill_System SHALL update product costs according to the configured cost policy (average cost, last cost, vendor cost)
4. WHEN posting, THE Vendor_Bill_System SHALL store the vendor bill document reference with the receiving transaction
5. WHEN posting, THE Vendor_Bill_System SHALL store all line-level details: vendor SKU, matched SKU, quantities, costs, confidence
6. THE Vendor_Bill_System SHALL post receiving transactions atomically (all lines succeed or all fail)
7. WHEN posting fails, THE Vendor_Bill_System SHALL rollback all changes and display a clear error message

### Requirement 13: Cost Policy Integration

**User Story:** As an inventory manager, I want vendor bills to update product costs according to our cost policy, so that margins and valuations remain accurate.

#### Acceptance Criteria

1. THE Vendor_Bill_System SHALL support cost policies: average cost, last cost, vendor-specific cost, no update
2. WHEN cost policy is "average cost", THE Vendor_Bill_System SHALL calculate weighted average of existing and new cost
3. WHEN cost policy is "last cost", THE Vendor_Bill_System SHALL replace the product cost with the vendor bill cost
4. WHEN cost policy is "vendor-specific", THE Vendor_Bill_System SHALL store vendor cost separately from general cost
5. THE Vendor_Bill_System SHALL track cost history with timestamps and source (vendor bill reference)
6. WHEN a cost change exceeds a threshold, THE Vendor_Bill_System SHALL flag it for review before posting
7. THE Vendor_Bill_System SHALL support freight allocation to distribute shipping costs across line items

### Requirement 14: Bill History and Audit Trail

**User Story:** As an inventory manager, I want to view all processed vendor bills and their receiving transactions, so that I can audit receiving activity.

#### Acceptance Criteria

1. THE Vendor_Bill_System SHALL maintain a complete history of all processed bills with status and timestamps
2. WHEN viewing bill history, THE Vendor_Bill_System SHALL display: vendor, invoice number, date, total, status, receiving transaction link
3. WHEN a user clicks a bill, THE Vendor_Bill_System SHALL display the original document, parsed data, and matched line items
4. THE Vendor_Bill_System SHALL support filtering bill history by: vendor, date range, status, user
5. THE Vendor_Bill_System SHALL allow exporting bill history to CSV/Excel for external analysis
6. WHEN a bill is reprocessed, THE Vendor_Bill_System SHALL create a new version and link to the original
7. THE Vendor_Bill_System SHALL track all user actions: uploads, matches, overrides, posts, with timestamps and user IDs

### Requirement 15: Reprocessing and Template Updates

**User Story:** As a system administrator, I want to reprocess old bills with updated templates or rules, so that I can improve matching without affecting inventory.

#### Acceptance Criteria

1. WHEN a template is updated, THE Vendor_Bill_System SHALL allow reprocessing bills without creating new receiving transactions
2. WHEN reprocessing, THE Vendor_Bill_System SHALL re-run OCR parsing and matching with current rules
3. WHEN reprocessing, THE Vendor_Bill_System SHALL compare new matches to original matches and highlight differences
4. THE Vendor_Bill_System SHALL allow bulk reprocessing of multiple bills from the same vendor
5. WHEN reprocessing improves matches, THE Vendor_Bill_System SHALL allow updating aliases without re-posting inventory
6. THE Vendor_Bill_System SHALL track reprocessing history including template version and match accuracy changes
7. THE Vendor_Bill_System SHALL prevent reprocessing bills that have already been posted unless explicitly allowed

### Requirement 16: Vendor Mapping Administration

**User Story:** As a system administrator, I want to manage vendor SKU aliases and templates, so that I can maintain and improve matching accuracy.

#### Acceptance Criteria

1. THE Vendor_Bill_System SHALL provide an admin UI for viewing and editing all vendor SKU aliases
2. WHEN viewing aliases, THE Vendor_Bill_System SHALL display: vendor SKU, internal SKU, confidence, last used date, usage count
3. WHEN editing an alias, THE Vendor_Bill_System SHALL validate that the internal SKU exists
4. THE Vendor_Bill_System SHALL allow bulk import/export of aliases via CSV
5. THE Vendor_Bill_System SHALL provide analytics on alias usage and match success rates per vendor
6. WHEN deleting an alias, THE Vendor_Bill_System SHALL warn if it's been used recently
7. THE Vendor_Bill_System SHALL support merging duplicate aliases when vendor SKUs are consolidated

### Requirement 17: Performance and Scalability

**User Story:** As a system administrator, I want the vendor bill system to perform well with large bills and high volumes, so that receiving operations are not delayed.

#### Acceptance Criteria

1. THE Vendor_Bill_System SHALL process OCR for a typical 2-page bill in under 10 seconds
2. THE Vendor_Bill_System SHALL match line items in under 1 second per item for bills with up to 100 lines
3. THE Vendor_Bill_System SHALL cache OCR results to avoid reprocessing the same document
4. THE Vendor_Bill_System SHALL process OCR asynchronously without blocking the UI
5. THE Vendor_Bill_System SHALL support concurrent processing of multiple bills
6. THE Vendor_Bill_System SHALL use database indexes on vendor_id, invoice_number, date, and status
7. THE Vendor_Bill_System SHALL paginate bill history and line item displays for large datasets

### Requirement 18: Offline Operation Support

**User Story:** As a receiving clerk, I want to upload and review bills offline, so that receiving can continue during internet outages.

#### Acceptance Criteria

1. WHEN the system is offline, THE Vendor_Bill_System SHALL allow uploading bills to local storage
2. WHEN the system is offline, THE Vendor_Bill_System SHALL queue bills for OCR processing when connectivity returns
3. WHEN the system is offline, THE Vendor_Bill_System SHALL use cached templates and aliases for matching
4. WHEN the system is offline, THE Vendor_Bill_System SHALL allow posting receiving transactions to local database
5. WHEN connectivity returns, THE Vendor_Bill_System SHALL sync posted receivings to other locations
6. THE Vendor_Bill_System SHALL handle sync conflicts using last-write-wins with timestamp + store_id
7. THE Vendor_Bill_System SHALL maintain full functionality for unlimited offline duration

### Requirement 19: Multi-Tenant Isolation

**User Story:** As a system administrator, I want vendor bills and mappings isolated by tenant, so that different businesses don't share vendor data.

#### Acceptance Criteria

1. THE Vendor_Bill_System SHALL filter all bills, aliases, and templates by tenant_id
2. WHEN a user uploads a bill, THE Vendor_Bill_System SHALL associate it with the current tenant
3. WHEN matching line items, THE Matching_Engine SHALL only use aliases and products from the current tenant
4. THE Vendor_Bill_System SHALL prevent cross-tenant access to bills, aliases, and templates
5. WHEN syncing, THE Vendor_Bill_System SHALL only sync bills within the same tenant
6. THE Vendor_Bill_System SHALL support tenant-specific OCR and matching configurations
7. THE Vendor_Bill_System SHALL track usage and storage per tenant for billing purposes

### Requirement 20: Integration with Existing Systems

**User Story:** As a developer, I want the vendor bill system to integrate seamlessly with existing inventory and product systems, so that no parallel systems are created.

#### Acceptance Criteria

1. THE Vendor_Bill_System SHALL use the existing inventory transaction model for all stock changes
2. THE Vendor_Bill_System SHALL use the existing product catalog and SKU lookup for matching
3. THE Vendor_Bill_System SHALL use the existing file storage strategy for bill documents
4. THE Vendor_Bill_System SHALL use the existing audit log system for all user actions
5. THE Vendor_Bill_System SHALL use the existing permission system for access control
6. THE Vendor_Bill_System SHALL use the existing sync engine for multi-store replication
7. THE Vendor_Bill_System SHALL add new tables and columns without modifying existing schemas unless necessary
