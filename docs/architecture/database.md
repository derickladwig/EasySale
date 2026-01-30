# Database Schema Documentation

## Overview

The CAPS POS system uses SQLite as its local database for offline-first operation. This document describes the database schema, relationships, and design decisions.

## Database Technology

- **Database**: SQLite 3.35+
- **ORM**: SQLx (compile-time checked queries)
- **Migrations**: SQL migration files in `backend/rust/migrations/`

## Schema Design

### Users Table

Stores user accounts and authentication information.

```sql
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

**Fields:**
- `id`: UUID string, primary key
- `username`: Unique username for login
- `email`: Unique email address
- `password_hash`: Argon2 hashed password
- `role`: User role (admin, manager, cashier, etc.)
- `first_name`, `last_name`: Optional user name fields
- `is_active`: Boolean flag (1 = active, 0 = inactive)
- `created_at`, `updated_at`: ISO 8601 timestamp strings

**Indexes:**
- `idx_users_username` on `username`
- `idx_users_email` on `email`
- `idx_users_role` on `role`

**Roles:**
- `admin`: Full system access
- `manager`: Store management access
- `cashier`: Point-of-sale access
- `specialist`: Specialized lookup and inventory access
- `inventory_clerk`: Warehouse access
- `technician`: Service order access

### Sessions Table

Manages JWT authentication sessions.

```sql
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**Fields:**
- `id`: UUID string, primary key
- `user_id`: Foreign key to users table
- `token`: JWT token string (unique)
- `expires_at`: ISO 8601 timestamp when token expires
- `created_at`: ISO 8601 timestamp when session was created

**Indexes:**
- `idx_sessions_token` on `token`
- `idx_sessions_user_id` on `user_id`
- `idx_sessions_expires_at` on `expires_at`

**Relationships:**
- `user_id` → `users.id` (CASCADE DELETE)

## Data Types

### Text Fields
All text fields use SQLite's TEXT type. Dates and timestamps are stored as ISO 8601 strings for portability.

### Boolean Fields
Boolean values are stored as INTEGER (0 = false, 1 = true) following SQLite conventions.

### Primary Keys
All primary keys use UUID strings (TEXT type) for distributed system compatibility.

## Migrations

### Migration Files

Migration files are located in `backend/rust/migrations/` and are numbered sequentially:

- `001_initial_schema.sql` - Initial users and sessions tables

### Running Migrations

Migrations run automatically on application startup via `db::migrations::run_migrations()`.

### Creating New Migrations

1. Create a new file: `migrations/NNN_description.sql`
2. Add the migration to `src/db/migrations.rs`
3. Test the migration on a development database

## Seed Data

The initial migration includes seed data for testing:

**Default Users:**
- Username: `admin`, Password: `admin123`, Role: `admin`
- Username: `cashier`, Password: `cashier123`, Role: `cashier`
- Username: `manager`, Password: `manager123`, Role: `manager`

**⚠️ Security Note:** Change default passwords in production!

## Indexes and Performance

### Query Optimization

Indexes are created on frequently queried fields:
- User lookups by username/email (login)
- Session lookups by token (authentication)
- User filtering by role (permissions)

### Expected Query Patterns

- **Authentication**: Lookup user by username, validate session by token
- **Authorization**: Check user role and permissions
- **Session Management**: Create, validate, and delete sessions

## Backup and Recovery

### Backup Strategy

- **Local Backups**: Daily SQLite file copy to network storage
- **Cloud Backups**: Weekly backup to cloud storage
- **Retention**: 30 days local, 1 year cloud

### Recovery Procedures

1. Stop the application
2. Replace database file with backup
3. Restart the application
4. Verify data integrity

## Future Schema Extensions

Planned tables for future features:

- `products` - Product catalog
- `inventory` - Stock levels and locations
- `transactions` - Sales and returns
- `customers` - Customer information
- `orders` - Service orders and quotes
- `audit_logs` - System audit trail

## Database Maintenance

### Vacuum

Run `VACUUM` periodically to reclaim space:
```sql
VACUUM;
```

### Analyze

Update query planner statistics:
```sql
ANALYZE;
```

### Integrity Check

Verify database integrity:
```sql
PRAGMA integrity_check;
```

## Connection Management

- **Pool Size**: 5 connections (configurable)
- **Connection Timeout**: 30 seconds
- **Idle Timeout**: 10 minutes
- **Max Lifetime**: 30 minutes

## Security Considerations

### Password Storage
- Passwords hashed with Argon2id
- Salt generated per password
- Memory cost: 19456 KB
- Time cost: 2 iterations
- Parallelism: 1 thread

### SQL Injection Prevention
- All queries use parameterized statements
- SQLx provides compile-time query validation
- No dynamic SQL construction

### Access Control
- Database file permissions: 600 (owner read/write only)
- Connection requires file system access
- No network exposure (local SQLite file)

## Troubleshooting

### Common Issues

**Database Locked:**
- Cause: Multiple processes accessing database
- Solution: Ensure only one application instance runs

**Disk Full:**
- Cause: Insufficient disk space
- Solution: Free disk space or move database

**Corruption:**
- Cause: Unexpected shutdown, disk failure
- Solution: Restore from backup

### Diagnostic Queries

**Check database size:**
```sql
SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size();
```

**List all tables:**
```sql
SELECT name FROM sqlite_master WHERE type='table';
```

**Count records:**
```sql
SELECT 'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'sessions', COUNT(*) FROM sessions;
```
