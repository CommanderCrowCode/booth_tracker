"""Lumicello Event Insights Logger API - Phase 2 & 3 with Real-time Updates"""
import asyncio
import json
import os
import re
from contextlib import asynccontextmanager
from datetime import date, datetime, timedelta, timezone
from typing import Optional, List, Set
from uuid import UUID

import asyncpg
import httpx
from fastapi import FastAPI, HTTPException, Request, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://postgres:26Nse4RDplFJfqkwHyUUPPrp@persistence:5432/lumicello_insights"
)
TAILSCALE_SOCKET = "/var/run/tailscale/tailscaled.sock"

# Validation constants
VALID_INTERACTION_TYPES = {"walk_by", "conversation"}
VALID_PERSONAS = {"parent", "gift_buyer", "expat", "future_parent"}
VALID_HOOKS = {"physical_kits", "big_garden", "signage"}
VALID_SALE_TYPES = {"none", "single", "bundle_3", "full_year"}
VALID_LEAD_TYPES = {"line", "email"}
VALID_OBJECTIONS = {
    "too_expensive", "not_interested", "no_time", "already_have",
    "need_to_think", "language_barrier", "other"
}

# Pricing constants
PRICE_990 = 990
PRICE_1290 = 1290
BUNDLE_3_PRICE = 2690
FULL_YEAR_PRICE = 4990

# Timestamp validation constants
MAX_BACKDATE_DAYS = 30  # Maximum days in the past for custom timestamps


# Database connection pool
db_pool: Optional[asyncpg.Pool] = None

# SSE Broadcaster - manages connected clients for real-time updates
class SSEBroadcaster:
    def __init__(self):
        self.clients: Set[asyncio.Queue] = set()
        self._listener_task: Optional[asyncio.Task] = None
        self._listener_conn: Optional[asyncpg.Connection] = None
        self._pool: Optional[asyncpg.Pool] = None

    async def start_listening(self, pool: asyncpg.Pool):
        """Start listening to PostgreSQL notifications."""
        self._pool = pool
        self._listener_conn = await pool.acquire()
        try:
            await self._listener_conn.add_listener('data_change', self._on_notification)
            print("SSE: Started listening for database notifications")
        except Exception as e:
            # Release connection on failure to prevent leak
            await pool.release(self._listener_conn)
            self._listener_conn = None
            raise e

    def _on_notification(self, conn, pid, channel, payload):
        """Handle incoming PostgreSQL notifications."""
        asyncio.create_task(self._broadcast(payload))

    async def _broadcast(self, message: str):
        """Broadcast message to all connected SSE clients."""
        disconnected = set()
        for queue in self.clients:
            try:
                await queue.put(message)
            except Exception:
                disconnected.add(queue)
        # Clean up disconnected clients
        self.clients -= disconnected

    async def subscribe(self) -> asyncio.Queue:
        """Subscribe a new client and return their message queue."""
        queue = asyncio.Queue()
        self.clients.add(queue)
        return queue

    def unsubscribe(self, queue: asyncio.Queue):
        """Unsubscribe a client."""
        self.clients.discard(queue)

    async def stop(self):
        """Stop listening and clean up."""
        if self._listener_conn:
            await self._listener_conn.remove_listener('data_change', self._on_notification)
            if self._pool:
                await self._pool.release(self._listener_conn)
            self._listener_conn = None

# Global broadcaster instance
broadcaster = SSEBroadcaster()


@asynccontextmanager
async def lifespan(app: FastAPI):
    global db_pool
    db_pool = await asyncpg.create_pool(DATABASE_URL, min_size=2, max_size=10)

    # Start SSE listener for real-time notifications
    try:
        await broadcaster.start_listening(db_pool)
    except Exception as e:
        print(f"Warning: Could not start SSE listener: {e}")

    yield

    # Cleanup
    await broadcaster.stop()
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
    timestamp: Optional[datetime] = None  # Custom timestamp for logging past events


class StaffCreate(BaseModel):
    device_name: str
    display_name: str


# Phase 2 Models
class InteractionUpdate(BaseModel):
    notes: Optional[str] = None
    deleted: Optional[bool] = None  # True = soft delete, False = restore
    interaction_type: Optional[str] = None
    persona: Optional[str] = None
    hook: Optional[str] = None
    sale_type: Optional[str] = None
    quantity: Optional[int] = None
    unit_price: Optional[int] = None
    total_amount: Optional[int] = None
    lead_type: Optional[str] = None
    objection: Optional[str] = None
    timestamp: Optional[datetime] = None


class SellerCreate(BaseModel):
    display_name: str
    id: Optional[str] = None  # Auto-generated from name if not provided


class SellerUpdate(BaseModel):
    display_name: Optional[str] = None
    is_active: Optional[bool] = None


class SellerSelect(BaseModel):
    seller_id: str


