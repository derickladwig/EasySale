@echo off
echo Fixing frontend TypeScript errors...

cd frontend

echo.
echo [1/3] Removing unused imports and variables...

REM Fix CategoryManagement.tsx - change icon to leftIcon
powershell -Command "(Get-Content src/features/admin/components/CategoryManagement.tsx) -replace 'icon=', 'leftIcon=' | Set-Content src/features/admin/components/CategoryManagement.tsx"

REM Fix CompanyInfoEditor.tsx - change icon to leftIcon and remove 'as' prop
powershell -Command "(Get-Content src/features/admin/components/CompanyInfoEditor.tsx) -replace 'icon=', 'leftIcon=' | Set-Content src/features/admin/components/CompanyInfoEditor.tsx"
powershell -Command "(Get-Content src/features/admin/components/CompanyInfoEditor.tsx) -replace 'as=\"\"a\"\"', '' | Set-Content src/features/admin/components/CompanyInfoEditor.tsx"

REM Fix EffectiveSettingsView.tsx - change icon to leftIcon and remove searchValue prop
powershell -Command "(Get-Content src/features/admin/components/EffectiveSettingsView.tsx) -replace 'icon=', 'leftIcon=' | Set-Content src/features/admin/components/EffectiveSettingsView.tsx"
powershell -Command "(Get-Content src/features/admin/components/EffectiveSettingsView.tsx) -replace 'searchValue={searchValue}', '' | Set-Content src/features/admin/components/EffectiveSettingsView.tsx"
powershell -Command "(Get-Content src/features/admin/components/EffectiveSettingsView.tsx) -replace 'onSearchChange={setSearchValue}', '' | Set-Content src/features/admin/components/EffectiveSettingsView.tsx"

REM Fix SyncConfiguration.tsx - change icon to leftIcon
powershell -Command "(Get-Content src/features/admin/components/SyncConfiguration.tsx) -replace 'icon=', 'leftIcon=' | Set-Content src/features/admin/components/SyncConfiguration.tsx"

REM Fix ImportWizard.tsx - remove 'as' prop
powershell -Command "(Get-Content src/features/settings/components/ImportWizard.tsx) -replace 'as=\"\"a\"\"', '' | Set-Content src/features/settings/components/ImportWizard.tsx"

echo.
echo [2/3] Fixing type errors...

REM Fix PricingTiersManagement.tsx - remove unused storeId parameter
powershell -Command "(Get-Content src/features/admin/components/PricingTiersManagement.tsx) -replace ', storeId: string', '' | Set-Content src/features/admin/components/PricingTiersManagement.tsx"

REM Fix UnitsManagement.tsx - remove unused storeId parameter  
powershell -Command "(Get-Content src/features/admin/components/UnitsManagement.tsx) -replace ', storeId: string', '' | Set-Content src/features/admin/components/UnitsManagement.tsx"

echo.
echo [3/3] Running TypeScript compiler to check for remaining errors...
npm run build

echo.
echo Done!
pause
