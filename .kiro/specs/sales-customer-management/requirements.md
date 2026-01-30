# Requirements Document

## Introduction

This specification defines the Sales & Customer Management enhancements for the CAPS POS system. These features extend the core transaction processing to support advanced sales workflows including layaways, service orders, commission tracking, customer-based pricing, loyalty programs, and credit account management. The system must maintain offline-first operation while providing comprehensive customer relationship management capabilities.

## Glossary

- **System**: The CAPS POS application
- **Layaway**: A sales transaction where a customer reserves items by paying a deposit, with the balance due before pickup
- **Work_Order**: A service transaction tracking labor, parts, and materials for repair or customization work
- **Commission**: Compensation paid to employees based on sales performance or profit margins
- **Pricing_Tier**: A customer classification that determines which price level applies to their purchases
- **Loyalty_Points**: Rewards accumulated by customers based on purchase history
- **Credit_Account**: A customer account allowing purchases on credit with defined credit limits and payment terms
- **AR_Statement**: Accounts Receivable statement showing outstanding balances and transaction history
- **Core_Charge**: A refundable deposit on returnable parts (e.g., batteries, alternators)
- **Service_History**: Record of all service work performed on a customer's vehicle

## Requirements

### Requirement 1: Layaway Management

**User Story:** As a sales associate, I want to create and manage layaway transactions, so that customers can reserve items with a deposit and pay the balance over time.

#### Acceptance Criteria

1. WHEN a sales associate creates a layaway transaction, THE System SHALL record the customer information, selected items, deposit amount, and payment schedule
2. WHEN a deposit is received, THE System SHALL update the layaway balance and mark items as reserved in inventory
3. WHEN a customer makes a payment on a layaway, THE System SHALL record the payment, update the remaining balance, and maintain a payment history
4. WHEN a layaway is fully paid, THE System SHALL convert it to a completed sale and release the reserved items for pickup
5. WHEN a layaway is cancelled, THE System SHALL return items to available inventory and process any refund according to store policy
6. WHEN viewing layaways, THE System SHALL display all active layaways with customer name, items, deposit paid, balance due, and due date
7. WHEN a layaway payment is overdue, THE System SHALL flag the layaway and notify staff according to configured reminder rules
8. THE System SHALL support partial payments on layaways with configurable minimum payment amounts
9. THE System SHALL generate layaway receipts showing items reserved, amount paid, balance due, and payment schedule

### Requirement 2: Service & Work Order Module

**User Story:** As a service technician, I want to create and track work orders for customer vehicles, so that I can manage repairs, track labor and materials, and maintain service history.

#### Acceptance Criteria

1. WHEN a service technician creates a work order, THE System SHALL record customer information, vehicle details (VIN, make, model, year), and service description
2. WHEN adding items to a work order, THE System SHALL support parts, labor charges, paint mixtures, and miscellaneous fees
3. WHEN a work order is created, THE System SHALL assign a unique work order number and track its status (created, in-progress, completed, invoiced)
4. WHEN labor is added to a work order, THE System SHALL calculate charges based on configurable labor rates and time duration
5. WHEN parts are added to a work order, THE System SHALL reserve them from inventory and track core charges separately
6. WHEN a work order is completed, THE System SHALL convert it to an invoice and update inventory for consumed parts
7. WHEN viewing a customer's service history, THE System SHALL display all work orders for their vehicles with dates, services performed, and costs
8. THE System SHALL support multiple vehicles per customer and track service history separately for each vehicle
9. THE System SHALL allow work order estimates to be created and converted to actual work orders upon customer approval
10. WHEN a work order includes warranty work, THE System SHALL flag warranty items and track them separately for reporting

### Requirement 3: Commission Tracking

**User Story:** As a store manager, I want to track employee commissions on sales, so that I can calculate compensation and measure individual performance.

#### Acceptance Criteria

