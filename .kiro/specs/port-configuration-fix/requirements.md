# Requirements Document: Port Configuration Standardization

## Introduction

The CAPS POS system has inconsistent port configurations across Docker Compose, environment files, documentation, and application code. This creates confusion and prevents the system from running correctly. This spec will standardize all port configurations to use consistent, well-documented values.

## Glossary

- **Frontend**: React + Vite development server
- **Backend**: Rust API server  
- **Storybook**: Component documentation server
- **Docker_Compose**: Container orchestration configuration
- **Environment_File**: Configuration file containing environment variables

## Requirements

### Requirement 1: Standardize Development Ports

**User Story:** As a developer, I want consistent port numbers across all services, so that I can reliably access each service without confusion.

#### Acceptance Criteria

1. THE Frontend SHALL use port 7945 (unique, avoids conflicts with Vite default 5173)
2. THE Backend SHALL use port 8923 (unique, avoids conflicts with common ports 3000, 8000, 8001, 8080)
3. THE Storybook SHALL use port 7946 (unique, avoids conflicts with Storybook default 6006)
4. WHEN Docker containers are started, THE port mappings SHALL match the internal container ports (no port translation)
5. THE ports SHALL be documented in all relevant files (docker-compose.yml, .env.example, README.md, specs)

### Requirement 2: Update Docker Compose Configuration

**User Story:** As a developer, I want Docker Compose to use the correct ports, so that containers start without port conflicts.

#### Acceptance Criteria

1. THE docker-compose.yml SHALL map frontend to "7945:7945"
2. THE docker-compose.yml SHALL map backend to "8923:8923"  
3. THE docker-compose.yml SHALL map storybook to "7946:7946"
4. THE environment variables in docker-compose.yml SHALL reference the correct ports (VITE_API_URL=http://localhost:8923, API_PORT=8923)
5. WHEN containers start, THE services SHALL be accessible on their designated ports

### Requirement 3: Update Environment Files

**User Story:** As a developer, I want environment files to reflect the correct ports, so that configuration is consistent.

#### Acceptance Criteria

1. THE .env.example SHALL specify API_PORT=8923
2. THE .env.example SHALL specify VITE_PORT=7945
3. THE .env.example SHALL specify VITE_API_URL=http://localhost:8923
4. THE backend/rust/.env.example SHALL specify API_PORT=8923
5. THE frontend Vite configuration SHALL use port 7945
6. THE Storybook configuration SHALL use port 7946

### Requirement 4: Update Documentation

**User Story:** As a developer, I want documentation to show the correct ports, so that I know where to access each service.

#### Acceptance Criteria

1. THE README.md SHALL list correct ports for all services
2. THE DOCKER_SETUP.md SHALL reference correct ports
3. THE foundation spec design.md SHALL use correct ports in examples
4. THE PORT_UPDATE_COMPLETE.md SHALL be updated or removed (outdated)
5. WHEN a developer reads any documentation, THE port numbers SHALL be consistent

### Requirement 5: Update Application Code

**User Story:** As a developer, I want application code to use the correct ports, so that services can communicate properly.

#### Acceptance Criteria

1. THE frontend apiClient SHALL use the VITE_API_URL environment variable (http://localhost:8923)
2. THE backend main.rs SHALL read API_PORT from environment (8923)
3. THE Vite config SHALL use port 7945
4. THE Storybook config SHALL use port 7946
5. WHEN the application starts, THE services SHALL bind to their configured ports

### Requirement 6: Remove Conflicting Port References

**User Story:** As a developer, I want old/incorrect port references removed, so that there's no confusion about which ports to use.

#### Acceptance Criteria

1. THE system SHALL NOT reference port 5173 (Vite default, conflicts with other projects)
2. THE system SHALL NOT reference port 5174 (old migration attempt)
3. THE system SHALL NOT reference port 8001 (old migration attempt)
4. THE system SHALL NOT reference port 3000 (original backend port, conflicts with Node apps)
5. THE system SHALL NOT reference port 6006 (Storybook default, conflicts with other projects)
6. WHEN searching for port references, THE only ports found SHALL be 7945, 8923, and 7946

## Port Allocation Table

| Service | Port | URL | Notes |
|---------|------|-----|-------|
| Frontend (Vite) | 7945 | http://localhost:7945 | Unique port, avoids conflicts with default Vite (5173) and other dev servers |
| Backend (Rust API) | 8923 | http://localhost:8923 | Unique port, avoids conflicts with common ports (3000, 8000, 8001, 8080) |
| Storybook | 7946 | http://localhost:7946 | Unique port, avoids conflicts with default Storybook (6006) |

**Rationale for Port Selection:**
- **7945**: Uncommon port range, unlikely to conflict with other development tools
- **8923**: High port number, avoids all common API server ports
- **7946**: Adjacent to frontend port for easy memorization, avoids Storybook default

## Out of Scope

- Production port configuration (handled separately)
- SSL/TLS configuration
- Reverse proxy configuration
- Port configuration for other environments (staging, testing)
