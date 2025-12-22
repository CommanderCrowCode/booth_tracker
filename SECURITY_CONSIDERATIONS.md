# Security Considerations for Public/Larger Deployment

This document outlines security considerations if the Booth Tracker application is expanded beyond its current internal-only, VPN-protected deployment.

## Current Security Posture

**Current Deployment Context:**
- Internal use only
- Protected by Tailscale VPN
- Trusted employee access only
- Small team of users
- No public internet exposure

**Risk Mitigation:**
Many security concerns are currently mitigated by the VPN boundary and trusted user base. However, expanding to a larger group or public deployment would require addressing the following issues.

---

## Critical Issues for Public Deployment

### 1. Audit Trail and Data Integrity

**Current State:**
- No audit logging for data modifications
- Users can edit interaction data retroactively without tracking
- No record of who changed what and when

**Risks for Larger Deployment:**
- Data manipulation without accountability
- Inability to investigate discrepancies
- Potential for revenue data tampering
- No compliance trail for financial auditing

**Recommended Solutions:**
```sql
-- Create audit log table
CREATE TABLE interaction_audit (
    id SERIAL PRIMARY KEY,
    interaction_id UUID REFERENCES interactions(id),
    changed_by VARCHAR(100),
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    field_name VARCHAR(50),
    old_value TEXT,
    new_value TEXT,
    ip_address INET
);

-- Create trigger function
CREATE OR REPLACE FUNCTION log_interaction_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Log changes to relevant fields
    IF OLD.timestamp != NEW.timestamp THEN
        INSERT INTO interaction_audit (interaction_id, field_name, old_value, new_value)
        VALUES (NEW.id, 'timestamp', OLD.timestamp::text, NEW.timestamp::text);
    END IF;
    -- Add similar checks for other sensitive fields
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger
CREATE TRIGGER audit_interaction_updates
AFTER UPDATE ON interactions
FOR EACH ROW EXECUTE FUNCTION log_interaction_changes();
```

**Implementation Priority:** HIGH

---

### 2. Timestamp Manipulation Controls

**Current State:**
- Users can set any timestamp (past or future)
- No age limits on backdating
- No warnings for unusual timestamp patterns

**Risks for Larger Deployment:**
- Gaming of metrics and analytics
- False reporting of historical sales
- Manipulation of performance metrics
- Skewed trend analysis

**Recommended Solutions:**

```python
# In api/main.py - add to update_interaction and create_interaction

MAX_BACKDATE_DAYS = 30  # Maximum days to backdate
MAX_FUTURE_MINUTES = 5  # Allow small clock skew

def validate_timestamp(timestamp: datetime) -> None:
    """Validate timestamp is within acceptable bounds."""
    now = datetime.now(timezone.utc)

    # Prevent future timestamps (with small tolerance for clock skew)
    if timestamp > now + timedelta(minutes=MAX_FUTURE_MINUTES):
        raise HTTPException(
            status_code=400,
            detail=f"Timestamp cannot be more than {MAX_FUTURE_MINUTES} minutes in the future"
        )

    # Prevent excessive backdating
    oldest_allowed = now - timedelta(days=MAX_BACKDATE_DAYS)
    if timestamp < oldest_allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Timestamp cannot be older than {MAX_BACKDATE_DAYS} days"
        )
```

**Frontend Warning:**
```javascript
// Add visual warning when logging past events
if (timestampAge > 24 hours) {
    showWarning("⚠️ You're logging an event from more than 24 hours ago. Please confirm this is accurate.");
}
```

**Implementation Priority:** MEDIUM-HIGH

---

### 3. Authentication and Authorization

**Current State:**
- Authentication handled by Tailscale VPN
- All authenticated users have full access
- No role-based access control (RBAC)
- No differentiation between staff and administrators

**Risks for Larger Deployment:**
- All users can edit/delete all data
- No separation of duties
- Staff could modify their own performance metrics
- No administrative controls

**Recommended Solutions:**

```python
# Add user roles
class UserRole(str, Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    STAFF = "staff"
    READONLY = "readonly"

# Add to staff table
ALTER TABLE staff ADD COLUMN role VARCHAR(20) DEFAULT 'staff';

# Implement permission checks
def require_permission(required_role: UserRole):
    def decorator(func):
        async def wrapper(*args, request: Request, **kwargs):
            user = await get_current_user(request)
            if user.role not in get_allowed_roles(required_role):
                raise HTTPException(status_code=403, detail="Insufficient permissions")
            return await func(*args, request=request, **kwargs)
        return wrapper
    return decorator

@app.patch("/api/interactions/{interaction_id}")
@require_permission(UserRole.MANAGER)  # Only managers+ can edit interactions
async def update_interaction(...):
    ...
```

