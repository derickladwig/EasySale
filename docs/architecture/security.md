# Security Architecture

## Overview

This document outlines the security measures implemented in the CAPS POS system to protect against common vulnerabilities and ensure data integrity.

## Authentication & Authorization

### JWT Token-Based Authentication

- **Token Generation**: JWT tokens are generated using the `jsonwebtoken` crate with HS256 algorithm
- **Token Expiration**: Tokens expire after 8 hours of inactivity
- **Token Storage**: Tokens are stored in localStorage on the client (httpOnly cookies recommended for production)
- **Token Validation**: All protected endpoints validate tokens using middleware

### Password Security

- **Hashing Algorithm**: Argon2id (winner of the Password Hashing Competition)
- **Salt Generation**: Cryptographically secure random salts using `rand_core` with `getrandom` feature
- **Password Requirements**: Minimum 8 characters (enforced at application level)
- **Password Storage**: Only hashed passwords are stored; plaintext passwords are never persisted

### Role-Based Access Control (RBAC)

- **Roles**: Admin, Manager, Cashier, Parts Specialist, Paint Technician, Warehouse Staff, Viewer
- **Permissions**: 11 granular permissions covering all operations
- **Permission Checks**: Both frontend (UI hiding) and backend (API enforcement)
- **Route Guards**: React components prevent unauthorized access to protected routes

## Input Validation & Sanitization

### Frontend Sanitization

All user input is sanitized using utility functions in `frontend/src/common/utils/sanitize.ts`:

- **HTML Sanitization**: Escapes special characters to prevent XSS attacks
- **SQL Input Sanitization**: Removes SQL injection attempts (quotes, comments, keywords)
- **Email Validation**: Validates format and normalizes to lowercase
- **Phone Sanitization**: Removes invalid characters while preserving formatting
- **URL Sanitization**: Blocks dangerous protocols (javascript:, data:, vbscript:)
- **Filename Sanitization**: Prevents path traversal attacks
- **Number Validation**: Validates numeric input with min/max/decimal constraints

### Backend Validation

- **Type Safety**: Rust's type system prevents many common vulnerabilities
- **SQL Injection Prevention**: SQLx with parameterized queries (no string concatenation)
- **Input Length Limits**: Database schema enforces maximum lengths
- **Data Validation**: Serde validates JSON payloads against expected types

## Content Security Policy (CSP)

CSP headers are configured in `frontend/vite.config.ts`:

```
default-src 'self'
script-src 'self' 'unsafe-inline'  # unsafe-inline needed for Vite HMR in dev
style-src 'self' 'unsafe-inline'
img-src 'self' data: https:
font-src 'self' data:
connect-src 'self' http://localhost:* ws://localhost:*
frame-ancestors 'none'
base-uri 'self'
form-action 'self'
```

**Production Recommendations**:
- Remove `'unsafe-inline'` from script-src and style-src
- Use nonces or hashes for inline scripts
- Restrict connect-src to specific API domains

## HTTPS & Transport Security

**Development**:
- HTTP is acceptable for local development
- API runs on http://localhost:8080

**Production Requirements**:
- HTTPS must be enforced for all connections
- TLS 1.3 recommended (minimum TLS 1.2)
- HSTS headers should be enabled
- Certificate pinning for mobile apps (if applicable)

## Session Management

### Session Storage

- **Database**: Sessions stored in SQLite `sessions` table
- **Session ID**: UUID v4 for uniqueness
- **Token Association**: Each session linked to a JWT token
- **Expiration**: Sessions expire after 8 hours

### Session Lifecycle

1. **Login**: Create session with token and expiration
2. **Request**: Validate token on each API call
3. **Logout**: Delete session from database
4. **Expiration**: Expired sessions are automatically invalid

## API Security

### CORS Configuration

- **Development**: Allow all origins for local testing
- **Production**: Restrict to specific frontend domains

### Rate Limiting

**Not Yet Implemented** - Recommended for production:
- Login endpoint: 5 attempts per minute per IP
- API endpoints: 100 requests per minute per user
- Use middleware like `actix-limitation`

### Request Logging

All authentication events are logged:
- Login attempts (success and failure)
- Logout events
- Token validation failures
- Permission denials

## Dependency Security

### Automated Scanning

CI pipeline includes security audits:
- **npm audit**: Scans frontend dependencies for known vulnerabilities
- **cargo audit**: Scans Rust dependencies for security advisories

### Update Policy

- Security patches applied within 48 hours of disclosure
- Dependencies updated monthly for non-security fixes
- Automated dependency updates via GitHub Dependabot

## Data Protection

### Sensitive Data Handling

- **Passwords**: Never logged or displayed
- **Tokens**: Redacted in logs
- **PII**: Customer data encrypted at rest (future enhancement)

### Database Security

- **File Permissions**: SQLite database file restricted to application user
- **Backup Encryption**: Backups encrypted with AES-256 (future enhancement)
- **Connection Security**: Local connections only (no network exposure)

## Error Handling

### Error Messages

- **Generic Errors**: Don't expose internal details to users
- **Logging**: Detailed errors logged server-side for debugging
- **User Feedback**: User-friendly messages without technical details

### Error Boundary

- **Frontend**: React ErrorBoundary catches and displays errors gracefully
- **Backend**: Structured error responses with appropriate HTTP status codes

## Security Best Practices

### Development

1. Never commit secrets to version control
2. Use environment variables for configuration
3. Run security audits before each release
4. Review code for security issues during PR reviews

### Deployment

1. Use strong secrets for JWT signing (minimum 32 characters)
2. Enable HTTPS with valid certificates
3. Configure firewall rules to restrict access
4. Regular security updates and patches

### Monitoring

1. Log all authentication events
2. Monitor for suspicious activity (multiple failed logins)
3. Alert on security audit failures
4. Regular penetration testing (recommended)

## Known Limitations

1. **localStorage for tokens**: Should use httpOnly cookies in production
2. **No rate limiting**: Should be implemented before production
3. **No 2FA**: Multi-factor authentication not yet implemented
4. **No encryption at rest**: Database not encrypted (SQLCipher recommended)
5. **No audit trail**: User actions not fully logged (future enhancement)

## Security Roadmap

### Phase 1 (Current)
- ✅ JWT authentication
- ✅ Argon2 password hashing
- ✅ Input sanitization
- ✅ CSP headers
- ✅ Dependency scanning

### Phase 2 (Next)
- ⬜ httpOnly cookies for tokens
- ⬜ Rate limiting
- ⬜ Database encryption (SQLCipher)
- ⬜ Comprehensive audit logging

### Phase 3 (Future)
- ⬜ Two-factor authentication
- ⬜ Biometric authentication
- ⬜ Hardware security module (HSM) integration
- ⬜ Regular penetration testing

## Incident Response

### Security Incident Procedure

1. **Detection**: Monitor logs and alerts
2. **Containment**: Disable affected accounts/services
3. **Investigation**: Analyze logs and determine scope
4. **Remediation**: Apply fixes and patches
5. **Recovery**: Restore services and verify security
6. **Post-Mortem**: Document incident and improve processes

### Contact Information

- **Security Team**: [To be defined]
- **Emergency Contact**: [To be defined]

## Compliance

### Standards

- **PCI DSS**: Required for payment processing (future)
- **GDPR**: Required for EU customer data (if applicable)
- **SOC 2**: Recommended for enterprise customers (future)

### Data Retention

- **Sessions**: Deleted after expiration
- **Logs**: Retained for 90 days
- **Backups**: Retained for 1 year
- **User Data**: Retained until account deletion

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Argon2 Specification](https://github.com/P-H-C/phc-winner-argon2)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
