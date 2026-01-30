# Configuration File Reference

## Quick Example

Here's what your CAPS configuration will look like:

```json
{
  "version": "1.0.0",
  "tenant": {
    "id": "caps-automotive",
    "name": "CAPS Automotive & Paint Supply",
    "slug": "caps"
  },
  "branding": {
    "company": {
      "name": "CAPS Automotive & Paint Supply",
      "shortName": "CAPS",
      "logo": "/assets/logos/caps-logo.svg"
    },
    "theme": {
      "colors": {
        "primary": "#3b82f6",
        "background": "#0f172a"
      }
    }
  },
  "categories": [
    {
      "id": "caps",
      "name": "Caps & Apparel",
      "attributes": [
        { "name": "size", "type": "dropdown", "values": ["S", "M", "L", "XL"] },
        { "name": "color", "type": "dropdown", "values": ["Black", "Navy", "Red"] }
      ]
    }
  ],
  "navigation": [
    { "id": "sell", "label": "Sell", "icon": "shopping-cart", "route": "/sell" }
  ],
  "modules": {
    "inventory": { "enabled": true },
    "layaway": { "enabled": true }
  }
}
```

## Full Configuration Schema

### Tenant Information
```json
{
  "tenant": {
    "id": "unique-tenant-id",           // Unique identifier
    "name": "Business Name",            // Full business name
    "slug": "business-slug",            // URL-friendly slug
    "domain": "custom.domain.com"       // Optional custom domain
  }
}
```

### Branding Configuration
```json
{
  "branding": {
    "company": {
      "name": "Company Name",
      "shortName": "Short",
      "tagline": "Your tagline here",
      "logo": "/path/to/logo.svg",
      "favicon": "/path/to/favicon.ico"
    },
    "theme": {
      "mode": "dark",                   // "light" or "dark"
      "colors": {
        "primary": "#3b82f6",
        "secondary": "#8b5cf6",
        "accent": "#10b981",
        "background": "#0f172a",
        "surface": "#1e293b",
        "text": "#f1f5f9",
        "success": "#22c55e",
        "warning": "#f59e0b",
        "error": "#ef4444",
        "info": "#3b82f6"
      },
      "fonts": {
        "heading": "Inter",
        "body": "Inter",
        "mono": "JetBrains Mono"
      },
      "spacing": {
        "base": 4,                      // Base unit in pixels
        "scale": [0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64]
      },
      "borderRadius": {
        "sm": "4px",
        "md": "8px",
        "lg": "12px",
        "xl": "16px"
      },
      "shadows": {
        "sm": "0 1px 2px rgba(0,0,0,0.05)",
        "md": "0 4px 6px rgba(0,0,0,0.1)",
        "lg": "0 10px 15px rgba(0,0,0,0.1)"
      }
    },
    "login": {
      "background": "/path/to/bg.jpg",
      "message": "Welcome message",
      "showLogo": true
    },
    "receipts": {
      "header": "Company Name\nAddress\nPhone",
      "footer": "Thank you!"
    }
  }
}
```

### Category Configuration
```json
{
  "categories": [
    {
      "id": "category-id",
      "name": "Category Name",
      "icon": "icon-name",              // Lucide icon name
      "color": "#3b82f6",
      "parent": "parent-id",            // Optional parent category
      "attributes": [
        {
          "name": "attribute-name",
          "label": "Display Label",
          "type": "text",               // text, number, dropdown, multi-select, date, boolean
          "required": true,
          "unique": false,
          "default": "default value",
          "values": ["option1", "option2"],  // For dropdown/multi-select
          "min": 0,                     // For number
          "max": 100,                   // For number
          "regex": "^[A-Z]{3}$",       // For text validation
          "helpText": "Help text"
        }
      ],
      "searchFields": ["name", "sku", "attribute-name"],
      "displayTemplate": "{name} - {attribute-name}",
      "pricing": {
        "allowDiscount": true,
        "taxable": true,
        "trackInventory": true
      }
    }
  ]
}
```

### Navigation Configuration
```json
{
  "navigation": {
    "main": [
      {
        "id": "nav-item-id",
        "label": "Menu Label",
        "icon": "icon-name",
        "route": "/path",
        "permission": "permission.name",
        "order": 1,
        "badge": "count",               // Optional badge
        "children": [                   // Optional submenu
          {
            "id": "sub-item-id",
            "label": "Sub Item",
            "route": "/path/sub"
          }
        ]
      }
    ],
    "quickActions": [
      {
        "label": "Action Label",
        "action": "navigate:/path",     // or "modal:modal-id"
        "icon": "icon-name",
        "permission": "permission.name"
      }
    ],
    "mobile": {
      "layout": "bottom-tabs",          // "bottom-tabs", "hamburger", "drawer"
      "primaryActions": ["sell", "lookup", "customers"]
    }
  }
}
```

### Widget Configuration
```json
{
  "widgets": {
    "dashboard": [
      {
        "id": "widget-id",
        "type": "stat-card",            // stat-card, line-chart, bar-chart, pie-chart, table, list
        "title": "Widget Title",
        "query": "SELECT COUNT(*) FROM table WHERE tenant_id = :tenant_id",
        "format": "currency",           // number, currency, percentage, date
        "icon": "icon-name",
        "color": "#3b82f6",
        "size": "1x1",                  // 1x1, 2x1, 1x2, 2x2
        "position": { "x": 0, "y": 0 },
        "refreshInterval": 60,          // Seconds
        "permission": "permission.name"
      }
    ]
  }
}
```