**Permissions Matrix:**
| Action | Staff | Manager | Admin |
|--------|-------|---------|-------|
| Log interaction | ✓ | ✓ | ✓ |
| Edit own interaction (< 1 hour) | ✓ | ✓ | ✓ |
| Edit any interaction | ✗ | ✓ | ✓ |
| Delete interaction | ✗ | ✗ | ✓ |
| View analytics | ✓ | ✓ | ✓ |
| Export data | ✗ | ✓ | ✓ |

**Implementation Priority:** HIGH

---

### 4. Rate Limiting and DoS Protection

**Current State:**
- No rate limiting on API endpoints
- No protection against rapid-fire requests
- No request throttling

**Risks for Larger Deployment:**
- API abuse
- Database overload
- Denial of service attacks
- Resource exhaustion

**Recommended Solutions:**

```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.post("/api/interactions")
@limiter.limit("60/minute")  # Max 60 interactions per minute
async def create_interaction(...):
    ...

@app.patch("/api/interactions/{interaction_id}")
@limiter.limit("30/minute")  # Max 30 edits per minute
async def update_interaction(...):
    ...
```

**Implementation Priority:** MEDIUM

---

### 5. Input Validation and Injection Prevention

**Current State:**
- ✅ Now implemented: Input validation for interaction fields
- ✅ Parameterized queries prevent SQL injection
- ⚠️ No input sanitization for notes/free-text fields
- ⚠️ No XSS protection for user-generated content

**Risks for Larger Deployment:**
- Cross-site scripting (XSS) attacks via notes field
- Injection of malicious scripts
- Data corruption via invalid input

**Recommended Solutions:**

```python
import html
import bleach

ALLOWED_HTML_TAGS = []  # No HTML allowed in notes
ALLOWED_ATTRIBUTES = {}

def sanitize_text(text: str) -> str:
    """Sanitize user input to prevent XSS."""
    if not text:
        return text
    # Strip all HTML tags
    return bleach.clean(text, tags=ALLOWED_HTML_TAGS, attributes=ALLOWED_ATTRIBUTES, strip=True)

# Apply to notes field
if update.notes is not None:
    updates.append(f"notes = ${param_idx}")
    params.append(sanitize_text(update.notes))
    param_idx += 1
```

**Frontend:**
```javascript
// Escape HTML when displaying notes
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
```

**Implementation Priority:** HIGH (for public deployment)

---

### 6. Data Privacy and GDPR Compliance

**Current State:**
- No data retention policies
- No data export capability for users
- No data deletion guarantees
- Soft-delete allows data recovery indefinitely

**Risks for Larger Deployment:**
- GDPR/privacy law violations
- Inability to comply with "right to be forgotten"
- Regulatory fines
- Loss of customer trust

**Recommended Solutions:**

1. **Data Retention Policy:**
```python
# Schedule hard-delete of soft-deleted items after 90 days
async def cleanup_old_deleted_records():
    """Permanently delete soft-deleted records older than 90 days."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=90)
    async with db_pool.acquire() as conn:
        result = await conn.execute("""
            DELETE FROM interactions
            WHERE deleted_at IS NOT NULL
            AND deleted_at < $1
        """, cutoff)
    return result
```

2. **Data Export Endpoint:**
```python
@app.get("/api/data-export")
async def export_user_data(request: Request):
    """Export all data for current user (GDPR compliance)."""
    # Return JSON with all user's data
    pass
```

3. **Hard Delete Endpoint:**
```python
@app.delete("/api/interactions/{id}/permanent")
@require_permission(UserRole.ADMIN)
async def permanent_delete(interaction_id: str):
    """Permanently delete interaction (GDPR right to deletion)."""
    pass
```

**Implementation Priority:** CRITICAL (for public deployment with EU users)

---

### 7. Secure Session Management

**Current State:**
- Sessions managed by Tailscale
- No session timeout
- No session invalidation mechanism

**Risks for Larger Deployment:**
- Session hijacking
- Unlimited session lifetime
- No forced logout capability

**Recommended Solutions:**

```python
# Add session management
from datetime import timedelta
import secrets

SESSION_TIMEOUT = timedelta(hours=8)

sessions = {}  # In production, use Redis

def create_session(user_id: str) -> str:
    session_token = secrets.token_urlsafe(32)
    sessions[session_token] = {
        'user_id': user_id,
        'created_at': datetime.now(timezone.utc),
        'last_activity': datetime.now(timezone.utc)
    }
    return session_token

def validate_session(session_token: str) -> bool:
    if session_token not in sessions:
        return False

    session = sessions[session_token]
    now = datetime.now(timezone.utc)

    # Check timeout
    if now - session['last_activity'] > SESSION_TIMEOUT:
        del sessions[session_token]
        return False

    # Update last activity
    session['last_activity'] = now
    return True
```

**Implementation Priority:** HIGH

---

### 8. HTTPS and Transport Security

**Current State:**
- Running over Tailscale encrypted tunnel
- No HTTPS enforcement at application level

**Risks for Larger Deployment:**
- Man-in-the-middle attacks (if outside VPN)
- Data interception
- Session hijacking