1. WHEN a sale is completed, THE System SHALL calculate commission based on configured rules (percentage of sale, percentage of profit, or flat rate per item)
2. WHEN an employee is assigned to a transaction, THE System SHALL record their employee ID and associate all commission calculations with that employee
3. WHEN viewing commission reports, THE System SHALL display total commissions by employee for a selected date range
4. THE System SHALL support different commission rates for different product categories or individual products
5. WHEN a sale is returned, THE System SHALL deduct the associated commission from the employee's total
6. THE System SHALL support split commissions when multiple employees contribute to a sale
7. WHEN commission rules are configured, THE System SHALL allow managers to set minimum profit thresholds before commission is earned
8. THE System SHALL generate commission reports showing sales volume, profit margin, and commission earned by employee

### Requirement 4: Customer-Based Pricing & Loyalty

**User Story:** As a sales associate, I want to apply customer-specific pricing and loyalty benefits, so that regular customers receive appropriate discounts and rewards.

#### Acceptance Criteria

1. WHEN a customer is added to the system, THE System SHALL allow assignment to a pricing tier (retail, wholesale, contractor, VIP)
2. WHEN a customer's pricing tier is set, THE System SHALL automatically apply the corresponding price level to all their purchases
3. WHEN a sale is completed for a loyalty member, THE System SHALL calculate and award loyalty points based on purchase amount
4. WHEN a customer redeems loyalty points, THE System SHALL deduct points from their balance and apply the discount to the current transaction
5. THE System SHALL support multiple pricing tiers with different markup or discount percentages per tier
6. WHEN viewing a customer profile, THE System SHALL display their pricing tier, loyalty points balance, and purchase history
7. THE System SHALL allow managers to manually adjust customer pricing tiers and loyalty points with audit logging
8. WHEN loyalty points are earned or redeemed, THE System SHALL record the transaction and maintain a points history
9. THE System SHALL support store credit balances that can be applied to future purchases
10. WHEN a customer has store credit, THE System SHALL display the available balance and allow partial or full redemption at checkout

### Requirement 5: Credit Accounts & AR Management

**User Story:** As a store manager, I want to manage customer credit accounts, so that approved customers can purchase on credit and I can track accounts receivable.

#### Acceptance Criteria

1. WHEN a customer is approved for credit, THE System SHALL create a credit account with a defined credit limit and payment terms
2. WHEN a credit customer makes a purchase, THE System SHALL verify available credit and record the charge to their account
3. WHEN a credit payment is received, THE System SHALL apply the payment to the customer's account balance and update available credit
4. WHEN generating AR statements, THE System SHALL show all outstanding invoices, payments received, current balance, and aging (30/60/90 days)
5. THE System SHALL prevent credit purchases that would exceed the customer's credit limit
6. WHEN a credit account becomes overdue, THE System SHALL flag the account and optionally prevent new purchases until payment is received
7. THE System SHALL support partial payments on credit accounts and track payment history
8. WHEN viewing credit accounts, THE System SHALL display customer name, credit limit, available credit, current balance, and payment status
9. THE System SHALL calculate and apply service charges or interest on overdue balances according to configured rules
10. THE System SHALL generate aging reports showing all credit accounts grouped by days overdue (current, 30, 60, 90+ days)

### Requirement 6: Gift Cards & Store Credits

**User Story:** As a sales associate, I want to issue and redeem gift cards and store credits, so that customers have flexible payment options.

#### Acceptance Criteria

1. WHEN a gift card is purchased, THE System SHALL generate a unique gift card number, record the initial balance, and process payment
2. WHEN a gift card is redeemed, THE System SHALL verify the card number, check the available balance, and apply the amount to the transaction
3. WHEN a gift card balance is insufficient, THE System SHALL allow partial redemption and require additional payment for the remaining balance
4. THE System SHALL support checking gift card balances without processing a transaction
5. WHEN store credit is issued (for returns, promotions, or compensation), THE System SHALL create a store credit record linked to the customer account
6. WHEN store credit is redeemed, THE System SHALL deduct the amount from the customer's store credit balance
7. THE System SHALL maintain transaction history for all gift card and store credit activities
8. THE System SHALL support gift card reloading (adding value to existing cards)
9. WHEN a gift card or store credit expires, THE System SHALL flag it according to configured expiration rules

### Requirement 7: VIN/YMM Lookup & Service History

