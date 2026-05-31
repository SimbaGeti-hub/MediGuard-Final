-- Phase 3 & 4: Symptom Tracking, Pattern Analysis, Onboarding

-- Symptom logs
CREATE TABLE IF NOT EXISTS symptom_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  symptom TEXT NOT NULL,
  severity INTEGER CHECK (severity BETWEEN 1 AND 10),
  body_location TEXT,
  time_of_day TEXT CHECK (time_of_day IN ('morning','afternoon','evening','night','unknown')),
  context_tags TEXT[] DEFAULT '{}',
  notes TEXT,
  logged_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pattern reports (AI-generated weekly analysis)
CREATE TABLE IF NOT EXISTS pattern_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  report_content TEXT NOT NULL,
  patterns JSONB DEFAULT '[]',
  recommendations TEXT[],
  severity_trend TEXT CHECK (severity_trend IN ('improving','stable','worsening','insufficient_data')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trend alerts
CREATE TABLE IF NOT EXISTS trend_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  symptom TEXT NOT NULL,
  alert_type TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User onboarding state
CREATE TABLE IF NOT EXISTS onboarding_state (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  completed BOOLEAN DEFAULT FALSE,
  step_reached INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE symptom_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pattern_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE trend_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own symptom_logs" ON symptom_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own pattern_reports" ON pattern_reports FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own trend_alerts" ON trend_alerts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own onboarding_state" ON onboarding_state FOR ALL USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_symptom_logs_user_date ON symptom_logs(user_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_symptom_logs_symptom ON symptom_logs(user_id, symptom);
CREATE INDEX IF NOT EXISTS idx_pattern_reports_user ON pattern_reports(user_id, week_start DESC);
CREATE INDEX IF NOT EXISTS idx_trend_alerts_user ON trend_alerts(user_id, created_at DESC);
