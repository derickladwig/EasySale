# EasySale Runbook

**Last Updated**: 2026-01-29

Day-to-day operations guide for running and maintaining EasySale.

---

## Daily Operations

### Starting the System

#### Docker (Production)

```bash
# Start all services
docker-compose -p EasySale -f docker-compose.prod.yml up -d

# Verify services are running
docker-compose -p EasySale -f docker-compose.prod.yml ps

# Check health
curl http://localhost:8923/health
```

#### Docker (Development)

```bash
# Start with hot-reload
docker-compose -p EasySale up --build

# Or in background
docker-compose -p EasySale up -d --build
```

#### Local Development

**Terminal 1 - Backend:**
```bash
cd backend
cargo run
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### Stopping the System

```bash
# Docker
docker-compose -p EasySale -f docker-compose.prod.yml down

# Local - press Ctrl+C in each terminal
```

---

## Monitoring

### Health Checks

```bash
# Backend health
curl http://localhost:8923/health

# Expected response:
# {"status":"healthy","version":"0.1.0","uptime_seconds":123}

# Capabilities check
curl http://localhost:8923/api/capabilities
```

### Viewing Logs

```bash
# Docker logs (all services)
docker-compose -p EasySale -f docker-compose.prod.yml logs -f

# Backend only
docker logs EasySale-backend -f

# Frontend only
docker logs EasySale-frontend -f

# Last 100 lines
docker logs EasySale-backend --tail 100
```

### Log Levels

Set via `RUST_LOG` environment variable:
- `error` - Errors only
- `warn` - Warnings and errors
- `info` - General information (default)
- `debug` - Detailed debugging

```bash
# Change log level
RUST_LOG=debug cargo run
```

---

## Database Operations

### Backup

```bash
# Manual backup (SQLite)
cp data/pos.db data/pos.db.backup.$(date +%Y%m%d)

# Docker volume backup
docker cp EasySale-backend:/data/EasySale.db ./backup/
```

### Restore

```bash
# Stop services first
docker-compose -p EasySale -f docker-compose.prod.yml down

# Restore database
cp backup/EasySale.db data/pos.db

# Restart services
docker-compose -p EasySale -f docker-compose.prod.yml up -d
```

### Migration Commands

```bash
cd backend

# Verify migration status
cargo run --release -- verify-snapshots

# Run pending migrations (automatic on startup)
# Migrations are in backend/migrations/

# Rollback (if needed)
cargo run --release -- rollback-migration
```

---

## Configuration

### Tenant Configuration

Configuration files are in `configs/`:
- `default.json` - Default configuration
- `private/` - Tenant-specific (gitignored)
- `examples/` - Templates

```bash
# Create tenant config
cp configs/examples/retail-store.json configs/private/my-store.json

# Set tenant ID
export TENANT_ID=my-store
```

### Environment Variables

```bash
# View current environment
env | grep -E "(DATABASE|JWT|STORE|TENANT|API)"

# Set for current session
export JWT_SECRET="your-secret-here"
export STORE_ID="store-001"
export TENANT_ID="default"
```

---

## Testing

### Backend Tests

```bash
cd backend

# Run all tests
cargo test

# Run specific test
cargo test test_name

# Run with output
cargo test -- --nocapture
```

### Frontend Tests

```bash
cd frontend

# Run tests once (CI-safe)
npm run test:run

# Run with coverage
npm run test:coverage

# E2E tests
npm run test:e2e
```

### Code Quality

```bash
# Backend
cd backend
cargo fmt --check
cargo clippy --all-targets --all-features -- -D warnings

# Frontend
cd frontend
npm run lint
npm run format:check
npm run verify:no-mocks
```

---

## Deployment

### Build Production Images

```bash
# Windows
.\build-prod.bat

# Linux/Mac
./build-prod.sh
```

### Deploy to Production

```bash
# Pull latest code
git pull origin main

# Rebuild images
./build-prod.sh

# Restart services
docker-compose -p EasySale -f docker-compose.prod.yml down
docker-compose -p EasySale -f docker-compose.prod.yml up -d
```

### Rollback

```bash
# Stop current version
docker-compose -p EasySale -f docker-compose.prod.yml down

# Checkout previous version
git checkout <previous-commit>

# Rebuild and restart
./build-prod.sh
```

---

## Troubleshooting

### Service Won't Start

1. Check logs:
   ```bash
   docker logs EasySale-backend --tail 50
   ```

2. Verify environment:
   ```bash
   docker exec EasySale-backend env
   ```

3. Check database:
   ```bash
   docker exec EasySale-backend ls -la /data/
   ```

### Database Issues

**"Database is locked":**
```bash
# Stop all services
docker-compose -p EasySale -f docker-compose.prod.yml down

# Remove WAL files
rm data/pos.db-shm data/pos.db-wal

# Restart
docker-compose -p EasySale -f docker-compose.prod.yml up -d
```

**Migration failed:**
```bash
# Check migration logs
docker logs EasySale-backend | grep -i migration

# Verify database state
sqlite3 data/pos.db ".tables"
```

### Network Issues

**Port conflict:**
```bash
# Find process using port
netstat -tulpn | grep 8923

# Or on Windows
netstat -ano | findstr :8923
```

**CORS errors:**
- Check `VITE_API_URL` matches backend URL
- Verify backend CORS configuration

### Memory Issues

```bash
# Check container resources
docker stats EasySale-backend EasySale-frontend

# Increase limits in docker-compose.yml if needed
```

---

## Security

### Rotate JWT Secret

1. Generate new secret:
   ```bash
   openssl rand -base64 32
   ```

2. Update `.env`:
   ```
   JWT_SECRET=new-secret-here
   ```

3. Restart services (all users will be logged out)

### Change Admin Password

1. Login as admin
2. Navigate to Settings > Users
3. Edit admin user
4. Set new password

### Audit Logs

```bash
# View audit logs via API
curl -H "Authorization: Bearer <token>" \
  http://localhost:8923/api/audit-logs
```

---

## Performance

### Database Optimization

```bash
# Vacuum database (reclaim space)
sqlite3 data/pos.db "VACUUM;"

# Analyze for query optimization
sqlite3 data/pos.db "ANALYZE;"
```

### Cache Management

```bash
# Clear tenant cache via API
curl -X POST -H "Authorization: Bearer <token>" \
  http://localhost:8923/api/cache/clear
```

---

## Quick Reference

| Task | Command |
|------|---------|
| Start (Docker prod) | `docker-compose -p EasySale -f docker-compose.prod.yml up -d` |
| Stop (Docker) | `docker-compose -p EasySale -f docker-compose.prod.yml down` |
| View logs | `docker logs EasySale-backend -f` |
| Health check | `curl http://localhost:8923/health` |
| Run tests | `cargo test && npm run test:run` |
| Backup DB | `cp data/pos.db data/pos.db.backup` |

---

## Related Documentation

- [INSTALL.md](INSTALL.md) - Installation guide
- [../README.md](../README.md) - Project overview
- [../audit/COMMANDS_FOUND.md](../audit/COMMANDS_FOUND.md) - Complete command reference

---

*For issues not covered here, check [GitHub Issues](https://github.com/derickladwig/EasySale/issues)*
