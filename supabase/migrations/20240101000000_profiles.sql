-- ============================================================
-- PROJ-1: User Authentication - profiles Tabelle
-- ============================================================
-- Ausfuehren in: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Profiles Tabelle erstellen
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL
    CONSTRAINT display_name_length CHECK (
      char_length(display_name) >= 2 AND char_length(display_name) <= 50
    ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Row Level Security aktivieren
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies

-- User kann nur sein eigenes Profil lesen
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- User kann sein eigenes Profil aktualisieren
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 4. Index fuer Performance
CREATE INDEX IF NOT EXISTS profiles_id_idx ON profiles(id);

-- 5. Funktion: Automatisch ein Profil anlegen wenn ein neuer User sich registriert
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    -- Priorisierung: display_name (Email/Passwort-Registrierung)
    -- dann name (Google OAuth)
    -- dann Email-Praefix als Fallback
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    )
  );
  RETURN NEW;
END;
$$;

-- 6. Trigger: wird nach jedem neuen auth.users Eintrag ausgefuehrt
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
