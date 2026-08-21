-- Migration: Auto-create profile on user signup via trigger
-- This replaces the client-side profile upsert in signup/callback pages.
-- SECURITY DEFINER lets the function bypass RLS, so it works even before
-- the user's session is established (email confirmation flow).

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url, xp, level, current_streak, longest_streak)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      NEW.raw_user_meta_data->>'full_name',
      split_part(NEW.email, '@', 1),
      'Learner'
    ),
    NEW.raw_user_meta_data->>'avatar_url',
    0, 1, 0, 0
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
