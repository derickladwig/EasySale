# Security Policy

## Supported Versions

EasySale follows semantic versioning. Security updates are provided for:

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |
| < 0.1   | :x:                |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

### Private Reporting
1. **GitHub Security**: Use GitHub's private vulnerability reporting feature
2. **Email**: security@EasySale.dev (if available)
3. **Response Time**: We aim to acknowledge reports within 48 hours

### What to Include
- Description of the vulnerability
- Steps to reproduce the issue
- Potential impact assessment
- Suggested fix (if available)

### Response Process
1. **Acknowledgment**: Within 48 hours
2. **Initial Assessment**: Within 5 business days
3. **Status Updates**: Weekly until resolved
4. **Resolution**: Coordinated disclosure after fix is available

## Security Measures

### Authentication & Authorization
- JWT tokens with 8-hour expiration
- Argon2 password hashing
- Role-based access control (RBAC)
- Rate limiting on authentication endpoints

### Data Protection
- SQLite database encrypted with SQLCipher
- TLS 1.3 for all network communication
- Prepared statements prevent SQL injection
- Input validation and sanitization

### Security Headers
- Content-Security-Policy
- X-Content-Type-Options
- X-Frame-Options
- X-XSS-Protection

### Regular Security Practices
- Weekly dependency audits (npm audit, cargo audit)
- Automated security scanning in CI/CD
- No hardcoded secrets or credentials
- Encrypted backups and data at rest

## Scope
This policy covers:
- EasySale core application (frontend/backend)
- Docker containers and deployment configurations
- CI/CD pipeline security
- Documentation and example configurations

Out of scope:
- Third-party dependencies (report to respective maintainers)
- Social engineering attacks
- Physical security of deployment environments

For detailed security guidelines, see [docs/SECURITY.md](docs/SECURITY.md).
