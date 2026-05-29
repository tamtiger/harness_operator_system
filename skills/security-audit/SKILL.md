---
name: security-audit
description: "STRIDE threat modeling and OWASP Top 10 security audit workflow for systematic vulnerability discovery."
metadata:
  version: "1.0"
  updated: "2026-05-29"
  applies_to: ["*"]
  triggers: ["verify_run"]
  tier: 2
  keywords: ["security", "vulnerability", "owasp", "stride", "auth", "injection", "xss", "bảo mật", "lỗ hổng", "xác thực", "tiêm", "csrf"]
---

# Security Audit Skill

## Overview

Security audits are systematic threat discovery workflows. This skill teaches STRIDE threat modeling combined with OWASP Top 10 patterns to identify vulnerabilities before they reach production.

A security audit is not a penetration test. It's a structured code review focused on threat categories and known attack patterns.

## STRIDE Threat Model

STRIDE is a mnemonic for six threat categories:

| Category | Definition | Example |
|----------|-----------|---------|
| **S**poofing | Attacker impersonates a legitimate user or system | Forged JWT token, fake API caller |
| **T**ampering | Attacker modifies data in transit or at rest | Unencrypted API request, unsigned database record |
| **R**epudiation | Attacker denies performing an action | No audit log of who deleted the record |
| **I**nformation Disclosure | Attacker reads sensitive data | Exposed API key in logs, unencrypted password field |
| **D**enial of Service | Attacker makes system unavailable | Unbounded loop, resource exhaustion, no rate limiting |
| **E**levation of Privilege | Attacker gains higher permissions than intended | Missing authorization check, hardcoded admin flag |

## Audit Workflow

### Phase 1: Threat Enumeration

For each component (API endpoint, database, service, client), ask:

1. **Spoofing**: How do we verify the caller is who they claim to be?
   - Is authentication enforced on all entry points?
   - Are tokens validated on every request?
   - Can an attacker forge credentials?

2. **Tampering**: How do we ensure data hasn't been modified?
   - Is data encrypted in transit (TLS)?
   - Are checksums or signatures used?
   - Can an attacker intercept and modify requests?

3. **Repudiation**: Can we prove who did what?
   - Are all sensitive actions logged?
   - Are logs tamper-proof?
   - Can an attacker cover their tracks?

4. **Information Disclosure**: What secrets could leak?
   - Are API keys hardcoded or in logs?
   - Are passwords hashed with strong algorithms?
   - Can an attacker read unencrypted data?

5. **Denial of Service**: Can the system be starved?
   - Are there rate limits on expensive operations?
   - Can unbounded loops exhaust resources?
   - Are timeouts enforced?

6. **Elevation of Privilege**: Can an attacker gain unauthorized access?
   - Is authorization checked before every sensitive operation?
   - Are role-based access controls enforced?
   - Can an attacker bypass permission checks?

### Phase 2: OWASP Top 10 Mapping

Cross-reference findings against OWASP Top 10 (2021):

1. **Broken Access Control** — Missing or weak authorization checks
2. **Cryptographic Failures** — Weak encryption, exposed secrets
3. **Injection** — SQL injection, command injection, template injection
4. **Insecure Design** — Missing security controls in architecture
5. **Security Misconfiguration** — Default credentials, unnecessary services enabled
6. **Vulnerable and Outdated Components** — Unpatched dependencies
7. **Authentication Failures** — Weak password policies, session fixation
8. **Software and Data Integrity Failures** — Unsigned updates, insecure deserialization
9. **Logging and Monitoring Failures** — Missing audit trails
10. **Server-Side Request Forgery (SSRF)** — Attacker makes server fetch attacker-controlled URLs

### Phase 3: Risk Assessment

For each finding:

- **Severity**: Critical (exploitable, high impact) → High → Medium → Low
- **Likelihood**: How easy is it to exploit?
- **Impact**: What's the worst-case outcome?
- **Effort**: How much work to fix?

Prioritize Critical and High severity findings for immediate remediation.

### Phase 4: Remediation

For each finding, document:

1. **Root cause** — Why does this vulnerability exist?
2. **Fix** — Specific code change or architectural adjustment
3. **Verification** — How to test that the fix works
4. **Prevention** — How to prevent this class of vulnerability in the future

## Checklist for Code Review

- [ ] All entry points (API, CLI, webhooks) require authentication
- [ ] Authorization is checked before every sensitive operation
- [ ] Secrets (API keys, passwords) are never hardcoded or logged
- [ ] All data in transit is encrypted (TLS 1.2+)
- [ ] Sensitive data at rest is encrypted
- [ ] All user input is validated and sanitized
- [ ] SQL queries use parameterized statements (no string concatenation)
- [ ] Rate limiting is enforced on expensive operations
- [ ] Timeouts are set on all external calls
- [ ] Errors don't leak sensitive information
- [ ] Audit logs record all sensitive actions
- [ ] Dependencies are up-to-date and scanned for vulnerabilities
- [ ] No hardcoded credentials or API keys
- [ ] CORS is configured restrictively (not `*`)
- [ ] CSRF tokens are used for state-changing operations

## Integration with Verify Pipeline

The `security_audit` step in the verify pipeline runs a security-focused command (e.g., `npm audit`, `cargo audit`, `dotnet list package --vulnerable`). This skill teaches the *manual* audit process — the verify step automates the dependency check.

## Example: Auditing a Payment API

**Component**: POST /api/payments

**STRIDE Analysis**:
- **Spoofing**: Is the caller authenticated? (Check JWT validation)
- **Tampering**: Is the request encrypted? (Check TLS)
- **Repudiation**: Is the payment logged? (Check audit trail)
- **Information Disclosure**: Is the card number exposed? (Check PCI compliance)
- **Denial of Service**: Can an attacker spam payments? (Check rate limiting)
- **Elevation of Privilege**: Can a user pay on behalf of another? (Check authorization)

**OWASP Mapping**:
- Broken Access Control: Missing user ID validation
- Cryptographic Failures: Card number stored in plaintext
- Injection: SQL injection in payment query
- Authentication Failures: Weak JWT validation

**Remediation**:
1. Validate JWT on every request
2. Encrypt card numbers with AES-256
3. Use parameterized SQL queries
4. Add rate limiting (10 requests/minute per user)
5. Log all payment attempts with user ID and timestamp

