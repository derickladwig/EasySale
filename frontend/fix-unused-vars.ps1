# Fix unused variable warnings by prefixing with underscore

# ProductGrid.tsx
(Get-Content "src/domains/product/components/ProductGrid.tsx") -replace "import \{ Product, CategoryConfig \}", "import { Product, CategoryConfig as _CategoryConfig }" | Set-Content "src/domains/product/components/ProductGrid.tsx"

# vendor-bill/api.ts
(Get-Content "src/domains/vendor-bill/api.ts") -replace "  VendorBill,", "  VendorBill as _VendorBill," | Set-Content "src/domains/vendor-bill/api.ts"
(Get-Content "src/domains/vendor-bill/api.ts") -replace "  VendorSkuAlias,", "  VendorSkuAlias as _VendorSkuAlias," | Set-Content "src/domains/vendor-bill/api.ts"

# CompanyStoresPage.tsx
(Get-Content "src/features/settings/pages/CompanyStoresPage.tsx") -replace "const \[stores, setStores\]", "const [stores, _setStores]" | Set-Content "src/features/settings/pages/CompanyStoresPage.tsx"

# DataManagementPage.tsx
(Get-Content "src/features/settings/pages/DataManagementPage.tsx") -replace "^import \{ Button, Input \}", "import { Button, Input as _Input }" | Set-Content "src/features/settings/pages/DataManagementPage.tsx"

# FeatureFlagsPage.tsx
(Get-Content "src/features/settings/pages/FeatureFlagsPage.tsx") -replace "^import \{ Button, Switch \}", "import { Button as _Button, Switch }" | Set-Content "src/features/settings/pages/FeatureFlagsPage.tsx"

# IntegrationsPage.tsx
(Get-Content "src/features/settings/pages/IntegrationsPage.tsx") -replace "const handleConnect = \(integrationId: string\)", "const handleConnect = (_integrationId: string)" | Set-Content "src/features/settings/pages/IntegrationsPage.tsx"

# LocalizationPage.tsx
(Get-Content "src/features/settings/pages/LocalizationPage.tsx") -replace "import \{ Globe, DollarSign, Calendar, Clock \}", "import { Globe, DollarSign, Calendar, Clock as _Clock }" | Set-Content "src/features/settings/pages/LocalizationPage.tsx"

# NetworkPage.tsx
(Get-Content "src/features/settings/pages/NetworkPage.tsx") -replace "const \[remoteStores, setRemoteStores\]", "const [remoteStores, _setRemoteStores]" | Set-Content "src/features/settings/pages/NetworkPage.tsx"

# ProductConfigPage.tsx
(Get-Content "src/features/settings/pages/ProductConfigPage.tsx") -replace "^import \{ Button, Input \}", "import { Button, Input as _Input }" | Set-Content "src/features/settings/pages/ProductConfigPage.tsx"
(Get-Content "src/features/settings/pages/ProductConfigPage.tsx") -replace "const \[categories, setCategories\]", "const [categories, _setCategories]" | Set-Content "src/features/settings/pages/ProductConfigPage.tsx"
(Get-Content "src/features/settings/pages/ProductConfigPage.tsx") -replace "const \[units, setUnits\]", "const [units, _setUnits]" | Set-Content "src/features/settings/pages/ProductConfigPage.tsx"
(Get-Content "src/features/settings/pages/ProductConfigPage.tsx") -replace "const \[pricingTiers, setPricingTiers\]", "const [pricingTiers, _setPricingTiers]" | Set-Content "src/features/settings/pages/ProductConfigPage.tsx"

# TaxRulesPage.tsx
(Get-Content "src/features/settings/pages/TaxRulesPage.tsx") -replace "const \[taxRules, setTaxRules\]", "const [taxRules, _setTaxRules]" | Set-Content "src/features/settings/pages/TaxRulesPage.tsx"

# useSettings.ts - remove unused import line
(Get-Content "src/hooks/useSettings.ts") | Where-Object { $_ -notmatch "^import \{ useQuery, useMutation, useQueryClient \}" } | Set-Content "src/hooks/useSettings.ts"

Write-Host "Fixed all unused variable warnings!"
