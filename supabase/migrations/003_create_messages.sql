CREATE TABLE IF NOT EXISTS messages (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id      UUID REFERENCES chat_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role            TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content         TEXT NOT NULL,
  tool_calls      JSONB DEFAULT '[]',
  agent_steps     JSONB DEFAULT '[]',
  tokens_used     INTEGER DEFAULT 0,
  cost_usd        NUMERIC(10, 6) DEFAULT 0,
  model_used      TEXT,
  risk_level      TEXT DEFAULT 'low',
  hitl_triggered  BOOLEAN DEFAULT FALSE,
  feedback_rating INTEGER CHECK (feedback_rating BETWEEN 1 AND 5),
  feedback_text   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_messages_session_id ON messages(session_id);
CREATE INDEX idx_messages_user_id ON messages(user_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own messages"
  ON messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own messages"
  ON messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own messages"
  ON messages FOR UPDATE USING (auth.uid() = user_id);
