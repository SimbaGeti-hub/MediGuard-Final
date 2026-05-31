-- ============================================================
-- Phase 2: Mental Health Module Tables
-- ============================================================

-- Mood tracking (daily entries)
CREATE TABLE IF NOT EXISTS mood_entries (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  mood_score  INTEGER NOT NULL CHECK (mood_score BETWEEN 1 AND 10),
  mood_label  TEXT NOT NULL CHECK (mood_label IN ('terrible','bad','poor','low','neutral','okay','good','great','excellent','amazing')),
  energy      INTEGER CHECK (energy BETWEEN 1 AND 5),
  anxiety     INTEGER CHECK (anxiety BETWEEN 1 AND 5),
  sleep_hours NUMERIC(4,1),
  notes       TEXT,
  factors     TEXT[] DEFAULT '{}',
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE INDEX idx_mood_entries_user_date ON mood_entries(user_id, date DESC);
ALTER TABLE mood_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own mood" ON mood_entries FOR ALL USING (auth.uid() = user_id);

-- PHQ-9 and GAD-7 assessment results
CREATE TABLE IF NOT EXISTS mental_assessments (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  assessment_type TEXT NOT NULL CHECK (assessment_type IN ('PHQ-9','GAD-7','PHQ-2','PCL-5')),
  answers         JSONB NOT NULL,
  total_score     INTEGER NOT NULL,
  severity        TEXT NOT NULL CHECK (severity IN ('minimal','mild','moderate','moderately_severe','severe')),
  interpretation  TEXT,
  recommendations TEXT[],
  created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE INDEX idx_assessments_user ON mental_assessments(user_id, created_at DESC);
ALTER TABLE mental_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own assessments" ON mental_assessments FOR ALL USING (auth.uid() = user_id);

-- Journal entries
CREATE TABLE IF NOT EXISTS journal_entries (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title       TEXT,
  content     TEXT NOT NULL,
  mood_score  INTEGER CHECK (mood_score BETWEEN 1 AND 10),
  tags        TEXT[] DEFAULT '{}',
  is_private  BOOLEAN DEFAULT TRUE,
  ai_insights TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE INDEX idx_journal_user ON journal_entries(user_id, created_at DESC);
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own journal" ON journal_entries FOR ALL USING (auth.uid() = user_id);

-- Crisis check-ins
CREATE TABLE IF NOT EXISTS crisis_checkins (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  risk_level    TEXT NOT NULL CHECK (risk_level IN ('low','medium','high','critical')),
  responses     JSONB NOT NULL,
  safety_plan   TEXT,
  resources_shown TEXT[],
  created_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
ALTER TABLE crisis_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own checkins" ON crisis_checkins FOR ALL USING (auth.uid() = user_id);

-- Breathing exercise sessions
CREATE TABLE IF NOT EXISTS breathing_sessions (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  technique     TEXT NOT NULL,
  duration_sec  INTEGER NOT NULL,
  mood_before   INTEGER CHECK (mood_before BETWEEN 1 AND 10),
  mood_after    INTEGER CHECK (mood_after BETWEEN 1 AND 10),
  created_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
ALTER TABLE breathing_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own breathing" ON breathing_sessions FOR ALL USING (auth.uid() = user_id);