**Recommended Solutions:**

1. **Enforce HTTPS:**
```python
from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware

# Add to production config only
if os.environ.get("ENVIRONMENT") == "production":
    app.add_middleware(HTTPSRedirectMiddleware)
```

2. **Security Headers:**
```python
from fastapi.middleware.trustedhost import TrustedHostMiddleware

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["yourdomain.com", "*.yourdomain.com"]
)

@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response
```

**Implementation Priority:** CRITICAL

---

### 9. Database Security

**Current State:**
- Database credentials in plaintext in code
- Connection string exposed
- No connection encryption
- Direct database access

**Risks for Larger Deployment:**
- Credential theft
- Unauthorized database access
- Data breaches

**Recommended Solutions:**

1. **Use Environment Variables:**
```python
# Never commit credentials
DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL environment variable not set")
```

2. **Use Secrets Management:**
```python
# Use AWS Secrets Manager, HashiCorp Vault, etc.
import boto3

def get_database_credentials():
    client = boto3.client('secretsmanager')
    secret = client.get_secret_value(SecretId='booth-tracker/db')
    return json.loads(secret['SecretString'])
```

3. **Enable SSL/TLS for Database Connections:**
```python
db_pool = await asyncpg.create_pool(
    DATABASE_URL,
    ssl='require',  # Require SSL connection
    min_size=2,
    max_size=10
)
```

**Implementation Priority:** HIGH

---

### 10. Error Handling and Information Disclosure

**Current State:**
- Detailed error messages returned to client
- Stack traces potentially exposed
- Database errors visible to users

**Risks for Larger Deployment:**
- Information leakage
- System architecture disclosure
- Aid to attackers

**Recommended Solutions:**

```python
@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    # Log detailed error server-side
    logger.error(f"Unhandled exception: {exc}", exc_info=True)

    # Return generic error to client
    return JSONResponse(
        status_code=500,
        content={
            "detail": "An internal error occurred. Please try again later.",
            "error_id": generate_error_id()  # For support reference
        }
    )
```

**Implementation Priority:** MEDIUM

---

## Testing and Monitoring

### Security Testing Checklist

Before public deployment, perform:

- [ ] Penetration testing
- [ ] SQL injection testing
- [ ] XSS vulnerability scanning
- [ ] Authentication bypass testing
- [ ] Authorization testing (privilege escalation)
- [ ] Rate limiting verification
- [ ] Session management testing
- [ ] Input validation testing
- [ ] CSRF protection verification
- [ ] API abuse testing

### Monitoring and Alerting

Implement monitoring for:

- **Failed login attempts** (threshold: 5 per user per hour)
- **Mass data modifications** (threshold: 50 edits per user per hour)
- **Unusual API patterns** (spikes in requests)
- **Database errors** (connection failures, query timeouts)
- **Timestamp anomalies** (backdating beyond normal range)
- **Rate limit hits** (users hitting rate limits)

---

## Compliance Considerations

### For Public Deployment

- **GDPR** (EU users): Data export, right to deletion, consent management
- **CCPA** (California users): Data disclosure, opt-out mechanisms
- **SOC 2** (Enterprise customers): Audit trails, access controls, encryption
- **PCI DSS** (If handling payments in future): Payment data isolation, encryption

---

## Implementation Roadmap

### Phase 1: Critical Security (Before ANY public access)
1. Implement HTTPS and transport security
2. Add authentication/authorization beyond VPN
3. Implement audit logging
4. Add rate limiting
5. Secure database credentials
6. Add input sanitization

### Phase 2: Enhanced Security (Before larger deployment)
1. Timestamp manipulation controls
2. Session management
3. Error handling improvements
4. Security headers and CSP
5. Monitoring and alerting

### Phase 3: Compliance (Before public/enterprise deployment)
1. GDPR compliance features
2. Data retention policies
3. Privacy controls
4. Compliance documentation
5. Third-party security audit

---

## Cost-Benefit Analysis

For **internal-only** deployment:
- Current security posture is ACCEPTABLE
- VPN provides strong boundary protection
- Trusted users mitigate many risks
- Audit trail would be NICE TO HAVE but not critical

For **larger internal** deployment (50+ users):
- Audit trail becomes RECOMMENDED
- Timestamp controls become IMPORTANT
- RBAC becomes RECOMMENDED

For **public** deployment:
- ALL items become CRITICAL
- Estimated implementation: 4-6 weeks development
- Ongoing security maintenance required
- Third-party security audit recommended ($10k-$50k)

---

## Conclusion

The current implementation is appropriate for internal, VPN-protected use with a small team of trusted employees. However, expansion beyond this context would require significant security enhancements as outlined in this document.

**Key Takeaway:** Do not expose this application to the public internet or untrusted users without implementing AT MINIMUM the Phase 1 critical security measures.

---

## Contact

For security concerns or questions about this document, contact your security team or the application maintainer.

**Last Updated:** 2025-12-22
