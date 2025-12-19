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
AND (engaged = FALSE OR engaged IS NULL);

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
