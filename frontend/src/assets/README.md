# Assets Directory

This directory contains all static assets for the EasySale frontend application.

## Structure

```
assets/
├── icons/          # SVG icons and icon components
├── images/         # Images (logos, placeholders, etc.)
├── styles/         # Global styles and CSS
└── labels/         # Label templates for printing
```

## Icon System

### Using Lucide React Icons

We use [Lucide React](https://lucide.dev/) for icons. It provides a comprehensive set of beautiful, consistent icons.

**Installation**:
```bash
npm install lucide-react
```

**Usage**:
```tsx
import { ShoppingCart, Package, Users, Settings } from 'lucide-react';

function MyComponent() {
  return (
    <div>
      <ShoppingCart size={24} />
      <Package size={24} color="#3b82f6" />
      <Users size={24} strokeWidth={1.5} />
      <Settings size={24} className="text-gray-600" />
    </div>
  );
}
```

### Common Icons

**Navigation**:
- `ShoppingCart` - Sell module
- `Search` - Lookup module
- `Package` - Warehouse module
- `Users` - Customers module
- `BarChart3` - Reporting module
- `Settings` - Admin module

**Actions**:
- `Plus` - Add item
- `Minus` - Remove item
- `Edit` - Edit
- `Trash2` - Delete
- `Save` - Save
- `X` - Close/Cancel
- `Check` - Confirm
- `ChevronDown` - Dropdown
- `ChevronRight` - Expand
- `ChevronLeft` - Collapse

**Status**:
- `CheckCircle` - Success
- `XCircle` - Error
- `AlertCircle` - Warning
- `Info` - Information
- `Loader2` - Loading (with spin animation)

**Hardware**:
- `Printer` - Print
- `Scan` - Barcode scanner
- `CreditCard` - Payment
- `DollarSign` - Money

**Inventory**:
- `Box` - Product
- `Boxes` - Multiple products
- `Tag` - Price tag
- `Barcode` - Barcode
- `TrendingUp` - Stock increase
- `TrendingDown` - Stock decrease

### Custom Icons

If you need custom icons not available in Lucide:

1. **Export SVG** from design tool (Figma, Illustrator)
2. **Optimize SVG** using [SVGOMG](https://jakearchibald.github.io/svgomg/)
3. **Save to** `assets/icons/custom/`
4. **Create React component**:

```tsx
// assets/icons/custom/MyIcon.tsx
export function MyIcon({ size = 24, color = 'currentColor', ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="..." />
    </svg>
  );
}
```

## Images

### Logo

**Location**: `assets/images/logo.svg`

**Usage**:
```tsx
import logo from '@/assets/images/logo.svg';

function Header() {
  return <img src={logo} alt="EasySale" className="h-8" />;
}
```

### Product Placeholders

**Location**: `assets/images/placeholders/`

**Files**:
- `product-placeholder.svg` - Generic product image
- `cap-placeholder.svg` - Cap category placeholder
- `part-placeholder.svg` - Auto part placeholder
- `paint-placeholder.svg` - Paint product placeholder
- `equipment-placeholder.svg` - Equipment placeholder

**Usage**:
```tsx
import productPlaceholder from '@/assets/images/placeholders/product-placeholder.svg';

function ProductCard({ product }) {
  return (
    <img
      src={product.image || productPlaceholder}
      alt={product.name}
      className="w-full h-48 object-cover"
    />
  );
}
```

### Image Optimization

**Guidelines**:
- Use SVG for logos and icons (scalable, small file size)
- Use WebP for photos (better compression than JPEG)
- Provide multiple sizes for responsive images
- Lazy load images below the fold
- Use `loading="lazy"` attribute

**Vite Configuration** (already configured):
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    assetsInlineLimit: 4096, // Inline assets < 4KB as base64
  },
});
```

## Styles

### Global Styles

**Location**: `assets/styles/global.css`

**Contents**:
- CSS reset
- Tailwind directives
- Custom utility classes
- Print styles

**Usage**:
```tsx
// main.tsx
import '@/assets/styles/global.css';
```

### Print Styles

**Location**: `assets/styles/print.css`

**Purpose**: Styles for printing receipts, labels, and reports

**Usage**:
```css
@media print {
  .no-print {
    display: none;
  }
  
  .print-only {
    display: block;
  }
}
```

## Label Templates

### Receipt Template

**Location**: `assets/labels/receipt-template.html`

**Purpose**: HTML template for thermal receipt printing

**Variables**:
- `{{store_name}}` - Store name
- `{{transaction_number}}` - Transaction number
- `{{date}}` - Transaction date
- `{{items}}` - Line items
- `{{total}}` - Total amount

### Product Label Template

**Location**: `assets/labels/product-label-template.html`

**Purpose**: HTML template for product shelf labels

**Variables**:
- `{{product_name}}` - Product name
- `{{sku}}` - SKU
- `{{barcode}}` - Barcode image
- `{{price}}` - Price

### Barcode Generation

**Library**: Use `jsbarcode` for barcode generation

**Installation**:
```bash
npm install jsbarcode
```

**Usage**:
```tsx
import JsBarcode from 'jsbarcode';

