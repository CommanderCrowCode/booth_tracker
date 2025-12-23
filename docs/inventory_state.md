Simple version (glossary)
	•	ON_HAND_STORE: Physically at the store (floor + backroom).
	•	ON_HAND_WAREHOUSE: Physically at the warehouse/FC.
	•	IN_TRANSIT_INBOUND: Shipped from supplier/upstream, not yet received by you.
	•	IN_TRANSIT_OUTBOUND: Shipped from you, not yet received by destination (store/customer/other).
	•	ON_ORDER: On an open PO; not shipped yet.
	•	ALLOCATED: Reserved for a specific demand (order/transfer); not available for other use.

⸻

Normative version (spec-like)

Definitions

ON_HAND_STORE
Inventory units MUST be physically located at a retail store location and MUST be receipted (received) into that location’s inventory. Units MAY be on the sales floor or in the backroom.

ON_HAND_WAREHOUSE
Inventory units MUST be physically located at a warehouse/fulfillment location and MUST be receipted into that location’s inventory.

IN_TRANSIT_INBOUND
Inventory units MUST have departed an upstream node (e.g., supplier, origin warehouse) and MUST NOT yet be receipted at the destination node. Units MUST be associated with an inbound shipment/ASN (or equivalent).

IN_TRANSIT_OUTBOUND
Inventory units MUST have departed a source node under your control (store/warehouse) and MUST NOT yet be receipted at the destination node (store/customer/3PL). Units MUST be associated with an outbound shipment/consignment.

ON_ORDER
Inventory units MUST be covered by an open purchase order line and MUST NOT have a carrier handoff event (ship-confirm) recorded. Units MUST NOT be considered physically present at any of your nodes.

ALLOCATED
Allocation is an availability constraint: a unit marked ALLOCATED MUST be committed to a specific demand object (sales order, transfer order, work order) and MUST NOT be available for other demands. Allocation MUST reference (a) the demand object and (b) the underlying physical state (on-hand or in-transit).

⸻

State transitions

Treat ALLOCATED as an orthogonal flag (not a physical location state).

Physical state machine (canonical)

ON_ORDER
  -> IN_TRANSIT_INBOUND
  -> ON_HAND_WAREHOUSE
  -> IN_TRANSIT_OUTBOUND
  -> ON_HAND_STORE

Allowed transitions (minimal, practical)

Procurement / receiving
	•	ON_ORDER -> IN_TRANSIT_INBOUND (supplier ship-confirm)
	•	IN_TRANSIT_INBOUND -> ON_HAND_WAREHOUSE (warehouse receipt)
	•	IN_TRANSIT_INBOUND -> ON_HAND_STORE (direct-to-store receipt / drop-ship to store)

Internal transfers
	•	ON_HAND_WAREHOUSE -> IN_TRANSIT_OUTBOUND (pick/pack/ship from warehouse)
	•	IN_TRANSIT_OUTBOUND -> ON_HAND_STORE (store receipt)

Store returns to DC (optional but common)
	•	ON_HAND_STORE -> IN_TRANSIT_OUTBOUND (ship from store)
	•	IN_TRANSIT_OUTBOUND -> ON_HAND_WAREHOUSE (warehouse receipt)

Customer shipment (optional)
	•	ON_HAND_WAREHOUSE -> IN_TRANSIT_OUTBOUND -> (CONSUMED) (delivered)
	•	ON_HAND_STORE -> (CONSUMED) (POS sale)

If you need customer delivery as a tracked end-state, add DELIVERED or CONSUMED. Otherwise treat it as leaving your network.

Allocation transitions (flag changes)
	•	UNALLOCATED -> ALLOCATED (reserve to demand)
	•	ALLOCATED -> UNALLOCATED (release/cancel/expiry)
	•	Allocation MAY move with the unit through physical transitions (e.g., allocated inbound becomes allocated on-hand after receipt).

⸻

Invariants (hard rules)

