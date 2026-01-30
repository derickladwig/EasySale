# Implementation Plan: Sales & Customer Management

## Overview

This implementation plan breaks down the Sales & Customer Management feature into discrete, manageable tasks. The approach follows an incremental development strategy: database schema → core models → business logic → API endpoints → property tests → integration. Each task builds on previous work, ensuring continuous validation through automated tests.

The implementation uses Rust for the backend with SQLx for database access, maintaining the offline-first architecture with SQLite. Property-based tests use the `proptest` crate with minimum 100 iterations per test.

## Tasks

- [x] 1. Database Schema & Migrations
  - Create migration file for all new tables (customers, vehicles, layaways, work_orders, commissions, loyalty, gift_cards, credit_accounts, promotions, price_levels)
  - Add indexes for performance optimization
  - Include sync metadata columns (sync_version, store_id, updated_at)
  - Test migration applies cleanly and rollback works
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1, 8.1, 9.1_

- [x] 2. Customer Management Core
  - [x] 2.1 Implement Customer model and CRUD operations
    - Create Customer struct with all fields
    - Implement database queries (create, read, update, delete)
    - Add pricing tier enum and validation
    - _Requirements: 4.1, 4.2_

  - [x] 2.2 Write property test for customer creation

    - **Property 28: Entity creation completeness**
    - **Validates: Requirements 4.1**

  - [x] 2.3 Implement Vehicle model and associations
    - Create Vehicle struct with customer relationship
    - Implement CRUD operations
    - Add VIN validation
    - _Requirements: 7.1, 7.4_

  - [x]* 2.4 Write unit tests for customer-vehicle relationships
    - Test multiple vehicles per customer
    - Test vehicle service history isolation
    - _Requirements: 7.4, 2.8_

- [x] 3. Layaway Management
  - [x] 3.1 Implement Layaway models (Layaway, LayawayItem, LayawayPayment)
    - Create structs with status enum
    - Implement layaway creation with items
    - Add inventory reservation logic
    - _Requirements: 1.1, 1.2_

  - [x]* 3.2 Write property test for layaway balance consistency
    - **Property 1: Layaway balance consistency**
    - **Validates: Requirements 1.3**

  - [x] 3.3 Implement layaway payment processing
    - Process payment and update balance
    - Record payment history
    - Handle partial payments with minimum validation
    - _Requirements: 1.3, 1.8_

  - [x]* 3.4 Write property test for partial payment acceptance
    - **Property 29: Partial payment acceptance**
    - **Validates: Requirements 1.8**

  - [x] 3.5 Implement layaway completion and cancellation
    - Complete layaway when balance reaches zero
    - Release inventory on completion
    - Handle cancellation with inventory restoration
    - _Requirements: 1.4, 1.5_

  - [x] 3.6 Write property tests for layaway state transitions

    - **Property 2: Layaway completion triggers sale conversion**
    - **Property 3: Layaway cancellation restores inventory**
    - **Validates: Requirements 1.4, 1.5**

  - [x] 3.7 Implement overdue detection and flagging
    - Check due dates and flag overdue layaways
    - Generate reminder notifications
    - _Requirements: 1.7_

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Work Order & Service Management
  - [x] 5.1 Implement WorkOrder and WorkOrderLine models
    - Create structs with status enum and line type enum
    - Implement work order creation with lines
    - Add work order number generation with uniqueness
    - _Requirements: 2.1, 2.2, 2.3_

  - [x]* 5.2 Write property test for work order number uniqueness
    - **Property 4: Work order number uniqueness**
    - **Validates: Requirements 2.3**

  - [x] 5.3 Implement labor charge calculation
    - Calculate labor charges from rate and duration
    - Support configurable labor rates
    - _Requirements: 2.4_

  - [x]* 5.4 Write property test for labor charge calculation
    - **Property 5: Labor charge calculation**
    - **Validates: Requirements 2.4**

  - [x] 5.5 Implement parts reservation for work orders
    - Reserve parts from inventory when added to work order
    - Track core charges separately
    - _Requirements: 2.5_

  - [x] 5.6 Implement work order completion and invoicing
    - Complete work order and create invoice
    - Update inventory for consumed parts
    - Handle warranty flagging
    - _Requirements: 2.6, 2.10_

  - [x] 5.7 Write property test for work order completion

    - **Property 6: Work order completion creates invoice**
    - **Validates: Requirements 2.6**

  - [x] 5.8 Implement service history tracking
    - Query all work orders for a vehicle
    - Display service history with dates and costs
    - Support multiple vehicles per customer
    - _Requirements: 2.7, 2.8_

  - [x] 5.9 Implement estimate-to-order conversion
    - Create estimates with status
    - Convert estimate to work order on approval
    - _Requirements: 2.9_

