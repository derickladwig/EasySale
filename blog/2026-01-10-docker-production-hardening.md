# Docker Production Hardening: From Hackathon Chaos to Production Ready

**Date:** January 10, 2026
**Session:** 10
**Mood:** 🎉 Finally clean!

## The Problem

After the hackathon sprint, our Docker setup was a mess:
- Network named `dynamous-kiro-hackathon_caps-network` (embarrassing)
- Volumes with hackathon prefixes everywhere
- SQL migrations failing with cryptic "no such table" errors
- OpenSSL linking errors in Docker builds
- Bat files that worked once but broke on every subsequent run

## What We Fixed

### 1. The SQL Parser Bug (The Sneaky One)

The migration was failing with:
```
no such table: main.users - SQL: CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
```

Wait, what? The CREATE TABLE should have run first!

Turns out our SQL parser was splitting on semicolons inside parentheses:
```sql
created_at TEXT NOT NULL DEFAULT (datetime('now'));  -- Split here incorrectly!
```

The parser saw the `;` inside `datetime('now')` and split the CREATE TABLE statement in half. The fix was tracking parenthesis depth:

```rust
} else if c == ';' && paren_depth == 0 {
    // Only split when not inside parentheses
    statements.push(current.trim().to_string());
    current.clear();
}
```

Also added: only record migration as "applied" AFTER all statements succeed. No more corrupted database state.

### 2. OpenSSL Static Linking (The Docker Killer)

Docker builds were failing with OpenSSL linking errors. The fix was simple - switch from `native-tls` to `rustls`:

```toml
# Before (requires OpenSSL dev packages)
reqwest = { version = "0.11", features = ["native-tls", "json"] }

# After (pure Rust, no system dependencies)
reqwest = { version = "0.11", default-features = false, features = ["rustls-tls", "json"] }
```

### 3. Unified Naming Convention (The Cleanup)

Everything now uses `caps-pos-*` prefix with explicit names:

| Resource | Old Name | New Name |
|----------|----------|----------|
| Network | `dynamous-kiro-hackathon_caps-network` | `caps-pos-network` |
| Data Volume | `dynamous-kiro-hackathon_pos-data` | `caps-pos-data` |
| Frontend (prod) | `caps-pos-frontend-prod` | `caps-pos-frontend` |
| Frontend (dev) | `caps-pos-frontend` | `caps-pos-frontend-dev` |

The key was using explicit `name:` properties in docker-compose:
```yaml
networks:
  caps-pos-network:
    name: caps-pos-network  # No more auto-prefixing!
```

### 4. Robust Bat Files (The Universal Fix)

Every bat file now:
1. Cleans up legacy hackathon resources automatically
2. Checks prerequisites (Docker running, files exist, ports available)
3. Waits for health checks, not just container start
4. Gives clear error messages with solutions
5. Pauses so you can actually read the output

## The Lesson

Docker naming matters more than you think. When you're in hackathon mode, you don't care that your network is called `dynamous-kiro-hackathon_caps-network`. But when you're trying to debug why containers can't talk to each other, or why volumes persist between "clean" rebuilds, that naming chaos becomes a nightmare.

Always use explicit names. Always clean up legacy resources. Always wait for health checks.

## Files Changed

- `docker-compose.yml` - Development environment with proper naming
- `docker-compose.prod.yml` - Production environment (already had good naming)
- `build-prod.bat/sh` - Added legacy cleanup, health waiting
- `docker-start.bat/sh` - Added legacy cleanup, port checks
- `docker-stop.bat/sh` - Simplified with proper cleanup
- `docker-clean.bat/sh` - Removes ALL resources including legacy
- `backend/rust/src/db/migrations.rs` - Fixed SQL parser
- `backend/rust/Cargo.toml` - Switched to rustls

## What's Next

With Docker finally production-ready, we can focus on:
1. VIN lookup integration
2. Offline sync service
3. Actually shipping this thing

---

*"The best time to fix your Docker naming was at the start. The second best time is now."*
