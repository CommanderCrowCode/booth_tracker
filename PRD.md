# Product Requirements Document: Lumicello Event Insights Logger (v1.1)

## 1. Executive Summary

**Objective:** Capture granular data to validate Lumicello's core business hypotheses at the K Village Christmas Market (Dec 19-25, 2025).

**Key Hypotheses to Validate:**
1. **Price Elasticity:** Will customers pay ฿1,290 sticker, or is ฿990 the effective ceiling?
2. **Bundle Preference:** Do gift buyers purchase more bundles than parents?
3. **Big Garden Hook:** Does the digital screen drive more engagement than physical kits alone?
4. **990 Floor:** How many no-sales cite price as the objection?

**Deployment:** Internal PWA on `tenacity` server, accessible via Tailscale VPN only.

---

## 2. User Experience Design

### 2.1 Design Principles

| Principle | Target |
|-----------|--------|
| **Zero Login** | Auto-identify staff via Tailscale device name |
| **Zero Typing** | 100% tap-based input |
| **Quick Tally** | < 1 second (single tap) |
| **Deep Log** | < 10 seconds (4-5 taps max) |
| **Thumb-Zone** | All buttons in bottom 60% of screen |
| **High Contrast** | Readable in mall lighting |

### 2.2 Screens

#### A. Home Dashboard

```
┌─────────────────────────────────────┐
│  LUMICELLO K VILLAGE                │
│  สวัสดีค่ะ Veerapat 👋              │
├─────────────────────────────────────┤
│                                     │
│  TODAY          │  THIS WEEK        │
│  👥 47          │  👥 203           │
│  🛒 8 (฿12,650) │  🛒 34 (฿52,430)  │
│  💚 12 LINE     │  💚 47 LINE       │
│                                     │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────┐    │
│  │                             │    │
│  │      + WALK-BY              │    │  ← Single tap, done
│  │                             │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │                             │    │
│  │      + CONVERSATION         │    │  ← Opens Deep Log
│  │                             │    │
│  └─────────────────────────────┘    │
│                                     │
│  [ 📊 View Stats ]                  │
│                                     │
└─────────────────────────────────────┘
```

#### B. Deep Log Flow (4-5 taps)

**Step 1: Persona**
```
┌─────────────────────────────────────┐
│  ← Back                    1 of 4   │
├─────────────────────────────────────┤
│                                     │
│  Who are they?                      │
│                                     │
│  ┌─────────────┐ ┌─────────────┐    │
│  │             │ │             │    │
│  │  👶 Parent  │ │ 🎁 Gift     │    │
│  │             │ │    Buyer    │    │
│  └─────────────┘ └─────────────┘    │
│                                     │
│  ┌─────────────┐ ┌─────────────┐    │
│  │             │ │             │    │
│  │  🌏 Expat   │ │ 🤰 Future   │    │
│  │             │ │    Parent   │    │
│  └─────────────┘ └─────────────┘    │
│                                     │
└─────────────────────────────────────┘
```

**Step 2: Hook**
```
┌─────────────────────────────────────┐
│  ← Back                    2 of 4   │
├─────────────────────────────────────┤
│                                     │
│  What drew them in?                 │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  📦  Physical Kits          │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  📱  Big Garden Screen      │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  🪧  Signage / Walk-in      │    │
│  └─────────────────────────────┘    │
│                                     │
└─────────────────────────────────────┘
```

**Step 3: Outcome**
```
┌─────────────────────────────────────┐
│  ← Back                    3 of 4   │
├─────────────────────────────────────┤
│                                     │
│  What happened?                     │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  ❌  No Sale                │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  1️⃣  Single Box             │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  3️⃣  3-Box Bundle  ฿2,690   │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  📅  Full Year     ฿4,990   │    │
│  └─────────────────────────────┘    │
│                                     │
└─────────────────────────────────────┘
```

**Step 3a: If Single Box → Quantity + Price**
```
┌─────────────────────────────────────┐
│  ← Back                  3a of 4    │
├─────────────────────────────────────┤
│                                     │
│  How many boxes?                    │
│                                     │
│    [ - ]      2      [ + ]          │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  Price paid per box?                │
│                                     │
│  ┌─────────────┐ ┌─────────────┐    │
│  │             │ │             │    │
│  │  ฿990      │ │  ฿1,290    │    │
│  │  Sale      │ │  Sticker 🎯 │    │
│  │             │ │             │    │
│  └─────────────┘ └─────────────┘    │
│                                     │
│  Total: ฿1,980                      │
│                                     │
│  ┌─────────────────────────────┐    │
│  │        Continue →           │    │
│  └─────────────────────────────┘    │
│                                     │
└─────────────────────────────────────┘
```

**Step 3b: If No Sale → Objection**
```
┌─────────────────────────────────────┐
│  ← Back                  3b of 4    │
├─────────────────────────────────────┤
│                                     │
│  Why no sale?                       │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  💰  แพงไป (Too expensive)  │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  🧸  มีของเล่นแล้ว (Has toys)│    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  🤔  ขอคิดก่อน (Thinking)   │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  👶  อายุไม่ตรง (Age off)   │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  ❓  Other                  │    │
│  └─────────────────────────────┘    │
│                                     │
└─────────────────────────────────────┘
```

**Step 4: Lead Capture**
```
┌─────────────────────────────────────┐
│  ← Back                    4 of 4   │
├─────────────────────────────────────┤
│                                     │
│  Lead captured?                     │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  💚  LINE                   │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  📧  Email                  │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  ➖  None                   │    │
│  └─────────────────────────────┘    │
│                                     │
└─────────────────────────────────────┘
```

**Confirmation (auto-dismiss after 1.5s)**
```
┌─────────────────────────────────────┐
│                                     │
│                                     │
│              ✓                      │
│           Saved!                    │
│                                     │
│     Parent → Physical Kits          │
│     2× Single @ ฿990 = ฿1,980       │
│     LINE signup                     │
│                                     │
│                                     │
└─────────────────────────────────────┘
```

#### C. Stats Dashboard

```
┌─────────────────────────────────────┐
│  ← Home              📊 Stats       │
├─────────────────────────────────────┤
│  [ Today ] [ Week ] [ All ]         │
├─────────────────────────────────────┤
│                                     │
│  TRAFFIC                            │
│  👥 203 visitors                    │
│  💬 89 conversations (44%)          │
│                                     │
│  SALES                              │
│  🛒 34 sales  │  ฿52,430 revenue    │
│  📦 41 boxes  │  ฿1,279 avg/sale    │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  PRICE VALIDATION                   │
│  ฿990 sale     ████████░░  82%      │
│  ฿1,290 sticker██░░░░░░░░  18% 🎯   │
│                                     │
│  PRODUCT MIX                        │
│  Single        ███░░░░░░░  12       │
│  3-Box Bundle  █████░░░░░  18       │
│  Full Year     █░░░░░░░░░   4 🎉    │
│                                     │
│  PERSONAS (buyers only)             │
│  Parent        ██████░░░░  56%      │
│  Gift Buyer    ███░░░░░░░  32%      │
│  Expat         █░░░░░░░░░   9%      │
│  Future Parent ░░░░░░░░░░   3%      │
│                                     │
│  HOOKS (all conversations)          │
│  Physical Kits █████░░░░░  52%      │
│  Big Garden    ███░░░░░░░  31%      │
│  Signage       ██░░░░░░░░  17%      │
│                                     │
│  NO-SALE REASONS                    │
│  Thinking      █████░░░░░  45%      │
│  Too expensive ███░░░░░░░  28%      │
│  Has toys      ██░░░░░░░░  15%      │
│  Age mismatch  █░░░░░░░░░   8%      │
│  Other         █░░░░░░░░░   4%      │
│                                     │
│  LEADS                              │
│  💚 LINE       47                   │
│  📧 Email      12                   │
│                                     │
└─────────────────────────────────────┘
```

---

## 3. Technical Architecture

### 3.1 System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      Tailscale Network                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  tenacity (100.126.31.92)           persistence (100.108.114.120)
│  ─────────────────────────          ─────────────────────────── │
│  ┌───────────────────────┐          ┌─────────────────────────┐ │
│  │ nginx :80             │          │ PostgreSQL :5432        │ │
│  │  └─► FastAPI :8000    │────────►│  └─► lumicello_insights │ │
│  │       └─► Tailscale   │          └─────────────────────────┘ │
│  │           Local API   │                                      │
│  └───────────────────────┘                                      │
│         ▲                                                       │
│         │                                                       │
│  ┌──────┴──────┐                                                │
│  │ Staff PWA   │                                                │
│  │ sisia       │  ← Veerapat                                    │
│  │ [new-device]│  ← New staff device                            │
│  └─────────────┘                                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Authentication Flow

```
Staff opens http://tenacity:3000
              │
              ▼
┌─────────────────────────────────┐
│ FastAPI receives request        │
│ client_ip = 100.80.219.114      │
└───────────────┬─────────────────┘
                │
                ▼
┌─────────────────────────────────┐
│ Query Tailscale Local API       │
│ GET /localapi/v0/status         │
│                                 │
│ Returns:                        │
│ {                               │
│   "100.80.219.114": {           │
│     "HostName": "sisia",        │
│     "Online": true              │
│   }                             │
│ }                               │
└───────────────┬─────────────────┘
                │
                ▼
┌─────────────────────────────────┐
│ Lookup staff table              │
│ WHERE device_name = 'sisia'     │
│                                 │
│ Returns: { name: "Veerapat" }   │
└───────────────┬─────────────────┘
                │
                ▼
┌─────────────────────────────────┐
│ PWA renders:                    │
│ "สวัสดีค่ะ Veerapat 👋"          │
│                                 │
│ All interactions tagged with    │
│ staff_device = 'sisia'          │
└─────────────────────────────────┘
```