- [x] 6. Commission Tracking
  - [x] 6.1 Implement CommissionRule model and configuration
    - Create commission rule struct with rule types
    - Support percentage of sale, percentage of profit, flat rate
    - Add category and product filters
    - _Requirements: 3.1, 3.4_

  - [x] 6.2 Implement commission calculation engine
    - Calculate commission based on rule type
    - Apply minimum profit thresholds
    - Associate commissions with employees
    - _Requirements: 3.1, 3.2, 3.7_

  - [x] 6.3 Write property tests for commission calculations

    - **Property 7: Commission calculation correctness**
    - **Property 10: Commission threshold enforcement**
    - **Validates: Requirements 3.1, 3.7**

  - [x] 6.4 Implement commission reversal for returns
    - Create negative commission entries on returns
    - Deduct from employee totals
    - _Requirements: 3.5_

  - [x]* 6.5 Write property test for commission reversal
    - **Property 8: Commission reversal on returns**
    - **Validates: Requirements 3.5**

  - [x] 6.6 Implement commission splitting
    - Support multiple employees per commission
    - Validate split percentages sum to 100%
    - Calculate split amounts
    - _Requirements: 3.6_

  - [x]* 6.7 Write property test for commission splits
    - **Property 9: Commission split totals equal original**
    - **Validates: Requirements 3.6**

  - [x] 6.8 Implement commission reporting
    - Aggregate commissions by employee and date range
    - Calculate sales volume and profit margins
    - _Requirements: 3.3, 3.8_

- [x] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Loyalty & Pricing
  - [x] 8.1 Implement PriceLevel model and tier-based pricing
    - Create price level struct with tier associations
    - Implement price lookup by product and tier
    - Support multiple pricing tiers
    - _Requirements: 4.2, 4.5_

  - [x]* 8.2 Write property test for pricing tier application
    - **Property 11: Customer pricing tier application**
    - **Validates: Requirements 4.2**

  - [x] 8.3 Implement loyalty points calculation and tracking
    - Calculate points based on purchase amount
    - Award points on sale completion
    - Track points balance per customer
    - _Requirements: 4.3_

  - [x]* 8.4 Write property test for loyalty points calculation
    - **Property 12: Loyalty points calculation**
    - **Validates: Requirements 4.3**

  - [x] 8.5 Implement loyalty points redemption
    - Redeem points for discounts
    - Deduct points from balance
    - Record redemption transactions
    - _Requirements: 4.4_

  - [x]* 8.6 Write property test for points redemption
    - **Property 13: Loyalty points redemption consistency**
    - **Validates: Requirements 4.4**

  - [x] 8.7 Implement store credit management
    - Track store credit balances
    - Issue credits for returns/promotions
    - Redeem credits at checkout
    - _Requirements: 4.9, 4.10_

  - [x] 8.8 Implement manual adjustments with audit logging
    - Allow manager adjustments to tiers and points
    - Log all adjustments with employee ID and reason
    - _Requirements: 4.7_

