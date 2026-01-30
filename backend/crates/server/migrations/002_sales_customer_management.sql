-- Sales & Customer Management Schema Migration
-- This migration adds tables for layaways, work orders, commissions, loyalty, 
-- gift cards, credit accounts, promotions, and price levels

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    pricing_tier TEXT NOT NULL DEFAULT 'Retail',
    loyalty_points INTEGER NOT NULL DEFAULT 0,
    store_credit REAL NOT NULL DEFAULT 0.0,
    credit_limit REAL,
    credit_balance REAL NOT NULL DEFAULT 0.0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_version INTEGER NOT NULL DEFAULT 0,
    store_id TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_pricing_tier ON customers(pricing_tier);

-- Vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    vin TEXT,
    make TEXT NOT NULL,
    model TEXT NOT NULL,
    year INTEGER NOT NULL,
    engine TEXT,
    trim TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_vehicles_customer_id ON vehicles(customer_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_vin ON vehicles(vin);

-- Layaways table
CREATE TABLE IF NOT EXISTS layaways (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    status TEXT NOT NULL,
    total_amount REAL NOT NULL,
    deposit_amount REAL NOT NULL,
    balance_due REAL NOT NULL,
    due_date TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at TEXT,
    sync_version INTEGER NOT NULL DEFAULT 0,
    store_id TEXT NOT NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE INDEX IF NOT EXISTS idx_layaways_customer_id ON layaways(customer_id);
CREATE INDEX IF NOT EXISTS idx_layaways_status ON layaways(status);
CREATE INDEX IF NOT EXISTS idx_layaways_due_date ON layaways(due_date);

-- Layaway items table
CREATE TABLE IF NOT EXISTS layaway_items (
    id TEXT PRIMARY KEY,
    layaway_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    quantity REAL NOT NULL,
    unit_price REAL NOT NULL,
    total_price REAL NOT NULL,
    FOREIGN KEY (layaway_id) REFERENCES layaways(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_layaway_items_layaway_id ON layaway_items(layaway_id);

-- Layaway payments table
CREATE TABLE IF NOT EXISTS layaway_payments (
    id TEXT PRIMARY KEY,
    layaway_id TEXT NOT NULL,
    amount REAL NOT NULL,
    payment_method TEXT NOT NULL,
    payment_date TEXT NOT NULL DEFAULT (datetime('now')),
    employee_id TEXT NOT NULL,
    FOREIGN KEY (layaway_id) REFERENCES layaways(id) ON DELETE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_layaway_payments_layaway_id ON layaway_payments(layaway_id);

-- Work orders table
CREATE TABLE IF NOT EXISTS work_orders (
    id TEXT PRIMARY KEY,
    work_order_number TEXT NOT NULL UNIQUE,
    customer_id TEXT NOT NULL,
    vehicle_id TEXT NOT NULL,
    status TEXT NOT NULL,
    description TEXT NOT NULL,
    estimated_total REAL,
    actual_total REAL,
    labor_total REAL NOT NULL DEFAULT 0.0,
    parts_total REAL NOT NULL DEFAULT 0.0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at TEXT,
    invoiced_at TEXT,
    assigned_technician_id TEXT,
    is_warranty INTEGER NOT NULL DEFAULT 0,
    sync_version INTEGER NOT NULL DEFAULT 0,
    store_id TEXT NOT NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
    FOREIGN KEY (assigned_technician_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_work_orders_customer_id ON work_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_vehicle_id ON work_orders(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_number ON work_orders(work_order_number);

-- Work order lines table
CREATE TABLE IF NOT EXISTS work_order_lines (
    id TEXT PRIMARY KEY,
    work_order_id TEXT NOT NULL,
    line_type TEXT NOT NULL,
    product_id TEXT,
    description TEXT NOT NULL,
    quantity REAL NOT NULL,
    unit_price REAL NOT NULL,
    total_price REAL NOT NULL,
    is_warranty INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_work_order_lines_work_order_id ON work_order_lines(work_order_id);

-- Commission rules table
CREATE TABLE IF NOT EXISTS commission_rules (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    rule_type TEXT NOT NULL,
    rate REAL NOT NULL,
    min_profit_threshold REAL,
    applies_to_categories TEXT,
    applies_to_products TEXT,
    is_active INTEGER NOT NULL DEFAULT 1
);

-- Commissions table
CREATE TABLE IF NOT EXISTS commissions (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL,
    transaction_id TEXT NOT NULL,
    rule_id TEXT NOT NULL,
    sale_amount REAL NOT NULL,
    profit_amount REAL NOT NULL,
    commission_amount REAL NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    is_reversed INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (employee_id) REFERENCES users(id),
    FOREIGN KEY (rule_id) REFERENCES commission_rules(id)
);

CREATE INDEX IF NOT EXISTS idx_commissions_employee_id ON commissions(employee_id);
CREATE INDEX IF NOT EXISTS idx_commissions_transaction_id ON commissions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_commissions_created_at ON commissions(created_at);

-- Commission splits table
CREATE TABLE IF NOT EXISTS commission_splits (
    id TEXT PRIMARY KEY,
    commission_id TEXT NOT NULL,
    employee_id TEXT NOT NULL,
    split_percentage REAL NOT NULL,
    split_amount REAL NOT NULL,
    FOREIGN KEY (commission_id) REFERENCES commissions(id) ON DELETE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_commission_splits_commission_id ON commission_splits(commission_id);
CREATE INDEX IF NOT EXISTS idx_commission_splits_employee_id ON commission_splits(employee_id);

-- Loyalty transactions table
CREATE TABLE IF NOT EXISTS loyalty_transactions (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    transaction_type TEXT NOT NULL,
    points INTEGER NOT NULL,
    amount REAL,
    reference_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    employee_id TEXT NOT NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (employee_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_customer_id ON loyalty_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_created_at ON loyalty_transactions(created_at);

-- Gift cards table
CREATE TABLE IF NOT EXISTS gift_cards (
    id TEXT PRIMARY KEY,
    card_number TEXT NOT NULL UNIQUE,
    initial_balance REAL NOT NULL,
    current_balance REAL NOT NULL,
    status TEXT NOT NULL,
    issued_date TEXT NOT NULL DEFAULT (datetime('now')),
    expiry_date TEXT,
    customer_id TEXT,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE INDEX IF NOT EXISTS idx_gift_cards_card_number ON gift_cards(card_number);
CREATE INDEX IF NOT EXISTS idx_gift_cards_customer_id ON gift_cards(customer_id);

-- Gift card transactions table
CREATE TABLE IF NOT EXISTS gift_card_transactions (
    id TEXT PRIMARY KEY,
    gift_card_id TEXT NOT NULL,
    transaction_type TEXT NOT NULL,
    amount REAL NOT NULL,
    reference_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (gift_card_id) REFERENCES gift_cards(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_gift_card_transactions_gift_card_id ON gift_card_transactions(gift_card_id);

-- Credit accounts table
CREATE TABLE IF NOT EXISTS credit_accounts (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL UNIQUE,
    credit_limit REAL NOT NULL,
    current_balance REAL NOT NULL DEFAULT 0.0,
    available_credit REAL NOT NULL,
    payment_terms_days INTEGER NOT NULL DEFAULT 30,
    service_charge_rate REAL,
    is_active INTEGER NOT NULL DEFAULT 1,
    last_statement_date TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_credit_accounts_customer_id ON credit_accounts(customer_id);

-- Credit transactions table
CREATE TABLE IF NOT EXISTS credit_transactions (
    id TEXT PRIMARY KEY,
    credit_account_id TEXT NOT NULL,
    transaction_type TEXT NOT NULL,
    amount REAL NOT NULL,
    reference_id TEXT NOT NULL,
    transaction_date TEXT NOT NULL DEFAULT (datetime('now')),
    due_date TEXT,
    days_overdue INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (credit_account_id) REFERENCES credit_accounts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_account_id ON credit_transactions(credit_account_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_due_date ON credit_transactions(due_date);

-- AR statements table
CREATE TABLE IF NOT EXISTS ar_statements (
    id TEXT PRIMARY KEY,
    credit_account_id TEXT NOT NULL,
    statement_date TEXT NOT NULL,
    previous_balance REAL NOT NULL,
    charges REAL NOT NULL,
    payments REAL NOT NULL,
    service_charges REAL NOT NULL,
    current_balance REAL NOT NULL,
    aging_current REAL NOT NULL,
    aging_30 REAL NOT NULL,
    aging_60 REAL NOT NULL,
    aging_90_plus REAL NOT NULL,
    FOREIGN KEY (credit_account_id) REFERENCES credit_accounts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ar_statements_account_id ON ar_statements(credit_account_id);
CREATE INDEX IF NOT EXISTS idx_ar_statements_date ON ar_statements(statement_date);

-- Promotions table
CREATE TABLE IF NOT EXISTS promotions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    promotion_type TEXT NOT NULL,
    discount_value REAL NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    applies_to_categories TEXT,
    applies_to_products TEXT,
    applies_to_tiers TEXT,
    min_quantity INTEGER,
    is_active INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_promotions_dates ON promotions(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_promotions_active ON promotions(is_active);

-- Promotion usage table
CREATE TABLE IF NOT EXISTS promotion_usage (
    id TEXT PRIMARY KEY,
    promotion_id TEXT NOT NULL,
    transaction_id TEXT NOT NULL,
    customer_id TEXT,
    discount_amount REAL NOT NULL,
    items_affected INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (promotion_id) REFERENCES promotions(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE INDEX IF NOT EXISTS idx_promotion_usage_promotion_id ON promotion_usage(promotion_id);
CREATE INDEX IF NOT EXISTS idx_promotion_usage_created_at ON promotion_usage(created_at);

-- Price levels table
CREATE TABLE IF NOT EXISTS price_levels (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    pricing_tier TEXT NOT NULL,
    price REAL NOT NULL,
    markup_percentage REAL
);

CREATE INDEX IF NOT EXISTS idx_price_levels_product_id ON price_levels(product_id);
CREATE INDEX IF NOT EXISTS idx_price_levels_tier ON price_levels(pricing_tier);
