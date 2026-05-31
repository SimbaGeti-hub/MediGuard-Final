CREATE TABLE IF NOT EXISTS health_profiles (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name     TEXT,
  age           INTEGER CHECK (age > 0 AND age < 150),
  gender        TEXT CHECK (gender IN ('male', 'female', 'non-binary', 'prefer_not_to_say')),
  blood_type    TEXT CHECK (blood_type IN ('A+','A-','B+','B-','AB+','AB-','O+','O-','unknown')),
  conditions    TEXT[] DEFAULT '{}',
  medications   TEXT[] DEFAULT '{}',
  allergies     TEXT[] DEFAULT '{}',
  emergency_contact_name  TEXT,
  emergency_contact_phone TEXT,
  preferred_language      TEXT DEFAULT 'en',
  created_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_health_profiles_updated_at
  BEFORE UPDATE ON health_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE health_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON health_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile"
  ON health_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile"
  ON health_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own profile"
  ON health_profiles FOR DELETE USING (auth.uid() = user_id);
