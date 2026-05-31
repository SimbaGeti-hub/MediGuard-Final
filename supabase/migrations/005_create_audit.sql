CREATE TABLE IF NOT EXISTS audit_log (
  id            BIGSERIAL PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id    UUID REFERENCES chat_sessions(id) ON DELETE SET NULL,
  action        TEXT NOT NULL,
  tool_called   TEXT,
  tool_input    JSONB,
  tool_output   JSONB,
  risk_level    TEXT DEFAULT 'low',
  outcome       TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE INDEX idx_audit_user_id ON audit_log(user_id);
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own audit" ON audit_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service can insert audit" ON audit_log FOR INSERT WITH CHECK (TRUE);