function generateBarcode(value: string) {
  const canvas = document.createElement('canvas');
  JsBarcode(canvas, value, {
    format: 'CODE128',
    width: 2,
    height: 50,
    displayValue: true,
  });
  return canvas.toDataURL();
}
```

## Asset Loading

### Static Assets

**Vite handles static assets automatically**:

```tsx
// Import as URL
import logo from './logo.svg';
<img src={logo} alt="Logo" />

// Import as string (for inline SVG)
import logoSvg from './logo.svg?raw';
<div dangerouslySetInnerHTML={{ __html: logoSvg }} />

// Import as React component (with vite-plugin-svgr)
import { ReactComponent as Logo } from './logo.svg';
<Logo className="h-8" />
```

### Dynamic Assets

**Use `import.meta.glob` for dynamic imports**:

```tsx
const images = import.meta.glob('./images/**/*.{png,jpg,svg}');

async function loadImage(path: string) {
  const image = await images[path]();
  return image.default;
}
```

## Performance Best Practices

### Image Optimization

1. **Use appropriate formats**:
   - SVG for logos, icons, simple graphics
   - WebP for photos (fallback to JPEG)
   - PNG for images requiring transparency

2. **Optimize file sizes**:
   - Compress images before adding to project
   - Use tools like ImageOptim, TinyPNG
   - Target < 100KB per image

3. **Lazy loading**:
   ```tsx
   <img src={image} alt="..." loading="lazy" />
   ```

4. **Responsive images**:
   ```tsx
   <img
     src={image}
     srcSet={`${imageSmall} 400w, ${imageMedium} 800w, ${imageLarge} 1200w`}
     sizes="(max-width: 640px) 400px, (max-width: 1024px) 800px, 1200px"
     alt="..."
   />
   ```

### Icon Optimization

1. **Use icon library** (Lucide) instead of individual SVG files
2. **Tree-shake unused icons** (Vite does this automatically)
3. **Reuse icon components** instead of duplicating SVG code

### Bundle Size

**Check bundle size**:
```bash
npm run build
npm run preview
```

**Analyze bundle**:
```bash
npm install -D rollup-plugin-visualizer
```

**Target sizes**:
- Initial bundle: < 200KB gzipped
- Route chunks: < 50KB gzipped each
- Assets: < 500KB total

## Accessibility

### Alt Text

**Always provide alt text for images**:
```tsx
<img src={product.image} alt={`${product.name} - ${product.category}`} />
```

**Decorative images**:
```tsx
<img src={decoration} alt="" role="presentation" />
```

### Icon Labels

**Provide labels for icon-only buttons**:
```tsx
<button aria-label="Add to cart">
  <Plus size={20} />
</button>
```

### Color Contrast

**Ensure sufficient contrast** (WCAG AA: 4.5:1 for text, 3:1 for UI):
- Use design tokens for colors
- Test with browser DevTools
- Use tools like [Contrast Checker](https://webaim.org/resources/contrastchecker/)

## References

- [Lucide Icons](https://lucide.dev/)
- [Vite Asset Handling](https://vitejs.dev/guide/assets.html)
- [Web.dev Image Optimization](https://web.dev/fast/#optimize-your-images)
- [WCAG Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
