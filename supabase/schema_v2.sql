-- =============================================
-- ROULEZ JEUNESSE - Schema V2
-- Ajout des visites garage et calendriers d'entretien
-- =============================================

-- =============================================
-- TABLE: garage_visits (Visites au garage)
-- Une visite regroupe plusieurs prestations
-- =============================================
CREATE TABLE IF NOT EXISTS garage_visits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  mileage INTEGER NOT NULL CHECK (mileage >= 0),
  garage_name VARCHAR(200),
  garage_address TEXT,
  total_cost DECIMAL(10, 2) NOT NULL DEFAULT 0,
  invoice_number VARCHAR(100),
  invoice_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_garage_visits_vehicle_id ON garage_visits(vehicle_id);
CREATE INDEX idx_garage_visits_user_id ON garage_visits(user_id);
CREATE INDEX idx_garage_visits_date ON garage_visits(date DESC);

-- Ajouter la colonne visit_id à maintenance_records (optionnelle)
ALTER TABLE maintenance_records 
ADD COLUMN IF NOT EXISTS visit_id UUID REFERENCES garage_visits(id) ON DELETE SET NULL;

CREATE INDEX idx_maintenance_visit_id ON maintenance_records(visit_id);

-- =============================================
-- TABLE: maintenance_schedules (Calendrier d'entretien)
-- Définit les intervalles d'entretien par véhicule
-- =============================================
CREATE TABLE IF NOT EXISTS maintenance_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  maintenance_type VARCHAR(50) NOT NULL,
  name VARCHAR(200) NOT NULL,
  interval_km INTEGER CHECK (interval_km > 0),
  interval_months INTEGER CHECK (interval_months > 0),
  last_done_date DATE,
  last_done_mileage INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT check_interval CHECK (interval_km IS NOT NULL OR interval_months IS NOT NULL)
);

CREATE INDEX idx_maintenance_schedules_vehicle_id ON maintenance_schedules(vehicle_id);
CREATE INDEX idx_maintenance_schedules_user_id ON maintenance_schedules(user_id);

-- =============================================
-- ROW LEVEL SECURITY pour les nouvelles tables
-- =============================================

ALTER TABLE garage_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_schedules ENABLE ROW LEVEL SECURITY;

-- Policies pour garage_visits
CREATE POLICY "Users can view own garage visits" ON garage_visits
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own garage visits" ON garage_visits
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own garage visits" ON garage_visits
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own garage visits" ON garage_visits
  FOR DELETE USING (auth.uid() = user_id);

-- Policies pour maintenance_schedules
CREATE POLICY "Users can view own maintenance schedules" ON maintenance_schedules
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own maintenance schedules" ON maintenance_schedules
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own maintenance schedules" ON maintenance_schedules
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own maintenance schedules" ON maintenance_schedules
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- TRIGGERS pour updated_at
-- =============================================

CREATE TRIGGER update_garage_visits_updated_at
  BEFORE UPDATE ON garage_visits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_maintenance_schedules_updated_at
  BEFORE UPDATE ON maintenance_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