### Module Configuration
```json
{
  "modules": {
    "inventory": {
      "enabled": true,
      "settings": {
        "trackSerialNumbers": true,
        "allowNegativeStock": false,
        "autoReorder": true
      }
    },
    "layaway": {
      "enabled": true,
      "settings": {
        "defaultDepositPercent": 20,
        "maxDurationDays": 90,
        "lateFeePercent": 5
      }
    },
    "workOrders": {
      "enabled": true,
      "settings": {
        "autoGenerateNumber": true,
        "requireApproval": true
      }
    },
    "commissions": {
      "enabled": true,
      "settings": {
        "defaultRate": 5,
        "payoutFrequency": "monthly"
      }
    },
    "loyalty": {
      "enabled": true,
      "settings": {
        "pointsPerDollar": 1,
        "redemptionRate": 0.01
      }
    },
    "creditAccounts": {
      "enabled": true,
      "settings": {
        "defaultCreditLimit": 1000,
        "interestRate": 0
      }
    },
    "giftCards": {
      "enabled": true,
      "settings": {
        "expirationMonths": 12,
        "allowReload": true
      }
    },
    "promotions": {
      "enabled": true,
      "settings": {
        "stackable": false,
        "autoApply": true
      }
    }
  }
}
```

### Database Configuration
```json
{
  "database": {
    "customTables": [
      {
        "name": "table_name",
        "columns": [
          {
            "name": "column_name",
            "type": "string",            // string, integer, float, boolean, date, json
            "required": true,
            "unique": false,
            "default": "value",
            "index": true
          }
        ],
        "relationships": [
          {
            "type": "belongsTo",         // belongsTo, hasMany, hasOne
            "table": "other_table",
            "foreignKey": "other_id"
          }
        ]
      }
    ],
    "customColumns": {
      "products": [
        {
          "name": "custom_field",
          "type": "string",
          "label": "Custom Field",
          "required": false
        }
      ],
      "customers": [
        {
          "name": "custom_field",
          "type": "string",
          "label": "Custom Field",
          "required": false
        }
      ]
    }
  }
}
```

### Localization Configuration
```json
{
  "localization": {
    "language": "en",                   // ISO 639-1 code
    "dateFormat": "MM/DD/YYYY",
    "timeFormat": "12h",                // "12h" or "24h"
    "numberFormat": {
      "decimalSeparator": ".",
      "thousandsSeparator": ","
    },
    "currency": {
      "code": "USD",
      "symbol": "$",
      "position": "before"              // "before" or "after"
    },
    "timezone": "America/New_York",
    "firstDayOfWeek": 0,                // 0 = Sunday, 1 = Monday
    "measurementSystem": "imperial"     // "metric" or "imperial"
  }
}
```

### Responsive Configuration
```json
{
  "responsive": {
    "breakpoints": {
      "xs": 320,
      "sm": 640,
      "md": 768,
      "lg": 1024,
      "xl": 1280,
      "2xl": 1536
    },
    "touchTargets": {
      "minimum": 44                     // Pixels
    },
    "mobile": {
      "transformTables": true,          // Transform to cards
      "fullScreenModals": true,
      "bottomNavigation": true
    }
  }
}
```

### Animation Configuration
```json
{
  "animations": {
    "durations": {
      "fast": 150,
      "normal": 300,
      "slow": 500
    },
    "easing": {
      "entrance": "ease-out",
      "exit": "ease-in",
      "standard": "ease-in-out"
    },
    "respectReducedMotion": true
  }
}
```

## Configuration Validation

The system validates configurations against a JSON schema. Invalid configurations will be rejected with helpful error messages.

### Common Validation Rules

1. **Required Fields**: `version`, `tenant.id`, `tenant.name`
2. **Color Format**: Must be valid hex colors (#RRGGBB)
3. **Icon Names**: Must be valid Lucide icon names
4. **Routes**: Must start with `/`
5. **Permissions**: Must match defined permission names
6. **SQL Queries**: Must include `:tenant_id` parameter
7. **File Paths**: Must exist in assets directory

## Environment Variables

Some sensitive settings can be overridden with environment variables:

```bash
# Tenant selection
TENANT_ID=caps-automotive

# Database
DATABASE_URL=sqlite://data/pos.db

# API
API_PORT=8923
API_HOST=0.0.0.0

# Security
JWT_SECRET=your-secret-key
ENCRYPTION_KEY=your-encryption-key

# Features
ENABLE_HOT_RELOAD=true
ENABLE_DEBUG_MODE=false
```

## Configuration Loading Priority

1. Environment variables (highest priority)
2. Tenant-specific configuration file
3. Default configuration file
4. Hardcoded defaults (lowest priority)

## Tips

### Keep It Simple
- Start with default configuration
- Add customizations incrementally
- Test after each change

### Use Templates
- Copy from example configurations
- Modify for your needs
- Validate before deploying

### Version Control
- Keep configurations in git (except private/)
- Use meaningful commit messages
- Tag configuration versions

### Backup
- Backup configurations before changes
- Keep old versions for rollback
- Test rollback procedure

### Documentation
- Document custom fields
- Explain business rules
- Note dependencies

## Example: Minimal Configuration

```json
{
  "version": "1.0.0",
  "tenant": {
    "id": "my-business",
    "name": "My Business"
  },
  "branding": {
    "company": {
      "name": "My Business"
    }
  },
  "categories": [
    {
      "id": "products",
      "name": "Products",
      "attributes": [
        { "name": "name", "type": "text", "required": true },
        { "name": "price", "type": "number", "required": true }
      ]
    }
  ],
  "navigation": [
    { "id": "sell", "label": "Sell", "route": "/sell" }
  ],
  "modules": {
    "inventory": { "enabled": true }
  }
}
```

This minimal configuration gives you a working POS with basic functionality. Add more as needed!