### 3.3 Database Schema

```sql
-- ============================================================
-- Database: lumicello_insights (on persistence)
-- ============================================================

-- Staff registry (populated before event)
CREATE TABLE staff (
    device_name VARCHAR(100) PRIMARY KEY,  -- Tailscale hostname
    display_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- All interactions
CREATE TABLE interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    staff_device VARCHAR(100) NOT NULL REFERENCES staff(device_name),
    
    -- Interaction type
    interaction_type VARCHAR(20) NOT NULL 
        CHECK (interaction_type IN ('walk_by', 'conversation')),
    
    -- Conversation details (NULL for walk_by)
    persona VARCHAR(20) 
        CHECK (persona IN ('parent', 'gift_buyer', 'expat', 'future_parent')),
    hook VARCHAR(20) 
        CHECK (hook IN ('physical_kits', 'big_garden', 'signage')),
    
    -- Sale outcome
    sale_type VARCHAR(20) 
        CHECK (sale_type IN ('none', 'single', 'bundle_3', 'full_year')),
    
    -- For single box sales
    quantity INTEGER DEFAULT 1,
    unit_price INTEGER,  -- 990 or 1290
    
    -- Computed total (trigger or app)
    total_amount INTEGER,
    
    -- Lead capture
    lead_type VARCHAR(20)
        CHECK (lead_type IN ('line', 'email', 'instagram', 'none')),
    
    -- Objection (only if sale_type = 'none')
    objection VARCHAR(50)
        CHECK (objection IN (
            'too_expensive', 
            'has_toys', 
            'need_to_think', 
            'age_mismatch',
            'other'
        ))
);

-- Indexes
CREATE INDEX idx_interactions_timestamp ON interactions (timestamp);
CREATE INDEX idx_interactions_date ON interactions (DATE(timestamp));
CREATE INDEX idx_interactions_staff ON interactions (staff_device);
CREATE INDEX idx_interactions_sale_type ON interactions (sale_type);

-- ============================================================
-- Seed data
-- ============================================================

INSERT INTO staff (device_name, display_name) VALUES
    ('sisia', 'Veerapat');
    -- Add more devices as needed via API or direct insert

-- ============================================================
-- Pricing reference (for validation, not stored per-row)
-- ============================================================
-- Single box: ฿990 (sale) or ฿1,290 (sticker)
-- 3-Box Bundle: ฿2,690 (fixed)
-- Full Year: ฿4,990 (fixed)
```

### 3.4 API Endpoints

```
GET  /api/whoami
     → Returns staff info based on Tailscale IP
     → { device: "sisia", name: "Veerapat" }
     → 404 if unknown device

GET  /api/stats?period=today|week|all
     → Returns aggregated stats for dashboard

POST /api/interactions
     → Creates new interaction
     → Body: { interaction_type, persona?, hook?, sale_type?, ... }

GET  /api/interactions?date=2025-12-19
     → Lists interactions for export/review

POST /api/staff
     → Registers new staff device (admin only)
     → Body: { device_name, display_name }

GET  /api/staff
     → Lists registered staff
```

### 3.5 Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Frontend** | React + Vite | Fast PWA, offline-ready if needed later |
| **Styling** | Tailwind CSS | Rapid UI, thumb-zone layouts |
| **Backend** | FastAPI (Python) | Your preference, async, fast |
| **Database** | PostgreSQL | Already on persistence, proper constraints |
| **Auth** | Tailscale Local API | Zero-login, device-based |
| **Deployment** | Docker Compose | Consistent with dominion patterns |

### 3.6 Docker Configuration

```yaml
# servers/tenacity/insights-logger/docker-compose.yml
version: "3.8"

services:
  insights-api:
    build: ./api
    container_name: lumicello-insights-api
    restart: unless-stopped
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql://postgres:${POSTGRES_PASSWORD}@persistence:5432/lumicello_insights
    volumes:
      - /var/run/tailscale/tailscaled.sock:/var/run/tailscale/tailscaled.sock:ro
    networks:
      - default

  insights-web:
    build: ./web
    container_name: lumicello-insights-web
    restart: unless-stopped
    ports:
      - "3000:80"
    depends_on:
      - insights-api
    networks:
      - default

networks:
  default:
    driver: bridge
```

---

## 4. Staff Onboarding

### 4.1 Prerequisites (Before Dec 19)

1. **Install Tailscale** on staff phone
2. **Join Tailnet** (tanwa@twoflamingos.capital)
3. **Note device name** from Tailscale app
4. **Register device** in staff table

### 4.2 Staff Quick Guide (< 2 minutes)

```
1. Open browser → tenacity:3000
2. You'll see your name automatically
3. Customer walks by? Tap "WALK-BY"
4. Had a conversation? Tap "CONVERSATION" → answer 4 questions
5. Done!
```

---

## 5. Success Metrics

| Metric | How Measured | Target |
|--------|--------------|--------|
| **Data Integrity** | PWA sales = cash reconciliation | 100% match |
| **Staff Speed** | Time from tap to saved | < 10 sec |
| **Hypothesis Data** | Can answer all 4 questions | Yes/No |

### 5.1 Hypothesis Validation Outputs

After event, we should be able to answer:

1. **Price Elasticity:** "X% of single-box buyers paid sticker price"
2. **Bundle Preference by Persona:** "Gift buyers bought Y% bundles vs Z% for parents"
3. **Big Garden Effectiveness:** "X% of conversations started from Big Garden screen"
4. **990 Floor Validation:** "X% of no-sales cited price as objection"

---

## 6. Implementation Timeline

| Date | Milestone |
|------|-----------|
| **Dec 18 AM** | Database schema deployed on persistence |
| **Dec 18 PM** | API + PWA deployed on tenacity |
| **Dec 18 PM** | Staff devices registered |
| **Dec 19 AM** | 5-min staff walkthrough |
| **Dec 19-25** | Live logging at K Village |
| **Dec 26** | Export data, generate hypothesis report |

---

## 7. Open Items

- [ ] Veerapat's new device name (add to staff table when known)
- [x] Confirm tenacity has Tailscale socket accessible (verified)
- [x] Create `lumicello_insights` database on persistence (done Dec 19)

## 8. Deployment Status

**Deployed:** Dec 19, 2025 at 11:55 ICT

| Component | Status | URL |
|-----------|--------|-----|
| API | Running (healthy) | http://tenacity:8000/api |
| PWA | Running (healthy) | http://tenacity:3000 |
| Database | Connected | persistence:5432/lumicello_insights |

**Staff Registered:**
- sisia (Veerapat)


---

## 9. Phase 2 Features (Post-Event Enhancements)

**Status:** Planned
**Target:** Post Dec 25, 2025 (after K Village event)
**Author:** PRD-engineer Agent
**Last Updated:** Dec 19, 2025

### 9.1 Overview

Phase 2 extends the Lumicello Insights Logger with data exploration, record management, and customer journey visualization capabilities. These features enable:

1. **Transaction Browser** - Search and filter individual interaction records
2. **Record Management** - Soft delete and notes for data cleanup/annotation
3. **Sankey Diagram** - Visualize customer journey from walk-by to sale
4. **Data Model Enhancement** - Treat walk-by as superset of all foot traffic

---

### 9.2 Data Model Change: Walk-by as Superset

#### 9.2.1 Problem Statement

Current model treats `walk_by` and `conversation` as mutually exclusive:
```
interaction_type IN ('walk_by', 'conversation')
```

This creates analytical problems:
- Cannot calculate true conversion rate (engaged/total foot traffic)
- Sankey diagram requires knowing total people who saw booth
- Walk-by and conversation are logged separately, missing implicit relationship

#### 9.2.2 Proposed Solution: Option A (Engaged Boolean)

Every person who pauses at the booth is logged. Some get upgraded to "engaged" with conversation details.

```sql
-- Migration: Add engaged flag to interactions
-- File: migrations/002_add_engaged_flag.sql

ALTER TABLE interactions 
ADD COLUMN engaged BOOLEAN DEFAULT FALSE;

-- Add soft delete support
ALTER TABLE interactions 
ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Add notes support
ALTER TABLE interactions 
ADD COLUMN notes TEXT DEFAULT NULL;

-- Backfill existing data:
-- - walk_by records: engaged = FALSE (already correct default)
-- - conversation records: engaged = TRUE
UPDATE interactions 
SET engaged = TRUE 
WHERE interaction_type = 'conversation';

-- Future: interaction_type becomes deprecated
-- All new records use interaction_type = 'walk_by' with engaged = TRUE/FALSE
-- Keep interaction_type for backward compatibility but treat as derived

-- Add index for soft delete queries
CREATE INDEX idx_interactions_deleted_at ON interactions (deleted_at);
CREATE INDEX idx_interactions_engaged ON interactions (engaged);

-- Composite index for common filter patterns
CREATE INDEX idx_interactions_filters ON interactions (
  DATE(timestamp),
  engaged,
  sale_type,
  persona,
  staff_device
) WHERE deleted_at IS NULL;
```

#### 9.2.3 Data Flow After Migration

