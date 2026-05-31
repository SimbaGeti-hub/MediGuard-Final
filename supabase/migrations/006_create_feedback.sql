CREATE TABLE IF NOT EXISTS feedback (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id  UUID REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  session_id  UUID REFERENCES chat_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  category    TEXT CHECK (category IN ('accuracy','helpfulness','clarity','safety','all')),
  comment     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own feedback" ON feedback FOR ALL USING (auth.uid() = user_id);
