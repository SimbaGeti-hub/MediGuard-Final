-- Phase 5: Medication Management

CREATE TABLE IF NOT EXISTS medications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  generic_name TEXT,
  dosage TEXT NOT NULL,
  unit TEXT DEFAULT 'mg',
  frequency TEXT NOT NULL,
  times_per_day INTEGER DEFAULT 1,
  schedule_times TEXT[] DEFAULT '{}',
  prescribing_doctor TEXT,
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  color TEXT DEFAULT '#6366f1',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dose_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  medication_id UUID REFERENCES medications(id) ON DELETE CASCADE,
  scheduled_time TIMESTAMPTZ NOT NULL,
  taken_at TIMESTAMPTZ,
  status TEXT CHECK (status IN ('taken','skipped','late')) DEFAULT 'taken',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS interaction_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  drug_a TEXT NOT NULL,
  drug_b TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('minor','moderate','severe')) DEFAULT 'moderate',
  description TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE dose_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE interaction_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own medications" ON medications FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own dose_logs" ON dose_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own interaction_alerts" ON interaction_alerts FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_medications_user ON medications(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_dose_logs_user_date ON dose_logs(user_id, scheduled_time DESC);
CREATE INDEX IF NOT EXISTS idx_interaction_alerts_user ON interaction_alerts(user_id, created_at DESC);