- [x] 9. Credit Accounts & AR
  - [x] 9.1 Implement CreditAccount model and creation
    - Create credit account struct with limits and terms
    - Initialize available credit
    - _Requirements: 5.1_

  - [x] 9.2 Implement credit purchase verification
    - Check available credit before purchase
    - Prevent purchases exceeding limit
    - Record charges to account
    - _Requirements: 5.2, 5.5_

  - [x]* 9.3 Write property test for credit limit enforcement
    - **Property 14: Credit limit enforcement**
    - **Validates: Requirements 5.5**

  - [x] 9.4 Implement credit payment processing
    - Apply payments to account balance
    - Update available credit
    - Track payment history
    - _Requirements: 5.3, 5.7_

  - [x]* 9.5 Write property test for credit payment application
    - **Property 15: Credit payment application**
    - **Validates: Requirements 5.3**

  - [x] 9.6 Implement AR statement generation
    - Calculate aging (current, 30, 60, 90+ days)
    - Show outstanding invoices and payments
    - Calculate service charges on overdue balances
    - _Requirements: 5.4, 5.9_

  - [x]* 9.7 Write property test for AR aging calculation
    - **Property 16: AR aging calculation**
    - **Validates: Requirements 5.10**

  - [x] 9.8 Implement overdue account flagging
    - Flag accounts past due date
    - Optionally prevent new purchases
    - _Requirements: 5.6_

- [x] 10. Gift Cards
  - [x] 10.1 Implement GiftCard model and issuance
    - Create gift card struct with unique number generation
    - Process gift card purchases
    - Record initial balance
    - _Requirements: 6.1_

  - [x]* 10.2 Write property test for gift card number uniqueness
    - **Property 17: Gift card number uniqueness**
    - **Validates: Requirements 6.1**

  - [x] 10.3 Implement gift card redemption
    - Verify card number and balance
    - Apply amount to transaction
    - Support partial redemption
    - _Requirements: 6.2, 6.3_

  - [x]* 10.4 Write property test for gift card redemption
    - **Property 18: Gift card redemption balance check**
    - **Validates: Requirements 6.2, 6.3**

  - [x] 10.5 Implement gift card balance inquiry
    - Check balance without transaction
    - Return current balance and status
    - _Requirements: 6.4_

  - [x] 10.6 Implement gift card reloading
    - Add value to existing cards
    - Update balance and record transaction
    - _Requirements: 6.8_

  - [x]* 10.7 Write property test for gift card reload
    - **Property 19: Gift card reload increases balance**
    - **Validates: Requirements 6.8**

  - [x] 10.8 Implement gift card expiration handling
    - Check expiration dates
    - Flag expired cards
    - Prevent redemption of expired cards
    - _Requirements: 6.9_

- [x] 11. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. VIN Lookup & Fitment
  - [x] 12.1 Implement VIN decoder integration
    - Create VIN decoder service interface
    - Parse VIN to extract vehicle information
    - Handle decoder service errors gracefully
    - _Requirements: 7.1_

  - [x]* 12.2 Write property test for VIN decoding
    - **Property 20: VIN decoding extracts vehicle information**
    - **Validates: Requirements 7.1**

  - [x] 12.3 Implement parts fitment filtering
    - Filter parts catalog by vehicle make/model/year
    - Verify part compatibility
    - Support manual override with authorization
    - _Requirements: 7.2, 7.5, 7.6_

  - [x]* 12.4 Write property test for fitment filtering
    - **Property 21: Fitment filtering shows only compatible parts**
    - **Validates: Requirements 7.2**

  - [x] 12.5 Implement maintenance recommendations
    - Calculate recommended maintenance based on mileage/time
    - Display recommendations when vehicle is selected
    - _Requirements: 7.7_

