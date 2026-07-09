CREATE TABLE IF NOT EXISTS user_settings (
  id                          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  model                       TEXT DEFAULT 'gpt-4o',
  personality                 TEXT DEFAULT 'friendly' CHECK (personality IN ('clinical','friendly','concise')),
  temperature                 NUMERIC(3,2) DEFAULT 0.7,
  top_p                       NUMERIC(3,2) DEFAULT 1.0,
  frequency_penalty           NUMERIC(3,2) DEFAULT 0.0,
  tool_assess_symptoms        BOOLEAN DEFAULT TRUE,
  tool_drug_interactions      BOOLEAN DEFAULT TRUE,
  tool_medical_knowledge      BOOLEAN DEFAULT TRUE,
  tool_find_care_level        BOOLEAN DEFAULT TRUE,
  tool_update_health_profile  BOOLEAN DEFAULT TRUE,
  updated_at                  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own settings" ON user_settings FOR ALL USING (auth.uid() = user_id);
