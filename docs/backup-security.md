# Backup System Security Documentation

## Overview

The CAPS POS backup system implements multiple layers of security to protect sensitive business data during backup, storage, and restore operations. This document outlines the security mechanisms, best practices, and configuration requirements.

## Security Features

### 1. File Permissions

**Implementation:**
All backup archives are created with restrictive file permissions (0600 - owner read/write only) to prevent unauthorized access on the local filesystem.

**Location:** `backend/crates/server/src/services/backup_service.rs`

```rust
// Set restrictive permissions on archive
let file = fs::File::open(path)?;
let mut perms = file.metadata()?.permissions();
perms.set_mode(0o600); // Owner read/write only
fs::set_permissions(path, perms)?;
```

**Best Practices:**
- Ensure the POS application runs under a dedicated user account
- Never store backups in publicly accessible directories
- Regularly audit file permissions on backup directories
- Use filesystem encryption (e.g., LUKS, BitLocker) for additional protection

**Verification:**
```bash
# Check backup file permissions (should show -rw-------)
ls -l /data/backups/*.zip

# Verify ownership
stat /data/backups/backup_*.zip
```

### 2. OAuth Token Encryption

**Implementation:**
Google Drive OAuth refresh tokens are encrypted before storage in the database using AES-256-GCM encryption with a key derived from the application's encryption key.

**Location:** `backend/crates/server/src/services/google_drive_service.rs`

```rust
// Encrypt refresh token before storage
let encrypted_token = encrypt_token(&refresh_token, &encryption_key)?;

// Store encrypted token in database
sqlx::query(
    "UPDATE backup_destinations 
     SET refresh_token_encrypted = ? 
     WHERE id = ?"
)
.bind(&encrypted_token)
.bind(&destination_id)
.execute(&pool)
.await?;
```

**Encryption Algorithm:**
- **Algorithm:** AES-256-GCM (Galois/Counter Mode)
- **Key Derivation:** PBKDF2 with SHA-256
- **Salt:** Randomly generated per installation
- **Iterations:** 100,000 (OWASP recommended minimum)

**Key Management:**
The encryption key is derived from the `ENCRYPTION_KEY` environment variable. This key should be:
- At least 32 bytes (256 bits) of cryptographically secure random data
- Stored securely (e.g., AWS Secrets Manager, HashiCorp Vault, or encrypted configuration)
- Never committed to version control
- Rotated periodically (recommended: annually)

**Configuration:**
```bash
# Generate a secure encryption key
openssl rand -base64 32

# Set in environment
export ENCRYPTION_KEY="your-generated-key-here"

# Or in .env file (ensure .env is in .gitignore)
echo "ENCRYPTION_KEY=your-generated-key-here" >> .env
```

**Best Practices:**
- Use a dedicated secrets management system in production
- Implement key rotation procedures
- Maintain encrypted backups of encryption keys in a separate secure location
- Use hardware security modules (HSMs) for enterprise deployments
- Never log or display encryption keys

**Token Lifecycle:**
1. User initiates OAuth flow
2. Application receives authorization code
3. Application exchanges code for access and refresh tokens
4. Refresh token is encrypted using AES-256-GCM
5. Encrypted token is stored in `backup_destinations.refresh_token_encrypted`
6. When needed, token is decrypted in memory only
7. Decrypted token is never logged or persisted

### 3. Secure Archive Downloads

**Implementation:**
Backup archives are protected from unauthorized access using time-limited download tokens. Direct URL access to backup files is prevented.

**Location:** `backend/crates/server/src/handlers/backup.rs`

**Token Generation:**
```rust
// Generate cryptographically secure 64-character token
let token: String = rand::thread_rng()
    .sample_iter(&rand::distributions::Alphanumeric)
    .take(64)
    .map(char::from)
    .collect();

// Set expiration (default: 15 minutes)
let expires_at = now + chrono::Duration::seconds(900);
```

**Token Properties:**
- **Length:** 64 characters (alphanumeric)
- **Entropy:** ~380 bits (cryptographically secure)
- **Lifetime:** 15 minutes (configurable)
- **Single-use:** Token is marked as used after first download
- **Validation:** Checked before streaming archive

