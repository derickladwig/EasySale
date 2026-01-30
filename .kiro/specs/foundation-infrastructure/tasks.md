# Implementation Plan: Foundation Infrastructure

## Overview

This implementation plan establishes the foundational infrastructure for the CAPS POS system. The approach follows a "structure prevents chaos" philosophy: by building rigid layout contracts, feature-based organization, and a comprehensive design system upfront, we prevent the code duplication and complexity that plague growing applications.

The implementation is organized into discrete tasks that build incrementally, with each task producing working, testable code. Testing tasks are marked as optional (*) to allow for faster MVP delivery while maintaining the option for comprehensive test coverage.

## Tasks

- [x] 1. Initialize monorepo structure and development environment
  - Create root directory structure with frontend/, backend/rust/, sync/, backup/, installer/, docs/
  - Initialize package managers: npm/pnpm for frontend, Cargo workspace for Rust, poetry/pip for Python
  - Create root README.md explaining directory structure and navigation
  - Set up .gitignore for each language/framework
  - Create .env.example with all required environment variables documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1_

- [x] 1.1 Configure linting and formatting tools

  - Set up ESLint + Prettier for TypeScript with pre-commit hooks
  - Configure rustfmt + clippy for Rust
  - Configure black + flake8 for Python
  - Add Husky pre-commit hooks to run formatters and linters
  - _Requirements: 2.4, 8.1, 8.2, 8.5_

- [x] 2. Set up frontend build system and base configuration
  - Initialize React + TypeScript project with Vite
  - Configure Tailwind CSS with design tokens (colors, spacing, typography, breakpoints)
  - Set up tsconfig.json with strict mode enabled
  - Configure path aliases (@common, @features, @domains, @assets)
  - Create vite.config.ts with environment variable handling
  - _Requirements: 2.1, 2.3, 3.1, 8.3_

- [x] 2.1 Configure frontend testing infrastructure

  - Set up Vitest with React Testing Library
  - Create test setup file with global mocks and utilities
  - Configure coverage reporting (80% threshold for business logic, 60% for UI)
  - Add test scripts to package.json
  - _Requirements: 6.1, 6.5, 6.7_

- [x] 3. Set up backend Rust API structure
  - Initialize Cargo workspace with actix-web
  - Configure sqlx for SQLite with compile-time checked queries
  - Set up project structure: handlers/, models/, db/, config/
  - Create Cargo.toml with required dependencies (actix-web, sqlx, serde, jsonwebtoken, argon2)
  - Configure environment variable loading with dotenv
  - _Requirements: 1.1, 1.2, 1.5, 2.1_

- [x] 3.1 Configure backend testing infrastructure

  - Set up Cargo test configuration
  - Create test utilities for mock database and fixtures
  - Add integration test structure
  - _Requirements: 6.2, 6.5_

- [x] 4. Create design system foundation
  - Define design tokens in tailwind.config.js (colors, spacing, typography)
  - Create base components directory structure: common/components/
  - Implement Button component with variants (primary, secondary, ghost, danger)
  - Implement Input component with validation states
  - Implement Select component (single, searchable)
  - Implement Card component with header/body/footer slots
  - _Requirements: 3.1, 3.2, 3.7, 3.8_

- [x] 4.1 Implement additional base components
  - Create Table component (sortable, filterable foundation)
  - Create Modal component with size variants
  - Create Toast component for notifications
  - Create Badge component for status indicators
  - Create Tabs component for secondary navigation
  - _Requirements: 3.2, 3.7_

- [x] 4.2 Set up Storybook for component documentation

  - Initialize Storybook in frontend project
  - Create stories for all base components
  - Configure Storybook with Tailwind CSS
  - Add accessibility addon for WCAG compliance checks
  - _Requirements: 3.6, 3.7_

- [x] 5. Create layout system and AppShell
  - Implement AppShell component (TopBar + LeftNav + MainWorkspace + RightContextPanel)
  - Create PageHeader layout primitive
  - Create SplitPane layout primitive with resizable divider
  - Create Panel layout primitive
  - Create FormLayout layout primitive
  - Enforce layout contract: pages cannot define outer grid structure
  - _Requirements: 3.3, 3.4, 3.5_

