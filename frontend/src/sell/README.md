# Sell Feature

Point-of-sale checkout interface for processing sales transactions.

## Structure

```
sell/
├── components/       # UI components specific to Sell
│   ├── CartPanel.tsx
│   ├── ProductSearch.tsx
│   └── PaymentPane.tsx
├── hooks/           # Custom hooks for Sell logic
│   ├── useCart.ts
│   └── usePayment.ts
├── pages/           # Route pages
│   └── SellPage.tsx
├── types/           # TypeScript types
│   └── index.ts
├── index.ts         # Public exports
└── README.md        # This file
```

## Module Boundaries

**Can import from:**
- `@common/*` - Shared components, layouts, utilities
- `@domains/cart/*` - Cart business logic
- `@domains/pricing/*` - Pricing calculations
- `@domains/auth/*` - Authentication

**Cannot import from:**
- Other features (e.g., `@features/lookup/*`)
- This prevents circular dependencies and maintains clear boundaries

## Usage

```tsx
import { SellPage } from '@features/sell';

// Use in router
<Route path="/sell" element={<SellPage />} />
```

## Key Components

### SellPage
Main page component for the POS interface.

### CartPanel
Displays current cart items with quantities and prices.

### ProductSearch
Search and add products to cart.

### PaymentPane
Process payment and complete transaction.

## State Management

Uses domain logic from `@domains/cart` and `@domains/pricing`.
Local UI state managed with React hooks.

## Future Enhancements

- Barcode scanner integration
- Quick product shortcuts
- Customer lookup integration
- Offline transaction queue
