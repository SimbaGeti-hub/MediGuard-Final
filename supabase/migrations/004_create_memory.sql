CREATE TABLE IF NOT EXISTS agent_memory (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  memory_type   TEXT NOT NULL CHECK (memory_type IN (
    'symptom_pattern','medication_response','care_preference',
    'health_goal','communication_pref','risk_factor','positive_outcome'
  )),
  content       TEXT NOT NULL,
  keywords      TEXT[] DEFAULT '{}',
  importance    INTEGER DEFAULT 3 CHECK (importance BETWEEN 1 AND 5),
  session_id    UUID REFERENCES chat_sessions(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_agent_memory_user_id ON agent_memory(user_id);
CREATE INDEX idx_agent_memory_type ON agent_memory(memory_type);
CREATE INDEX idx_agent_memory_keywords ON agent_memory USING GIN(keywords);

ALTER TABLE agent_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own memory" ON agent_memory FOR ALL USING (auth.uid() = user_id);
