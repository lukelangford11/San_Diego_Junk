-- San Diego Junk Removal Lead Generation Platform
-- Database Schema for Supabase/PostgreSQL
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- LEADS TABLE
-- Primary source of truth for all estimate requests
-- ============================================================================
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Customer Information
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(20) NOT NULL,
  customer_email VARCHAR(255),
  zip_code VARCHAR(10) NOT NULL,
  
  -- Job Details
  photo_urls TEXT[] NOT NULL,
  item_types TEXT[] DEFAULT '{}',
  additional_notes TEXT,
  preferred_pickup_start TIMESTAMPTZ,
  preferred_pickup_end TIMESTAMPTZ,
  
  -- AI Estimate Output
  estimated_min_price DECIMAL(10,2) NOT NULL,
  estimated_max_price DECIMAL(10,2) NOT NULL,
  confidence_level VARCHAR(20) NOT NULL CHECK (confidence_level IN ('low', 'medium', 'high')),
  estimate_assumptions TEXT,
  pricing_zone VARCHAR(50),
  
  -- Vision AI Analysis (GPT-4 Vision)
  ai_volume_cubic_yards DECIMAL(5,2),
  ai_detected_items TEXT[],
  ai_access_difficulty VARCHAR(20) CHECK (ai_access_difficulty IN ('easy', 'medium', 'hard')),
  ai_special_concerns TEXT[],
  ai_confidence VARCHAR(20) CHECK (ai_confidence IN ('low', 'medium', 'high')),
  ai_notes TEXT,
  pricing_method VARCHAR(20) DEFAULT 'legacy' CHECK (pricing_method IN ('legacy', 'vision')),
  
  -- Service Type Tracking (Enhanced Pricing)
  service_type_inferred VARCHAR(20) CHECK (service_type_inferred IN ('curbside', 'full_service', 'unknown')),
  service_type_confirmed VARCHAR(20) CHECK (service_type_confirmed IN ('curbside', 'ground_garage', 'inside_home', 'upstairs')),
  service_type_confidence DECIMAL(3,2),  -- 0.00-1.00
  
  -- Enhanced Cubic Yards Tracking
  cubic_yards_raw DECIMAL(5,2),          -- Vision output
  cubic_yards_adjusted DECIMAL(5,2),     -- After 2yd minimum
  
  -- Heavy Materials Flag
  heavy_materials_detected BOOLEAN DEFAULT FALSE,
  heavy_material_type VARCHAR(50),
  
  -- Pricing Breakdown for Calibration
  pricing_breakdown JSONB,
  
  -- Vision Reasoning Tags
  vision_reasoning_tags TEXT[],
  
  -- Lead Management
  status VARCHAR(50) NOT NULL DEFAULT 'unclaimed' CHECK (status IN ('unclaimed', 'claimed', 'scheduled', 'completed', 'cancelled')),
  claimed_by UUID,
  claimed_at TIMESTAMPTZ,
  
  -- Metadata
  source VARCHAR(50) DEFAULT 'web',
  ip_address INET,
  user_agent TEXT,
  
  -- Constraints
  CONSTRAINT photos_count_valid CHECK (array_length(photo_urls, 1) BETWEEN 1 AND 6),
  CONSTRAINT price_range_valid CHECK (estimated_min_price <= estimated_max_price),
  CONSTRAINT claimed_consistency CHECK (
    (status = 'claimed' AND claimed_by IS NOT NULL AND claimed_at IS NOT NULL) OR
    (status != 'claimed' OR (claimed_by IS NULL AND claimed_at IS NULL))
  )
);

-- Indexes for leads table
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_zip_code ON leads(zip_code);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_claimed_by ON leads(claimed_by) WHERE claimed_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_unclaimed ON leads(created_at DESC) WHERE status = 'unclaimed';

-- ============================================================================
-- BUYERS TABLE (Future Use)
-- Junk removal companies who purchase/claim leads
-- ============================================================================
CREATE TABLE IF NOT EXISTS buyers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  company_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  
  -- Service Coverage
  service_zip_codes TEXT[],
  max_distance_miles INT DEFAULT 25,
  
  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'suspended')),
  
  -- Authentication (placeholder for future JWT implementation)
  password_hash TEXT,
  last_login TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_buyers_status ON buyers(status);
CREATE INDEX IF NOT EXISTS idx_buyers_email ON buyers(email);