```
                    ALL FOOT TRAFFIC
                          │
                          ▼
              ┌───────────────────────┐
              │   + PAUSED AT BOOTH   │  ← All get logged as interaction
              │   (interaction row)   │     engaged = FALSE by default
              └───────────┬───────────┘
                          │
            ┌─────────────┴─────────────┐
            │                           │
            ▼                           ▼
    ┌───────────────┐          ┌───────────────┐
    │   WALK-BY     │          │   ENGAGED     │
    │ engaged=FALSE │          │ engaged=TRUE  │
    │ (no details)  │          │ + persona     │
    └───────────────┘          │ + hook        │
                               │ + outcome     │
                               └───────────────┘
```

#### 9.2.4 API Changes for New Model

```python
# POST /api/interactions - Updated payload options

# Option 1: Quick walk-by (unchanged)
{
    "interaction_type": "walk_by"  # engaged defaults to FALSE
}

# Option 2: Full conversation (unchanged API, backend sets engaged=TRUE)
{
    "interaction_type": "conversation",
    "persona": "parent",
    "hook": "physical_kits",
    "sale_type": "single",
    ...
}

# Backend logic in main.py:
# if interaction_type == 'conversation':
#     engaged = True
# else:
#     engaged = False
```

---

### 9.3 Feature 1: Transaction Browser

#### 9.3.1 User Stories

| ID | Story | Acceptance Criteria |
|----|-------|---------------------|
| P2-01 | As staff, I want to browse all recorded interactions so I can review what happened | List view shows recent 50 interactions with pagination |
| P2-02 | As staff, I want to filter by date range so I can focus on specific days | Date picker with quick options (Today, Yesterday, This Week, Custom) |
| P2-03 | As staff, I want to filter by persona/hook/outcome so I can analyze patterns | Multi-select chips for each filter category |
| P2-04 | As staff, I want to see interaction details in a card format | Card shows all fields with visual hierarchy |
| P2-05 | As staff, I want to access the browser from the main stats screen | New "Browse" button in stats header |

#### 9.3.2 Screen: Transaction Browser

```
┌─────────────────────────────────────┐
│  ← Stats           📋 Browse        │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────┐    │
│  │ 🔍 Search...           ▾    │    │  ← Date range dropdown
│  └─────────────────────────────┘    │
│                                     │
│  FILTERS                [ Clear ]   │
│  ┌───────┐ ┌───────┐ ┌───────┐     │
│  │ Today │ │ Week  │ │Custom │     │  ← Quick date filters
│  └───────┘ └───────┘ └───────┘     │
│                                     │
│  ┌────────┐ ┌────────┐ ┌────────┐  │
│  │ Engaged│ │Walk-by │ │ Sales  │  │  ← Type filters
│  └────────┘ └────────┘ └────────┘  │
│                                     │
│  ┌────────┐ ┌────────┐ ┌────────┐  │
│  │ Parent │ │ Gift   │ │ Expat  │  │  ← Persona filters
│  └────────┘ └────────┘ └────────┘  │
│                                     │
│  ┌────────┐ ┌────────┐             │
│  │ Veerapat│ │ Other │             │  ← Staff filters
│  └────────┘ └────────┘             │
│                                     │
│  Showing 47 of 203 records          │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────┐    │
│  │ 14:32  Parent → Single ฿990│    │  ← Interaction card
│  │ 📦 Physical Kits  💚 LINE  │    │
│  │ Veerapat            [ ⋮ ]  │    │  ← Overflow menu
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ 14:28  Walk-by             │    │
│  │ (no engagement)            │    │
│  │ Veerapat            [ ⋮ ]  │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ 14:15  Gift Buyer → No Sale│    │
│  │ 📱 Big Garden  🤔 Thinking │    │
│  │ Veerapat            [ ⋮ ]  │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │        Load More ↓         │    │  ← Pagination
│  └─────────────────────────────┘    │
│                                     │
└─────────────────────────────────────┘
```

#### 9.3.3 Filter Chip States

```
┌────────────────────────────────────────────────────────┐
│  FILTER CHIP STATES                                    │
├────────────────────────────────────────────────────────┤
│                                                        │
│  INACTIVE:              ACTIVE:             MULTI:     │
│  ┌──────────┐          ┌──────────┐       ┌──────────┐│
│  │  Parent  │          │ ● Parent │       │ ✓ 2 sel  ││
│  │  (gray)  │          │(terracot)│       │(terracot)││
│  └──────────┘          └──────────┘       └──────────┘│
│                                                        │
│  - Tap to toggle single selection                      │
│  - Long-press or second tap to enter multi-select      │
│  - "Clear" resets all filters                          │
│                                                        │
└────────────────────────────────────────────────────────┘
```

#### 9.3.4 Interaction Card Detail View

```
┌─────────────────────────────────────┐
│  ← Back            🗑️ Delete        │
├─────────────────────────────────────┤
│                                     │
│           14:32 Today               │
│           Dec 19, 2025              │
│                                     │
│  ┌─────────────────────────────┐    │
│  │         👶 Parent           │    │
│  │                             │    │
│  │  Hook:     📦 Physical Kits │    │
│  │  Outcome:  1️⃣ Single × 2     │    │
│  │  Price:    ฿990 × 2 = ฿1,980│    │
│  │  Lead:     💚 LINE          │    │
│  │                             │    │
│  │  Staff:    Veerapat (sisia) │    │
│  └─────────────────────────────┘    │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  NOTES                              │
│  ┌─────────────────────────────┐    │
│  │ "Returning customer, bought │    │
│  │  set for niece last year"   │    │
│  │                             │    │
│  │              [Edit Note]    │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │      + Add Note             │    │  ← If no notes yet
│  └─────────────────────────────┘    │
│                                     │
└─────────────────────────────────────┘
```

---

### 9.4 Feature 2: Record Management

#### 9.4.1 User Stories

| ID | Story | Acceptance Criteria |
|----|-------|---------------------|
| P2-06 | As staff, I want to mark records for deletion so I can clean up mistakes | Soft delete with confirmation, sets deleted_at timestamp |
| P2-07 | As staff, I want to undelete records so I can recover mistakes | "Trash" view shows deleted, undelete restores |
| P2-08 | As staff, I want to add notes to any interaction | Text input, saves to notes field |
| P2-09 | As staff, I want notes separate from main tap flow | Notes only accessible from transaction browser |

#### 9.4.2 Soft Delete Flow

```
┌────────────────────────────────────────────────────────────────┐
│                      SOFT DELETE FLOW                          │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  1. User taps overflow menu (⋮) on interaction card            │
│                                                                │
│     ┌────────────────┐                                         │
│     │ View Details   │                                         │
│     │ Add Note       │                                         │
│     │ ────────────── │                                         │
│     │ 🗑️ Delete      │  ← Red text                             │
│     └────────────────┘                                         │
│                                                                │
│  2. Confirmation modal appears                                 │
│                                                                │
│     ┌─────────────────────────────┐                            │
│     │                             │                            │
│     │  Delete this interaction?   │                            │
│     │                             │                            │
│     │  14:32 Parent → Single      │                            │
│     │  ฿1,980                     │                            │
│     │                             │                            │
│     │  This can be undone from    │                            │
│     │  the Trash view.            │                            │
│     │                             │                            │
│     │  [ Cancel ]  [ 🗑️ Delete ]  │                            │
│     │                             │                            │
│     └─────────────────────────────┘                            │
│                                                                │
│  3. Record hidden from main view (deleted_at = NOW())          │
│                                                                │
│  4. Stats automatically exclude deleted records                │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

#### 9.4.3 Trash View Screen

```
┌─────────────────────────────────────┐
│  ← Browse            🗑️ Trash       │
├─────────────────────────────────────┤
│                                     │
│  3 deleted records                  │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ ⚠️ 14:32  Parent → Single   │    │  ← Strikethrough styling
│  │ Deleted 2 hours ago         │    │
│  │                             │    │
│  │ [ Restore ]  [ Permanent ]  │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ ⚠️ 13:45  Walk-by           │    │
│  │ Deleted 3 hours ago         │    │
│  │                             │    │
│  │ [ Restore ]  [ Permanent ]  │    │
│  └─────────────────────────────┘    │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  💡 Permanently deleted records     │
│  cannot be recovered. Soft-deleted  │
│  records are kept for 30 days.      │
│                                     │
└─────────────────────────────────────┘
```

#### 9.4.4 Notes Input Modal

```
┌─────────────────────────────────────┐
│                                     │
│  ┌─────────────────────────────┐    │
│  │                             │    │
│  │  📝 Add Note                │    │
│  │                             │    │
│  │  ┌───────────────────────┐  │    │
│  │  │                       │  │    │
│  │  │ Customer mentioned    │  │    │
│  │  │ they saw us at        |  │    │
│  │  │ Emquartier last       │  │    │
│  │  │ month...              │  │    │
│  │  │                       │  │    │
│  │  └───────────────────────┘  │    │  ← Expandable textarea
│  │                             │    │
│  │  This is an exception to    │    │
│  │  zero-typing: notes are     │    │
│  │  optional annotations.      │    │
│  │                             │    │
│  │  [ Cancel ]    [ Save ✓ ]   │    │
│  │                             │    │
│  └─────────────────────────────┘    │
│                                     │
└─────────────────────────────────────┘
```

---

### 9.5 Feature 3: Sankey Diagram

#### 9.5.1 User Stories

| ID | Story | Acceptance Criteria |
|----|-------|---------------------|
| P2-10 | As owner, I want to see customer journey flow so I can optimize conversion | Sankey shows walk-by → engaged → outcomes |
| P2-11 | As owner, I want to see objection breakdown for no-sales | No-sale node expands to show reasons |
| P2-12 | As owner, I want to filter the Sankey by date range | Same date filters as transaction browser |
| P2-13 | As owner, I want to see percentages at each stage | Labels show count and % of previous stage |

#### 9.5.2 Sankey Diagram Layout

```
┌────────────────────────────────────────────────────────────────────────────┐
│                         CUSTOMER JOURNEY SANKEY                            │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  [ Today ▾ ]                                                               │
│                                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │    ┌──────────┐                              ┌─────────────────┐    │   │
│  │    │          │─────────────────────────────▶│ Left w/o engage │    │   │
│  │    │          │           114 (54%)          │      114        │    │   │
│  │    │          │                              └─────────────────┘    │   │
│  │    │   ALL    │                                                     │   │
│  │    │ PAUSED   │      ┌─────────────┐         ┌─────────────────┐    │   │
│  │    │          │─────▶│             │────────▶│    No Sale      │    │   │
│  │    │   211    │ 97   │  ENGAGED    │  55     │       55        │────┼──▶│
│  │    │          │(46%) │             │ (57%)   │                 │    │   │
│  │    │          │      │     97      │         └─────────────────┘    │   │
│  │    │          │      │             │         ┌─────────────────┐    │   │
│  │    │          │      │             │────────▶│ Single (×18)    │    │   │
│  │    │          │      │             │   18    │     ฿17,640     │    │   │
│  │    │          │      │             │ (19%)   └─────────────────┘    │   │
│  │    │          │      │             │         ┌─────────────────┐    │   │
│  │    │          │      │             │────────▶│ Bundle 3 (×15)  │    │   │
│  │    │          │      │             │   15    │     ฿40,350     │    │   │
│  │    │          │      │             │ (15%)   └─────────────────┘    │   │
│  │    │          │      │             │         ┌─────────────────┐    │   │
│  │    │          │      │             │────────▶│ Full Year (×9)  │    │   │
│  │    └──────────┘      └─────────────┘    9    │     ฿44,910     │    │   │
│  │                                       (9%)   └─────────────────┘    │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
│  ─────────────────────────────────────────────────────────────────────────│
│                                                                            │
│  CONVERSION FUNNEL SUMMARY                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                  │
│  │ Pause → Talk │    │ Talk → Sale  │    │ Total Conv.  │                  │
│  │    46%       │    │    43%       │    │    20%       │                  │
│  └──────────────┘    └──────────────┘    └──────────────┘                  │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