- [x] 13. Promotions & Discounts
  - [x] 13.1 Implement Promotion model and configuration
    - Create promotion struct with types (percentage, fixed, buy-X-get-Y, quantity)
    - Support date ranges and applicability filters
    - Add tier and customer restrictions
    - _Requirements: 8.1, 8.4_

  - [x] 13.2 Implement promotion evaluation engine
    - Check promotion applicability for items
    - Calculate discount amounts
    - Select best promotion when multiple apply
    - _Requirements: 8.2, 8.5_

  - [x]* 13.3 Write property test for best promotion selection
    - **Property 22: Best promotion selection**
    - **Validates: Requirements 8.2, 8.5**

  - [x] 13.4 Implement quantity-based discounts
    - Check quantity thresholds
    - Apply discounts when threshold met
    - _Requirements: 8.3_

  - [x]* 13.5 Write property test for quantity discount threshold
    - **Property 23: Quantity discount threshold**
    - **Validates: Requirements 8.3**

  - [x] 13.6 Implement promotion expiration handling
    - Check current date against promotion dates
    - Prevent expired promotions from applying
    - Auto-deactivate expired promotions
    - _Requirements: 8.7_

  - [x]* 13.7 Write property test for expired promotions
    - **Property 24: Expired promotions do not apply**
    - **Validates: Requirements 8.7**

  - [x] 13.8 Implement promotion usage tracking
    - Record promotion applications
    - Track items sold and discount amounts
    - Generate effectiveness reports
    - _Requirements: 8.6_

  - [x] 13.9 Implement group markdowns
    - Apply category-wide discounts
    - Support time-based markdowns
    - _Requirements: 8.8_

- [x] 14. Offline Operation & Sync
  - [x] 14.1 Implement offline transaction queuing
    - Queue all transactions when offline
    - Persist queue to database
    - Track sync status per transaction
    - _Requirements: 9.2_

  - [x]* 14.2 Write property test for offline queuing
    - **Property 25: Offline transaction queuing**
    - **Validates: Requirements 9.2**

  - [x] 14.3 Implement sync conflict resolution
    - Compare sync_version and updated_at timestamps
    - Preserve most recent changes
    - Handle special cases (layaway payments, credit balances)
    - _Requirements: 9.3, 9.4, 9.5_

  - [x]* 14.4 Write property test for conflict resolution
    - **Property 26: Sync conflict resolution preserves most recent**
    - **Validates: Requirements 9.3**

  - [x] 14.5 Implement offline credit limit checking
    - Use last synchronized balance
    - Flag transactions for verification on sync
    - _Requirements: 9.7_

  - [x] 14.6 Implement comprehensive audit logging
    - Log all transactions with timestamps and employee IDs
    - Include offline operations
    - Support audit trail queries
    - _Requirements: 9.8_

  - [x]* 14.7 Write property test for audit logging
    - **Property 27: Transaction audit logging**
    - **Validates: Requirements 1.3, 4.8, 6.7, 9.8**

- [x] 15. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 16. Reporting & Analytics
  - [x] 16.1 Implement sales reporting
    - Aggregate sales by category, employee, tier, time period
    - Support date range filtering
    - Calculate totals and averages
    - _Requirements: 10.1_

  - [x] 16.2 Implement customer reporting
    - Rank customers by revenue
    - Show loyalty participation
    - Display credit account status
    - _Requirements: 10.2_

  - [x] 16.3 Implement employee performance reporting
    - Calculate sales volume per employee
    - Show commission earned
    - Calculate average transaction value
    - _Requirements: 10.3_

  - [x] 16.4 Implement layaway reporting
    - Show active layaways
    - Track overdue payments
    - Calculate completion rates
    - _Requirements: 10.4_

  - [x] 16.5 Implement work order reporting
    - Calculate service revenue
    - Break down labor vs. parts
    - Show average completion time
    - _Requirements: 10.5_

  - [x] 16.6 Implement promotion effectiveness reporting
    - Track discount amounts per promotion
    - Show items sold under promotion
    - Calculate revenue impact
    - _Requirements: 10.6_

  - [x] 16.7 Implement AR aging reports
    - Group balances by days overdue
    - Show current, 30, 60, 90+ aging buckets
    - _Requirements: 10.7_

  - [x]* 16.8 Write property test for report aggregation
    - **Property 30: Report aggregation accuracy**
    - **Validates: Requirements 3.3, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.10**

  - [x] 16.9 Implement report filtering
    - Support filtering by date range, store, employee, customer segment
    - Apply filters to all report types
    - _Requirements: 10.8_

  - [x] 16.10 Implement report export
    - Export reports to CSV format
    - Export reports to PDF format
    - _Requirements: 10.9_

  - [x] 16.11 Implement dashboard views
    - Show daily sales metrics
    - Display active layaways count
    - Show overdue accounts
    - Display top products
    - _Requirements: 10.10_