**Download Flow:**
1. Admin requests download via UI
2. Backend generates time-limited token
3. Token is stored in `download_tokens` table
4. Frontend receives token and download URL
5. User clicks download link
6. Backend validates token (not expired, not used)
7. Token is marked as used
8. Archive is streamed to user
9. Expired/used tokens are cleaned up periodically

**API Endpoints:**
```
POST /api/backups/{backup_id}/download-token
  - Requires: manage_settings permission
  - Returns: { token, expires_at, download_url }

GET /api/backups/download?token={token}
  - Requires: Valid token (no permission check)
  - Returns: Archive file stream

DELETE /api/backups/download-tokens/cleanup
  - Requires: manage_settings permission
  - Removes expired and used tokens
```

**Best Practices:**
- Never share download URLs publicly
- Implement rate limiting on token generation
- Monitor for suspicious download patterns
- Clean up expired tokens regularly (automated job recommended)
- Consider shorter TTL for highly sensitive environments
- Log all download attempts for audit purposes

**Security Considerations:**
- Tokens are transmitted over HTTPS only
- Tokens cannot be reused after download
- Expired tokens are automatically rejected
- No direct filesystem access to backup archives
- Download attempts are logged for audit

### 4. Permission-Based Access Control

**Implementation:**
All backup operations require the `manage_settings` permission. Non-admin users receive 403 Forbidden responses.

**Location:** `backend/crates/server/src/main.rs`

```rust
.service(
    web::resource("/api/backups/overview")
        .route(web::get().to(handlers::backup::get_overview))
        .wrap(require_permission("manage_settings"))
)
```

**Protected Operations:**
- View backup overview and list
- Create manual backups
- Configure backup settings
- Delete backups
- Restore from backups
- Generate download tokens
- Connect/disconnect Google Drive
- View restore jobs

**Best Practices:**
- Follow principle of least privilege
- Regularly audit user permissions
- Implement role-based access control (RBAC)
- Log all permission-denied attempts
- Review access logs for suspicious activity

### 5. Audit Logging

**Implementation:**
All backup operations are logged with user ID, station ID, timestamp, and operation details.

**Location:** `backend/crates/server/src/services/audit_logger.rs`

**Logged Operations:**
- Backup creation (type, size, status)
- Backup deletion (ID, reason)
- Settings changes (before/after values)
- Restore initiation (backup ID, options)
- Restore completion (status, files restored)
- Google Drive connection/disconnection
- Download token generation
- Archive downloads

**Log Format:**
```json
{
  "entity_type": "backup",
  "entity_id": "backup-123",
  "action": "create",
  "user_id": "user-456",
  "station_id": "station-1",
  "timestamp": "2026-01-10T12:00:00Z",
  "data": {
    "backup_type": "db_full",
    "size_bytes": 1048576,
    "status": "completed"
  }
}
```

**Best Practices:**
- Retain audit logs for compliance requirements (typically 1-7 years)
- Implement log rotation and archival
- Monitor logs for suspicious patterns
- Use SIEM (Security Information and Event Management) systems
- Protect log files with restrictive permissions
- Consider centralized logging for multi-store deployments

## Security Checklist

### Installation

- [ ] Generate strong encryption key (32+ bytes)
- [ ] Store encryption key securely (secrets manager)
- [ ] Set backup directory permissions (0700)
- [ ] Configure HTTPS for all API endpoints
- [ ] Enable firewall rules for backup ports
- [ ] Verify file permissions on created backups (0600)

### Configuration

- [ ] Set strong passwords for admin accounts
- [ ] Enable two-factor authentication (if available)
- [ ] Configure backup retention policies
- [ ] Set up automated token cleanup
- [ ] Configure audit log retention
- [ ] Enable Google Drive OAuth (if using cloud backup)
- [ ] Verify OAuth token encryption

### Operations

- [ ] Regularly test backup restoration
- [ ] Monitor backup success/failure rates
- [ ] Review audit logs weekly
- [ ] Rotate encryption keys annually
- [ ] Update OAuth credentials when expired
- [ ] Clean up old backups per retention policy
- [ ] Verify backup integrity (checksums)