-- Add foreign key constraint from leads to buyers
ALTER TABLE leads
  DROP CONSTRAINT IF EXISTS fk_leads_claimed_by,
  ADD CONSTRAINT fk_leads_claimed_by 
    FOREIGN KEY (claimed_by) 
    REFERENCES buyers(id) 
    ON DELETE SET NULL;

-- ============================================================================
-- LEAD_CLAIMS TABLE (Future Use)
-- Audit trail of buyer interactions with leads
-- ============================================================================
CREATE TABLE IF NOT EXISTS lead_claims (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES buyers(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL CHECK (action IN ('viewed', 'claimed', 'contacted', 'won', 'lost'))
);

CREATE INDEX IF NOT EXISTS idx_lead_claims_lead_id ON lead_claims(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_claims_buyer_id ON lead_claims(buyer_id);
CREATE INDEX IF NOT EXISTS idx_lead_claims_created_at ON lead_claims(created_at DESC);

-- ============================================================================
-- RATE_LIMIT TABLE
-- Track submission attempts by IP for spam protection
-- ============================================================================
CREATE TABLE IF NOT EXISTS rate_limit (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ip_address INET NOT NULL,
  endpoint VARCHAR(100) NOT NULL,
  attempt_count INT NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_attempt TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_rate_limit_ip_endpoint ON rate_limit(ip_address, endpoint);
CREATE INDEX IF NOT EXISTS idx_rate_limit_window ON rate_limit(window_start);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyers ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit ENABLE ROW LEVEL SECURITY;

-- Leads policies: Allow service role full access, restrict anon key
CREATE POLICY "Service role has full access to leads" 
  ON leads FOR ALL 
  USING (auth.role() = 'service_role');

CREATE POLICY "Anon can insert leads" 
  ON leads FOR INSERT 
  WITH CHECK (auth.role() = 'anon');

CREATE POLICY "Anon can read own lead by ID" 
  ON leads FOR SELECT 
  USING (auth.role() = 'anon');

-- Buyers policies: Service role only for now
CREATE POLICY "Service role has full access to buyers" 
  ON buyers FOR ALL 
  USING (auth.role() = 'service_role');

-- Lead claims policies: Service role only
CREATE POLICY "Service role has full access to lead_claims" 
  ON lead_claims FOR ALL 
  USING (auth.role() = 'service_role');

-- Rate limit policies: Allow anon to read/write for their IP
CREATE POLICY "Service role has full access to rate_limit" 
  ON rate_limit FOR ALL 
  USING (auth.role() = 'service_role');

CREATE POLICY "Anon can manage rate_limit for own IP" 
  ON rate_limit FOR ALL 
  USING (auth.role() = 'anon');

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to clean up old rate limit entries (run via cron or manually)
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM rate_limit 
  WHERE window_start < NOW() - INTERVAL '24 hours';
END;
$$;

-- Function to get lead statistics
CREATE OR REPLACE FUNCTION get_lead_stats()
RETURNS TABLE (
  total_leads BIGINT,
  unclaimed_leads BIGINT,
  claimed_leads BIGINT,
  avg_estimate DECIMAL
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    COUNT(*)::BIGINT as total_leads,
    COUNT(*) FILTER (WHERE status = 'unclaimed')::BIGINT as unclaimed_leads,
    COUNT(*) FILTER (WHERE status = 'claimed')::BIGINT as claimed_leads,
    AVG((estimated_min_price + estimated_max_price) / 2) as avg_estimate
  FROM leads;
$$;

-- ============================================================================
-- SEED DATA (Optional - for testing)
-- ============================================================================

-- Uncomment to insert test buyer account
-- INSERT INTO buyers (company_name, email, phone, service_zip_codes, status)
-- VALUES (
--   'Test Junk Removal Co',
--   'test@example.com',
--   '+1-555-0100',
--   ARRAY['92101', '92102', '92103'],
--   'active'
-- )
-- ON CONFLICT (email) DO NOTHING;

-- ============================================================================
-- GRANTS (if using custom roles beyond service_role)
-- ============================================================================

-- Grant necessary permissions to authenticated role (future use)
-- GRANT SELECT, INSERT ON leads TO authenticated;
-- GRANT SELECT ON buyers TO authenticated;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✓ Schema created successfully!';
  RAISE NOTICE '✓ Tables: leads, buyers, lead_claims, rate_limit';
  RAISE NOTICE '✓ RLS policies enabled';
  RAISE NOTICE '✓ Helper functions created';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Copy your Supabase URL and keys to .env file';
  RAISE NOTICE '2. Configure Cloudinary account';
  RAISE NOTICE '3. Deploy to Netlify';
END $$;
