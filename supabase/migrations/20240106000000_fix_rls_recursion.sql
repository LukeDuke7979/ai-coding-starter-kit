-- =============================================================
-- Fix: Infinite recursion in RLS policies
--
-- Ursache: Zirkelreferenz zwischen polls und poll_participants
--   polls SELECT-Policy    -> EXISTS (SELECT FROM poll_participants) [RLS aktiv]
--   poll_participants SELECT-Policy -> EXISTS (SELECT FROM polls)    [RLS aktiv]
--   -> Endlosrekursion
--
-- Lösung: SECURITY DEFINER-Funktion für den poll_participants-Check.
--   SECURITY DEFINER umgeht RLS auf den intern zugegriffenen Tabellen,
--   damit bricht der Zirkel.
-- =============================================================

CREATE OR REPLACE FUNCTION is_poll_participant(p_poll_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM poll_participants
    WHERE poll_id = p_poll_id
      AND user_id = auth.uid()
  );
$$;

-- Alte Policy entfernen und mit SECURITY DEFINER-Funktion neu anlegen
DROP POLICY IF EXISTS "Poll members can view polls" ON polls;
CREATE POLICY "Poll members can view polls" ON polls
  FOR SELECT USING (
    auth.uid() = created_by
    OR is_poll_participant(polls.id)
  );