#### 9.5.3 Expanded No-Sale View

```
┌──────────────────────────────────────────────────────────────────┐
│  NO-SALE BREAKDOWN (Tap to expand)                               │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│    ┌───────────────┐                                             │
│    │               │──────────▶ 🤔 Thinking (25)        45%      │
│    │               │──────────▶ 💰 Too Expensive (15)   27%      │
│    │   NO SALE     │──────────▶ 🧸 Has Toys (8)         15%      │
│    │     55        │──────────▶ 👶 Age Mismatch (5)      9%      │
│    │               │──────────▶ ❓ Other (2)             4%      │
│    └───────────────┘                                             │
│                                                                  │
│  💡 15 customers said "too expensive" - consider promotional     │
│     pricing or bundle messaging improvements                     │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

#### 9.5.4 Sankey with Lead Capture Overlay

```
┌──────────────────────────────────────────────────────────────────┐
│  SALE OUTCOMES + LEAD CAPTURE                                    │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│    ┌─────────────────┐           ┌─────────────────┐             │
│    │ Single (×18)    │──────────▶│ 💚 LINE (12)   │ 67%         │
│    │     ฿17,640     │──────────▶│ 📧 Email (3)   │ 17%         │
│    └─────────────────┘──────────▶│ ➖ None (3)    │ 16%         │
│                                  └─────────────────┘             │
│                                                                  │
│    ┌─────────────────┐           ┌─────────────────┐             │
│    │ No Sale (55)    │──────────▶│ 💚 LINE (23)   │ 42%         │
│    │                 │──────────▶│ 📧 Email (5)   │  9%         │
│    └─────────────────┘──────────▶│ ➖ None (27)   │ 49%         │
│                                  └─────────────────┘             │
│                                                                  │
│  💡 Even no-sale conversations captured 28 leads!                │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

### 9.6 Database Schema (Phase 2 Complete)

```sql
-- ============================================================
-- PHASE 2 MIGRATIONS
-- File: migrations/002_phase2_features.sql
-- ============================================================

-- 1. Add engaged boolean for walk-by superset model
ALTER TABLE interactions 
ADD COLUMN IF NOT EXISTS engaged BOOLEAN DEFAULT FALSE;

-- 2. Add soft delete support
ALTER TABLE interactions 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 3. Add notes support
ALTER TABLE interactions 
ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT NULL;

-- 4. Add updated_at for tracking edits
ALTER TABLE interactions 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NULL;

-- 5. Backfill engaged flag based on existing interaction_type
UPDATE interactions 
SET engaged = TRUE 
WHERE interaction_type = 'conversation' 
AND engaged = FALSE;

-- 6. Create indexes for new query patterns
CREATE INDEX IF NOT EXISTS idx_interactions_deleted_at 
ON interactions (deleted_at);

CREATE INDEX IF NOT EXISTS idx_interactions_engaged 
ON interactions (engaged);

CREATE INDEX IF NOT EXISTS idx_interactions_notes 
ON interactions (id) 
WHERE notes IS NOT NULL;

-- 7. Composite index for transaction browser filters
CREATE INDEX IF NOT EXISTS idx_interactions_browser 
ON interactions (
    timestamp DESC,
    engaged,
    sale_type,
    persona,
    hook,
    staff_device
) WHERE deleted_at IS NULL;

-- 8. Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 9. Trigger for updated_at
DROP TRIGGER IF EXISTS update_interactions_updated_at ON interactions;
CREATE TRIGGER update_interactions_updated_at
    BEFORE UPDATE ON interactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- UPDATED SCHEMA REFERENCE (After Phase 2)
-- ============================================================

/*
TABLE: interactions
---------------------
id              UUID PRIMARY KEY
timestamp       TIMESTAMPTZ DEFAULT NOW()
staff_device    VARCHAR(100) NOT NULL REFERENCES staff(device_name)
interaction_type VARCHAR(20) NOT NULL  -- 'walk_by' or 'conversation' (legacy)
engaged         BOOLEAN DEFAULT FALSE   -- TRUE = conversation, FALSE = walk-by only
persona         VARCHAR(20)             -- NULL for walk-by
hook            VARCHAR(20)             -- NULL for walk-by  
sale_type       VARCHAR(20)             -- NULL for walk-by, or sale outcome
quantity        INTEGER DEFAULT 1
unit_price      INTEGER
total_amount    INTEGER
lead_type       VARCHAR(20)
objection       VARCHAR(50)
notes           TEXT                    -- NEW: Optional annotations
deleted_at      TIMESTAMPTZ             -- NEW: Soft delete timestamp
updated_at      TIMESTAMPTZ             -- NEW: Last edit timestamp
*/
```

---

### 9.7 API Endpoints (Phase 2)

#### 9.7.1 New Endpoints

```yaml
# ============================================================
# TRANSACTION BROWSER ENDPOINTS
# ============================================================

GET /api/interactions/browse
  description: Filtered, paginated interaction list
  query_params:
    - start_date: ISO date (optional)
    - end_date: ISO date (optional)
    - engaged: boolean (optional) - true=conversations, false=walk-by only
    - sale_types: comma-separated list (optional) - "single,bundle_3,none"
    - personas: comma-separated list (optional) - "parent,gift_buyer"
    - hooks: comma-separated list (optional)
    - staff_devices: comma-separated list (optional)
    - objections: comma-separated list (optional)
    - has_notes: boolean (optional)
    - include_deleted: boolean (default: false)
    - limit: integer (default: 50, max: 200)
    - offset: integer (default: 0)
    - sort: "timestamp_desc" | "timestamp_asc" (default: timestamp_desc)
  response:
    - total: integer (total matching records)
    - records: array of interaction objects
    - has_more: boolean

GET /api/interactions/{id}
  description: Get single interaction with full details
  response:
    - Full interaction object including notes

# ============================================================
# RECORD MANAGEMENT ENDPOINTS  
# ============================================================

PATCH /api/interactions/{id}
  description: Update interaction (notes, soft delete)
  body:
    - notes: string (optional) - Update notes
    - deleted_at: ISO timestamp | null (optional) - Soft delete/restore
  response:
    - Updated interaction object

DELETE /api/interactions/{id}
  description: Permanent delete (admin only, requires confirmation)
  query_params:
    - confirm: boolean (required, must be true)
  response:
    - 204 No Content

GET /api/interactions/trash
  description: List soft-deleted interactions
  query_params:
    - limit: integer (default: 50)
    - offset: integer (default: 0)
  response:
    - Same format as /browse

POST /api/interactions/{id}/restore
  description: Restore soft-deleted interaction
  response:
    - Restored interaction object

# ============================================================
# SANKEY DATA ENDPOINT
# ============================================================

GET /api/analytics/sankey
  description: Aggregated data for Sankey diagram
  query_params:
    - start_date: ISO date (optional)
    - end_date: ISO date (optional)
  response:
    nodes:
      - { id: "all_paused", label: "All Paused", value: 211 }
      - { id: "not_engaged", label: "Left w/o Engage", value: 114 }
      - { id: "engaged", label: "Engaged", value: 97 }
      - { id: "no_sale", label: "No Sale", value: 55 }
      - { id: "single", label: "Single", value: 18 }
      - { id: "bundle_3", label: "Bundle 3", value: 15 }
      - { id: "full_year", label: "Full Year", value: 9 }
    links:
      - { source: "all_paused", target: "not_engaged", value: 114 }
      - { source: "all_paused", target: "engaged", value: 97 }
      - { source: "engaged", target: "no_sale", value: 55 }
      - { source: "engaged", target: "single", value: 18 }
      - { source: "engaged", target: "bundle_3", value: 15 }
      - { source: "engaged", target: "full_year", value: 9 }
    metrics:
      total_paused: 211
      engaged_rate: 0.46
      conversion_rate: 0.43
      overall_conversion: 0.20
      total_revenue: 102900
    objection_breakdown:
      need_to_think: 25
      too_expensive: 15
      has_toys: 8
      age_mismatch: 5
      other: 2
    lead_breakdown:
      sale_with_line: 35
      sale_with_email: 5
      no_sale_with_line: 23
      no_sale_with_email: 5
```