Exclusivity / counting
	1.	A unit MUST be in exactly one physical state among:
{ON_HAND_STORE, ON_HAND_WAREHOUSE, IN_TRANSIT_INBOUND, IN_TRANSIT_OUTBOUND, ON_ORDER}.
	2.	A unit in any IN_TRANSIT_* state MUST NOT be counted as ON_HAND_*.
	3.	A unit in ON_ORDER MUST NOT be counted as IN_TRANSIT_* or ON_HAND_*.

Event-backed validity
	4.	IN_TRANSIT_INBOUND MUST have a ship/handoff event and an expected destination.
	5.	Transition into any ON_HAND_* state MUST be backed by a receipt event.
	6.	Transition into any IN_TRANSIT_* state MUST be backed by a ship-confirm event.

Allocation correctness
	7.	ALLOCATED MUST reference a demand object (order/transfer/etc.).
	8.	ALLOCATED units MUST reduce “available” quantity and MUST NOT be double-allocated to multiple demands (unless you explicitly support split quantities).
	9.	Allocation MUST NOT change the physical state (i.e., ALLOCATED is not a location).

No negative / no teleporting
	10.	Location-level on-hand quantities MUST NOT go negative from transactions.
	11.	Physical transitions MUST NOT “teleport”: you can’t go ON_ORDER -> ON_HAND_* without either (a) receipt + shipment implied (direct receipt) or (b) explicit IN_TRANSIT_INBOUND.

---

YAML specs

