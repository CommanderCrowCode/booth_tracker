-- ============================================================
-- PHASE 3: STAFF CONFIG MIGRATIONS
-- File: migrations/003_staff_config.sql
-- ============================================================

-- 1. Create sellers table (people who sell, separate from devices)
CREATE TABLE IF NOT EXISTS sellers (
    id VARCHAR(50) PRIMARY KEY,           -- 'tanwa', 'veerapat', etc.
    display_name VARCHAR(100) NOT NULL,   -- 'Tanwa', 'Veerapat'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- 2. Add active_seller to track who is currently using each device
ALTER TABLE staff
ADD COLUMN IF NOT EXISTS active_seller VARCHAR(50) REFERENCES sellers(id);

-- 3. Add seller reference to interactions (separate from device)
ALTER TABLE interactions
ADD COLUMN IF NOT EXISTS seller_id VARCHAR(50);

-- 4. Backfill: Create sellers from existing staff devices
INSERT INTO sellers (id, display_name)
SELECT
    device_name as id,
    display_name
FROM staff
ON CONFLICT (id) DO NOTHING;

-- 5. Add foreign key constraint after sellers exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'interactions_seller_id_fkey'
    ) THEN
        ALTER TABLE interactions
        ADD CONSTRAINT interactions_seller_id_fkey
        FOREIGN KEY (seller_id) REFERENCES sellers(id);
    END IF;
END $$;

-- 6. Backfill: Set seller_id from staff_device for historical data
UPDATE interactions i
SET seller_id = i.staff_device
WHERE i.seller_id IS NULL
AND EXISTS (SELECT 1 FROM sellers s WHERE s.id = i.staff_device);

-- 7. Index for seller performance queries
CREATE INDEX IF NOT EXISTS idx_interactions_seller
ON interactions (seller_id, timestamp)
WHERE deleted_at IS NULL;

-- 8. Add index for active sellers lookup
CREATE INDEX IF NOT EXISTS idx_sellers_active
ON sellers (is_active)
WHERE is_active = TRUE;

-- 9. Seed default sellers if needed
INSERT INTO sellers (id, display_name) VALUES
    ('tanwa', 'Tanwa'),
    ('veerapat', 'Veerapat')
ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name;
