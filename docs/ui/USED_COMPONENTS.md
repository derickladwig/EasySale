# Used Components Documentation

## Overview

This document lists the canonical UI components used in EasySale and where they are used.

## Layout Components

| Component | Location | Used In |
|-----------|----------|---------|
| `AppLayout` | `src/AppLayout.tsx` | App.tsx (all authenticated routes) |
| `AdminLayout` | `src/features/admin/components/AdminLayout.tsx` | Admin routes |
| `Navigation` | `src/common/components/Navigation.tsx` | AppLayout |
| `TopBar` | `src/AppLayout.tsx` (inline) | AppLayout |
| `ProfileMenu` | `src/common/components/molecules/ProfileMenu.tsx` | AppLayout header |

## Atoms

| Component | Location | Purpose |
|-----------|----------|---------|
| `Button` | `src/common/components/atoms/Button.tsx` | Primary action buttons |
| `Input` | `src/common/components/atoms/Input.tsx` | Form inputs |
| `Toggle` | `src/common/components/atoms/Toggle.tsx` | Boolean switches |
| `Badge` | `src/common/components/atoms/Badge.tsx` | Status indicators |
| `LogoWithFallback` | `src/common/components/atoms/LogoWithFallback.tsx` | Brand logo display |

## Molecules

| Component | Location | Purpose |
|-----------|----------|---------|
| `Card` | `src/common/components/molecules/Card.tsx` | Content containers |
| `EmptyState` | `src/common/components/molecules/EmptyState.tsx` | No data states |
| `EmptyDetailPane` | `src/common/components/molecules/EmptyDetailPane.tsx` | Empty detail views |
| `Toast` | `src/common/components/molecules/Toast.tsx` | Notifications |

## Organisms

| Component | Location | Purpose |
|-----------|----------|---------|
| `DataTable` | `src/common/components/organisms/DataTable.tsx` | Tabular data display |
| `LoadingSpinner` | `src/common/components/organisms/LoadingSpinner.tsx` | Loading states |
| `Alert` | `src/common/components/organisms/Alert.tsx` | Alert messages |
| `BottomNav` | `src/common/components/organisms/BottomNav.tsx` | Mobile navigation |

## Feature Components

### Admin
| Component | Location | Purpose |
|-----------|----------|---------|
| `IntegrationCard` | `src/features/admin/components/IntegrationCard.tsx` | Integration status cards |
| `SetupWizardPage` | `src/features/admin/pages/SetupWizardPage.tsx` | First-run wizard |
| `WizardCompletionScreen` | `src/features/admin/components/wizard/WizardCompletionScreen.tsx` | Setup complete |

### Auth
| Component | Location | Purpose |
|-----------|----------|---------|
| `LoginPage` | `src/features/auth/pages/LoginPage.tsx` | User login |
| `AccessDeniedPage` | `src/features/auth/pages/AccessDeniedPage.tsx` | Permission denied |

### Documents
| Component | Location | Purpose |
|-----------|----------|---------|
| `DocumentsPage` | `src/features/documents/pages/DocumentsPage.tsx` | Document management |
| `DocumentTable` | `src/features/documents/components/DocumentTable.tsx` | Document list |

### Exports
| Component | Location | Purpose |
|-----------|----------|---------|
| `ExportsPage` | `src/features/exports/pages/ExportsPage.tsx` | Export management |

## Route Guards

| Component | Location | Purpose |
|-----------|----------|---------|
| `RequireAuth` | `src/common/components/RequireAuth.tsx` | Authentication guard |
| `RequirePermission` | `src/common/components/RequirePermission.tsx` | Permission guard |
| `RequireSetup` | `src/common/components/RequireSetup.tsx` | Setup completion guard |

## Contexts

| Context | Location | Purpose |
|---------|----------|---------|
| `AuthContext` | `src/common/contexts/AuthContext.tsx` | Authentication state |
| `PermissionsContext` | `src/common/contexts/PermissionsContext.tsx` | User permissions |
| `CapabilitiesContext` | `src/common/contexts/CapabilitiesContext.tsx` | Feature capabilities |
| `TenantSetupContext` | `src/common/contexts/TenantSetupContext.tsx` | Setup status |
| `ConfigContext` | `src/config/ConfigContext.tsx` | App configuration |
| `ThemeContext` | `src/config/ThemeContext.tsx` | Theme management |

## Requirements Validated

- **13.1**: Canonical components documented with usage locations
