-- Rollback: Remove real-time notification triggers
-- Run this to undo migrations/005_realtime_notifications.sql

-- Drop triggers
DROP TRIGGER IF EXISTS interaction_notify_trigger ON interactions;
DROP TRIGGER IF EXISTS event_notify_trigger ON events;

-- Drop functions
DROP FUNCTION IF EXISTS notify_interaction_change();
DROP FUNCTION IF EXISTS notify_event_change();

-- Verify cleanup
DO $$
BEGIN
    RAISE NOTICE 'Rollback complete. Real-time notification triggers removed.';
END $$;