#### 9.7.2 Updated Existing Endpoints

```yaml
# Update existing /api/stats to use new engaged model

GET /api/stats?period=today
  changes:
    - "visitors" now = COUNT(*) WHERE deleted_at IS NULL
    - "conversations" now = COUNT(*) WHERE engaged = TRUE AND deleted_at IS NULL
    - "walk_bys" now = COUNT(*) WHERE engaged = FALSE AND deleted_at IS NULL
    - All queries now filter: WHERE deleted_at IS NULL

# Update POST /api/interactions for new model

POST /api/interactions
  changes:
    - Backend sets engaged = TRUE when interaction_type = 'conversation'
    - Backend sets engaged = FALSE when interaction_type = 'walk_by'
    - No client-side changes required
```

---

### 9.8 State Diagrams

#### 9.8.1 Transaction Browser Navigation

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    TRANSACTION BROWSER STATE MACHINE                     │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────┐     tap Browse      ┌──────────┐                            │
│  │  Stats  │ ────────────────▶  │  Browse  │                            │
│  │  Screen │                     │   List   │                            │
│  └─────────┘                     └──────────┘                            │
│       ▲                               │                                  │
│       │                               │ tap card                         │
│       │ tap ←                         ▼                                  │
│       │                          ┌──────────┐                            │
│       └───────────────────────── │  Detail  │                            │
│                                  │   View   │                            │
│                                  └──────────┘                            │
│                                       │                                  │
│                    ┌──────────────────┼──────────────────┐               │
│                    │                  │                  │               │
│                    ▼                  ▼                  ▼               │
│              ┌──────────┐      ┌──────────┐      ┌──────────┐            │
│              │  Notes   │      │  Delete  │      │  Trash   │            │
│              │  Modal   │      │  Confirm │      │   View   │            │
│              └──────────┘      └──────────┘      └──────────┘            │
│                    │                  │                  │               │
│                    │ save/cancel      │ confirm          │ restore       │
│                    ▼                  ▼                  ▼               │
│              ┌─────────────────────────────────────────────────┐         │
│              │               Return to List                    │         │
│              │           (refresh data if changed)             │         │
│              └─────────────────────────────────────────────────┘         │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

#### 9.8.2 Filter State Machine

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         FILTER CHIP STATE MACHINE                        │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│                           ┌──────────────┐                               │
│                           │   INACTIVE   │                               │
│                           │  (default)   │                               │
│                           └──────────────┘                               │
│                                  │                                       │
│                                  │ tap                                   │
│                                  ▼                                       │
│                           ┌──────────────┐                               │
│                           │   ACTIVE     │ ◀──────┐                      │
│                           │  (selected)  │        │ tap another          │
│                           └──────────────┘        │ in same group        │
│                              │       │            │ (exclusive mode)     │
│                              │       │            │                      │
│                    tap same  │       │ long-press │                      │
│                              │       │            │                      │
│                              ▼       ▼            │                      │
│                      ┌──────────────────┐        │                      │
│                      │     INACTIVE     │────────┘                       │
│                      │    (deselected)  │                                │
│                      └──────────────────┘                                │
│                                                                          │
│  MULTI-SELECT MODE:                                                      │
│  ─────────────────                                                       │
│                                                                          │
│  Long-press on any chip → enters multi-select for that filter group      │
│  In multi-select: tap toggles individual chips (multiple can be active)  │
│  "Clear" button → resets all filters to INACTIVE                         │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

#### 9.8.3 Record Lifecycle

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        INTERACTION RECORD LIFECYCLE                      │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│                           ┌──────────────┐                               │
│                           │   CREATED    │                               │
│                           │ deleted_at   │                               │
│                           │   = NULL     │                               │
│                           └──────────────┘                               │
│                                  │                                       │
│                                  │ visible in:                           │
│                                  │ - Stats (counted)                     │
│                                  │ - Browse (listed)                     │
│                                  │ - Sankey (aggregated)                 │
│                                  │                                       │
│               ┌──────────────────┼──────────────────┐                    │
│               │                  │                  │                    │
│               ▼                  ▼                  ▼                    │
│        ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│        │  ADD NOTE    │  │ SOFT DELETE  │  │   UPDATED    │              │
│        │ notes = text │  │ deleted_at   │  │ updated_at   │              │
│        │              │  │  = NOW()     │  │  = NOW()     │              │
│        └──────────────┘  └──────────────┘  └──────────────┘              │
│               │                  │                                       │
│               │                  │ visible in:                           │
│               │                  │ - Trash view ONLY                     │
│               │                  │ - NOT in Stats                        │
│               │                  │ - NOT in Browse (default)             │
│               │                  │ - NOT in Sankey                       │
│               │                  │                                       │
│               │                  ▼                                       │
│               │          ┌──────────────┐                                │
│               │          │   RESTORE    │                                │
│               │          │ deleted_at   │                                │
│               │          │   = NULL     │                                │
│               │          └──────────────┘                                │
│               │                  │                                       │
│               │                  │ returns to normal visibility          │
│               │                  │                                       │
│               ▼                  ▼                                       │
│        ┌───────────────────────────────────────┐                         │
│        │            ACTIVE RECORD              │                         │
│        │     (can be edited, deleted again)    │                         │
│        └───────────────────────────────────────┘                         │
│                          │                                               │
│                          │ PERMANENT DELETE                              │
│                          │ (admin only, requires confirm=true)           │
│                          ▼                                               │
│                   ┌──────────────┐                                       │
│                   │   DELETED    │                                       │
│                   │ (row removed)│                                       │
│                   │  IRREVERSIBLE│                                       │
│                   └──────────────┘                                       │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

### 9.9 Component Architecture

#### 9.9.1 New React Components

```
src/
├── App.jsx                     # Existing - add new screens
├── components/
│   ├── TransactionBrowser/
│   │   ├── BrowseScreen.jsx    # Main list view
│   │   ├── FilterBar.jsx       # Date + filter chips
│   │   ├── FilterChip.jsx      # Individual filter button
│   │   ├── InteractionCard.jsx # Compact card for list
│   │   ├── InteractionDetail.jsx # Full detail view
│   │   └── Pagination.jsx      # Load more button
│   │
│   ├── RecordManagement/
│   │   ├── DeleteConfirmModal.jsx
│   │   ├── NotesModal.jsx
│   │   ├── TrashScreen.jsx
│   │   └── TrashCard.jsx
│   │
│   ├── Sankey/
│   │   ├── SankeyScreen.jsx    # Container with date filter
│   │   ├── SankeyDiagram.jsx   # Plotly Sankey chart
│   │   ├── ConversionMetrics.jsx # Funnel summary cards
│   │   └── ObjectionBreakdown.jsx # Expandable no-sale detail
│   │
│   └── shared/
│       ├── Modal.jsx           # Reusable modal wrapper
│       ├── DateRangePicker.jsx # Date selection UI
│       └── OverflowMenu.jsx    # Three-dot menu component
│
└── hooks/
    ├── useInteractions.js      # Browse API + caching
    ├── useFilters.js           # Filter state management
    └── useSankeyData.js        # Sankey API + formatting
```

#### 9.9.2 Screen Navigation Map

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          SCREEN NAVIGATION MAP                           │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│                              ┌──────────┐                                │
│                              │   HOME   │                                │
│                              │  Screen  │                                │
│                              └──────────┘                                │
│                                   │                                      │
│                          tap stats icon                                  │
│                                   │                                      │
│                                   ▼                                      │
│                              ┌──────────┐                                │
│                              │  STATS   │ ◀───────────────┐              │
│                              │  Screen  │                 │              │
│                              └──────────┘                 │              │
│                                   │                       │              │
│                    ┌──────────────┴──────────────┐        │              │
│              tap Browse                    tap Sankey     │              │
│                    │                             │        │              │
│                    ▼                             ▼        │              │
│              ┌──────────┐                  ┌──────────┐   │              │
│              │  BROWSE  │                  │  SANKEY  │   │              │
│              │  Screen  │                  │  Screen  │───┘              │
│              └──────────┘                  └──────────┘                  │
│                    │                                                     │
│            tap interaction                                               │
│                    │                                                     │
│                    ▼                                                     │
│              ┌──────────┐                                                │
│              │  DETAIL  │                                                │
│              │  Screen  │                                                │
│              └──────────┘                                                │
│                    │                                                     │
│        ┌──────────┼──────────┐                                           │
│   tap notes   tap delete  tap trash                                      │
│        │          │          │                                           │
│        ▼          ▼          ▼                                           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                                  │
│  │  NOTES   │ │  DELETE  │ │  TRASH   │                                  │
│  │  Modal   │ │  Modal   │ │  Screen  │                                  │
│  └──────────┘ └──────────┘ └──────────┘                                  │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

