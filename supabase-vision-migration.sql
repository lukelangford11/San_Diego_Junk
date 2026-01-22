-- Migration: Add Vision AI columns to leads table
-- Run this if you already have an existing leads table
-- For new installations, use supabase-schema.sql instead

-- Add Vision AI columns
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS ai_volume_cubic_yards DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS ai_detected_items TEXT[],
  ADD COLUMN IF NOT EXISTS ai_access_difficulty VARCHAR(20) CHECK (ai_access_difficulty IN ('easy', 'medium', 'hard')),
  ADD COLUMN IF NOT EXISTS ai_special_concerns TEXT[],
  ADD COLUMN IF NOT EXISTS ai_confidence VARCHAR(20) CHECK (ai_confidence IN ('low', 'medium', 'high')),
  ADD COLUMN IF NOT EXISTS ai_notes TEXT,
  ADD COLUMN IF NOT EXISTS pricing_method VARCHAR(20) DEFAULT 'legacy' CHECK (pricing_method IN ('legacy', 'vision'));

-- Create index for faster queries on pricing method
CREATE INDEX IF NOT EXISTS idx_leads_pricing_method ON leads(pricing_method);

-- Update existing rows to have 'legacy' as pricing method (if NULL)
UPDATE leads 
SET pricing_method = 'legacy' 
WHERE pricing_method IS NULL;

-- Verify migration
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'leads' 
  AND column_name LIKE 'ai_%' OR column_name = 'pricing_method'
ORDER BY ordinal_position;
