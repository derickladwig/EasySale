# Port Migration Plan - Unique Ports

## New Port Assignments

- **Frontend (Vite)**: Port **7945**
- **Backend (Rust API)**: Port **8923**
- **Storybook**: Port **7946**

These ports are chosen to be:
- High enough to avoid system/common ports
- Unique enough to avoid conflicts
- Easy to remember (sequential for frontend/storybook)

## Files to Update

### 1. Configuration Files
- [ ] `docker-compose.yml`
- [ ] `docker-compose.prod.yml`
- [ ] `.env`
- [ ] `.env.example`

### 2. Frontend Files
- [ ] `frontend/vite.config.ts`
- [ ] `frontend/src/common/utils/apiClient.ts`
- [ ] `frontend/src/common/contexts/AuthContext.tsx`
- [ ] `frontend/nginx.conf`

### 3. Backend Files
- [ ] `backend/rust/src/main.rs` (CORS config)
- [ ] `backend/rust/Dockerfile`

### 4. Documentation Files
- [ ] `README.md`
- [ ] `README.old.md`
- [ ] `DOCKER_SETUP.md`
- [ ] `docs/api/README.md`
- [ ] `docs/architecture/deployment.md`
- [ ] `docs/architecture/overview.md`
- [ ] `examples/README.md`

### 5. Summary/Task Files
- [ ] `TASK_9_SUMMARY.md`
- [ ] `PORT_CONFIGURATION_FIX.md`
- [ ] `QUICK_FIX_SUMMARY.md`

### 6. Spec Files
- [ ] `.kiro/specs/foundation-infrastructure/design.md`

## Migration Steps

1. Update all configuration files
2. Update all code files
3. Update all documentation
4. Update all specs and plans
5. Test the changes
6. Create restart scripts

## Testing Checklist

- [ ] Backend starts on port 8923
- [ ] Frontend starts on port 7945
- [ ] Frontend can connect to backend
- [ ] Login works without errors
- [ ] Health check accessible at http://localhost:8923/health
- [ ] Storybook accessible at http://localhost:7946
