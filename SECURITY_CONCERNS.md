# Security Concerns

This document lists security concerns identified during development that should be addressed before production use.

---

## 1. Database Password Exposure

**Severity: High**

### Issue
The PostgreSQL password is exposed in multiple locations:

1. **Hardcoded in source code** (`api/main.py` line 14-17):
   ```python
   DATABASE_URL = os.environ.get(
       "DATABASE_URL",
       "postgresql://postgres:<PASSWORD>@persistence:5432/lumicello_insights"
   )
   ```
   This fallback default means credentials are in version control.

2. **Plaintext in `.env` file** on the deployment server

3. **Visible via `docker inspect`** on the persistence server

### Recommendation
- Remove hardcoded fallback from `main.py` - application should fail if `DATABASE_URL` is not set
- Use a secrets manager (e.g., Infisical, HashiCorp Vault, or Docker secrets)
- Rotate the database password after implementing proper secrets management

---

## 2. Shared Database Credentials

**Severity: Medium**

### Issue
The `lumicello_insights` database uses the same `postgres` superuser account that other applications (e.g., Umami) use on the persistence server.

### Recommendation
- Create a dedicated database user for `lumicello_insights` with minimal required permissions
- Use separate credentials per application

---

## 3. No Authentication Layer

**Severity: Low (mitigated by Tailscale)**

### Issue
The API has no traditional authentication (no API keys, no JWT tokens). It relies entirely on Tailscale network access for security.

### Current Mitigation
- Only devices on the Tailscale network can access the API
- Device identity is verified via Tailscale Local API

### Recommendation
- This is acceptable for the current use case (internal booth tracking tool)
- If exposed beyond Tailscale, add proper authentication

---

## 4. Auto-Registration of Any Tailscale Device

**Severity: Low**

### Issue
Any device that joins the Tailscale network is automatically registered as staff and can log interactions (`api/main.py` `/api/whoami` and `/api/interactions` endpoints).

### Current Mitigation
- Tailscale network membership is controlled by the network admin

### Recommendation
- For higher security, maintain an allowlist of approved device hostnames
- Or require manual staff registration before devices can log interactions

---

## Action Items

| Item | Owner | Status |
|------|-------|--------|
| Remove hardcoded DB password from main.py | TBD | Pending |
| Set up Infisical for secrets management | TBD | Pending |
| Create dedicated DB user for lumicello_insights | TBD | Pending |
| Rotate database password | TBD | Pending |

---

*Document created: 2025-12-19*
*Last updated: 2025-12-19*