### 9.10 Design Specifications

#### 9.10.1 Color Usage for Phase 2

| Element | Color | Variable | Usage |
|---------|-------|----------|-------|
| Filter chip inactive | Cream | `--cream` | Default unselected state |
| Filter chip active | Terracotta | `--terracotta` | Selected filter |
| Filter chip multi | Terracotta light | `--terracotta-light` | Multi-select indicator |
| Delete button | #dc2626 | Custom | Destructive action |
| Delete confirm BG | #fee2e2 | Custom | Warning background |
| Restore button | Forest | `--forest` | Positive action |
| Notes text | Charcoal | `--charcoal` | Note content |
| Notes placeholder | Warm gray | `--warm-gray` | Empty state |
| Sankey flow | Terracotta gradient | `--terracotta` → `--terracotta-dark` | Main flow |
| Sankey no-sale | #f87171 | Custom | Lost opportunity |
| Sankey sales | Forest | `--forest` | Conversion success |

#### 9.10.2 Responsive Breakpoints

```css
/* Mobile first - all Phase 2 screens */
.browse-screen,
.sankey-screen,
.detail-screen {
  min-width: 375px;
  max-width: 100vw;
}

/* Filter chips wrap on small screens */
@media (max-width: 380px) {
  .filter-row {
    flex-wrap: wrap;
    gap: 6px;
  }
  
  .filter-chip {
    font-size: 12px;
    padding: 6px 10px;
  }
}

/* Sankey diagram responsive */
@media (max-width: 500px) {
  .sankey-container {
    height: 300px;
    overflow-x: auto;
  }
  
  .sankey-diagram {
    min-width: 500px; /* Horizontal scroll if needed */
  }
}

@media (min-width: 501px) {
  .sankey-container {
    height: 400px;
  }
}
```

#### 9.10.3 Tap Targets (Thumb-Zone Compliance)

```
┌────────────────────────────────────────────────────────────────┐
│  PHASE 2 TAP TARGET SPECIFICATIONS                             │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Filter chips:       44px height minimum                       │
│  Interaction cards:  Full width, min-height 72px               │
│  Overflow menu (⋮):  44×44px touch target                      │
│  Load More button:   Full width, 52px height                   │
│  Modal buttons:      Full width, 48px height                   │
│  Restore/Delete:     48px height, min 44px width               │
│                                                                │
│  Note: All interactive elements in bottom 60% of screen        │
│  where possible. Header actions use larger targets (48px).     │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

### 9.11 Implementation Plan

| Phase | Task | Estimate | Dependencies |
|-------|------|----------|--------------|
| **2.1** | Database migration (engaged, deleted_at, notes) | 1 day | None |
| **2.2** | API: Browse endpoint with filters | 2 days | 2.1 |
| **2.3** | API: PATCH/DELETE endpoints | 1 day | 2.1 |
| **2.4** | API: Sankey data endpoint | 1 day | 2.1 |
| **2.5** | Frontend: Transaction Browser screen | 2 days | 2.2 |
| **2.6** | Frontend: Filter chips component | 1 day | 2.5 |
| **2.7** | Frontend: Detail view + notes modal | 1 day | 2.5, 2.3 |
| **2.8** | Frontend: Trash view | 0.5 day | 2.3 |
| **2.9** | Frontend: Sankey diagram (Plotly) | 2 days | 2.4 |
| **2.10** | Integration testing | 1 day | All above |
| **2.11** | QA testing against PRD | 0.5 day | 2.10 |

**Total Estimate:** 12-13 days

---

### 9.12 Success Criteria

| Metric | Target | Measurement |
|--------|--------|-------------|
| Filter response time | < 500ms | API latency for /browse with filters |
| Sankey load time | < 1s | Full diagram render |
| Soft delete recovery | 100% | All soft-deleted records restorable |
| Mobile usability | All tap targets ≥44px | Manual verification |
| Data integrity | Zero orphaned records | Verify notes/deletes don't corrupt |

---

### 9.13 Open Questions

| # | Question | Context | Status |
|---|----------|---------|--------|
| 1 | Should permanent delete require owner auth? | Currently any Tailscale user can delete | TBD |
| 2 | Auto-purge soft-deleted after 30 days? | Or keep indefinitely? | TBD |
| 3 | Add "undo" toast for quick restore? | Instead of going to Trash view | Nice-to-have |
| 4 | Export filtered data to CSV? | From transaction browser | Future |
| 5 | Sankey: Show walk-bys that return later as sales? | Requires session tracking | Out of scope |

---

### 9.14 Technical Notes

#### 9.14.1 Plotly.js Sankey Integration

```javascript
// Install: uv add plotly.js-dist-min (or npm equivalent)
// Or use CDN in index.html

// Example Sankey configuration
const sankeyData = {
  type: "sankey",
  orientation: "h",
  node: {
    pad: 15,
    thickness: 20,
    line: { color: "black", width: 0.5 },
    label: ["All Paused", "Left", "Engaged", "No Sale", "Single", "Bundle", "Full Year"],
    color: ["#D4654A", "#8B7E74", "#D4654A", "#f87171", "#2D5A3D", "#2D5A3D", "#2D5A3D"]
  },
  link: {
    source: [0, 0, 2, 2, 2, 2],
    target: [1, 2, 3, 4, 5, 6],
    value: [114, 97, 55, 18, 15, 9],
    color: ["rgba(139, 126, 116, 0.4)", "rgba(212, 101, 74, 0.4)", ...]
  }
};

// Responsive layout
const layout = {
  font: { family: "Plus Jakarta Sans" },
  margin: { l: 20, r: 20, t: 20, b: 20 },
  paper_bgcolor: "#FDF8F4",
  plot_bgcolor: "#FDF8F4"
};
```

#### 9.14.2 Filter Query Building (Backend)

```python
# In main.py - parameterized query builder pattern
from typing import List, Optional

async def build_browse_query(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    engaged: Optional[bool] = None,
    sale_types: Optional[List[str]] = None,
    personas: Optional[List[str]] = None,
    # ... etc
):
    conditions = ["deleted_at IS NULL"]
    params = []
    param_idx = 1
    
    if start_date:
        conditions.append(f"timestamp >= ${param_idx}")
        params.append(start_date)
        param_idx += 1
    
    if engaged is not None:
        conditions.append(f"engaged = ${param_idx}")
        params.append(engaged)
        param_idx += 1
    
    if sale_types:
        placeholders = ", ".join([f"${param_idx + i}" for i in range(len(sale_types))])
        conditions.append(f"sale_type IN ({placeholders})")
        params.extend(sale_types)
        param_idx += len(sale_types)
    
    # ... build full query
    
    where_clause = " AND ".join(conditions)
    return f"SELECT * FROM interactions WHERE {where_clause}", params
```

---

### 9.15 References

- Existing PRD Sections 1-8 for context
- `/Users/tanwa/lumicello/booth_tracker/api/main.py:1-250` - Current API structure
- `/Users/tanwa/lumicello/booth_tracker/web/src/App.jsx:1-600` - Current React patterns
- `/Users/tanwa/lumicello/booth_tracker/web/src/App.css:1-500` - Design system variables

---

*Phase 2 PRD authored by prd-engineer agent. Ready for implementation after K Village event.*

---

## 10. Staff Configuration & Performance Analytics

**Status:** Planned
**Priority:** High (enables seller performance analysis during event)
**Author:** Human + Claude
**Last Updated:** Dec 19, 2025

### 10.1 Overview

Enable dynamic staff assignment to devices and provide seller-specific performance analytics. This addresses the reality that:
- Multiple staff may share devices during shifts
- The same person may use different devices
- Business needs to compare seller effectiveness

### 10.2 Current vs Proposed Model

#### Current Model (Device-Based)
```
Device "sisia" → Always mapped to "Veerapat"
Device "tanwa-iphone" → Always mapped to "Tanwa"

Problem: If Tanwa uses sisia's phone, interactions are misattributed
```

#### Proposed Model (Session-Based)
```
Device "sisia" → Session start → "Who's selling?" → Veerapat selected
                                                   → All interactions tagged to Veerapat
              → Shift change → "Who's selling?" → Tanwa selected
                                                → Now tagged to Tanwa
```

### 10.3 Data Model Changes

```sql
-- ============================================================
-- STAFF CONFIG MIGRATIONS
-- File: migrations/003_staff_config.sql
-- ============================================================

-- 1. Add active_staff_id to track who is currently using each device
ALTER TABLE staff
ADD COLUMN IF NOT EXISTS active_seller VARCHAR(50) DEFAULT NULL;

