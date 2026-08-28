CREATE TABLE IF NOT EXISTS course_requests (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title       text        NOT NULL,
  description text        NOT NULL,
  status      text        NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'noted', 'rejected')),
  admin_note  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE course_requests ENABLE ROW LEVEL SECURITY;

-- Users can submit requests
CREATE POLICY "users can insert own course requests" ON course_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can view their own requests
CREATE POLICY "users can read own course requests" ON course_requests
  FOR SELECT USING (auth.uid() = user_id);
