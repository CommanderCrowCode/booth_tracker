-- ============================================================
-- PHASE 2+: EVENT TAGS
-- File: migrations/004_event_tags.sql
-- ============================================================

-- Simple table to track booth events/milestones
CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    description TEXT NOT NULL,
    staff_device VARCHAR(100),
    seller_id VARCHAR(50) REFERENCES sellers(id)
);

-- Index for time-based queries
CREATE INDEX IF NOT EXISTS idx_events_timestamp
ON events (timestamp DESC);
