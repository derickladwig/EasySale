# Fix all tenant table references in migrations
# This script removes FOREIGN KEY constraints that reference the non-existent tenants table
# 
# CONTEXT: The EasySale system uses tenant_id as a string identifier in all tables,
# but there is NO tenants table in the database. Tenant management is handled through
# configuration files and environment variables, not database records.
# 
# This script removes the invalid FOREIGN KEY constraints while keeping the tenant_id columns.

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Fixing Tenant Table References in Migrations" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "CONTEXT: Removing FOREIGN KEY constraints to non-existent tenants table" -ForegroundColor Gray
Write-Host "         tenant_id columns will remain as string identifiers" -ForegroundColor Gray
Write-Host ""

$migrationsPath = "backend\rust\migrations"
$fixedCount = 0

# List of migrations that need fixing (based on grep results)
$migrationsToFix = @(
    "025_integration_credentials.sql",
    "026_field_mappings.sql",
    "027_field_mappings_extended.sql",
    "028_sync_direction_control.sql",
    "029_sync_schedules.sql",
    "030_oauth_states.sql",
    "031_confirmation_tokens.sql",
    "032_sync_logs.sql"
)

foreach ($migration in $migrationsToFix) {
    $filePath = Join-Path $migrationsPath $migration
    
    if (Test-Path $filePath) {
        Write-Host "Processing: $migration" -ForegroundColor Yellow
        
        $content = Get-Content $filePath -Raw
        $originalContent = $content
        
        # Pattern 1: Remove standalone FOREIGN KEY line with tenants reference (with preceding comma)
        $content = $content -replace ",\s*FOREIGN KEY \(tenant_id\) REFERENCES tenants\(id\) ON DELETE CASCADE", ""
        
        # Pattern 2: Remove FOREIGN KEY as last constraint before closing paren (no preceding comma)
        $content = $content -replace "\s*FOREIGN KEY \(tenant_id\) REFERENCES tenants\(id\) ON DELETE CASCADE\s*\)", ")"
        
        # Pattern 3: Remove trailing comma before closing paren (cleanup)
        $content = $content -replace ",(\s*)\)", '$1)'
        
        if ($content -ne $originalContent) {
            Set-Content -Path $filePath -Value $content -NoNewline
            Write-Host "  Fixed: $migration" -ForegroundColor Green
            $fixedCount++
        } else {
            Write-Host "  - No changes needed: $migration" -ForegroundColor Gray
        }
    } else {
        Write-Host "  Not found: $migration" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Fixed $fixedCount migration files" -ForegroundColor Green
Write-Host "Note: tenant_id columns remain as string identifiers" -ForegroundColor Gray
Write-Host "========================================" -ForegroundColor Cyan
