# Development Options - Docker vs Native

You have **two ways** to run EasySale for development:

## Option 1: Docker Development (Recommended for Testing)

**Use this for:** Full system testing, deployment simulation, isolated environment

### Start Everything:
```bash
docker-start.bat
```

This runs:
- Frontend in Docker container (port 7945)
- Backend in Docker container (port 8923)
- Isolated from your local machine
- Uses Docker volumes for data persistence

### Advantages:
- ✅ Matches production environment
- ✅ No need to install Rust/Node locally
- ✅ Isolated - won't conflict with other projects
- ✅ Easy to clean up and rebuild

### Disadvantages:
- ❌ Slower builds (Docker overhead)
- ❌ Harder to debug
- ❌ Requires Docker Desktop running

---

## Option 2: Native Development (Recommended for Active Development)

**Use this for:** Active coding, debugging, faster iteration

### Start Backend (Terminal 1):
```bash
start-backend.bat
```

This runs:
- Rust backend directly on your machine
- Uses local Rust toolchain
- Faster compilation with incremental builds
- Direct access to logs and debugger

### Start Frontend (Terminal 2):
```bash
start-frontend.bat
```

This runs:
- Vite dev server directly on your machine
- Hot module replacement (instant updates)
- Faster than Docker
- Direct access to browser dev tools

### Advantages:
- ✅ Much faster development cycle
- ✅ Hot reload works perfectly
- ✅ Easy to debug with IDE
- ✅ Incremental compilation (Rust)
- ✅ No Docker overhead

### Disadvantages:
- ❌ Requires Rust and Node.js installed locally
- ❌ May have environment differences from production
- ❌ Need to manage two terminal windows

---

## Requirements for Each Option

### Docker Development:
- Docker Desktop installed and running
- That's it!

### Native Development:
- **Rust:** 1.75+ with cargo
- **Node.js:** 18+ with npm
- **SQLite:** 3.35+ (usually included with Rust)

---

## Which Should You Use?

### Use Docker (`docker-start.bat`) when:
- Testing the full system
- Verifying deployment configuration
- You don't have Rust/Node installed
- You want a clean, isolated environment
- You're doing final testing before deployment

### Use Native (`start-backend.bat` + `start-frontend.bat`) when:
- Actively writing code
- Debugging issues
- Making frequent changes
- You want fast feedback loops
- You're developing features

---

## Current Status

### Docker Development:
- ✅ Configuration correct (docker-compose.yml)
- ✅ TypeScript errors fixed
- ✅ Frontend builds successfully
- ✅ Ready to use with `docker-start.bat`

### Native Development:
- ✅ Backend script loads .env correctly
- ✅ Frontend script ready
- ✅ TypeScript errors fixed
- ✅ Ready to use with separate terminals

---

## Quick Start Guide

### For Docker:
```bash
# One command starts everything
docker-start.bat

# Open browser
http://localhost:7945

# Login: admin / admin123
```

### For Native:
```bash
# Terminal 1 - Backend
start-backend.bat

# Terminal 2 - Frontend  
start-frontend.bat

# Open browser
http://localhost:7945

# Login: admin / admin123
```

---

## Troubleshooting

### Docker Issues:
- Make sure Docker Desktop is running
- Check ports 7945 and 8923 are free
- Use `docker-clean.bat` to reset

### Native Issues:
- Make sure Rust is installed: `cargo --version`
- Make sure Node is installed: `node --version`
- Check .env file exists at project root
- Make sure ports 7945 and 8923 are free

---

## My Recommendation

**For your current situation:**

Since you're testing if the login works after all the fixes, I recommend:

1. **First try Docker** (`docker-start.bat`) to verify everything works in a clean environment
2. **Then switch to Native** for ongoing development work

This way you confirm the Docker setup works, then use the faster native development for daily work.

---

## Summary

| Feature | Docker | Native |
|---------|--------|--------|
| **Command** | `docker-start.bat` | `start-backend.bat` + `start-frontend.bat` |
| **Speed** | Slower | Faster |
| **Setup** | Just Docker | Rust + Node required |
| **Debugging** | Harder | Easier |
| **Hot Reload** | Works | Works better |
| **Isolation** | Complete | None |
| **Best For** | Testing/Deployment | Active Development |

**Both are ready to use!** Choose based on what you're doing right now.
