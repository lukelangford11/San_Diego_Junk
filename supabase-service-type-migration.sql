-- Migration: Add Enhanced Pricing Columns to Leads Table
-- This adds service type inference, cubic yards tracking, heavy materials detection,
-- and pricing breakdown fields for the new competitor-anchored pricing system

-- Add service type tracking columns
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS service_type_inferred VARCHAR(20) CHECK (service_type_inferred IN ('curbside', 'full_service', 'unknown')),
  ADD COLUMN IF NOT EXISTS service_type_confirmed VARCHAR(20) CHECK (service_type_confirmed IN ('curbside', 'ground_garage', 'inside_home', 'upstairs')),
  ADD COLUMN IF NOT EXISTS service_type_confidence DECIMAL(3,2);  -- 0.00-1.00

-- Add enhanced cubic yards tracking
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS cubic_yards_raw DECIMAL(5,2),          -- Vision output
  ADD COLUMN IF NOT EXISTS cubic_yards_adjusted DECIMAL(5,2);     -- After 2yd minimum

-- Add heavy materials detection
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS heavy_materials_detected BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS heavy_material_type VARCHAR(50);

-- Add pricing breakdown for calibration
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS pricing_breakdown JSONB;

-- Add vision reasoning tags
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS vision_reasoning_tags TEXT[];

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_leads_service_type_confirmed ON leads(service_type_confirmed);
CREATE INDEX IF NOT EXISTS idx_leads_heavy_materials ON leads(heavy_materials_detected) WHERE heavy_materials_detected = TRUE;
CREATE INDEX IF NOT EXISTS idx_leads_cubic_yards ON leads(cubic_yards_adjusted);

-- Update existing rows to have safe defaults
UPDATE leads 
SET 
  service_type_inferred = 'unknown',
  heavy_materials_detected = FALSE
WHERE service_type_inferred IS NULL;

-- Verify migration
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'leads' 
  AND (
    column_name LIKE 'service_type%' OR 
    column_name LIKE 'cubic_yards%' OR 
    column_name LIKE 'heavy_material%' OR
    column_name = 'pricing_breakdown' OR
    column_name = 'vision_reasoning_tags'
  )
ORDER BY ordinal_position;

-- Show summary
SELECT 
  'Migration Complete' as status,
  COUNT(*) as total_leads,
  SUM(CASE WHEN service_type_inferred IS NOT NULL THEN 1 ELSE 0 END) as with_service_type,
  SUM(CASE WHEN cubic_yards_adjusted IS NOT NULL THEN 1 ELSE 0 END) as with_cubic_yards,
  SUM(CASE WHEN heavy_materials_detected = TRUE THEN 1 ELSE 0 END) as with_heavy_materials
FROM leads;
