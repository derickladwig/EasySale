s Contributing to EasySale

We welcome contributions to EasySale! This document provides guidelines for contributing to the project.

## Development Setup

### Prerequisites
- Node.js 18+ (for frontend)
- Rust 1.75+ (for backend)
- Docker 20.10+ (optional)

### Quick Start
```bash
# Clone and setup
git clone <repository-url>
cd EasySale

# Start development environment
docker-start.bat  # Windows
./docker-start.sh # Linux/Mac

# Or manual setup
cd frontend && npm install && npm run dev
cd backend && cargo run --bin EasySale-server
```

## How to Contribute

### Reporting Issues
- Use GitHub Issues for bug reports and feature requests
- Include system information, steps to reproduce, and expected behavior
- Check existing issues before creating new ones

### Pull Requests
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes following our coding standards
4. Run tests: `npm test && cargo test`
5. Run linters: `npm run lint && cargo clippy`
6. Commit with conventional format: `feat: add new feature`
7. Push and create a pull request

### Coding Standards

**Frontend (TypeScript/React):**
- Use ESLint and Prettier configurations
- Follow React hooks patterns
- Write unit tests with Vitest
- Use Tailwind CSS for styling

**Backend (Rust):**
- Follow Rust naming conventions
- Use `cargo fmt` and `cargo clippy`
- Write unit and integration tests
- Document public APIs with rustdoc

### Commit Messages
Follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` new features
- `fix:` bug fixes
- `docs:` documentation changes
- `style:` formatting changes
- `refactor:` code refactoring
- `test:` adding tests
- `chore:` maintenance tasks

## Project Structure
- `backend/` - Rust workspace with multiple crates
- `frontend/` - React application with Vite
- `docs/` - Documentation
- `audit/` - Audit reports and analysis
- `.github/` - GitHub workflows and templates

## Testing
- Frontend: `cd frontend && npm test`
- Backend: `cd backend && cargo test`
- E2E: `cd frontend && npm run test:e2e`

## Security
Report security vulnerabilities privately to [security contact]. See SECURITY.md for details.

## License
By contributing, you agree that your contributions will be licensed under the MIT License.