### Monitoring

- [ ] Set up alerts for backup failures
- [ ] Monitor disk space usage
- [ ] Track unauthorized access attempts
- [ ] Review download token usage
- [ ] Monitor Google Drive sync status
- [ ] Check for expired OAuth tokens
- [ ] Audit user permissions quarterly

## Threat Model

### Threats Mitigated

1. **Unauthorized Local Access**
   - Mitigation: File permissions (0600)
   - Impact: High
   - Likelihood: Medium

2. **Token Theft**
   - Mitigation: Encryption at rest, HTTPS in transit
   - Impact: High
   - Likelihood: Low

3. **Unauthorized Downloads**
   - Mitigation: Time-limited tokens, permission checks
   - Impact: High
   - Likelihood: Medium

4. **Privilege Escalation**
   - Mitigation: RBAC, permission middleware
   - Impact: High
   - Likelihood: Low

5. **Data Exfiltration**
   - Mitigation: Audit logging, download tokens
   - Impact: High
   - Likelihood: Low

### Residual Risks

1. **Physical Access**
   - Risk: Attacker with physical access can copy backup files
   - Mitigation: Use full-disk encryption, secure physical premises

2. **Insider Threats**
   - Risk: Admin users can access all backups
   - Mitigation: Audit logging, separation of duties, background checks

3. **Key Compromise**
   - Risk: If encryption key is compromised, tokens can be decrypted
   - Mitigation: Secure key storage, regular rotation, HSM usage

4. **Zero-Day Vulnerabilities**
   - Risk: Unknown vulnerabilities in dependencies
   - Mitigation: Regular updates, security scanning, monitoring

## Compliance Considerations

### PCI DSS (Payment Card Industry Data Security Standard)

If backups contain payment card data:
- Encrypt backups at rest (Requirement 3.4)
- Restrict access to cardholder data (Requirement 7)
- Log and monitor all access (Requirement 10)
- Regularly test security systems (Requirement 11)

### GDPR (General Data Protection Regulation)

If backups contain EU customer data:
- Implement appropriate technical measures (Article 32)
- Maintain records of processing activities (Article 30)
- Enable data subject rights (Article 15-20)
- Report breaches within 72 hours (Article 33)

### HIPAA (Health Insurance Portability and Accountability Act)

If backups contain health information:
- Implement access controls (§164.312(a)(1))
- Encrypt ePHI at rest and in transit (§164.312(a)(2)(iv))
- Maintain audit logs (§164.312(b))
- Implement backup and recovery procedures (§164.308(a)(7)(ii)(A))

## Incident Response

### Suspected Backup Compromise

1. **Immediate Actions:**
   - Disable affected user accounts
   - Revoke all download tokens
   - Disconnect Google Drive sync
   - Isolate affected systems

2. **Investigation:**
   - Review audit logs for unauthorized access
   - Check file access timestamps
   - Analyze network traffic logs
   - Identify scope of compromise

3. **Remediation:**
   - Rotate encryption keys
   - Reset OAuth credentials
   - Update affected user passwords
   - Patch vulnerabilities

4. **Recovery:**
   - Restore from known-good backup
   - Verify data integrity
   - Re-enable services incrementally
   - Monitor for suspicious activity

5. **Post-Incident:**
   - Document incident timeline
   - Update security procedures
   - Conduct lessons-learned review
   - Notify affected parties (if required)

## References

- [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
- [NIST Special Publication 800-57: Key Management](https://csrc.nist.gov/publications/detail/sp/800-57-part-1/rev-5/final)
- [CIS Controls v8](https://www.cisecurity.org/controls/v8)
- [PCI DSS v4.0](https://www.pcisecuritystandards.org/document_library/)

## Support

For security concerns or questions:
- Email: security@example.com
- Security Hotline: +1-XXX-XXX-XXXX
- Bug Bounty Program: https://example.com/security/bounty

---

**Last Updated:** 2026-01-10  
**Version:** 1.0  
**Maintained By:** Security Team
