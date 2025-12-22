-- Migration: Add Instagram to lead_type options
-- Description: Adds 'instagram' as a valid option for lead_type field

-- Drop the existing constraint if it exists
ALTER TABLE interactions DROP CONSTRAINT IF EXISTS interactions_lead_type_check;

-- Add the new constraint with instagram included
ALTER TABLE interactions ADD CONSTRAINT interactions_lead_type_check
    CHECK (lead_type IN ('line', 'email', 'instagram', 'none') OR lead_type IS NULL);