- [x] 17. API Endpoints
  - [x] 17.1 Create customer management endpoints
    - POST /api/customers - Create customer
    - GET /api/customers/:id - Get customer
    - PUT /api/customers/:id - Update customer
    - GET /api/customers - List customers with filtering
    - POST /api/customers/:id/vehicles - Add vehicle
    - GET /api/customers/:id/vehicles - List customer vehicles

  - [x] 17.2 Create layaway endpoints
    - POST /api/layaways - Create layaway
    - GET /api/layaways/:id - Get layaway
    - POST /api/layaways/:id/payments - Record payment
    - PUT /api/layaways/:id/complete - Complete layaway
    - PUT /api/layaways/:id/cancel - Cancel layaway
    - GET /api/layaways - List layaways with filtering

  - [x] 17.3 Create work order endpoints
    - POST /api/work-orders - Create work order
    - GET /api/work-orders/:id - Get work order
    - PUT /api/work-orders/:id - Update work order
    - POST /api/work-orders/:id/lines - Add line item
    - PUT /api/work-orders/:id/complete - Complete work order
    - GET /api/work-orders - List work orders
    - GET /api/vehicles/:id/service-history - Get service history

  - [x] 17.4 Create commission endpoints
    - GET /api/commissions/rules - List commission rules
    - POST /api/commissions/rules - Create commission rule
    - GET /api/commissions/employee/:id - Get employee commissions
    - GET /api/commissions/reports - Generate commission reports

  - [x] 17.5 Create loyalty and pricing endpoints
    - GET /api/customers/:id/loyalty - Get loyalty balance
    - POST /api/customers/:id/loyalty/redeem - Redeem points
    - GET /api/price-levels - Get price levels
    - POST /api/price-levels - Create price level

  - [x] 17.6 Create credit account endpoints
    - POST /api/credit-accounts - Create credit account
    - GET /api/credit-accounts/:id - Get credit account
    - POST /api/credit-accounts/:id/charge - Record charge
    - POST /api/credit-accounts/:id/payment - Record payment
    - GET /api/credit-accounts/:id/statement - Generate statement
    - GET /api/credit-accounts/aging - Get aging report

  - [x] 17.7 Create gift card endpoints
    - POST /api/gift-cards - Issue gift card
    - GET /api/gift-cards/:number/balance - Check balance
    - POST /api/gift-cards/:number/redeem - Redeem gift card
    - POST /api/gift-cards/:number/reload - Reload gift card

  - [x] 17.8 Create promotion endpoints
    - POST /api/promotions - Create promotion
    - GET /api/promotions - List promotions
    - PUT /api/promotions/:id - Update promotion
    - GET /api/promotions/:id/usage - Get promotion usage
    - POST /api/promotions/evaluate - Evaluate promotions for cart

  - [x] 17.9 Create VIN and fitment endpoints
    - POST /api/vin/decode - Decode VIN
    - GET /api/parts/fitment - Filter parts by vehicle
    - GET /api/vehicles/:id/maintenance - Get maintenance recommendations

  - [x] 17.10 Create reporting endpoints
    - GET /api/reports/sales - Sales reports
    - GET /api/reports/customers - Customer reports
    - GET /api/reports/employees - Employee reports
    - GET /api/reports/layaways - Layaway reports
    - GET /api/reports/work-orders - Work order reports
    - GET /api/reports/promotions - Promotion reports
    - GET /api/reports/dashboard - Dashboard metrics
    - POST /api/reports/export - Export report

- [x] 18. Integration Tests

  - Test complete layaway lifecycle
  - Test work order from estimate to invoice
  - Test customer with multiple vehicles and service history
  - Test credit account with purchases and payments
  - Test promotion application across transactions
  - Test offline operation followed by sync

- [x] 19. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties (minimum 100 iterations each)
- Unit tests validate specific examples and edge cases
- All database operations use transactions for consistency
- Sync metadata (sync_version, store_id, updated_at) is maintained for all synchronized entities