**User Story:** As a parts specialist, I want to search for parts using VIN or vehicle make/model/year, so that I can quickly find compatible parts and view service history.

#### Acceptance Criteria

1. WHEN a VIN is entered, THE System SHALL decode it to extract make, model, year, engine, and trim information
2. WHEN searching by make/model/year, THE System SHALL filter the parts catalog to show only compatible items
3. WHEN viewing a vehicle's service history, THE System SHALL display all work orders, parts purchased, and services performed for that vehicle
4. THE System SHALL support storing multiple vehicles per customer with separate service histories
5. WHEN a part is selected, THE System SHALL verify fitment compatibility with the selected vehicle
6. THE System SHALL allow manual override of fitment warnings when a specialist confirms compatibility
7. WHEN a customer returns with a vehicle, THE System SHALL retrieve the vehicle's service history and display recommended maintenance based on mileage or time intervals

### Requirement 8: Markdown & Promotions Engine

**User Story:** As a store manager, I want to create and manage promotions and markdowns, so that I can run sales campaigns and track their effectiveness.

#### Acceptance Criteria

1. WHEN a promotion is created, THE System SHALL allow configuration of discount type (percentage, fixed amount, buy-X-get-Y), applicable products or categories, and date range
2. WHEN a qualifying item is added to a transaction, THE System SHALL automatically apply the best available promotion
3. THE System SHALL support quantity-based discounts (e.g., buy 3 get 10% off)
4. THE System SHALL support customer-specific promotions that apply only to selected pricing tiers or individual customers
5. WHEN multiple promotions apply, THE System SHALL apply the promotion that provides the greatest discount to the customer
6. THE System SHALL track promotion usage and generate reports showing items sold, revenue, and discount amounts per promotion
7. WHEN a promotion expires, THE System SHALL automatically deactivate it and stop applying discounts
8. THE System SHALL support group markdowns that apply a discount to entire product categories for a specified period

### Requirement 9: Offline Operation & Synchronization

**User Story:** As a system administrator, I want all sales and customer management features to work offline, so that store operations continue during network outages.

#### Acceptance Criteria

1. WHEN the system is offline, THE System SHALL allow creation and modification of layaways, work orders, credit transactions, and loyalty activities
2. WHEN offline transactions are created, THE System SHALL queue them for synchronization when connectivity is restored
3. WHEN synchronizing layaway data, THE System SHALL resolve conflicts by preserving the most recent payment or status change
4. WHEN synchronizing work orders, THE System SHALL ensure parts reservations are consistent across all stores
5. WHEN synchronizing customer data, THE System SHALL merge loyalty points, credit balances, and service history without data loss
6. THE System SHALL display sync status and pending transaction count to inform staff of offline operations
7. WHEN credit limits are checked offline, THE System SHALL use the last synchronized credit balance and flag transactions for verification upon sync
8. THE System SHALL maintain audit logs of all offline transactions for reconciliation and reporting

### Requirement 10: Reporting & Analytics

**User Story:** As a store manager, I want comprehensive reports on sales, customer behavior, and employee performance, so that I can make data-driven business decisions.

#### Acceptance Criteria

1. WHEN generating sales reports, THE System SHALL provide breakdowns by product category, employee, customer tier, and time period
2. WHEN generating customer reports, THE System SHALL show top customers by revenue, loyalty program participation, and credit account status
3. WHEN generating employee reports, THE System SHALL display sales volume, commission earned, and average transaction value per employee
4. THE System SHALL provide layaway reports showing active layaways, overdue payments, and completion rates
5. THE System SHALL provide work order reports showing service revenue, labor vs. parts breakdown, and average job completion time
6. THE System SHALL provide promotion effectiveness reports showing discount amounts, items sold, and revenue impact per promotion
7. THE System SHALL provide AR aging reports showing outstanding balances grouped by days overdue
8. THE System SHALL allow report filtering by date range, store location, employee, and customer segment
9. THE System SHALL support exporting reports to CSV or PDF formats for external analysis
10. THE System SHALL provide dashboard views with key metrics (daily sales, active layaways, overdue accounts, top products)