class EventCreate(BaseModel):
    description: str


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
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}


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
    now = datetime.now(timezone.utc)

    if period == "today":
        start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "week":
        start_date = now - timedelta(days=7)
    else:  # all
        start_date = datetime(2020, 1, 1, tzinfo=timezone.utc)

    async with db_pool.acquire() as conn:
        # Total visitors (walk_by + conversation) - exclude deleted
        visitors = await conn.fetchval(
            "SELECT COUNT(*) FROM interactions WHERE timestamp >= $1 AND deleted_at IS NULL",
            start_date
        )

        # Conversations only (engaged = TRUE)
        conversations = await conn.fetchval(
            "SELECT COUNT(*) FROM interactions WHERE timestamp >= $1 AND engaged = TRUE AND deleted_at IS NULL",
            start_date
        )

        # Walk-bys only (engaged = FALSE)
        walk_bys = await conn.fetchval(
            "SELECT COUNT(*) FROM interactions WHERE timestamp >= $1 AND engaged = FALSE AND deleted_at IS NULL",
            start_date
        )

        # Sales count and revenue - exclude deleted
        sales_data = await conn.fetchrow("""
            SELECT
                COUNT(*) as sales_count,
                COALESCE(SUM(total_amount), 0) as revenue
            FROM interactions
            WHERE timestamp >= $1
            AND sale_type IS NOT NULL
            AND sale_type != 'none'
            AND deleted_at IS NULL
        """, start_date)

        # Boxes sold - exclude deleted
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
            WHERE timestamp >= $1 AND sale_type IS NOT NULL AND sale_type != 'none' AND deleted_at IS NULL
        """, start_date)

        # Price breakdown (990 vs 1290) - exclude deleted
        price_990 = await conn.fetchval(
            "SELECT COUNT(*) FROM interactions WHERE timestamp >= $1 AND unit_price = 990 AND deleted_at IS NULL",
            start_date
        )
        price_1290 = await conn.fetchval(
            "SELECT COUNT(*) FROM interactions WHERE timestamp >= $1 AND unit_price = 1290 AND deleted_at IS NULL",
            start_date
        )

        # Product mix - exclude deleted
        product_mix = await conn.fetch("""
            SELECT sale_type, COUNT(*) as count
            FROM interactions
            WHERE timestamp >= $1 AND sale_type IS NOT NULL AND sale_type != 'none' AND deleted_at IS NULL
            GROUP BY sale_type
        """, start_date)

        # Personas (buyers only) - exclude deleted
        personas = await conn.fetch("""
            SELECT persona, COUNT(*) as count
            FROM interactions
            WHERE timestamp >= $1 AND persona IS NOT NULL
            AND sale_type IS NOT NULL AND sale_type != 'none' AND deleted_at IS NULL
            GROUP BY persona
        """, start_date)

        # Hooks (all conversations) - exclude deleted
        hooks = await conn.fetch("""
            SELECT hook, COUNT(*) as count
            FROM interactions
            WHERE timestamp >= $1 AND hook IS NOT NULL AND deleted_at IS NULL
            GROUP BY hook
        """, start_date)

        # No-sale reasons - exclude deleted
        objections = await conn.fetch("""
            SELECT objection, COUNT(*) as count
            FROM interactions
            WHERE timestamp >= $1 AND objection IS NOT NULL AND deleted_at IS NULL
            GROUP BY objection
        """, start_date)

        # Leads - exclude deleted
        line_leads = await conn.fetchval(
            "SELECT COUNT(*) FROM interactions WHERE timestamp >= $1 AND lead_type = 'line' AND deleted_at IS NULL",
            start_date
        )
        email_leads = await conn.fetchval(
            "SELECT COUNT(*) FROM interactions WHERE timestamp >= $1 AND lead_type = 'email' AND deleted_at IS NULL",
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

    async with db_pool.acquire() as conn:
        # Auto-register staff if needed
        await conn.execute(
            "INSERT INTO staff (device_name, display_name) VALUES ($1, $2) ON CONFLICT DO NOTHING",
            hostname, display_name
        )

        # Get active seller for this device (Phase 3)
        staff_row = await conn.fetchrow(
            "SELECT active_seller FROM staff WHERE device_name = $1",
            hostname
        )
        seller_id = staff_row["active_seller"] if staff_row else None

        # Calculate total_amount if not provided
        total_amount = interaction.total_amount
        if total_amount is None and interaction.sale_type:
            if interaction.sale_type == "single" and interaction.unit_price:
                total_amount = interaction.quantity * interaction.unit_price
            elif interaction.sale_type == "bundle_3":
                total_amount = BUNDLE_3_PRICE
            elif interaction.sale_type == "full_year":
                total_amount = FULL_YEAR_PRICE

        # Determine engaged status based on interaction type
        engaged = interaction.interaction_type == "conversation"

        # Use provided timestamp or current time (timezone-aware)
        timestamp = interaction.timestamp or datetime.now(timezone.utc)

        # Validate timestamp if provided
        if interaction.timestamp:
            now = datetime.now(timezone.utc)
            # Prevent future timestamps
            if timestamp > now:
                raise HTTPException(status_code=400, detail="Timestamp cannot be in the future")
            # Prevent backdating beyond limit
            min_allowed = now - timedelta(days=MAX_BACKDATE_DAYS)
            if timestamp < min_allowed:
                raise HTTPException(
                    status_code=400,
                    detail=f"Timestamp cannot be more than {MAX_BACKDATE_DAYS} days in the past"
                )

        # Insert interaction with engaged, seller_id, and custom timestamp
        row = await conn.fetchrow("""
            INSERT INTO interactions (
                staff_device, interaction_type, engaged, persona, hook,
                sale_type, quantity, unit_price, total_amount,
                lead_type, objection, seller_id, timestamp
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING id, timestamp
        """,
            hostname,
            interaction.interaction_type,
            engaged,
            interaction.persona,
            interaction.hook,
            interaction.sale_type,
            interaction.quantity,
            interaction.unit_price,
            total_amount,
            interaction.lead_type,
            interaction.objection,
            seller_id,
            timestamp
        )

    return {
        "id": str(row["id"]),
        "timestamp": row["timestamp"].isoformat(),
        "staff_device": hostname,
        "seller_id": seller_id
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


# ============================================================
# PHASE 2: TRANSACTION BROWSER ENDPOINTS
# ============================================================

@app.get("/api/interactions/browse")
async def browse_interactions(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    engaged: Optional[bool] = None,
    sale_types: Optional[str] = None,  # comma-separated
    personas: Optional[str] = None,  # comma-separated
    hooks: Optional[str] = None,  # comma-separated
    staff_devices: Optional[str] = None,  # comma-separated
    seller_ids: Optional[str] = None,  # comma-separated
    objections: Optional[str] = None,  # comma-separated
    has_notes: Optional[bool] = None,
    include_deleted: bool = False,
    limit: int = Query(default=50, le=200),
    offset: int = 0,
    sort: str = "timestamp_desc"
):
    """Filtered, paginated interaction list for transaction browser."""
    conditions = []
    params = []
    param_idx = 1

    # Deleted filter
    if not include_deleted:
        conditions.append("deleted_at IS NULL")

    # Date filters
    if start_date:
        conditions.append(f"timestamp >= ${param_idx}")
        params.append(datetime.fromisoformat(start_date.replace('Z', '+00:00')))
        param_idx += 1

    if end_date:
        conditions.append(f"timestamp <= ${param_idx}")
        params.append(datetime.fromisoformat(end_date.replace('Z', '+00:00')))
        param_idx += 1

    # Engaged filter
    if engaged is not None:
        conditions.append(f"engaged = ${param_idx}")
        params.append(engaged)
        param_idx += 1

    # Sale types filter
    if sale_types:
        types_list = [t.strip() for t in sale_types.split(",")]
        placeholders = ", ".join([f"${param_idx + i}" for i in range(len(types_list))])
        conditions.append(f"sale_type IN ({placeholders})")
        params.extend(types_list)
        param_idx += len(types_list)

    # Personas filter
    if personas:
        persona_list = [p.strip() for p in personas.split(",")]
        placeholders = ", ".join([f"${param_idx + i}" for i in range(len(persona_list))])
        conditions.append(f"persona IN ({placeholders})")
        params.extend(persona_list)
        param_idx += len(persona_list)

    # Hooks filter
    if hooks:
        hooks_list = [h.strip() for h in hooks.split(",")]
        placeholders = ", ".join([f"${param_idx + i}" for i in range(len(hooks_list))])
        conditions.append(f"hook IN ({placeholders})")
        params.extend(hooks_list)
        param_idx += len(hooks_list)

    # Staff devices filter
    if staff_devices:
        devices_list = [d.strip() for d in staff_devices.split(",")]
        placeholders = ", ".join([f"${param_idx + i}" for i in range(len(devices_list))])
        conditions.append(f"staff_device IN ({placeholders})")
        params.extend(devices_list)
        param_idx += len(devices_list)

    # Seller IDs filter
    if seller_ids:
        seller_list = [s.strip() for s in seller_ids.split(",")]
        placeholders = ", ".join([f"${param_idx + i}" for i in range(len(seller_list))])
        conditions.append(f"seller_id IN ({placeholders})")
        params.extend(seller_list)
        param_idx += len(seller_list)

    # Objections filter
    if objections:
        obj_list = [o.strip() for o in objections.split(",")]
        placeholders = ", ".join([f"${param_idx + i}" for i in range(len(obj_list))])
        conditions.append(f"objection IN ({placeholders})")
        params.extend(obj_list)
        param_idx += len(obj_list)

    # Has notes filter
    if has_notes is not None:
        if has_notes:
            conditions.append("notes IS NOT NULL AND notes != ''")
        else:
            conditions.append("(notes IS NULL OR notes = '')")

    # Build WHERE clause
    where_clause = " AND ".join(conditions) if conditions else "TRUE"

    # Sort order
    order_clause = "timestamp DESC" if sort == "timestamp_desc" else "timestamp ASC"

    async with db_pool.acquire() as conn:
        # Get total count
        count_query = f"SELECT COUNT(*) FROM interactions WHERE {where_clause}"
        total = await conn.fetchval(count_query, *params)

        # Get records
        query = f"""
            SELECT i.*, s.display_name as staff_name,
                   sl.display_name as seller_name
            FROM interactions i
            LEFT JOIN staff s ON i.staff_device = s.device_name
            LEFT JOIN sellers sl ON i.seller_id = sl.id
            WHERE {where_clause}
            ORDER BY {order_clause}
            LIMIT ${param_idx} OFFSET ${param_idx + 1}
        """
        params.extend([limit, offset])
        rows = await conn.fetch(query, *params)

    records = []
    for row in rows:
        record = dict(row)
        # Convert UUID and datetime for JSON serialization
        record["id"] = str(record["id"])
        record["timestamp"] = record["timestamp"].isoformat() if record["timestamp"] else None
        record["deleted_at"] = record["deleted_at"].isoformat() if record.get("deleted_at") else None
        record["updated_at"] = record["updated_at"].isoformat() if record.get("updated_at") else None
        records.append(record)

    return {
        "total": total,
        "records": records,
        "has_more": offset + len(records) < total,
        "limit": limit,
        "offset": offset
    }


@app.get("/api/interactions/trash")
async def list_trash(limit: int = Query(default=50, le=200), offset: int = 0):
    """List soft-deleted interactions."""
    async with db_pool.acquire() as conn:
        total = await conn.fetchval(
            "SELECT COUNT(*) FROM interactions WHERE deleted_at IS NOT NULL"
        )

        rows = await conn.fetch("""
            SELECT i.*, s.display_name as staff_name
            FROM interactions i
            LEFT JOIN staff s ON i.staff_device = s.device_name
            WHERE i.deleted_at IS NOT NULL
            ORDER BY i.deleted_at DESC
            LIMIT $1 OFFSET $2
        """, limit, offset)

    records = []
    for row in rows:
        record = dict(row)
        record["id"] = str(record["id"])
        record["timestamp"] = record["timestamp"].isoformat() if record["timestamp"] else None
        record["deleted_at"] = record["deleted_at"].isoformat() if record.get("deleted_at") else None
        record["updated_at"] = record["updated_at"].isoformat() if record.get("updated_at") else None
        records.append(record)

    return {
        "total": total,
        "records": records,
        "has_more": offset + len(records) < total
    }


@app.get("/api/interactions/{interaction_id}")
async def get_interaction(interaction_id: str):
    """Get single interaction with full details."""
    async with db_pool.acquire() as conn:
        row = await conn.fetchrow("""
            SELECT i.*, s.display_name as staff_name,
                   sl.display_name as seller_name
            FROM interactions i
            LEFT JOIN staff s ON i.staff_device = s.device_name
            LEFT JOIN sellers sl ON i.seller_id = sl.id
            WHERE i.id = $1
        """, UUID(interaction_id))

    if not row:
        raise HTTPException(status_code=404, detail="Interaction not found")

    record = dict(row)
    record["id"] = str(record["id"])
    record["timestamp"] = record["timestamp"].isoformat() if record["timestamp"] else None
    record["deleted_at"] = record["deleted_at"].isoformat() if record.get("deleted_at") else None
    record["updated_at"] = record["updated_at"].isoformat() if record.get("updated_at") else None

    return record


@app.patch("/api/interactions/{interaction_id}")
async def update_interaction(interaction_id: str, update: InteractionUpdate):
    """Update interaction (notes, soft delete/restore, and all interaction fields)."""
    # Input validation
    if update.interaction_type is not None and update.interaction_type not in VALID_INTERACTION_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid interaction_type. Must be one of: {', '.join(VALID_INTERACTION_TYPES)}")

    if update.persona is not None and update.persona and update.persona not in VALID_PERSONAS:
        raise HTTPException(status_code=400, detail=f"Invalid persona. Must be one of: {', '.join(VALID_PERSONAS)}")

    if update.hook is not None and update.hook and update.hook not in VALID_HOOKS:
        raise HTTPException(status_code=400, detail=f"Invalid hook. Must be one of: {', '.join(VALID_HOOKS)}")

    if update.sale_type is not None and update.sale_type and update.sale_type not in VALID_SALE_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid sale_type. Must be one of: {', '.join(VALID_SALE_TYPES)}")

    if update.lead_type is not None and update.lead_type and update.lead_type not in VALID_LEAD_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid lead_type. Must be one of: {', '.join(VALID_LEAD_TYPES)}")

    if update.objection is not None and update.objection and update.objection not in VALID_OBJECTIONS:
        raise HTTPException(status_code=400, detail=f"Invalid objection. Must be one of: {', '.join(VALID_OBJECTIONS)}")

    if update.quantity is not None and update.quantity < 1:
        raise HTTPException(status_code=400, detail="Quantity must be at least 1")

    if update.unit_price is not None and update.unit_price not in [PRICE_990, PRICE_1290, None]:
        raise HTTPException(status_code=400, detail=f"Invalid unit_price. Must be {PRICE_990} or {PRICE_1290}")

    if update.total_amount is not None and update.total_amount < 0:
        raise HTTPException(status_code=400, detail="Total amount cannot be negative")

    if update.timestamp is not None:
        now = datetime.now(timezone.utc)
        # Prevent future timestamps
        if update.timestamp > now:
            raise HTTPException(status_code=400, detail="Timestamp cannot be in the future")
        # Prevent backdating beyond limit
        min_allowed = now - timedelta(days=MAX_BACKDATE_DAYS)
        if update.timestamp < min_allowed:
            raise HTTPException(
                status_code=400,
                detail=f"Timestamp cannot be more than {MAX_BACKDATE_DAYS} days in the past"
            )

    async with db_pool.acquire() as conn:
        # Use transaction for atomicity
        async with conn.transaction():
            # Check if exists and get current state
            current = await conn.fetchrow(
                "SELECT interaction_type FROM interactions WHERE id = $1",
                UUID(interaction_id)
            )
            if not current:
                raise HTTPException(status_code=404, detail="Interaction not found")

            # Build update query
            updates = []
            params = []
            param_idx = 1

            if update.notes is not None:
                updates.append(f"notes = ${param_idx}")
                params.append(update.notes)
                param_idx += 1

            if update.deleted is not None:
                if update.deleted:
                    updates.append(f"deleted_at = ${param_idx}")
                    params.append(datetime.now(timezone.utc))
                else:
                    updates.append("deleted_at = NULL")
                param_idx += 1

            if update.interaction_type is not None:
                updates.append(f"interaction_type = ${param_idx}")
                params.append(update.interaction_type)
                param_idx += 1
                # Update engaged based on interaction type
                engaged = update.interaction_type == "conversation"
                updates.append(f"engaged = ${param_idx}")
                params.append(engaged)
                param_idx += 1

                # Clear conversation-specific fields when changing to walk_by
                if update.interaction_type == "walk_by" and current["interaction_type"] == "conversation":
                    updates.extend([
                        "persona = NULL",
                        "hook = NULL",
                        "sale_type = NULL",
                        "quantity = NULL",
                        "unit_price = NULL",
                        "total_amount = NULL",
                        "lead_type = NULL",
                        "objection = NULL"
                    ])

            if update.persona is not None:
                updates.append(f"persona = ${param_idx}")
                params.append(update.persona if update.persona else None)
                param_idx += 1

            if update.hook is not None:
                updates.append(f"hook = ${param_idx}")
                params.append(update.hook if update.hook else None)
                param_idx += 1

            if update.sale_type is not None:
                updates.append(f"sale_type = ${param_idx}")
                params.append(update.sale_type if update.sale_type else None)
                param_idx += 1

            if update.quantity is not None:
                updates.append(f"quantity = ${param_idx}")
                params.append(update.quantity)
                param_idx += 1

            if update.unit_price is not None:
                updates.append(f"unit_price = ${param_idx}")
                params.append(update.unit_price)
                param_idx += 1

            if update.total_amount is not None:
                updates.append(f"total_amount = ${param_idx}")
                params.append(update.total_amount)
                param_idx += 1

            if update.lead_type is not None:
                updates.append(f"lead_type = ${param_idx}")
                params.append(update.lead_type if update.lead_type else None)
                param_idx += 1

            if update.objection is not None:
                updates.append(f"objection = ${param_idx}")
                params.append(update.objection if update.objection else None)
                param_idx += 1

            if update.timestamp is not None:
                updates.append(f"timestamp = ${param_idx}")
                params.append(update.timestamp)
                param_idx += 1

            if not updates:
                raise HTTPException(status_code=400, detail="No updates provided")

            params.append(UUID(interaction_id))
            query = f"""
                UPDATE interactions
                SET {", ".join(updates)}
                WHERE id = ${param_idx}
                RETURNING *
            """

            row = await conn.fetchrow(query, *params)

    record = dict(row)
    record["id"] = str(record["id"])
    record["timestamp"] = record["timestamp"].isoformat() if record["timestamp"] else None
    record["deleted_at"] = record["deleted_at"].isoformat() if record.get("deleted_at") else None
    record["updated_at"] = record["updated_at"].isoformat() if record.get("updated_at") else None

    return record


@app.delete("/api/interactions/{interaction_id}")
async def delete_interaction_permanent(interaction_id: str, confirm: bool = Query(default=False)):
    """Permanent delete (requires confirm=true)."""
    if not confirm:
        raise HTTPException(status_code=400, detail="Must set confirm=true for permanent delete")

    async with db_pool.acquire() as conn:
        result = await conn.execute(
            "DELETE FROM interactions WHERE id = $1",
            UUID(interaction_id)
        )

    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="Interaction not found")

    return {"deleted": True, "id": interaction_id}


@app.post("/api/interactions/{interaction_id}/restore")
async def restore_interaction(interaction_id: str):
    """Restore soft-deleted interaction."""
    async with db_pool.acquire() as conn:
        row = await conn.fetchrow("""
            UPDATE interactions
            SET deleted_at = NULL
            WHERE id = $1 AND deleted_at IS NOT NULL
            RETURNING id
        """, UUID(interaction_id))

    if not row:
        raise HTTPException(status_code=404, detail="Interaction not found or not deleted")

    return {"restored": True, "id": interaction_id}


# ============================================================
# PHASE 2: SANKEY DATA ENDPOINT
# ============================================================

@app.get("/api/analytics/sankey")
async def get_sankey_data(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    period: Optional[str] = None  # today, week, all - alternative to dates
):
    """Aggregated data for Sankey diagram visualization."""
    now = datetime.now(timezone.utc)

    # Determine date range
    if period == "today":
        start_dt = now.replace(hour=0, minute=0, second=0, microsecond=0)
        end_dt = now
    elif period == "week":
        start_dt = now - timedelta(days=7)
        end_dt = now
    elif start_date:
        start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00')) if end_date else now
    else:
        start_dt = datetime(2020, 1, 1, tzinfo=timezone.utc)
        end_dt = now

    async with db_pool.acquire() as conn:
        # Total paused (all interactions)
        total_paused = await conn.fetchval("""
            SELECT COUNT(*) FROM interactions
            WHERE timestamp >= $1 AND timestamp <= $2 AND deleted_at IS NULL
        """, start_dt, end_dt)

        # Not engaged (walk-by only)
        not_engaged = await conn.fetchval("""
            SELECT COUNT(*) FROM interactions
            WHERE timestamp >= $1 AND timestamp <= $2
            AND engaged = FALSE AND deleted_at IS NULL
        """, start_dt, end_dt)

        # Engaged (conversations)
        engaged_count = await conn.fetchval("""
            SELECT COUNT(*) FROM interactions
            WHERE timestamp >= $1 AND timestamp <= $2
            AND engaged = TRUE AND deleted_at IS NULL
        """, start_dt, end_dt)

        # Sale breakdown
        sale_data = await conn.fetch("""
            SELECT
                sale_type,
                COUNT(*) as count,
                COALESCE(SUM(total_amount), 0) as revenue
            FROM interactions
            WHERE timestamp >= $1 AND timestamp <= $2
            AND engaged = TRUE AND deleted_at IS NULL
            GROUP BY sale_type
        """, start_dt, end_dt)

        # Objection breakdown
        objection_data = await conn.fetch("""
            SELECT objection, COUNT(*) as count
            FROM interactions
            WHERE timestamp >= $1 AND timestamp <= $2
            AND objection IS NOT NULL AND deleted_at IS NULL
            GROUP BY objection
        """, start_dt, end_dt)

        # Lead breakdown by sale outcome
        lead_data = await conn.fetch("""
            SELECT
                CASE WHEN sale_type IS NOT NULL AND sale_type != 'none' THEN 'sale' ELSE 'no_sale' END as outcome,
                lead_type,
                COUNT(*) as count
            FROM interactions
            WHERE timestamp >= $1 AND timestamp <= $2
            AND engaged = TRUE AND lead_type IS NOT NULL AND deleted_at IS NULL
            GROUP BY outcome, lead_type
        """, start_dt, end_dt)

    # Process sale data
    sale_breakdown = {row["sale_type"]: {"count": row["count"], "revenue": row["revenue"]} for row in sale_data}
    no_sale_count = sale_breakdown.get("none", {}).get("count", 0)
    single_count = sale_breakdown.get("single", {}).get("count", 0)
    bundle_count = sale_breakdown.get("bundle_3", {}).get("count", 0)
    full_year_count = sale_breakdown.get("full_year", {}).get("count", 0)

    total_sales = single_count + bundle_count + full_year_count
    total_revenue = sum(s.get("revenue", 0) for k, s in sale_breakdown.items() if k != "none")

    # Calculate rates
    engaged_rate = engaged_count / total_paused if total_paused > 0 else 0
    conversion_rate = total_sales / engaged_count if engaged_count > 0 else 0
    overall_conversion = total_sales / total_paused if total_paused > 0 else 0

    # Build nodes and links for Sankey
    nodes = [
        {"id": "all_paused", "label": "All Paused", "value": total_paused},
        {"id": "not_engaged", "label": "Left w/o Engage", "value": not_engaged},
        {"id": "engaged", "label": "Engaged", "value": engaged_count},
        {"id": "no_sale", "label": "No Sale", "value": no_sale_count},
        {"id": "single", "label": "Single", "value": single_count, "revenue": sale_breakdown.get("single", {}).get("revenue", 0)},
        {"id": "bundle_3", "label": "Bundle 3", "value": bundle_count, "revenue": sale_breakdown.get("bundle_3", {}).get("revenue", 0)},
        {"id": "full_year", "label": "Full Year", "value": full_year_count, "revenue": sale_breakdown.get("full_year", {}).get("revenue", 0)},
    ]

    links = [
        {"source": "all_paused", "target": "not_engaged", "value": not_engaged},
        {"source": "all_paused", "target": "engaged", "value": engaged_count},
        {"source": "engaged", "target": "no_sale", "value": no_sale_count},
        {"source": "engaged", "target": "single", "value": single_count},
        {"source": "engaged", "target": "bundle_3", "value": bundle_count},
        {"source": "engaged", "target": "full_year", "value": full_year_count},
    ]

    # Process objection and lead breakdowns
    objection_breakdown = {row["objection"]: row["count"] for row in objection_data}

    lead_breakdown = {}
    for row in lead_data:
        key = f"{row['outcome']}_with_{row['lead_type']}"
        lead_breakdown[key] = row["count"]

    return {
        "nodes": nodes,
        "links": links,
        "metrics": {
            "total_paused": total_paused,
            "engaged_count": engaged_count,
            "not_engaged": not_engaged,
            "total_sales": total_sales,
            "no_sale_count": no_sale_count,
            "engaged_rate": round(engaged_rate, 2),
            "conversion_rate": round(conversion_rate, 2),
            "overall_conversion": round(overall_conversion, 2),
            "total_revenue": total_revenue
        },
        "objection_breakdown": objection_breakdown,
        "lead_breakdown": lead_breakdown,
        "period": {
            "start": start_dt.isoformat(),
            "end": end_dt.isoformat()
        }
    }


# ============================================================
# PHASE 3: SELLER MANAGEMENT ENDPOINTS
# ============================================================

@app.get("/api/sellers")
async def list_sellers(active_only: bool = True):
    """List all sellers."""
    async with db_pool.acquire() as conn:
        if active_only:
            rows = await conn.fetch("""
                SELECT s.*,
                    (SELECT COUNT(*) FROM interactions WHERE seller_id = s.id AND deleted_at IS NULL AND DATE(timestamp) = CURRENT_DATE) as today_count,
                    (SELECT st.device_name FROM staff st WHERE st.active_seller = s.id LIMIT 1) as last_device
                FROM sellers s
                WHERE is_active = TRUE
                ORDER BY display_name
            """)
        else:
            rows = await conn.fetch("""
                SELECT s.*,
                    (SELECT COUNT(*) FROM interactions WHERE seller_id = s.id AND deleted_at IS NULL AND DATE(timestamp) = CURRENT_DATE) as today_count,
                    (SELECT st.device_name FROM staff st WHERE st.active_seller = s.id LIMIT 1) as last_device
                FROM sellers s
                ORDER BY display_name
            """)

    return [dict(row) for row in rows]


@app.post("/api/sellers")
async def create_seller(seller: SellerCreate):
    """Create new seller."""
    # Generate ID from name if not provided
    seller_id = seller.id
    if not seller_id:
        # Convert to lowercase, replace spaces with underscores, remove special chars
        seller_id = re.sub(r'[^a-z0-9_]', '', seller.display_name.lower().replace(' ', '_'))

    async with db_pool.acquire() as conn:
        try:
            row = await conn.fetchrow("""
                INSERT INTO sellers (id, display_name)
                VALUES ($1, $2)
                RETURNING *
            """, seller_id, seller.display_name)
        except asyncpg.UniqueViolationError:
            raise HTTPException(status_code=409, detail="Seller ID already exists")

    return dict(row)


@app.patch("/api/sellers/{seller_id}")
async def update_seller(seller_id: str, update: SellerUpdate):
    """Update seller."""
    async with db_pool.acquire() as conn:
        # Build update
        updates = []
        params = []
        param_idx = 1

        if update.display_name is not None:
            updates.append(f"display_name = ${param_idx}")
            params.append(update.display_name)
            param_idx += 1

        if update.is_active is not None:
            updates.append(f"is_active = ${param_idx}")
            params.append(update.is_active)
            param_idx += 1

        if not updates:
            raise HTTPException(status_code=400, detail="No updates provided")

        params.append(seller_id)
        row = await conn.fetchrow(f"""
            UPDATE sellers
            SET {", ".join(updates)}
            WHERE id = ${param_idx}
            RETURNING *
        """, *params)

    if not row:
        raise HTTPException(status_code=404, detail="Seller not found")

    return dict(row)


# ============================================================
# PHASE 3: SESSION MANAGEMENT ENDPOINTS
# ============================================================

@app.get("/api/session")
async def get_session(request: Request):
    """Get current session info for this device."""
    client_ip = get_client_ip(request)

    device = await get_tailscale_device(client_ip)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found. Are you connected via Tailscale?")

    hostname = device["hostname"]

    async with db_pool.acquire() as conn:
        # Get device info with active seller
        staff_row = await conn.fetchrow("""
            SELECT st.device_name, st.display_name as device_display_name, st.active_seller,
                   s.display_name as seller_name
            FROM staff st
            LEFT JOIN sellers s ON st.active_seller = s.id
            WHERE st.device_name = $1
        """, hostname)

        # Get available sellers
        sellers = await conn.fetch("""
            SELECT id, display_name FROM sellers WHERE is_active = TRUE ORDER BY display_name
        """)

    active_seller = None
    if staff_row and staff_row["active_seller"]:
        active_seller = {
            "id": staff_row["active_seller"],
            "display_name": staff_row["seller_name"]
        }

    return {
        "device_name": hostname,
        "device_display_name": staff_row["device_display_name"] if staff_row else hostname.title(),
        "active_seller": active_seller,
        "available_sellers": [{"id": s["id"], "display_name": s["display_name"]} for s in sellers]
    }


@app.post("/api/session/select-seller")
async def select_seller(selection: SellerSelect, request: Request):
    """Set active seller for current device."""
    client_ip = get_client_ip(request)

    device = await get_tailscale_device(client_ip)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found. Are you connected via Tailscale?")

    hostname = device["hostname"]

    async with db_pool.acquire() as conn:
        # Verify seller exists and is active
        seller = await conn.fetchrow(
            "SELECT id, display_name FROM sellers WHERE id = $1 AND is_active = TRUE",
            selection.seller_id
        )
        if not seller:
            raise HTTPException(status_code=404, detail="Seller not found or inactive")

        # Update device's active seller
        await conn.execute("""
            UPDATE staff SET active_seller = $1 WHERE device_name = $2
        """, selection.seller_id, hostname)

    return {
        "success": True,
        "active_seller": {
            "id": seller["id"],
            "display_name": seller["display_name"]
        }
    }


# ============================================================
# PHASE 3: SELLER ANALYTICS ENDPOINTS
# ============================================================

@app.get("/api/analytics/by-seller")
async def get_seller_analytics(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    period: Optional[str] = None
):
    """Performance metrics grouped by seller."""
    now = datetime.now(timezone.utc)

    if period == "today":
        start_dt = now.replace(hour=0, minute=0, second=0, microsecond=0)
        end_dt = now
    elif period == "week":
        start_dt = now - timedelta(days=7)
        end_dt = now
    elif start_date:
        start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00')) if end_date else now
    else:
        start_dt = datetime(2020, 1, 1, tzinfo=timezone.utc)
        end_dt = now

    async with db_pool.acquire() as conn:
        # Get all active sellers
        sellers = await conn.fetch(
            "SELECT id, display_name FROM sellers WHERE is_active = TRUE"
        )

        results = []
        for seller in sellers:
            seller_id = seller["id"]

            # Get metrics for this seller
            metrics = await conn.fetchrow("""
                SELECT
                    COUNT(*) FILTER (WHERE engaged = TRUE) as total_engaged,
                    COUNT(*) FILTER (WHERE sale_type IS NOT NULL AND sale_type != 'none') as total_sales,
                    COALESCE(SUM(total_amount) FILTER (WHERE sale_type IS NOT NULL AND sale_type != 'none'), 0) as total_revenue
                FROM interactions
                WHERE seller_id = $1
                AND timestamp >= $2 AND timestamp <= $3
                AND deleted_at IS NULL
            """, seller_id, start_dt, end_dt)

            total_engaged = metrics["total_engaged"] or 0
            total_sales = metrics["total_sales"] or 0
            total_revenue = metrics["total_revenue"] or 0

            # Get top hook
            top_hook = await conn.fetchrow("""
                SELECT hook, COUNT(*) as count
                FROM interactions
                WHERE seller_id = $1 AND hook IS NOT NULL
                AND timestamp >= $2 AND timestamp <= $3
                AND sale_type IS NOT NULL AND sale_type != 'none'
                AND deleted_at IS NULL
                GROUP BY hook ORDER BY count DESC LIMIT 1
            """, seller_id, start_dt, end_dt)

            # Get top persona
            top_persona = await conn.fetchrow("""
                SELECT persona, COUNT(*) as count
                FROM interactions
                WHERE seller_id = $1 AND persona IS NOT NULL
                AND timestamp >= $2 AND timestamp <= $3
                AND sale_type IS NOT NULL AND sale_type != 'none'
                AND deleted_at IS NULL
                GROUP BY persona ORDER BY count DESC LIMIT 1
            """, seller_id, start_dt, end_dt)

            results.append({
                "seller_id": seller_id,
                "display_name": seller["display_name"],
                "metrics": {
                    "total_engaged": total_engaged,
                    "total_sales": total_sales,
                    "total_revenue": total_revenue,
                    "conversion_rate": round(total_sales / total_engaged, 2) if total_engaged > 0 else 0,
                    "avg_sale_value": round(total_revenue / total_sales) if total_sales > 0 else 0,
                    "top_hook": top_hook["hook"] if top_hook else None,
                    "top_persona": top_persona["persona"] if top_persona else None
                }
            })

    return {
        "sellers": results,
        "period": {
            "start": start_dt.isoformat(),
            "end": end_dt.isoformat()
        }
    }


# ============================================================
# EVENT TAGS ENDPOINTS
# ============================================================

@app.post("/api/events")
async def create_event(event: EventCreate, request: Request):
    """Log a booth event/milestone."""
    client_ip = get_client_ip(request)

    # Get device info
    device = await get_tailscale_device(client_ip)
    hostname = device["hostname"] if device else None

    # Get seller if device is registered
    seller_id = None
    if hostname:
        async with db_pool.acquire() as conn:
            staff_row = await conn.fetchrow(
                "SELECT active_seller FROM staff WHERE device_name = $1",
                hostname
            )
            seller_id = staff_row["active_seller"] if staff_row else None

    async with db_pool.acquire() as conn:
        row = await conn.fetchrow("""
            INSERT INTO events (description, staff_device, seller_id)
            VALUES ($1, $2, $3)
            RETURNING id, timestamp
        """, event.description, hostname, seller_id)

    return {
        "id": row["id"],
        "timestamp": row["timestamp"].isoformat(),
        "description": event.description
    }


@app.get("/api/events")
async def list_events(limit: int = 50):
    """Get recent events."""
    async with db_pool.acquire() as conn:
        rows = await conn.fetch("""
            SELECT e.*, s.display_name as seller_name, st.display_name as device_name
            FROM events e
            LEFT JOIN sellers s ON e.seller_id = s.id
            LEFT JOIN staff st ON e.staff_device = st.device_name
            ORDER BY e.timestamp DESC
            LIMIT $1
        """, limit)

    return [{
        "id": row["id"],
        "timestamp": row["timestamp"].isoformat(),
        "description": row["description"],
        "seller_name": row["seller_name"],
        "device_name": row["device_name"]
    } for row in rows]


# ============================================================
# DEVICE MANAGEMENT ENDPOINTS
# ============================================================

@app.get("/api/devices")
async def list_devices():
    """List all registered devices with their seller assignments."""
    async with db_pool.acquire() as conn:
        rows = await conn.fetch("""
            SELECT st.device_name, st.display_name, st.active_seller,
                   s.display_name as seller_display_name
            FROM staff st
            LEFT JOIN sellers s ON st.active_seller = s.id
            ORDER BY st.display_name
        """)

    return [{
        "device_name": row["device_name"],
        "display_name": row["display_name"],
        "active_seller": row["active_seller"],
        "seller_display_name": row["seller_display_name"]
    } for row in rows]


class DeviceAssignment(BaseModel):
    seller_id: Optional[str] = None


@app.post("/api/devices/{device_name}/assign")
async def assign_seller_to_device(device_name: str, assignment: DeviceAssignment):
    """Assign a seller to a device for analytics tracking."""
    async with db_pool.acquire() as conn:
        # Verify device exists
        device = await conn.fetchrow(
            "SELECT device_name FROM staff WHERE device_name = $1",
            device_name
        )
        if not device:
            raise HTTPException(status_code=404, detail="Device not found")

        # Verify seller exists if provided
        if assignment.seller_id:
            seller = await conn.fetchrow(
                "SELECT id FROM sellers WHERE id = $1 AND is_active = TRUE",
                assignment.seller_id
            )
            if not seller:
                raise HTTPException(status_code=404, detail="Seller not found or inactive")

        # Update assignment
        await conn.execute("""
            UPDATE staff SET active_seller = $1 WHERE device_name = $2
        """, assignment.seller_id, device_name)

    return {"success": True, "device_name": device_name, "seller_id": assignment.seller_id}


# ============================================================
# UNIFIED TIMELINE ENDPOINT (Interactions + Events)
# ============================================================

@app.get("/api/timeline")
async def get_timeline(
    limit: int = Query(default=50, le=200),
    offset: int = 0,
    include_events: bool = True
):
    """Get unified timeline of interactions and events."""
    async with db_pool.acquire() as conn:
        # Get interactions
        interactions = await conn.fetch("""
            SELECT
                i.id::text as id,
                'interaction' as type,
                i.timestamp,
                i.interaction_type,
                i.engaged,
                i.persona,
                i.hook,
                i.sale_type,
                i.total_amount,
                i.lead_type,
                i.objection,
                i.notes,
                s.display_name as staff_name,
                sl.display_name as seller_name,
                NULL as description
            FROM interactions i
            LEFT JOIN staff s ON i.staff_device = s.device_name
            LEFT JOIN sellers sl ON i.seller_id = sl.id
            WHERE i.deleted_at IS NULL
            ORDER BY i.timestamp DESC
            LIMIT $1 OFFSET $2
        """, limit, offset)

        events = []
        if include_events:
            events = await conn.fetch("""
                SELECT
                    e.id::text as id,
                    'event' as type,
                    e.timestamp,
                    NULL as interaction_type,
                    NULL as engaged,
                    NULL as persona,
                    NULL as hook,
                    NULL as sale_type,
                    NULL as total_amount,
                    NULL as lead_type,
                    NULL as objection,
                    NULL as notes,
                    st.display_name as staff_name,
                    s.display_name as seller_name,
                    e.description
                FROM events e
                LEFT JOIN staff st ON e.staff_device = st.device_name
                LEFT JOIN sellers s ON e.seller_id = s.id
                ORDER BY e.timestamp DESC
                LIMIT $1 OFFSET $2
            """, limit, offset)

    # Combine and sort by timestamp
    all_items = []
    for row in interactions:
        item = dict(row)
        item["timestamp"] = item["timestamp"].isoformat() if item["timestamp"] else None
        all_items.append(item)

    for row in events:
        item = dict(row)
        item["timestamp"] = item["timestamp"].isoformat() if item["timestamp"] else None
        all_items.append(item)

    # Sort combined list by timestamp descending
    all_items.sort(key=lambda x: x["timestamp"] or "", reverse=True)

    return {
        "items": all_items[:limit],
        "has_more": len(all_items) > limit
    }


# ============================================================
# REAL-TIME UPDATES VIA SERVER-SENT EVENTS (SSE)
# ============================================================

@app.get("/api/events/stream")
async def sse_stream():
    """Server-Sent Events endpoint for real-time data updates.

    Clients connect to this endpoint to receive push notifications
    when data changes in the database (new interactions, events, etc.)
    """
    async def event_generator():
        queue = await broadcaster.subscribe()
        try:
            # Send initial connection confirmation
            yield f"data: {json.dumps({'type': 'connected', 'timestamp': datetime.now(timezone.utc).isoformat()})}\n\n"

            # Send heartbeat every 30 seconds to keep connection alive
            heartbeat_interval = 30

            while True:
                try:
                    # Wait for message with timeout for heartbeat
                    message = await asyncio.wait_for(queue.get(), timeout=heartbeat_interval)
                    # Parse and forward the database notification
                    try:
                        data = json.loads(message)
                        data['type'] = 'data_change'
                        yield f"data: {json.dumps(data)}\n\n"
                    except json.JSONDecodeError:
                        yield f"data: {json.dumps({'type': 'data_change', 'raw': message})}\n\n"
                except asyncio.TimeoutError:
                    # Send heartbeat to keep connection alive
                    yield f"data: {json.dumps({'type': 'heartbeat', 'timestamp': datetime.now(timezone.utc).isoformat()})}\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            broadcaster.unsubscribe(queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
        }
    )
