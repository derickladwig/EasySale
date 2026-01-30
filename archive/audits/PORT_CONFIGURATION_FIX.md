# Port Configuration Fix

## Summary
Fixed login fetch errors and port conflicts by updating all configuration files to use unique, non-conflicting ports.

## Changes Made

### Port Assignments (New)
- **Frontend (Vite)**: Port 5174 (was 5173)
- **Backend (Rust API)**: Port 8001 (was 3000)
- **Storybook**: Port 6007 (was 6006)

### Files Updated

1. **docker-compose.yml**
   - Frontend port: 5173 → 5174
   - Backend port: 3000 → 8001
   - Storybook port: 6006 → 6007
   - Updated VITE_API_URL environment variable

2. **frontend/src/common/utils/apiClient.ts**
   - Fixed default API URL: 8080 → 8001
   - This was causing the "Failed to fetch" error on login

3. **frontend/vite.config.ts**
   - Updated default port: 5173 → 5174
   - Updated default API URL: 3000 → 8001
   - Enhanced CSP to allow 127.0.0.1 connections

4. **backend/rust/src/main.rs**
   - Updated CORS configuration to be more specific
   - Added explicit allowed origins for localhost:5174 and 127.0.0.1:5174
   - Added credentials support

5. **.env**
   - API_PORT: 3000 → 8001
   - API_BASE_URL: http://localhost:3000 → http://localhost:8001
   - VITE_PORT: 5173 → 5174
   - VITE_API_URL: http://localhost:3000 → http://localhost:8001

6. **.env.example**
   - Same changes as .env for consistency

## Why These Ports?

- **Port 8001**: Less commonly used than 3000, 8000, 8080
- **Port 5174**: Avoids conflict with default Vite (5173) and other dev servers
- **Port 6007**: Avoids conflict with default Storybook (6006)

## Root Cause of Login Failure

The API client was hardcoded to use `http://localhost:8080` as the default, but:
1. The backend was running on port 3000 (in docker-compose)
2. The environment variable wasn't being passed correctly
3. This caused all API requests (including login) to fail with "Failed to fetch"

## Testing

After these changes:
1. Stop all running containers: `docker-compose down`
2. Rebuild containers: `docker-compose build`
3. Start containers: `docker-compose up`
4. Access frontend at: http://localhost:5174
5. Backend API at: http://localhost:8001
6. Test login with default credentials:
   - Username: admin
   - Password: admin123

## Additional Notes

- All ports are now configurable via environment variables
- CORS is properly configured to allow frontend-backend communication
- CSP headers allow both localhost and 127.0.0.1 for flexibility
- Ports are chosen to minimize conflicts with common development tools
