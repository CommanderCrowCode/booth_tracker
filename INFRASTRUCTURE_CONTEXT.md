# Infrastructure Context for Lumicello Event Insights Logger

This document provides all the infrastructure context needed to build and deploy the Lumicello Event Insights Logger PWA.

**You are working on `tenacity` (this server).**

## Quick Reference

| Resource | Value |
|----------|-------|
| **Build/Deploy Server** | `tenacity` (100.126.31.92) - **YOU ARE HERE** |
| **Database Server** | `persistence` (100.108.114.120) |
| **PostgreSQL Port** | 5432 on persistence |
| **PWA Port** | 3000 (available on tenacity) |
| **API Port** | 8000 (available on tenacity) |
| **Network** | Tailscale VPN only (no public internet) |
| **Tailscale Socket** | `/var/run/tailscale/tailscaled.sock` (verified accessible) |

---

## This Server: tenacity

### Currently Running Services

| Container | Port | Status |
|-----------|------|--------|
| `big-garden-prod` | 8111 | Healthy |
| `workout-tracker` | 8889 | Unhealthy |
| `compscout-postgres` | 127.0.0.1:5432 | Healthy (local only) |
| `compscout-redis` | 127.0.0.1:6379 | Healthy (local only) |
| `dozzle` | 8888 | Unhealthy |

### Available Ports for Insights Logger

| Port | Status | Suggested Use |
|------|--------|---------------|
| **3000** | Available | Insights Logger PWA |
| **8000** | Available | FastAPI Backend |

Note: Port 5432 is used locally by compscout-postgres but bound to 127.0.0.1 only.

### Existing Docker Networks

Relevant networks on tenacity:
- `production_big-garden-prod-network`
- `production_lumigrow-prod-network`

Create a new network for insights logger: `production_insights-network`

### Working Directory

```
/home/tanwa/dominion/production/
```

The repo is cloned here. Deploy configs live in `servers/tenacity/`.

---

## Tailscale Network

### All Devices

```
100.126.31.92    tenacity       tanwa@     linux    ← YOU ARE HERE
100.108.114.120  persistence    tanwa@     linux    ← PostgreSQL database
100.91.254.73    velocity       tanwa@     linux
100.74.12.15     metron         tanwa@     linux
100.80.219.114   sisia          veerapat@  macOS
100.75.11.120    darling-nikki  tanwa@     macOS
100.75.148.105   black-sweat    tanwa@     iOS
```

### Tailscale Socket (Verified)

```bash
$ ls -la /var/run/tailscale/tailscaled.sock
srw-rw-rw- 1 root root 0 Dec  2 14:18 /var/run/tailscale/tailscaled.sock
```

Socket is accessible and ready for Docker volume mount.

---

## Database: PostgreSQL on persistence

### Connection Details

```
Host:     persistence (or 100.108.114.120 via Tailscale)
Port:     5432
User:     postgres
Password: (ask Tanwa - stored in .env on persistence)
```

### Connection String

```
DATABASE_URL=postgresql://postgres:PASSWORD@persistence:5432/lumicello_insights
```

### Existing Databases on persistence

| Database | Purpose |
|----------|---------|
| `postgres` | Default/admin |
| `umami_db` | Umami web analytics |
| `lumicello_insights` | **TO BE CREATED** |

### Creating lumicello_insights Database

SSH to persistence and run:

```bash
ssh persistence
docker exec -it postgres psql -U postgres -c "CREATE DATABASE lumicello_insights;"
```

### Docker Compose on persistence

The persistence server runs:
- **PostgreSQL 15** (Alpine) on port 5432
- **Umami Analytics** on port 3001
- **Grafana Alloy** for metrics

All services are on a `persistence-net` bridge network.

---

## Authentication: Tailscale Local API

### How It Works

The PRD specifies zero-login authentication via Tailscale device identification.

```
┌─────────────────────────────────────┐
│ Staff phone (Tailscale IP)          │
│ e.g., 100.80.219.114 (sisia)        │
└───────────────┬─────────────────────┘
                │ HTTP request
                ▼
┌─────────────────────────────────────┐
│ FastAPI on tenacity                 │
│ 1. Get client IP from request       │
│ 2. Query Tailscale Local API        │
│ 3. Map IP → device name → staff     │
└─────────────────────────────────────┘
```

