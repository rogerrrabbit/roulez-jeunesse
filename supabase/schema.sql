-- =============================================
-- ROULEZ JEUNESSE - Script SQL pour Supabase
-- Carnet d'entretien automobile
-- =============================================

-- Activer l'extension UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- TABLE: vehicles (Véhicules)
-- =============================================
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand VARCHAR(100) NOT NULL,
  model VARCHAR(100) NOT NULL,
  year INTEGER NOT NULL CHECK (year >= 1900 AND year <= 2100),
  license_plate VARCHAR(20) NOT NULL,
  vin VARCHAR(17),
  fuel_type VARCHAR(20) NOT NULL DEFAULT 'sp95',
  current_mileage INTEGER NOT NULL DEFAULT 0 CHECK (current_mileage >= 0),
  purchase_date DATE,
  purchase_price DECIMAL(10, 2),
  image_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX idx_vehicles_user_id ON vehicles(user_id);

-- =============================================
-- TABLE: maintenance_records (Entretiens)
-- =============================================
CREATE TABLE IF NOT EXISTS maintenance_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  date DATE NOT NULL,
  mileage INTEGER NOT NULL CHECK (mileage >= 0),
  cost DECIMAL(10, 2) NOT NULL DEFAULT 0,
  garage_name VARCHAR(200),
  garage_address TEXT,
  invoice_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX idx_maintenance_vehicle_id ON maintenance_records(vehicle_id);
CREATE INDEX idx_maintenance_user_id ON maintenance_records(user_id);
CREATE INDEX idx_maintenance_date ON maintenance_records(date DESC);

-- =============================================
-- TABLE: reminders (Rappels)
-- =============================================
CREATE TABLE IF NOT EXISTS reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  due_date DATE,
  due_mileage INTEGER CHECK (due_mileage >= 0),
  is_completed BOOLEAN DEFAULT FALSE,
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX idx_reminders_vehicle_id ON reminders(vehicle_id);
CREATE INDEX idx_reminders_user_id ON reminders(user_id);
CREATE INDEX idx_reminders_due_date ON reminders(due_date);
CREATE INDEX idx_reminders_is_completed ON reminders(is_completed);

-- =============================================
-- TABLE: fuel_logs (Pleins de carburant)
-- =============================================
CREATE TABLE IF NOT EXISTS fuel_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  mileage INTEGER NOT NULL CHECK (mileage >= 0),
  liters DECIMAL(8, 2) NOT NULL CHECK (liters > 0),
  price_per_liter DECIMAL(6, 3) NOT NULL CHECK (price_per_liter > 0),
  total_cost DECIMAL(10, 2) NOT NULL,
  fuel_type VARCHAR(20) NOT NULL,
  station_name VARCHAR(200),
  is_full_tank BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX idx_fuel_logs_vehicle_id ON fuel_logs(vehicle_id);
CREATE INDEX idx_fuel_logs_user_id ON fuel_logs(user_id);
CREATE INDEX idx_fuel_logs_date ON fuel_logs(date DESC);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Activer RLS sur toutes les tables
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_logs ENABLE ROW LEVEL SECURITY;

-- Policies pour vehicles
CREATE POLICY "Users can view own vehicles" ON vehicles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own vehicles" ON vehicles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own vehicles" ON vehicles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own vehicles" ON vehicles
  FOR DELETE USING (auth.uid() = user_id);

-- Policies pour maintenance_records
CREATE POLICY "Users can view own maintenance records" ON maintenance_records
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own maintenance records" ON maintenance_records
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own maintenance records" ON maintenance_records
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own maintenance records" ON maintenance_records
  FOR DELETE USING (auth.uid() = user_id);

-- Policies pour reminders
CREATE POLICY "Users can view own reminders" ON reminders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reminders" ON reminders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reminders" ON reminders
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reminders" ON reminders
  FOR DELETE USING (auth.uid() = user_id);

-- Policies pour fuel_logs
CREATE POLICY "Users can view own fuel logs" ON fuel_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own fuel logs" ON fuel_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own fuel logs" ON fuel_logs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own fuel logs" ON fuel_logs
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- TRIGGERS pour updated_at
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_vehicles_updated_at
  BEFORE UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_maintenance_records_updated_at
  BEFORE UPDATE ON maintenance_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reminders_updated_at
  BEFORE UPDATE ON reminders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
