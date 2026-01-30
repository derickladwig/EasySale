# Docker Development Environment

## Overview

This Docker setup provides a complete development environment for the CAPS POS system with hot reload for both frontend and backend.

## Prerequisites

- Docker Desktop (Windows/Mac) or Docker Engine + Docker Compose (Linux)
- Minimum 4GB RAM allocated to Docker
- Minimum 20GB disk space

### Installation

**Windows:**
1. Download Docker Desktop from https://www.docker.com/products/docker-desktop
2. Install and restart your computer
3. Ensure WSL 2 is enabled (Docker Desktop will prompt if needed)

**Mac:**
1. Download Docker Desktop from https://www.docker.com/products/docker-desktop
2. Install and start Docker Desktop

**Linux:**
```bash
# Install Docker Engine
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

## Services

The Docker Compose setup includes three services:

1. **Frontend** (React + Vite)
   - Port: 7945
   - Hot reload enabled
   - Accessible at http://localhost:7945

2. **Backend** (Rust + Actix Web)
   - Port: 8923
   - Hot reload with cargo-watch
   - Accessible at http://localhost:8923

3. **Storybook** (Component Documentation)
   - Port: 7946
   - Hot reload enabled
   - Accessible at http://localhost:7946

## Quick Start

### First Time Setup

1. **Clone the repository** (if not already done)
   ```bash
   git clone <repository-url>
   cd caps-pos
   ```

2. **Create environment files**
   ```bash
   # Root .env file
   cp .env.example .env
   
   # Backend .env file
   cp backend/rust/.env.example backend/rust/.env
   ```

3. **Build and start all services**
   ```bash
   docker-compose up --build
   ```

   This will:
   - Build Docker images for all services
   - Install dependencies
   - Start development servers
   - Enable hot reload

4. **Wait for services to start**
   - Frontend: Watch for "Local: http://localhost:7945"
   - Backend: Watch for "Starting server on 0.0.0.0:8923"
   - Storybook: Watch for "Storybook started"

5. **Access the application**
   - Frontend: http://localhost:7945
   - Backend API: http://localhost:8923
   - Storybook: http://localhost:7946

### Daily Development

**Start all services:**
```bash
docker-compose up
```

**Start specific service:**
```bash
docker-compose up frontend
docker-compose up backend
docker-compose up storybook
```

**Start in background (detached mode):**
```bash
docker-compose up -d
```

**View logs:**
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f frontend
docker-compose logs -f backend
```

**Stop all services:**
```bash
docker-compose down
```

**Stop and remove volumes (clean slate):**
```bash
docker-compose down -v
```

## Development Workflow

### Making Code Changes

1. **Edit files locally** - Changes are automatically synced to containers via volume mounts
2. **Hot reload** - Both frontend and backend will automatically reload on changes
3. **View changes** - Refresh browser to see frontend changes, API changes are immediate

### Running Commands Inside Containers

**Frontend commands:**
```bash
# Install new npm package
docker-compose exec frontend npm install <package-name>

# Run tests
docker-compose exec frontend npm test

# Run linter
docker-compose exec frontend npm run lint

# Format code
docker-compose exec frontend npm run format
```

**Backend commands:**
```bash
# Add new Rust dependency
docker-compose exec backend cargo add <crate-name>

# Run tests
docker-compose exec backend cargo test

# Run clippy
docker-compose exec backend cargo clippy

# Format code
docker-compose exec backend cargo fmt
```

### Database Management

The SQLite database is stored in `./data/pos.db` and is mounted into the backend container.

**Run migrations:**
```bash
docker-compose exec backend cargo sqlx migrate run
```

**Create new migration:**
```bash
docker-compose exec backend cargo sqlx migrate add <migration_name>
```

**Reset database:**
```bash
# Stop backend
docker-compose stop backend

# Delete database file
rm -f data/pos.db

# Start backend (will recreate database)
docker-compose up backend
```

## Troubleshooting

### Port Already in Use

If you see "port is already allocated" errors:

1. **Check what's using the port:**
   ```bash
   # Windows
   netstat -ano | findstr :7945
   netstat -ano | findstr :8923
   
   # Mac/Linux
   lsof -i :7945
   lsof -i :8923
   ```

2. **Stop the conflicting process or change ports in docker-compose.yml**

### Container Won't Start

1. **Check logs:**
   ```bash
   docker-compose logs <service-name>
   ```