### Tailscale Local API Access

The Tailscale daemon exposes a local API via Unix socket:

```
/var/run/tailscale/tailscaled.sock
```

Query example:

```bash
curl --unix-socket /var/run/tailscale/tailscaled.sock http://local-tailscaled.sock/localapi/v0/status
```

Response includes peer mapping:

```json
{
  "Peer": {
    "100.80.219.114": {
      "HostName": "sisia",
      "Online": true
    }
  }
}
```

### Docker Socket Mount

To access Tailscale from Docker, mount the socket:

```yaml
volumes:
  - /var/run/tailscale/tailscaled.sock:/var/run/tailscale/tailscaled.sock:ro
```

### Python Example (FastAPI)

```python
import httpx
from fastapi import Request

async def get_tailscale_device(client_ip: str) -> dict | None:
    """Query Tailscale local API to get device info from IP."""
    transport = httpx.HTTPTransport(uds="/var/run/tailscale/tailscaled.sock")
    async with httpx.AsyncClient(transport=transport) as client:
        response = await client.get("http://local-tailscaled.sock/localapi/v0/status")
        data = response.json()

        for ip, peer in data.get("Peer", {}).items():
            if ip == client_ip:
                return {
                    "hostname": peer.get("HostName"),
                    "online": peer.get("Online", False)
                }
    return None
```

---

## Registered Staff Devices

Staff devices are registered in the `staff` table. When a new device joins the Tailscale network, add it:

```sql
INSERT INTO staff (device_name, display_name) VALUES ('device-hostname', 'Staff Name');
```

To find a device's hostname after joining:

```bash
tailscale status
```

---

## Network Security Model

- **Tailscale-only access**: No public internet exposure
- **Zero-trust**: All inter-server communication via encrypted Tailscale mesh
- **No firewall rules needed**: Tailscale handles authentication

### Accessing Services

From any Tailscale-connected device:

```bash
# PWA
http://tenacity:3000

# API
http://tenacity:8000/api

# Database (tools only)
postgresql://postgres:PASSWORD@persistence:5432/lumicello_insights
```

---

## Docker Patterns (Follow Existing Conventions)

Based on the persistence server's docker-compose.yml:

```yaml
version: "3.8"

services:
  my-service:
    container_name: my-service
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - default

networks:
  default:
    driver: bridge
```

### Environment Variables

Use `.env` file with `.env.example` template:

```bash
# .env.example
DATABASE_URL=postgresql://postgres:CHANGE_ME@persistence:5432/lumicello_insights
```

---

## Pre-Deployment Checklist

### On persistence (database server)

- [ ] Create `lumicello_insights` database
- [ ] Verify PostgreSQL is accessible from tenacity

```bash
# Run this on tenacity (this server)
docker run --rm postgres:15-alpine psql postgresql://postgres:PASSWORD@persistence:5432/lumicello_insights -c "SELECT 1;"
```

### On tenacity (this server)

- [x] Verify Tailscale socket exists ✓ (confirmed: `/var/run/tailscale/tailscaled.sock`)
- [ ] Create project directory in repo: `servers/tenacity/insights-logger/`
- [ ] Create docker-compose.yml
- [ ] Create .env with database credentials (get password from Tanwa)
- [ ] Build and deploy containers

### Staff Devices

- [ ] Veerapat joins Tailscale with new device
- [ ] Register device in `staff` table
- [ ] Test: Can device reach http://tenacity:3000?

---

## Monitoring (Future)

Once vigilance server is deployed, add metrics:

```yaml
# In insights-api Dockerfile or compose
labels:
  - "prometheus.scrape=true"
  - "prometheus.port=8000"
  - "prometheus.path=/metrics"
```

---

## Contacts

| Role | Person | Tailscale Device |
|------|--------|------------------|
| Infrastructure Owner | Tanwa | darling-nikki |
| Staff | Veerapat | sisia |

---

## Appendix: Full Tailscale Status Command

```bash
tailscale status
```

Useful for debugging connectivity:

```bash
# Check if device can reach tenacity
tailscale ping tenacity

# Check if device can reach persistence
tailscale ping persistence
```
