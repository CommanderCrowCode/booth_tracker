"""Lumicello Event Insights Logger API"""
import os
from contextlib import asynccontextmanager
from datetime import date, datetime, timedelta
from typing import Optional
from uuid import UUID

import asyncpg
import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://postgres:26Nse4RDplFJfqkwHyUUPPrp@persistence:5432/lumicello_insights"
)
TAILSCALE_SOCKET = "/var/run/tailscale/tailscaled.sock"


# Database connection pool
db_pool: Optional[asyncpg.Pool] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global db_pool
    db_pool = await asyncpg.create_pool(DATABASE_URL, min_size=2, max_size=10)
    yield
    await db_pool.close()


app = FastAPI(title="Lumicello Insights API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Pydantic models
class InteractionCreate(BaseModel):
    interaction_type: str  # walk_by or conversation
    persona: Optional[str] = None
    hook: Optional[str] = None
    sale_type: Optional[str] = None
    quantity: Optional[int] = 1
    unit_price: Optional[int] = None
    total_amount: Optional[int] = None
    lead_type: Optional[str] = None
    objection: Optional[str] = None


class StaffCreate(BaseModel):
    device_name: str
    display_name: str


# Helper: Get Tailscale device info from IP
async def get_tailscale_device(client_ip: str) -> Optional[dict]:
    """Query Tailscale local API to get device info from IP."""
    try:
        transport = httpx.AsyncHTTPTransport(uds=TAILSCALE_SOCKET)
        async with httpx.AsyncClient(transport=transport, timeout=5.0) as client:
            response = await client.get("http://local-tailscaled.sock/localapi/v0/status")
            data = response.json()

            # Check Peer map
            peers = data.get("Peer", {})
            for node_key, peer in peers.items():
                # TailscaleIPs is a list of IPs for this peer
                tailscale_ips = peer.get("TailscaleIPs", [])
                if client_ip in tailscale_ips:
                    return {
                        "hostname": peer.get("HostName", "").lower(),
                        "online": peer.get("Online", False),
                        "display_name": peer.get("DisplayName", peer.get("HostName", ""))
                    }

            # Also check Self
            self_node = data.get("Self", {})
            self_ips = self_node.get("TailscaleIPs", [])
            if client_ip in self_ips:
                return {
                    "hostname": self_node.get("HostName", "").lower(),
                    "online": True,
                    "display_name": self_node.get("DisplayName", self_node.get("HostName", ""))
                }

    except Exception as e:
        print(f"Tailscale API error: {e}")
    return None


def get_client_ip(request: Request) -> str:
    """Extract client IP from request, checking forwarded headers."""
    # Check X-Forwarded-For first (for reverse proxy setups)
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()

    # Check X-Real-IP
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip

    # Fall back to direct connection
    return request.client.host if request.client else "unknown"


@app.get("/api/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}


@app.get("/api/whoami")
async def whoami(request: Request):
    """Identify staff member from Tailscale IP. Auto-registers any Tailscale device."""
    client_ip = get_client_ip(request)

    # Get device info from Tailscale
    device = await get_tailscale_device(client_ip)
    if not device:
        raise HTTPException(status_code=404, detail=f"Device not found for IP {client_ip}. Are you connected via Tailscale?")

    hostname = device["hostname"]
    display_name = device["display_name"] or hostname.title()

    # Auto-register if not in staff table (any Tailscale device is trusted)
    async with db_pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT device_name, display_name FROM staff WHERE device_name = $1",
            hostname
        )

        if not row:
            # Auto-register this Tailscale device
            await conn.execute(
                "INSERT INTO staff (device_name, display_name) VALUES ($1, $2) ON CONFLICT DO NOTHING",
                hostname, display_name
            )
            row = {"device_name": hostname, "display_name": display_name}

    return {
        "device": row["device_name"],
        "name": row["display_name"],
        "ip": client_ip
    }


@app.get("/api/stats")
async def get_stats(period: str = "today"):
    """Get aggregated stats for dashboard."""
    now = datetime.utcnow()

    if period == "today":
        start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "week":
        start_date = now - timedelta(days=7)
    else:  # all
        start_date = datetime(2020, 1, 1)

    async with db_pool.acquire() as conn:
        # Total visitors (walk_by + conversation)
        visitors = await conn.fetchval(
            "SELECT COUNT(*) FROM interactions WHERE timestamp >= $1",
            start_date
        )

        # Conversations only
        conversations = await conn.fetchval(
            "SELECT COUNT(*) FROM interactions WHERE timestamp >= $1 AND interaction_type = 'conversation'",
            start_date
        )

        # Walk-bys only
        walk_bys = await conn.fetchval(
            "SELECT COUNT(*) FROM interactions WHERE timestamp >= $1 AND interaction_type = 'walk_by'",
            start_date
        )

        # Sales count and revenue
        sales_data = await conn.fetchrow("""
            SELECT
                COUNT(*) as sales_count,
                COALESCE(SUM(total_amount), 0) as revenue
            FROM interactions
            WHERE timestamp >= $1
            AND sale_type IS NOT NULL
            AND sale_type != 'none'
        """, start_date)

        # Boxes sold
        boxes = await conn.fetchval("""
            SELECT COALESCE(SUM(
                CASE
                    WHEN sale_type = 'single' THEN quantity
                    WHEN sale_type = 'bundle_3' THEN 3
                    WHEN sale_type = 'full_year' THEN 12
                    ELSE 0
                END
            ), 0)
            FROM interactions
            WHERE timestamp >= $1 AND sale_type IS NOT NULL AND sale_type != 'none'
        """, start_date)

        # Price breakdown (990 vs 1290)
        price_990 = await conn.fetchval(
            "SELECT COUNT(*) FROM interactions WHERE timestamp >= $1 AND unit_price = 990",
            start_date
        )
        price_1290 = await conn.fetchval(
            "SELECT COUNT(*) FROM interactions WHERE timestamp >= $1 AND unit_price = 1290",
            start_date
        )

        # Product mix
        product_mix = await conn.fetch("""
            SELECT sale_type, COUNT(*) as count
            FROM interactions
            WHERE timestamp >= $1 AND sale_type IS NOT NULL AND sale_type != 'none'
            GROUP BY sale_type
        """, start_date)

        # Personas (buyers only)
        personas = await conn.fetch("""
            SELECT persona, COUNT(*) as count
            FROM interactions
            WHERE timestamp >= $1 AND persona IS NOT NULL
            AND sale_type IS NOT NULL AND sale_type != 'none'
            GROUP BY persona
        """, start_date)

        # Hooks (all conversations)
        hooks = await conn.fetch("""
            SELECT hook, COUNT(*) as count
            FROM interactions
            WHERE timestamp >= $1 AND hook IS NOT NULL
            GROUP BY hook
        """, start_date)

        # No-sale reasons
        objections = await conn.fetch("""
            SELECT objection, COUNT(*) as count
            FROM interactions
            WHERE timestamp >= $1 AND objection IS NOT NULL
            GROUP BY objection
        """, start_date)

        # Leads
        line_leads = await conn.fetchval(
            "SELECT COUNT(*) FROM interactions WHERE timestamp >= $1 AND lead_type = 'line'",
            start_date
        )
        email_leads = await conn.fetchval(
            "SELECT COUNT(*) FROM interactions WHERE timestamp >= $1 AND lead_type = 'email'",
            start_date
        )

    return {
        "period": period,
        "visitors": visitors or 0,
        "conversations": conversations or 0,
        "walk_bys": walk_bys or 0,
        "sales": {
            "count": sales_data["sales_count"] or 0,
            "revenue": sales_data["revenue"] or 0,
            "boxes": boxes or 0,
            "avg_per_sale": round(sales_data["revenue"] / sales_data["sales_count"]) if sales_data["sales_count"] else 0
        },
        "price_validation": {
            "price_990": price_990 or 0,
            "price_1290": price_1290 or 0
        },
        "product_mix": {row["sale_type"]: row["count"] for row in product_mix},
        "personas": {row["persona"]: row["count"] for row in personas},
        "hooks": {row["hook"]: row["count"] for row in hooks},
        "objections": {row["objection"]: row["count"] for row in objections},
        "leads": {
            "line": line_leads or 0,
            "email": email_leads or 0
        }
    }


@app.post("/api/interactions")
async def create_interaction(interaction: InteractionCreate, request: Request):
    """Create a new interaction record."""
    client_ip = get_client_ip(request)

    # Get device info
    device = await get_tailscale_device(client_ip)
    if not device:
        raise HTTPException(status_code=401, detail="Unknown device. Are you connected via Tailscale?")

    hostname = device["hostname"]
    display_name = device["display_name"] or hostname.title()

    # Auto-register if needed (any Tailscale device is trusted)
    async with db_pool.acquire() as conn:
        await conn.execute(
            "INSERT INTO staff (device_name, display_name) VALUES ($1, $2) ON CONFLICT DO NOTHING",
            hostname, display_name
        )

        # Calculate total_amount if not provided
        total_amount = interaction.total_amount
        if total_amount is None and interaction.sale_type:
            if interaction.sale_type == "single" and interaction.unit_price:
                total_amount = interaction.quantity * interaction.unit_price
            elif interaction.sale_type == "bundle_3":
                total_amount = 2690
            elif interaction.sale_type == "full_year":
                total_amount = 4990

        # Insert interaction
        row = await conn.fetchrow("""
            INSERT INTO interactions (
                staff_device, interaction_type, persona, hook,
                sale_type, quantity, unit_price, total_amount,
                lead_type, objection
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id, timestamp
        """,
            hostname,
            interaction.interaction_type,
            interaction.persona,
            interaction.hook,
            interaction.sale_type,
            interaction.quantity,
            interaction.unit_price,
            total_amount,
            interaction.lead_type,
            interaction.objection
        )

    return {
        "id": str(row["id"]),
        "timestamp": row["timestamp"].isoformat(),
        "staff_device": hostname
    }


@app.get("/api/interactions")
async def list_interactions(date_filter: Optional[str] = None, limit: int = 100):
    """List interactions, optionally filtered by date."""
    async with db_pool.acquire() as conn:
        if date_filter:
            target_date = datetime.strptime(date_filter, "%Y-%m-%d").date()
            rows = await conn.fetch("""
                SELECT * FROM interactions
                WHERE DATE(timestamp) = $1
                ORDER BY timestamp DESC
                LIMIT $2
            """, target_date, limit)
        else:
            rows = await conn.fetch("""
                SELECT * FROM interactions
                ORDER BY timestamp DESC
                LIMIT $1
            """, limit)

    return [dict(row) for row in rows]


@app.get("/api/staff")
async def list_staff():
    """List all registered staff."""
    async with db_pool.acquire() as conn:
        rows = await conn.fetch("SELECT * FROM staff ORDER BY display_name")
    return [dict(row) for row in rows]


@app.post("/api/staff")
async def create_staff(staff: StaffCreate):
    """Register a new staff device."""
    async with db_pool.acquire() as conn:
        try:
            await conn.execute(
                "INSERT INTO staff (device_name, display_name) VALUES ($1, $2)",
                staff.device_name.lower(),
                staff.display_name
            )
        except asyncpg.UniqueViolationError:
            raise HTTPException(status_code=409, detail="Device already registered")

    return {"device_name": staff.device_name.lower(), "display_name": staff.display_name}
