# Cashier Guide

A comprehensive guide for cashiers using EasySale POS.

## Getting Started

### Logging In

1. **Launch EasySale** on your terminal
2. **Enter your username** (provided by your manager)
3. **Enter your password**
4. **Click "Login"**

If you've forgotten your password, contact your manager to reset it.

### Understanding Your Role

As a cashier, you have access to:
- **Sell Module**: Process sales, returns, and exchanges
- **Product Lookup**: Search for products and check prices
- **Customer Lookup**: Find customer information

You may also have access to additional features depending on your permissions.

### Main Screen Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ Top Bar: Store name, your name, online/offline status          │
├────────────┬────────────────────────────────────────────────────┤
│            │                                                    │
│ Navigation │          Main Workspace                            │
│            │                                                    │
│ • Sell     │   ┌──────────────────────┬───────────────────┐    │
│ • Lookup   │   │ Product Search Area  │   Shopping Cart   │    │
│ • Customers│   │                      │                   │    │
│            │   │ • Scan or search     │ • Items in cart   │    │
│            │   │ • Product details    │ • Subtotal        │    │
│            │   │                      │ • Tax             │    │
│            │   │                      │ • Total           │    │
│            │   │                      │ • Payment button  │    │
│            │   └──────────────────────┴───────────────────┘    │
│            │                                                    │
└────────────┴────────────────────────────────────────────────────┘
```

---

## Processing Sales

### Basic Sale

#### Step 1: Start a New Sale
- Click **"Sell"** in the navigation
- The sale screen opens with an empty cart

#### Step 2: Add Products

**Option A: Scan Barcode**
1. Position barcode scanner over product barcode
2. Scanner beeps when successful
3. Product appears in cart

**Option B: Search by Name**
1. Click the search box (or press F2)
2. Type product name or keywords
3. Click on the correct product
4. Product appears in cart

**Option C: Search by SKU/Barcode**
1. Type SKU or barcode number in search box
2. Press Enter
3. Product appears in cart

#### Step 3: Adjust Quantities

- **Increase**: Click the "+" button next to the item
- **Decrease**: Click the "-" button next to the item
- **Set specific quantity**: Click the quantity and type a number
- **Remove item**: Click the "X" or trash icon

#### Step 4: Review Cart

Before proceeding to payment, verify:
- All items are correct
- Quantities are accurate
- Prices look right
- Customer information (if applicable)

#### Step 5: Process Payment

1. Click **"Payment"** button (or press F10)
2. Select payment method:
   - **Cash**
   - **Card** (credit/debit)
   - **Check**
   - **Gift Card**
   - **Store Credit**
3. Enter payment amount
4. Complete the transaction
5. Print receipt

### Payment Methods

#### Cash Payment

1. Select **"Cash"**
2. Enter amount tendered
3. System calculates change
4. Click **"Complete"**
5. Give change to customer
6. Receipt prints automatically

**Tip**: For exact cash amount, click "Exact" button.

#### Card Payment

1. Select **"Card"**
2. Customer inserts/swipes/taps card on terminal
3. Wait for approval
4. Have customer sign if required
5. Receipt prints automatically

**Chip Cards**: Always insert chip-first if available.

**Contactless**: Hold card/phone near terminal until beep.

#### Split Payment

For customers paying with multiple methods:

1. Click **"Payment"**
2. Select first payment method
3. Enter partial amount
4. Click **"Add Payment"**
5. Select second payment method
6. Enter remaining amount
7. Complete transaction

Example: $50 total, customer pays $30 cash + $20 card.

---

## Applying Discounts

### Item Discount

To discount a single item:

1. Click the **discount icon** next to the item (% symbol)
2. Choose discount type:
   - **Percentage**: Enter percent off (e.g., 10%)
   - **Fixed Amount**: Enter dollar amount (e.g., $5.00)
3. Enter reason (required)
4. Click **"Apply"**

### Transaction Discount

To discount the entire sale:

1. Click **"Discount"** button in cart area
2. Choose discount type
3. Enter amount/percentage
4. Enter reason
5. Click **"Apply"**

### Manager Override

For discounts above your limit:

1. Apply discount as normal
2. System prompts for manager approval
3. Manager enters their credentials
4. Discount is applied

**Note**: All discounts are logged for review.

---

## Processing Returns

### Standard Return (With Receipt)

1. Click **"Sell"** then **"Return"** (or press F8)
2. **Scan receipt barcode** or enter transaction number
3. Original transaction loads
4. Select items being returned (check boxes)
5. Enter return quantity for each item
6. Select **return reason**:
   - Defective
   - Wrong item
   - Not needed
   - Damaged
   - Other
7. Select **refund method**:
   - Original payment method
   - Cash
   - Store credit
8. Process refund
9. Print return receipt

### No Receipt Return

If customer doesn't have receipt:

1. Click **"Return"** then **"No Receipt"**
2. Search for product
3. Select product and enter quantity
4. Select return reason
5. Manager approval may be required
6. Refund typically issued as store credit

**Note**: No-receipt returns may have limits and restrictions.

---

## Processing Exchanges

1. Click **"Return"** to start return process
2. Return the original item(s)
3. Instead of refunding, click **"Exchange"**
4. Scan/search for new item(s)
5. System calculates difference:
   - **Customer owes more**: Collect additional payment
   - **Customer owes less**: Refund difference
   - **Even exchange**: No payment needed
6. Complete transaction

---

## Customer Operations

### Adding Customer to Sale

**Option A: Existing Customer**
1. Click **"Customer"** button in cart
2. Search by name, phone, or email
3. Click on customer to select
4. Customer info appears in cart

**Option B: New Customer**
1. Click **"Customer"** then **"New Customer"**
2. Enter customer information:
   - Name (required)
   - Phone
   - Email
3. Click **"Save"**
4. Customer is added to sale

### Customer Benefits

When customer is attached to sale:
- **Loyalty points** earned automatically
- **Pricing tier** applied (if different from retail)
- **Purchase history** updated
- **Store credit** can be used

### Redeeming Loyalty Points

1. Add customer to sale
2. Click **"Apply Loyalty"** button
3. Enter points to redeem (or click "Use All")
4. Points convert to discount
5. Complete sale as normal

### Using Store Credit

1. Add customer to sale
2. At payment, select **"Store Credit"**
3. Credit balance shown
4. Enter amount to use
5. Add additional payment if needed

---

## Special Transactions

### Price Override

If price needs to be changed:

1. Click the **price** next to the item
2. Enter new price
3. Select reason:
   - Price match
   - Damaged item
   - Manager approved
   - Other
4. Manager approval may be required
5. New price applied

### Layaway

To start a layaway:

1. Add items to cart
2. Add customer (required)
3. Click **"Layaway"** instead of Payment
4. Collect deposit (minimum amount required)
5. Print layaway receipt

To complete layaway:
1. Click **"Sell"** then **"Pickup Layaway"**
2. Search by customer or layaway number
3. Review items
4. Collect remaining balance
5. Complete sale

### Quotes

To create a quote:

1. Add items to cart
2. Add customer (optional)
3. Click **"Save as Quote"**
4. Print or email quote to customer

To convert quote to sale:
1. Click **"Open Quote"**
2. Search by quote number or customer
3. Review and adjust if needed
4. Process payment

### Suspended Sales

To suspend (hold) a sale:

1. Add items to cart
2. Click **"Suspend"** (or press F9)
3. Enter note (optional)
4. Sale is saved

To resume suspended sale:
1. Click **"Resume"** button
2. Select the suspended sale
3. Continue where you left off

**Use this when**: Customer forgot wallet, needs to check something, etc.

---

## Handling Voids

### Void Line Item

To remove an item during sale:
- Click **"X"** next to the item
- Item is removed from cart

### Void Transaction

To cancel entire sale before payment:
1. Click **"Void Sale"** (or press Esc)
2. Confirm cancellation
3. Cart is cleared

### Post-Void (After Completion)

To void a completed transaction:
1. Find transaction (Reports > Recent Transactions)
2. Click **"Void"**
3. Enter reason
4. Manager approval required
5. Inventory restored automatically

**Note**: Post-voids should be done same day if possible.

---

## End of Day Procedures

### Closing Your Register

1. Click your name in top bar
2. Select **"Close Register"**
3. Count your cash drawer:
   - Count bills by denomination
   - Count coins by type
   - Enter totals
4. System calculates over/short
5. Print closing report
6. Place cash in safe per store policy

### Cash Drop (During Shift)

If drawer has too much cash:

1. Click **"Cash Drop"** in menu
2. Enter amount being removed
3. Count and verify amount
4. Print drop receipt
5. Place in safe immediately

---

## Quick Reference

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| F1 | Help |
| F2 | Product Search |
| F3 | Customer Search |
| F4 | New Sale |
| F5 | Refresh |
| F8 | Return Mode |
| F9 | Suspend Sale |
| F10 | Payment |
| Esc | Cancel/Back |
| Enter | Confirm Selection |

### Common Tasks

| Task | How To |
|------|--------|
| Find a product | F2 → Type name → Enter |
| Change quantity | Click quantity → Type number |
| Apply discount | Click % icon → Enter amount |
| Add customer | Click Customer → Search/Add |
| Process return | F8 → Scan receipt |
| Suspend sale | F9 |
| Resume sale | Click Resume |

---

## Troubleshooting

### Scanner Not Working

1. Check USB connection
2. Try scanning a different barcode
3. Type barcode manually as backup
4. Restart scanner (unplug/replug)
5. Contact IT if still not working

### Card Payment Declined

1. Try running card again
2. Ask customer to try different card
3. Ask customer for alternative payment
4. Check card for damage
5. If terminal shows error, note code

### Printer Not Printing

1. Check printer is on
2. Check paper supply
3. Check USB/network connection
4. Try restarting printer
5. Print to backup printer if available
6. Offer emailed receipt if possible

### Item Not in System

1. Try different search terms
2. Search by category
3. Ask manager to add item
4. Use "misc" item with manual price (if allowed)

### Price Seems Wrong

1. Check for sale/promotion signs
2. Verify correct item scanned
3. Ask manager to verify
4. Price match if policy allows

---

## Best Practices

### Speed and Accuracy

- **Scan when possible** - faster and more accurate than typing
- **Use shortcuts** - memorize common keyboard shortcuts
- **Keep workspace clear** - have room to scan items
- **Stay organized** - handle one transaction at a time

### Customer Service

- **Greet customers** - acknowledge them when they approach
- **Be patient** - some transactions take longer
- **Explain clearly** - help customers understand totals and payments
- **Thank them** - positive ending to every transaction

### Security

- **Never share your login** - you're responsible for your transactions
- **Log out when leaving** - even for short breaks
- **Watch for fraud** - report suspicious activity
- **Handle cash carefully** - count twice, verify change

### Offline Mode

The system works offline - no internet needed!

- **All features work** normally
- **Don't worry** if you see "Offline" indicator
- **Data syncs automatically** when connection returns
- **Keep working** - nothing is lost

---

## Getting Help

### In-App Help
- Press **F1** for help on current screen
- Click **"?"** icon in top bar for help menu

### Manager Assistance
- Call manager for:
  - Unusual situations
  - Discount approvals
  - Customer complaints
  - System issues

### IT Support
- For technical issues:
  - Note the error message
  - Note what you were doing
  - Contact IT with details

---

## Quick Tips

1. **Greet every customer** with a smile
2. **Scan items smoothly** - practice your technique
3. **Verify totals** before asking for payment
4. **Count change carefully** - verify twice
5. **Thank every customer** as they leave
6. **Keep your area clean** throughout the day
7. **Report issues immediately** - don't wait
8. **Stay calm** during busy times
9. **Ask questions** - it's how you learn
10. **Log out** when you leave your station

Welcome to the team!
