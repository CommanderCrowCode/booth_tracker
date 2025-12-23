-- Migration: Real-time notifications via PostgreSQL LISTEN/NOTIFY
-- This enables push notifications to connected clients when data changes

-- Function to notify on interaction changes
CREATE OR REPLACE FUNCTION notify_interaction_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Notify with the change type and table
    PERFORM pg_notify('data_change', json_build_object(
        'table', 'interactions',
        'action', TG_OP,
        'timestamp', CURRENT_TIMESTAMP
    )::text);
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Function to notify on event changes
CREATE OR REPLACE FUNCTION notify_event_change()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify('data_change', json_build_object(
        'table', 'events',
        'action', TG_OP,
        'timestamp', CURRENT_TIMESTAMP
    )::text);
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS interaction_notify_trigger ON interactions;
DROP TRIGGER IF EXISTS event_notify_trigger ON events;

-- Create triggers for interactions table
CREATE TRIGGER interaction_notify_trigger
AFTER INSERT OR UPDATE OR DELETE ON interactions
FOR EACH ROW EXECUTE FUNCTION notify_interaction_change();

-- Create triggers for events table
CREATE TRIGGER event_notify_trigger
AFTER INSERT OR UPDATE OR DELETE ON events
FOR EACH ROW EXECUTE FUNCTION notify_event_change();