```
inventory_quantity_state_spec:
  name: Inventory Quantity State Model
  version: 1.1.0
  intent: >
    Quantity-based inventory state model. Inventory is tracked as bucketed quantities by
    (sku, node, physical_state) with an orthogonal allocation constraint. Allocation is permitted
    on on-hand and in-transit inventory, but NOT on on-order inventory.

  # ============================================================
  # Dimensions
  # ============================================================
  dimensions:
    sku:
      type: string
      description: Stock keeping unit identifier.
      examples: ["SKU-LUMI-BOX-001", "SKU-ABC-123"]

    node:
      description: Physical or logical node relevant to the inventory bucket.
      keys: [node_type, node_id]
      node_type_enum: [STORE, WAREHOUSE, SUPPLIER, CUSTOMER, OTHER]

  # ============================================================
  # Physical states (mutually exclusive buckets)
  # ============================================================
  physical_states:
    ON_HAND_STORE:
      meaning: Physically received and present at a store location.
      node_type_required: STORE

    ON_HAND_WAREHOUSE:
      meaning: Physically received and present at a warehouse or fulfillment center.
      node_type_required: WAREHOUSE

    IN_TRANSIT_INBOUND:
      meaning: Shipped from an upstream node and en route to a store or warehouse; not yet received.
      node_type_required: [STORE, WAREHOUSE]
      requires_refs: [shipment_id_optional]

    IN_TRANSIT_OUTBOUND:
      meaning: Shipped from a store or warehouse and en route to another node or customer; not yet received.
      node_type_required: [STORE, WAREHOUSE, CUSTOMER, OTHER]
      requires_refs: [shipment_id_optional]

    ON_ORDER:
      meaning: Covered by an open purchase order and not yet shipped by the supplier.
      node_type_required: SUPPLIER
      requires_refs: [po_id_optional]

  # ============================================================
  # Allocation model
  # ============================================================
  allocation:
    meaning: >
      Allocation reserves quantity for a specific downstream demand and reduces availability.
      Allocation does NOT represent a physical location or movement.
    demand_type_enum: [SALES_ORDER, TRANSFER_ORDER, WORK_ORDER, OTHER]

    permissions:
      allowed_physical_states:
        - ON_HAND_STORE
        - ON_HAND_WAREHOUSE
        - IN_TRANSIT_INBOUND
        - IN_TRANSIT_OUTBOUND
      disallowed_physical_states:
        - ON_ORDER

  # ============================================================
  # Data schema
  # ============================================================
  schema:
    tables:
      inventory_buckets:
        description: Bucketed quantities per SKU, node, and physical state.
        primary_key: [sku, node_type, node_id, physical_state]
        columns:
          - { name: sku, type: string }
          - { name: node_type, type: enum, enum: [STORE, WAREHOUSE, SUPPLIER, CUSTOMER, OTHER] }
          - { name: node_id, type: string }
          - { name: physical_state, type: enum,
              enum: [ON_HAND_STORE, ON_HAND_WAREHOUSE, IN_TRANSIT_INBOUND, IN_TRANSIT_OUTBOUND, ON_ORDER] }
          - { name: on_hand_qty, type: number, constraints: [">=0"] }
          - { name: allocated_qty, type: number, constraints: [">=0"] }
          - { name: updated_at, type: datetime }

      allocations:
        description: >
          Optional table for traceability of allocations by demand object.
        primary_key: [sku, demand_type, demand_id, physical_state, node_type, node_id]
        columns:
          - { name: sku, type: string }
          - { name: demand_type, type: enum, enum: [SALES_ORDER, TRANSFER_ORDER, WORK_ORDER, OTHER] }
          - { name: demand_id, type: string }
          - { name: physical_state, type: enum,
              enum: [ON_HAND_STORE, ON_HAND_WAREHOUSE, IN_TRANSIT_INBOUND, IN_TRANSIT_OUTBOUND] }
          - { name: node_type, type: enum, enum: [STORE, WAREHOUSE, CUSTOMER, OTHER] }
          - { name: node_id, type: string }
          - { name: allocated_qty, type: number, constraints: [">0"] }
          - { name: created_at, type: datetime }

  # ============================================================
  # Canonical transitions (quantity moves)
  # ============================================================
  transitions:
    - id: T-ONORDER-TO-INBOUND
      name: Supplier ships
      from: { physical_state: ON_ORDER, node_type: SUPPLIER }
      to:   { physical_state: IN_TRANSIT_INBOUND, node_type: [STORE, WAREHOUSE] }
      event: SHIP_CONFIRM_INBOUND
      rules:
        - moved_qty MUST be <= from.on_hand_qty
        - from.on_hand_qty -= moved_qty
        - to.on_hand_qty += moved_qty
        - to.allocated_qty MUST remain 0

    - id: T-INBOUND-TO-ONHAND
      name: Receive inbound
      from: { physical_state: IN_TRANSIT_INBOUND, node_type: [STORE, WAREHOUSE] }
      to:
        choices:
          - { physical_state: ON_HAND_WAREHOUSE, node_type: WAREHOUSE }
          - { physical_state: ON_HAND_STORE, node_type: STORE }
      event: RECEIVE_INBOUND
      rules:
        - moved_qty MUST be <= from.on_hand_qty
        - moved_allocated_qty MUST be <= from.allocated_qty
        - from.on_hand_qty -= moved_qty
        - from.allocated_qty -= moved_allocated_qty
        - to.on_hand_qty += moved_qty
        - to.allocated_qty += moved_allocated_qty

    - id: T-ONHAND-TO-OUTBOUND
      name: Ship outbound
      from:
        choices:
          - { physical_state: ON_HAND_WAREHOUSE, node_type: WAREHOUSE }
          - { physical_state: ON_HAND_STORE, node_type: STORE }
      to: { physical_state: IN_TRANSIT_OUTBOUND, node_type: [STORE, WAREHOUSE, CUSTOMER, OTHER] }
      event: SHIP_CONFIRM_OUTBOUND
      rules:
        - moved_qty MUST be <= from.on_hand_qty
        - moved_allocated_qty MUST be <= from.allocated_qty
        - from.on_hand_qty -= moved_qty
        - from.allocated_qty -= moved_allocated_qty
        - to.on_hand_qty += moved_qty
        - to.allocated_qty += moved_allocated_qty

    - id: T-OUTBOUND-TO-ONHAND
      name: Receive outbound transfer
      from: { physical_state: IN_TRANSIT_OUTBOUND, node_type: [STORE, WAREHOUSE] }
      to:
        choices:
          - { physical_state: ON_HAND_WAREHOUSE, node_type: WAREHOUSE }
          - { physical_state: ON_HAND_STORE, node_type: STORE }
      event: RECEIVE_OUTBOUND
      rules:
        - moved_qty MUST be <= from.on_hand_qty
        - moved_allocated_qty MUST be <= from.allocated_qty
        - from.on_hand_qty -= moved_qty
        - from.allocated_qty -= moved_allocated_qty
        - to.on_hand_qty += moved_qty
        - to.allocated_qty += moved_allocated_qty

  # ============================================================
  # Invariants (hard rules)
  # ============================================================
  invariants:
    - id: INV-QTY-001
      rule: on_hand_qty MUST be >= 0.

    - id: INV-QTY-002
      rule: allocated_qty MUST be >= 0 AND <= on_hand_qty.

    - id: INV-NODE-001
      rule: physical_state == ON_HAND_STORE MUST have node_type == STORE.

    - id: INV-NODE-002
      rule: physical_state == ON_HAND_WAREHOUSE MUST have node_type == WAREHOUSE.

    - id: INV-NODE-003
      rule: physical_state == ON_ORDER MUST have node_type == SUPPLIER.

    - id: INV-ALLOC-001
      rule: Allocation MUST NOT exist on physical_state == ON_ORDER.

    - id: INV-ALLOC-002
      rule: Allocation MUST NOT change physical_state.

    - id: INV-ALLOC-003
      rule: Allocation MUST move consistently with quantity across transitions.

    - id: INV-COUNT-001
      rule: IN_TRANSIT_* quantities MUST NOT be counted as ON_HAND.

    - id: INV-COUNT-002
      rule: ON_ORDER quantities MUST NOT be counted as ON_HAND or IN_TRANSIT.

    - id: INV-EVENT-001
      rule: Any increase of IN_TRANSIT_* MUST be backed by a ship-confirm event.

    - id: INV-EVENT-002
      rule: Any increase of ON_HAND_* MUST be backed by a receipt event.

  # ============================================================
  # Derived metrics
  # ============================================================
  derived_metrics:
    on_hand_total:
      definition: sum(on_hand_qty) where physical_state in [ON_HAND_STORE, ON_HAND_WAREHOUSE]

    allocated_on_hand_total:
      definition: sum(allocated_qty) where physical_state in [ON_HAND_STORE, ON_HAND_WAREHOUSE]

    available_on_hand_total:
      definition: on_hand_total - allocated_on_hand_total

    inbound_pipeline_total:
      definition: sum(on_hand_qty) where physical_state == IN_TRANSIT_INBOUND

    outbound_pipeline_total:
      definition: sum(on_hand_qty) where physical_state == IN_TRANSIT_OUTBOUND

    on_order_total:
      definition: sum(on_hand_qty) where physical_state == ON_ORDER

  # ============================================================
  # Example data
  # ============================================================
  examples:
    inventory_buckets:
      - sku: SKU-LUMI-BOX-001
        node_type: STORE
        node_id: STO-001
        physical_state: ON_HAND_STORE
        on_hand_qty: 18
        allocated_qty: 3
        updated_at: "2025-12-23T18:30:00+07:00"

      - sku: SKU-LUMI-BOX-001
        node_type: WAREHOUSE
        node_id: WH-001
        physical_state: ON_HAND_WAREHOUSE
        on_hand_qty: 120
        allocated_qty: 25
        updated_at: "2025-12-23T18:30:00+07:00"

      - sku: SKU-LUMI-BOX-001
        node_type: WAREHOUSE
        node_id: WH-001
        physical_state: IN_TRANSIT_INBOUND
        on_hand_qty: 60
        allocated_qty: 10
        updated_at: "2025-12-23T18:30:00+07:00"

      - sku: SKU-LUMI-BOX-001
        node_type: STORE
        node_id: STO-001
        physical_state: IN_TRANSIT_OUTBOUND
        on_hand_qty: 12
        allocated_qty: 5
        updated_at: "2025-12-23T18:30:00+07:00"

      - sku: SKU-LUMI-BOX-001
        node_type: SUPPLIER
        node_id: SUP-ALPHA
        physical_state: ON_ORDER
        on_hand_qty: 200
        allocated_qty: 0
        updated_at: "2025-12-23T18:30:00+07:00"
```
