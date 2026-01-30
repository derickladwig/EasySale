# CI/CD Pipeline Guide

## Overview

The CAPS POS system uses GitHub Actions for continuous integration and continuous deployment. The pipeline ensures code quality, runs tests, and automates the build and deployment process.

## Workflows

### 1. CI Pipeline (`ci.yml`)

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

**Jobs:**

#### Frontend CI
- Checkout code
- Setup Node.js 18 with npm cache
- Install dependencies
- Check code formatting (Prettier)
- Run linter (ESLint)
- Run type checking (TypeScript)
- Run unit tests (Vitest)
- Build production bundle
- Upload build artifacts

#### Backend CI
- Checkout code
- Setup Rust toolchain (stable)
- Install system dependencies (SQLite, OpenSSL)
- Cache cargo registry, git, and build artifacts
- Check code formatting (rustfmt)
- Run linter (clippy) with warnings as errors
- Run unit and integration tests
- Build release binary
- Upload build artifacts

#### Python Services CI
- Checkout code
- Setup Python 3.10 with pip cache
- Install dependencies
- Check code formatting (black)
- Run linter (flake8)
- Run type checker (mypy)
- Run tests (pytest)

#### Security Audit
- Run npm audit for frontend dependencies
- Run cargo audit for backend dependencies
- Report vulnerabilities (non-blocking)

#### CI Success
- Summary job that requires all other jobs to pass
- Provides clear success message

**Status Checks:**
All jobs must pass before a pull request can be merged.

### 2. CD Pipeline (`cd.yml`)

**Triggers:**
- Release published on GitHub
- Manual workflow dispatch with environment selection

**Jobs:**

#### Build Frontend
- Build production-optimized bundle
- Create compressed archive
- Upload as artifact (30-day retention)

#### Build Backend
- Build release binary with optimizations
- Strip debug symbols
- Create compressed archive
- Upload as artifact (30-day retention)

#### Create Release Assets
- Download build artifacts
- Attach to GitHub release
- Available for download

#### Deploy
- Download artifacts
- Deploy to selected environment (staging/production)
- Currently a placeholder for actual deployment steps

**Manual Deployment:**
```bash
# Trigger deployment via GitHub UI
Actions → CD Pipeline → Run workflow → Select environment
```

### 3. Code Coverage (`coverage.yml`)

**Triggers:**
- Push to `main` branch
- Pull requests to `main` branch
- Weekly schedule (Monday 00:00 UTC)

**Jobs:**

#### Frontend Coverage
- Run tests with coverage collection
- Generate coverage report
- Upload to Codecov
- Display summary in GitHub Actions

#### Backend Coverage
- Run tests with LLVM coverage
- Generate LCOV report
- Upload to Codecov
- Display summary in GitHub Actions

**Coverage Thresholds:**
- Business logic: 80% minimum
- UI components: 60% minimum

### 4. Dependency Updates (`dependency-update.yml`)

**Triggers:**
- Weekly schedule (Monday 09:00 UTC)
- Manual workflow dispatch

**Jobs:**
- Check for outdated npm packages (frontend)
- Check for outdated cargo crates (backend)
- Check for outdated pip packages (Python services)
- Display update recommendations

## Branch Protection Rules

### Main Branch
- Require pull request reviews (1 approver)
- Require status checks to pass:
  - Frontend CI
  - Backend CI
  - Python Services CI
  - Security Audit
- Require branches to be up to date
- Require linear history
- No force pushes
- No deletions

### Develop Branch
- Require status checks to pass
- Allow force pushes (for rebasing)
- No deletions

## Pull Request Workflow

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make Changes and Commit**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

3. **Push to Remote**
   ```bash
   git push origin feature/my-feature
   ```

4. **Create Pull Request**
   - Go to GitHub repository
   - Click "New Pull Request"
   - Select base branch (main or develop)
   - Fill in PR template
   - Submit for review

5. **CI Checks Run Automatically**
   - Wait for all checks to pass
   - Fix any failures
   - Push fixes to same branch

6. **Code Review**
   - Request review from team members
   - Address review comments
   - Get approval

7. **Merge**
   - Squash and merge (recommended)
   - Or merge commit (for feature branches)
   - Delete feature branch after merge

## Release Workflow

### Creating a Release

1. **Prepare Release**
   ```bash
   # Update version in package.json and Cargo.toml
   git checkout main
   git pull origin main
   
   # Create release branch
   git checkout -b release/v1.0.0
   
   # Update version numbers
   # Update CHANGELOG.md
   
   git commit -m "chore: prepare release v1.0.0"
   git push origin release/v1.0.0
   ```

2. **Create Pull Request**
   - Create PR from release branch to main
   - Wait for CI to pass
   - Get approval and merge

3. **Create GitHub Release**
   - Go to Releases → Draft a new release
   - Create new tag: `v1.0.0`
   - Target: `main` branch
   - Release title: `v1.0.0 - Release Name`
   - Description: Copy from CHANGELOG.md
   - Publish release

4. **CD Pipeline Runs Automatically**
   - Builds frontend and backend
   - Creates release assets
   - Attaches to GitHub release

5. **Deploy to Production**
   - Go to Actions → CD Pipeline
   - Click "Run workflow"
   - Select "production" environment
   - Click "Run workflow"

### Version Numbering

Follow Semantic Versioning (SemVer):
- **Major** (1.0.0): Breaking changes
- **Minor** (0.1.0): New features, backward compatible
- **Patch** (0.0.1): Bug fixes, backward compatible

## Environment Variables