2. **Rebuild the container:**
   ```bash
   docker-compose build --no-cache <service-name>
   docker-compose up <service-name>
   ```

3. **Remove all containers and volumes:**
   ```bash
   docker-compose down -v
   docker-compose up --build
   ```

### Hot Reload Not Working

1. **Verify volume mounts:**
   ```bash
   docker-compose config
   ```

2. **Restart the service:**
   ```bash
   docker-compose restart <service-name>
   ```

3. **Check file permissions** (Linux/Mac):
   ```bash
   # Ensure files are readable
   chmod -R 755 frontend/src
   chmod -R 755 backend/rust/src
   ```

### Slow Performance

1. **Increase Docker resources:**
   - Docker Desktop → Settings → Resources
   - Increase CPU and Memory allocation

2. **Use named volumes for dependencies:**
   - Already configured in docker-compose.yml
   - node_modules and cargo cache use named volumes

3. **Exclude unnecessary files:**
   - Check .dockerignore files
   - Ensure large files/folders are excluded

### Permission Issues (Linux)

If you encounter permission errors:

```bash
# Run containers with your user ID
export UID=$(id -u)
export GID=$(id -g)
docker-compose up
```

Or add to docker-compose.yml:
```yaml
user: "${UID}:${GID}"
```

## Advanced Usage

### Running Tests in Docker

**Frontend tests:**
```bash
# Run all tests
docker-compose exec frontend npm test

# Run tests with coverage
docker-compose exec frontend npm run test:coverage

# Run specific test file
docker-compose exec frontend npm test -- src/common/components/Button.test.tsx
```

**Backend tests:**
```bash
# Run all tests
docker-compose exec backend cargo test

# Run specific test
docker-compose exec backend cargo test test_name

# Run tests with output
docker-compose exec backend cargo test -- --nocapture
```

### Building Production Images

```bash
# Build production frontend
docker build -f frontend/Dockerfile.prod -t caps-pos-frontend:latest ./frontend

# Build production backend
docker build -f backend/rust/Dockerfile.prod -t caps-pos-backend:latest ./backend/rust
```

### Cleaning Up

**Remove stopped containers:**
```bash
docker-compose rm
```

**Remove unused images:**
```bash
docker image prune
```

**Remove all unused Docker resources:**
```bash
docker system prune -a
```

**Remove specific volumes:**
```bash
docker volume rm caps-pos_frontend_node_modules
docker volume rm caps-pos_backend_cargo_registry
```

## Environment Variables

### Frontend (.env)
```bash
VITE_API_URL=http://localhost:8923
VITE_PORT=7945
NODE_ENV=development
```

### Backend (backend/rust/.env)
```bash
DATABASE_PATH=/data/pos.db
API_HOST=0.0.0.0
API_PORT=8923
RUST_LOG=info
RUST_BACKTRACE=1
JWT_SECRET=your-secret-key-here
```

## Network Configuration

All services are connected via the `caps-network` bridge network, allowing them to communicate using service names:

- Frontend can access backend at `http://backend:8923`
- Backend can access frontend at `http://frontend:7945`

## Volume Mounts

### Source Code Volumes
- `./frontend:/app` - Frontend source code
- `./backend/rust:/app` - Backend source code
- `./data:/data` - SQLite database

### Named Volumes (for performance)
- `frontend_node_modules` - Node.js dependencies
- `backend_cargo_registry` - Cargo registry cache
- `backend_cargo_git` - Cargo git cache
- `backend_target` - Rust build artifacts

## Tips for Best Performance

1. **Use named volumes for dependencies** - Already configured
2. **Exclude node_modules and target from file watching** - Already configured
3. **Allocate sufficient resources to Docker** - Minimum 4GB RAM
4. **Use .dockerignore files** - Already configured
5. **Keep Docker Desktop updated** - Latest version has performance improvements

## Getting Help

If you encounter issues not covered here:

1. Check Docker logs: `docker-compose logs -f`
2. Verify Docker is running: `docker ps`
3. Check Docker resources: Docker Desktop → Settings → Resources
4. Consult Docker documentation: https://docs.docker.com/
5. Ask the team in the development channel

## Next Steps

Once your Docker environment is running:

1. Access the frontend at http://localhost:7945
2. Test the API at http://localhost:8923/health
3. View components in Storybook at http://localhost:7946
4. Start developing with hot reload enabled!