- [x] 5.1 Write unit tests for layout components

  - Test AppShell renders all sections correctly
  - Test SplitPane resizing behavior
  - Test layout primitives enforce spacing tokens
  - _Requirements: 6.1, 6.7_

- [x] 6. Implement feature-based directory structure
  - Create features/ directory with subdirectories: sell/, lookup/, warehouse/, customers/, reporting/, admin/
  - Create common/ directory with subdirectories: components/, layouts/, contexts/, utils/
  - Create domains/ directory with subdirectories: cart/, pricing/, stock/, auth/, documents/
  - Add index.ts files with public exports for each feature
  - Create feature template documentation showing structure
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 6.1 Configure module boundary enforcement

  - Add ESLint rules to prevent feature-to-feature imports
  - Configure import path restrictions
  - Add linting check to CI pipeline
  - _Requirements: 4.6, 4.7, 8.2_

- [x] 7. Implement authentication and permissions system
  - Create User and Role models in Rust backend
  - Implement JWT token generation and validation
  - Create permissions enum with all required permissions
  - Implement role-to-permissions mapping
  - Create authentication endpoints: POST /auth/login, POST /auth/logout, GET /auth/me
  - _Requirements: 9.1, 9.2_

- [x] 7.1 Create frontend authentication context
  - Implement AuthContext with login/logout/getCurrentUser methods
  - Create useAuth hook for components
  - Implement PermissionsContext with hasPermission/hasAnyPermission methods
  - Create usePermissions hook
  - Store JWT in httpOnly cookies (not localStorage)
  - _Requirements: 9.1, 9.2_

- [x]* 7.2 Write authentication tests
  - Test JWT generation and validation
  - Test permission checks for all roles
  - Test unauthorized access returns 403
  - Test token expiration handling
  - _Requirements: 6.2, 6.5_

- [x] 8. Implement route guards and role-based navigation
  - Create RequirePermission component for route protection
  - Implement route guards in React Router
  - Create navigation configuration with permission requirements
  - Implement dynamic navigation menu that filters by user permissions
  - Add redirect logic for unauthorized access (login or access denied page)
  - _Requirements: 9.2, 9.3, 9.4, 9.5_

- [x]* 8.1 Write route guard tests
  - Test unauthorized users redirected to login
  - Test users without permission see access denied
  - Test navigation items filtered correctly by role
  - _Requirements: 6.1, 6.5_

- [x] 9. Set up Docker development environment
  - Create docker-compose.yml with services: frontend, backend, storybook
  - Create Dockerfile.dev for frontend with hot reload
  - Create Dockerfile.dev for Rust backend with cargo watch
  - Configure volume mounts for live code updates
  - Document docker-compose commands in README
  - _Requirements: 2.2, 2.3_

- [x] 10. Implement CI/CD pipeline
  - Create GitHub Actions workflow (or equivalent) for CI
  - Add frontend job: install deps, lint, test, build
  - Add backend job: format check, clippy, test, build
  - Add E2E test job (runs after frontend and backend)
  - Configure pipeline to run on push and pull requests
  - Prevent merging if any job fails
  - _Requirements: 5.4, 6.6, 8.5, 8.6_

- [x] 10.1 Configure code coverage reporting

  - Add coverage collection to test jobs
  - Configure coverage thresholds (80% business logic, 60% UI)
  - Add coverage badge to README
  - _Requirements: 6.7, 8.4_

- [x] 11. Create database schema and migrations
  - Design SQLite schema for users, roles, permissions, sessions
  - Create initial migration scripts using sqlx or Diesel
  - Add indexes for frequent queries
  - Create seed data for default roles and permissions
  - Document schema in docs/architecture/database.md
  - _Requirements: 1.1, 2.1_