### CI Environment
Set in GitHub repository settings (Settings → Secrets and variables → Actions):

**Secrets:**
- `CODECOV_TOKEN`: Token for Codecov integration (optional)
- `DEPLOY_SSH_KEY`: SSH key for deployment (when implemented)
- `DEPLOY_HOST`: Deployment server hostname (when implemented)

**Variables:**
- `NODE_VERSION`: Node.js version (default: 18)
- `RUST_VERSION`: Rust version (default: stable)
- `PYTHON_VERSION`: Python version (default: 3.10)

### CD Environment
Set per environment (staging, production):

**Staging:**
- `STAGING_API_URL`: Staging API URL
- `STAGING_DATABASE_PATH`: Staging database path
- `STAGING_DEPLOY_PATH`: Staging deployment path

**Production:**
- `PRODUCTION_API_URL`: Production API URL
- `PRODUCTION_DATABASE_PATH`: Production database path
- `PRODUCTION_DEPLOY_PATH`: Production deployment path

## Caching Strategy

### Frontend
- **npm cache**: Speeds up dependency installation
- **Cache key**: Hash of package-lock.json
- **Invalidation**: When package-lock.json changes

### Backend
- **Cargo registry**: Caches downloaded crates
- **Cargo git**: Caches git dependencies
- **Build artifacts**: Caches compiled dependencies
- **Cache key**: Hash of Cargo.lock
- **Invalidation**: When Cargo.lock changes

### Python
- **pip cache**: Speeds up package installation
- **Cache key**: Hash of requirements.txt
- **Invalidation**: When requirements.txt changes

## Artifacts

### Build Artifacts
- **Retention**: 7 days for CI, 30 days for releases
- **Frontend**: `frontend-dist` (dist/ directory)
- **Backend**: `backend-binary` (compiled executable)

### Release Assets
- **Retention**: Permanent (attached to release)
- **Frontend**: `frontend-v1.0.0.tar.gz`
- **Backend**: `backend-v1.0.0.tar.gz`

## Troubleshooting

### CI Failures

**Frontend build fails:**
1. Check Node.js version compatibility
2. Verify package-lock.json is committed
3. Check for TypeScript errors locally
4. Run `npm ci && npm run build` locally

**Backend build fails:**
1. Check Rust version compatibility
2. Verify Cargo.lock is committed
3. Check for clippy warnings locally
4. Run `cargo build --release` locally

**Tests fail:**
1. Run tests locally: `npm test` or `cargo test`
2. Check for environment-specific issues
3. Verify test fixtures and mocks
4. Check database migrations

**Linting fails:**
1. Run linter locally: `npm run lint` or `cargo clippy`
2. Auto-fix: `npm run lint:fix` or `cargo clippy --fix`
3. Check formatting: `npm run format` or `cargo fmt`

### CD Failures

**Build artifacts missing:**
1. Check if CI pipeline completed successfully
2. Verify artifact upload step succeeded
3. Check artifact retention period

**Deployment fails:**
1. Check deployment credentials
2. Verify server connectivity
3. Check deployment logs
4. Verify environment variables

### Cache Issues

**Stale cache:**
1. Clear cache manually in GitHub Actions
2. Update cache key in workflow file
3. Wait for cache to expire (7 days)

**Cache miss:**
1. Verify cache key matches
2. Check if dependencies changed
3. Ensure cache is being saved

## Best Practices

### Commits
- Use conventional commits: `feat:`, `fix:`, `docs:`, `chore:`
- Keep commits atomic and focused
- Write clear commit messages
- Reference issues: `fixes #123`

### Pull Requests
- Keep PRs small and focused
- Write descriptive PR titles and descriptions
- Link related issues
- Request reviews from relevant team members
- Respond to review comments promptly

### Testing
- Write tests for new features
- Maintain test coverage above thresholds
- Run tests locally before pushing
- Fix failing tests immediately

### Code Quality
- Run linters and formatters before committing
- Use pre-commit hooks
- Address all warnings
- Follow project coding standards

### Security
- Keep dependencies up to date
- Review security audit reports
- Never commit secrets or credentials
- Use environment variables for sensitive data

## Monitoring

### GitHub Actions Dashboard
- View workflow runs: Actions tab
- Check job status and logs
- Download artifacts
- Re-run failed jobs

### Status Badges
Add to README.md:
```markdown
![CI](https://github.com/derickladwig/EasySale/workflows/CI%20Pipeline/badge.svg)
![Coverage](https://codecov.io/gh/derickladwig/EasySale/branch/main/graph/badge.svg)
```

### Notifications
Configure in repository settings:
- Email notifications for failed builds
- Slack integration for CI/CD events
- GitHub mobile app for real-time updates

## Future Enhancements

### Planned Improvements
- [ ] Automated database migrations in CD
- [ ] Blue-green deployment strategy
- [ ] Automated rollback on failure
- [ ] Performance testing in CI
- [ ] Visual regression testing
- [ ] Automated changelog generation
- [ ] Dependency update PRs (Dependabot)
- [ ] Container image builds
- [ ] Multi-environment deployments
- [ ] Smoke tests after deployment

### Integration Opportunities
- Codecov for coverage visualization
- SonarQube for code quality analysis
- Snyk for security scanning
- Lighthouse for performance audits
- Sentry for error tracking

## Support

For CI/CD issues:
1. Check workflow logs in GitHub Actions
2. Review this documentation
3. Consult team lead or DevOps engineer
4. Create issue with `ci/cd` label

## References

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Semantic Versioning](https://semver.org/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Codecov Documentation](https://docs.codecov.com/)