-- 2. Create sellers table (people who sell, separate from devices)
CREATE TABLE IF NOT EXISTS sellers (
    id VARCHAR(50) PRIMARY KEY,           -- 'tanwa', 'veerapat', etc.
    display_name VARCHAR(100) NOT NULL,   -- 'Tanwa', 'Veerapat'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- 3. Add seller reference to interactions (separate from device)
ALTER TABLE interactions
ADD COLUMN IF NOT EXISTS seller_id VARCHAR(50) REFERENCES sellers(id);

-- 4. Backfill: Create sellers from existing staff devices
INSERT INTO sellers (id, display_name)
SELECT
    device_name as id,
    display_name
FROM staff
ON CONFLICT (id) DO NOTHING;

-- 5. Backfill: Set seller_id from staff_device for historical data
UPDATE interactions i
SET seller_id = s.device_name
FROM staff s
WHERE i.staff_device = s.device_name
AND i.seller_id IS NULL;

-- 6. Index for seller performance queries
CREATE INDEX IF NOT EXISTS idx_interactions_seller
ON interactions (seller_id, timestamp)
WHERE deleted_at IS NULL;

-- ============================================================
-- SEED DATA
-- ============================================================

INSERT INTO sellers (id, display_name) VALUES
    ('tanwa', 'Tanwa'),
    ('veerapat', 'Veerapat')
ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name;
```

### 10.4 Feature 1: Staff Selector on Session Start

#### 10.4.1 User Stories

| ID | Story | Acceptance Criteria |
|----|-------|---------------------|
| P3-01 | As staff, I want to select who I am when opening the app so my interactions are tracked correctly | Selector appears on app open if no active seller set |
| P3-02 | As staff, I want to switch sellers mid-session for shift changes | "Switch Seller" option accessible from home screen |
| P3-03 | As owner, I want to see all registered sellers so I can manage the team | Config portal shows seller list |
| P3-04 | As owner, I want to add/remove sellers without code changes | Config portal allows CRUD on sellers |

#### 10.4.2 Screen: Seller Selection (Session Start)

```
┌─────────────────────────────────────┐
│                                     │
│           LUMICELLO                 │
│         K VILLAGE 2025              │
│                                     │
├─────────────────────────────────────┤
│                                     │
│        Who's selling now?           │
│                                     │
│  ┌─────────────────────────────┐    │
│  │                             │    │
│  │      👤  Tanwa              │    │  ← Large tap target
│  │                             │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │                             │    │
│  │      👤  Veerapat           │    │
│  │                             │    │
│  └─────────────────────────────┘    │
│                                     │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  Using device: sisia                │
│  This can be changed anytime        │
│                                     │
└─────────────────────────────────────┘
```

#### 10.4.3 Home Screen with Active Seller Indicator

```
┌─────────────────────────────────────┐
│  LUMICELLO K VILLAGE                │
│  👤 Veerapat                [ 🔄 ]  │  ← Tap 🔄 to switch seller
├─────────────────────────────────────┤
│                                     │
│  YOUR STATS TODAY    │  BOOTH TOTAL │
│  🛒 5 (฿7,450)       │  🛒 12       │  ← Personal vs team
│  📈 62% conv         │  📈 48%      │
│                                     │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────┐    │
│  │                             │    │
│  │      + WALK-BY              │    │
│  │                             │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │                             │    │
│  │      + CONVERSATION         │    │
│  │                             │    │
│  └─────────────────────────────┘    │
│                                     │
│  [ 📊 View Stats ]                  │
│                                     │
└─────────────────────────────────────┘
```

#### 10.4.4 Switch Seller Flow

```
┌────────────────────────────────────────────────────────────────┐
│                      SWITCH SELLER FLOW                         │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  1. User taps 🔄 button on home screen                         │
│                                                                │
│  2. Confirmation appears (prevent accidental switches)         │
│                                                                │
│     ┌─────────────────────────────┐                            │
│     │                             │                            │
│     │  Switch seller?             │                            │
│     │                             │                            │
│     │  Current: Veerapat          │                            │
│     │                             │                            │
│     │  Select new seller:         │                            │
│     │                             │                            │
│     │  ┌───────────────────────┐  │                            │
│     │  │      👤  Tanwa        │  │                            │
│     │  └───────────────────────┘  │                            │
│     │                             │                            │
│     │        [ Cancel ]           │                            │
│     │                             │                            │
│     └─────────────────────────────┘                            │
│                                                                │
│  3. After selection, updates device's active_seller            │
│                                                                │
│  4. Brief toast: "Now logging as Tanwa ✓"                      │
│                                                                │
│  5. Home screen updates to show new seller name                │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

### 10.5 Feature 2: Staff Performance Dashboard

#### 10.5.1 User Stories

| ID | Story | Acceptance Criteria |
|----|-------|---------------------|
| P3-05 | As owner, I want to see sales by seller to compare performance | Stats screen shows per-seller breakdown |
| P3-06 | As owner, I want to see conversion rates by seller | Each seller shows engaged→sale % |
| P3-07 | As owner, I want to filter by seller in transaction browser | Seller filter chip in browse screen |
| P3-08 | As owner, I want Sankey to optionally show by seller | Toggle or filter for seller-specific funnel |

#### 10.5.2 Screen: Stats Dashboard with Seller Breakdown

```
┌─────────────────────────────────────┐
│  ← Home              📊 Stats       │
├─────────────────────────────────────┤
│  [ Today ] [ Week ] [ All ]         │
├─────────────────────────────────────┤
│                                     │
│  BOOTH TOTALS                       │
│  👥 211 paused   →   🛒 42 sales    │
│  💬 97 engaged       ฿65,430 rev    │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  SELLER PERFORMANCE                 │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  👤 Veerapat                │    │
│  │  ─────────────────────────  │    │
│  │  👥 Engaged: 58             │    │
│  │  🛒 Sales: 26 (฿38,920)     │    │
│  │  📈 Conv: 45%               │    │
│  │  ⭐ Avg sale: ฿1,497        │    │
│  │                             │    │
│  │  Best hook: Physical Kits   │    │
│  │  Top persona: Parent        │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  👤 Tanwa                   │    │
│  │  ─────────────────────────  │    │
│  │  👥 Engaged: 39             │    │
│  │  🛒 Sales: 16 (฿26,510)     │    │
│  │  📈 Conv: 41%               │    │
│  │  ⭐ Avg sale: ฿1,657        │    │
│  │                             │    │
│  │  Best hook: Big Garden      │    │
│  │  Top persona: Gift Buyer    │    │
│  └─────────────────────────────┘    │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  [ 📋 Browse ] [ 📊 Sankey ]        │
│  [ ⚙️ Config ]                      │  ← New config button
│                                     │
└─────────────────────────────────────┘
```

#### 10.5.3 Seller Comparison View

```
┌─────────────────────────────────────────────────────────────────┐
│  SELLER COMPARISON (This Week)                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                    Veerapat         Tanwa          Booth Avg    │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  Conversations     58               39              48.5        │
│                    ██████████       ██████░░        ────        │
│                                                                 │
│  Sales             26               16              21          │
│                    ██████████       ██████░░        ────        │
│                                                                 │
│  Revenue           ฿38,920          ฿26,510         ฿32,715     │
│                    ██████████       ██████░░        ────        │
│                                                                 │
│  Conversion %      45%              41%             43%         │
│                    █████████░       ████████░       ────        │
│                                                                 │
│  Avg per Sale      ฿1,497           ฿1,657          ฿1,557      │
│                    ████████░░       ██████████      ────        │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  💡 Tanwa has higher average sale value despite fewer total     │
│     sales. Consider sharing upselling techniques.               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### 10.6 Feature 3: Staff Config Portal

#### 10.6.1 User Stories

| ID | Story | Acceptance Criteria |
|----|-------|---------------------|
| P3-09 | As owner, I want to add new sellers to the system | Config screen has "Add Seller" option |
| P3-10 | As owner, I want to deactivate sellers who leave | Toggle active/inactive, doesn't delete data |
| P3-11 | As owner, I want to see which device each seller last used | Device info shown in config |

#### 10.6.2 Screen: Config Portal

```
┌─────────────────────────────────────┐
│  ← Stats            ⚙️ Config       │
├─────────────────────────────────────┤
│                                     │
│  REGISTERED SELLERS                 │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  👤 Veerapat           ✓    │    │  ← Active indicator
│  │  Last active: sisia         │    │
│  │  Today: 58 conversations    │    │
│  │                      [ ⋮ ]  │    │  ← Edit menu
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  👤 Tanwa              ✓    │    │
│  │  Last active: tanwa-phone   │    │
│  │  Today: 39 conversations    │    │
│  │                      [ ⋮ ]  │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │                             │    │
│  │      + Add Seller           │    │
│  │                             │    │
│  └─────────────────────────────┘    │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  DEVICES                            │
│                                     │
│  sisia          → Veerapat (now)    │
│  tanwa-phone    → (not in use)      │
│                                     │
│  💡 Sellers are assigned per-device │
│  when they start logging.           │
│                                     │
└─────────────────────────────────────┘
```

#### 10.6.3 Add/Edit Seller Modal

```
┌─────────────────────────────────────┐
│                                     │
│  ┌─────────────────────────────┐    │
│  │                             │    │
│  │  ➕ Add Seller              │    │
│  │                             │    │
│  │  ┌───────────────────────┐  │    │
│  │  │ Display name          │  │    │  ← Exception: typing required
│  │  │                       │  │    │
│  │  │ Somchai              │  │    │
│  │  │                       │  │    │
│  │  └───────────────────────┘  │    │
│  │                             │    │
│  │  ID (auto-generated):       │    │
│  │  somchai                    │    │  ← Lowercase, no spaces
│  │                             │    │
│  │  [ Cancel ]    [ Add ✓ ]    │    │
│  │                             │    │
│  └─────────────────────────────┘    │
│                                     │
└─────────────────────────────────────┘
```

#### 10.6.4 Seller Context Menu

```
┌────────────────┐
│ Edit Name      │
│ ────────────── │
│ View Stats     │
│ ────────────── │
│ Deactivate     │  ← Soft disable, keeps data
└────────────────┘
```

---

### 10.7 API Endpoints (Staff Config)

```yaml
# ============================================================
# SELLER MANAGEMENT ENDPOINTS
# ============================================================

GET /api/sellers
  description: List all sellers
  query_params:
    - active_only: boolean (default: true)
  response:
    - sellers: array of { id, display_name, is_active, last_device, today_count }

POST /api/sellers
  description: Create new seller
  body:
    - display_name: string (required)
    - id: string (optional, auto-generated from name if not provided)
  response:
    - Created seller object

PATCH /api/sellers/{id}
  description: Update seller
  body:
    - display_name: string (optional)
    - is_active: boolean (optional)
  response:
    - Updated seller object

# ============================================================
# SESSION MANAGEMENT ENDPOINTS
# ============================================================

GET /api/session
  description: Get current session info for this device
  response:
    - device_name: string
    - active_seller: { id, display_name } | null
    - available_sellers: array of { id, display_name }

POST /api/session/select-seller
  description: Set active seller for current device
  body:
    - seller_id: string (required)
  response:
    - success: boolean
    - active_seller: { id, display_name }

# ============================================================
# SELLER ANALYTICS ENDPOINTS
# ============================================================

GET /api/analytics/by-seller
  description: Performance metrics grouped by seller
  query_params:
    - start_date: ISO date (optional)
    - end_date: ISO date (optional)
    - period: "today" | "week" | "all" (optional, alternative to dates)
  response:
    sellers:
      - seller_id: string
        display_name: string
        metrics:
          total_engaged: integer
          total_sales: integer
          total_revenue: integer
          conversion_rate: float
          avg_sale_value: float
          top_hook: string
          top_persona: string
    booth_totals:
      total_engaged: integer
      total_sales: integer
      total_revenue: integer
      avg_conversion_rate: float

GET /api/analytics/sankey?seller_id={id}
  description: Sankey data filtered to specific seller
  query_params:
    - seller_id: string (optional, omit for booth-wide)
    - start_date, end_date: as before
  response:
    - Same Sankey format, filtered to seller
```

---

### 10.8 Updated Existing Endpoints

```yaml
# Update /api/whoami to include session info
GET /api/whoami
  response (updated):
    device: "sisia"
    name: "Veerapat"  # Legacy - device display name
    active_seller: { id: "veerapat", display_name: "Veerapat" } | null
    requires_seller_selection: boolean

# Update POST /api/interactions to include seller_id
POST /api/interactions
  body (updated):
    - seller_id: string (optional, defaults to device's active_seller)
    - interaction_type: string
    - ...other fields
  validation:
    - If no seller_id and no active_seller on device, return 400
    - "Please select a seller before logging interactions"

# Update browse endpoint to support seller filter
GET /api/interactions/browse
  query_params (added):
    - seller_ids: comma-separated list (optional)
```

---

### 10.9 State Diagram: Seller Session

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        SELLER SESSION STATE MACHINE                       │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│                         ┌─────────────────────┐                          │
│                         │    APP OPENED       │                          │
│                         │  (device identified)│                          │
│                         └─────────────────────┘                          │
│                                   │                                      │
│                                   │ check device.active_seller           │
│                                   │                                      │
│                    ┌──────────────┴──────────────┐                       │
│                    │                             │                       │
│                    ▼                             ▼                       │
│         ┌─────────────────┐           ┌─────────────────┐                │
│         │  NO SELLER SET  │           │  SELLER ACTIVE  │                │
│         │  (first use or  │           │  (resume prev)  │                │
│         │   device reset) │           │                 │                │
│         └─────────────────┘           └─────────────────┘                │
│                    │                             │                       │
│                    │                             │ show home with        │
│                    │                             │ seller name           │
│                    ▼                             │                       │
│         ┌─────────────────┐                      │                       │
│         │ SELLER SELECTION│                      │                       │
│         │    SCREEN       │                      │                       │
│         │                 │                      │                       │
│         │  "Who's selling │                      │                       │
│         │   now?"         │                      │                       │
│         └─────────────────┘                      │                       │
│                    │                             │                       │
│                    │ tap seller                  │                       │
│                    │                             │                       │
│                    ▼                             ▼                       │
│         ┌─────────────────────────────────────────────┐                  │
│         │              ACTIVE SESSION                 │                  │
│         │                                             │                  │
│         │  - Seller name shown in header              │                  │
│         │  - All interactions tagged with seller_id   │                  │
│         │  - Stats show personal + booth metrics      │                  │
│         │                                             │                  │
│         └─────────────────────────────────────────────┘                  │
│                              │                                           │
│                              │ tap 🔄 switch                             │
│                              │                                           │
│                              ▼                                           │
│         ┌─────────────────────────────────────────────┐                  │
│         │           SWITCH SELLER MODAL               │                  │
│         │                                             │                  │
│         │  - Shows other available sellers            │                  │
│         │  - Cancel returns to active session         │                  │
│         │  - Select updates device.active_seller      │                  │
│         │                                             │                  │
│         └─────────────────────────────────────────────┘                  │
│                              │                                           │
│                              │ select new seller                         │
│                              │                                           │
│                              ▼                                           │
│                    (returns to ACTIVE SESSION                            │
│                     with new seller context)                             │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

### 10.10 Filter Integration: Transaction Browser

```
┌─────────────────────────────────────┐
│  ← Stats           📋 Browse        │
├─────────────────────────────────────┤
│                                     │
│  FILTERS                [ Clear ]   │
│  ┌───────┐ ┌───────┐ ┌───────┐     │
│  │ Today │ │ Week  │ │Custom │     │
│  └───────┘ └───────┘ └───────┘     │
│                                     │
│  ┌──────────┐ ┌──────────┐         │  ← NEW: Seller filter
│  │ Veerapat │ │  Tanwa   │         │
│  └──────────┘ └──────────┘         │
│                                     │
│  ┌────────┐ ┌────────┐ ┌────────┐  │
│  │ Engaged│ │Walk-by │ │ Sales  │  │
│  └────────┘ └────────┘ └────────┘  │
│                                     │
│  ...rest of filters...              │
│                                     │
└─────────────────────────────────────┘
```

---

### 10.11 Sankey with Seller Toggle

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  CUSTOMER JOURNEY                                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [ Today ▾ ]     [ All Sellers ▾ ]                                          │
│                        │                                                    │
│                        ├── All Sellers (default)                            │
│                        ├── Veerapat only                                    │
│                        └── Tanwa only                                       │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                                                                     │    │
│  │                     [ SANKEY DIAGRAM ]                              │    │
│  │                                                                     │    │
│  │    Shows filtered data based on seller selection                    │    │
│  │                                                                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  CONVERSION FUNNEL (Veerapat)                                               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                   │
│  │ Pause → Talk │    │ Talk → Sale  │    │ Total Conv.  │                   │
│  │    52%       │    │    45%       │    │    23%       │                   │
│  └──────────────┘    └──────────────┘    └──────────────┘                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 10.12 Implementation Plan (Staff Config)

| Phase | Task | Estimate | Dependencies |
|-------|------|----------|--------------|
| **3.1** | Database migration (sellers table, seller_id) | 0.5 day | Phase 2.1 |
| **3.2** | API: Seller CRUD endpoints | 1 day | 3.1 |
| **3.3** | API: Session management endpoints | 0.5 day | 3.2 |
| **3.4** | API: Analytics by-seller endpoint | 1 day | 3.1 |
| **3.5** | Frontend: Seller selection screen | 1 day | 3.3 |
| **3.6** | Frontend: Switch seller modal | 0.5 day | 3.5 |
| **3.7** | Frontend: Config portal screen | 1 day | 3.2 |
| **3.8** | Frontend: Stats dashboard seller breakdown | 1 day | 3.4 |
| **3.9** | Frontend: Seller filter in browse/sankey | 0.5 day | Phase 2.5, 2.9 |
| **3.10** | Integration testing | 0.5 day | All above |

**Total Estimate:** 7.5 days

---

### 10.13 Success Criteria

| Metric | Target | Measurement |
|--------|--------|-------------|
| Seller selection time | < 2 taps | Count taps from app open to logging |
| Attribution accuracy | 100% | All interactions have valid seller_id |
| Switch seller time | < 3 seconds | Time from tap to confirmed |
| Performance query | < 500ms | Analytics by-seller response time |

---

### 10.14 Open Questions

| # | Question | Context | Status |
|---|----------|---------|--------|
| 1 | Remember seller across app restarts? | Currently proposed: yes, stored on device | Confirmed |
| 2 | Allow "no seller" for testing? | Or always require seller? | TBD |
| 3 | Show seller in confirmation overlay? | After logging interaction | Nice-to-have |
| 4 | Seller photo/avatar support? | For visual identification | Future |

---

*Section 10 authored by Human + Claude. Enables seller attribution and performance comparison.*
