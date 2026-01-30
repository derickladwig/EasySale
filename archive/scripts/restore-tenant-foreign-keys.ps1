# Restore tenant foreign key constraints
# Now that we have a tenants table, we need to add back the foreign key constraints

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Restoring Tenant Foreign Key Constraints" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$migrationsPath = "backend\rust\migrations"
$fixedCount = 0

# Migration 025: integration_credentials - 3 tables need FK
Write-Host "Processing: 025_integration_credentials.sql" -ForegroundColor Yellow
$file025 = Join-Path $migrationsPath "025_integration_credentials.sql"
$content = Get-Content $file025 -Raw

# Table 1: integration_credentials
$content = $content -replace "(    -- Constraints\s+UNIQUE\(tenant_id, platform\))", "    -- Constraints`r`n    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,`r`n    UNIQUE(tenant_id, platform)"

# Table 2: integration_field_mappings  
$content = $content -replace "(    -- Constraints\s+UNIQUE\(tenant_id, platform, entity_type\))", "    -- Constraints`r`n    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,`r`n    UNIQUE(tenant_id, platform, entity_type)"

# Table 3: integration_webhook_events
$content = $content -replace "(    -- Constraints\s+UNIQUE\(platform, event_id\)  -- Prevent duplicate event processing)", "    -- Constraints`r`n    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,`r`n    UNIQUE(platform, event_id)  -- Prevent duplicate event processing"

Set-Content -Path $file025 -Value $content -NoNewline
Write-Host "  Fixed: 025_integration_credentials.sql (3 tables)" -ForegroundColor Green
$fixedCount++

# Migration 026: field_mappings
Write-Host "Processing: 026_field_mappings.sql" -ForegroundColor Yellow
$file026 = Join-Path $migrationsPath "026_field_mappings.sql"
$content = Get-Content $file026 -Raw
$content = $content -replace "(\s+updated_at TEXT NOT NULL DEFAULT \(datetime\('now'\)\)\s+\);)", "`$1`r`n    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE"
# Actually, let me check the structure first
Write-Host "  Skipping for now - need to check structure" -ForegroundColor Gray

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Restored foreign keys in $fixedCount files" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