- [x] 11.1 Write database integration tests

  - Test migrations run successfully on empty database
  - Test CRUD operations for all tables
  - Test referential integrity constraints
  - _Requirements: 6.2, 6.5_

- [x] 12. Implement error handling infrastructure
  - Create ErrorBoundary component for React
  - Implement centralized API error handling in apiClient.ts
  - Create error logging utility
  - Implement user-friendly error toast notifications
  - Add error tracking configuration (placeholder for future monitoring service)
  - _Requirements: 7.1, 7.2_

- [x] 12.1 Write error handling tests

  - Test ErrorBoundary catches and displays errors
  - Test API errors show appropriate toasts
  - Test error logging captures context
  - _Requirements: 6.1, 6.5_

- [x] 13. Create documentation structure
  - Create docs/ directory with subdirectories: architecture/, api/, user-guides/
  - Write docs/architecture/overview.md with high-level system architecture
  - Write docs/architecture/data-flow.md explaining data flow
  - Create API documentation template
  - Set up automated API doc generation from code comments
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 14. Implement asset management system
  - Create assets/ directory with subdirectories: images/, icons/, styles/, labels/
  - Configure Vite asset loading and optimization
  - Set up SVG icon library (Lucide or similar)
  - Configure image optimization during build
  - Document asset organization in README
  - _Requirements: 10.1, 10.2, 10.3, 10.5_

- [x] 15. Create build and deployment scripts
  - Create production build scripts for frontend (npm run build)
  - Create production build scripts for backend (cargo build --release)
  - Configure multi-stage Docker builds for production images
  - Create deployment documentation in docs/deployment.md
  - Set up environment-specific configuration (.env.development, .env.production templates)
  - _Requirements: 5.1, 5.2, 5.3, 5.5_

- [x] 15.1 Configure Playwright for E2E testing

  - Initialize Playwright in frontend project
  - Create E2E test structure and utilities
  - Write sample E2E test for login flow
  - Add E2E test script to package.json
  - _Requirements: 6.4, 6.5_

- [x] 16. Implement logging and monitoring infrastructure
  - Create structured logging utility for frontend (logger.ts)
  - Configure tracing crate for Rust backend
  - Implement health check endpoint (GET /health)
  - Add logging for authentication events
  - Document logging format and levels
  - _Requirements: 7.1, 7.2_

- [x] 17. Implement security hardening
  - Configure Content Security Policy headers in Vite
  - Implement input sanitization utilities
  - Configure JWT token expiration (8 hours)
  - Set up password hashing with Argon2
  - Add dependency scanning to CI (npm audit, cargo audit)
  - Document security practices in docs/architecture/security.md
  - _Requirements: 8.1, 8.2, 8.3_

- [x]* 17.1 Write security tests
  - Test CSP headers are set correctly
  - Test input sanitization prevents XSS
  - Test password hashing works correctly
  - Test JWT tokens expire as expected
  - _Requirements: 6.2, 6.5_

- [x] 18. Create installer framework structure
  - Create installer/ directory with subdirectories for server and client installers
  - Design installer workflow: server setup, database initialization, device registration
  - Create placeholder scripts for Windows/Linux installation
  - Document installer requirements and flow
  - _Requirements: 1.1, 2.1_

- [x] 19. Final integration and documentation
  - Verify all components integrate correctly in AppShell
  - Test authentication flow end-to-end
  - Test role-based navigation works for all roles
  - Update README with complete setup instructions
  - Create developer onboarding guide
  - Document all environment variables
  - _Requirements: 1.4, 2.3, 7.3, 7.4_

- [x] 20. Checkpoint - Foundation complete
  - Ensure all tests pass
  - Verify build succeeds for frontend and backend
  - Confirm Docker environment works
  - Verify CI pipeline passes
  - Review documentation completeness
  - Ask the user if questions arise or if ready to proceed to feature development

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- The foundation must be solid before building domain features (sales, inventory, etc.)
- Testing infrastructure is set up early but comprehensive test writing is optional
- Focus on creating the structure and patterns that prevent future chaos
- All tasks build incrementally - each produces working, testable code
