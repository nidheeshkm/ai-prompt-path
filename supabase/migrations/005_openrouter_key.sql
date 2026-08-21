-- Add openrouter_api_key to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS openrouter_api_key TEXT;

-- RLS: users can update their own key
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update own openrouter key'
  ) THEN
    CREATE POLICY "Users can update own openrouter key"
      ON profiles FOR UPDATE
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;
