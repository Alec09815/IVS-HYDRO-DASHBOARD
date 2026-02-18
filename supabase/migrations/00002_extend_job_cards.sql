-- ============================================================
-- Extend job_cards with Job Card form fields
-- ============================================================

ALTER TABLE job_cards
  ADD COLUMN IF NOT EXISTS pump_config TEXT,          -- '20K' or '40K'
  ADD COLUMN IF NOT EXISTS surface_type TEXT,         -- e.g., 'Bridge Deck', 'Column', 'Wall'
  ADD COLUMN IF NOT EXISTS cut_type TEXT,             -- e.g., 'Full Depth', 'Partial Depth', 'Scarify'
  ADD COLUMN IF NOT EXISTS equipment_assigned JSONB DEFAULT '[]',    -- array of equipment IDs
  ADD COLUMN IF NOT EXISTS onsite_contacts JSONB DEFAULT '[]',       -- array of contact objects
  ADD COLUMN IF NOT EXISTS location_address TEXT,
  ADD COLUMN IF NOT EXISTS location_city TEXT,
  ADD COLUMN IF NOT EXISTS location_state TEXT,
  ADD COLUMN IF NOT EXISTS location_zip TEXT,
  ADD COLUMN IF NOT EXISTS crew_assigned JSONB DEFAULT '[]',         -- array of crew assignment objects
  ADD COLUMN IF NOT EXISTS rental_equipment JSONB DEFAULT '[]',      -- array of rental equipment objects
  ADD COLUMN IF NOT EXISTS cost_codes_assigned JSONB DEFAULT '[]';   -- array of cost code IDs
