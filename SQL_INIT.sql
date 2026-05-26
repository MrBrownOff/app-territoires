-- ===== TABLES SUPABASE =====

-- Table zones
CREATE TABLE IF NOT EXISTS zones (
  id TEXT PRIMARY KEY,
  rep_number INTEGER NOT NULL,
  coordinates JSONB NOT NULL,
  color TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table rep_locations (domiciles)
CREATE TABLE IF NOT EXISTS rep_locations (
  rep_number INTEGER PRIMARY KEY,
  lat DECIMAL(10, 8) NOT NULL,
  lon DECIMAL(11, 8) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_zones_rep ON zones(rep_number);

-- Données initiales (domiciles)
INSERT INTO rep_locations (rep_number, lat, lon) VALUES
  (1, 45.467, -72.057),  -- Cookshire
  (2, 46.8139, -71.2080), -- Québec
  (3, 48.3894, -71.2036)  -- Chicoutimi
ON CONFLICT (rep_number) DO NOTHING;

-- RLS (Row Level Security) - optionnel
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE rep_locations ENABLE ROW LEVEL SECURITY;

-- Policies (optionnel - tout le monde peut lire/écrire)
CREATE POLICY "Allow all" ON zones FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON rep_locations FOR ALL USING (true) WITH CHECK (true);
