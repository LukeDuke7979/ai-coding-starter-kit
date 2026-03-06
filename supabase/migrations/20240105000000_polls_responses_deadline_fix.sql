-- =============================================================
-- PROJ-6 Backend: Deadline-Enforcement auch für DELETE absichern
--
-- Problem in 20240103000000_polls_add_columns.sql:
--   USING  = auth.uid() = user_id           (kein Deadline-Check)
--   WITH CHECK = ... AND deadline-Check      (nur für INSERT/UPDATE)
--
-- In PostgreSQL RLS gilt:
--   USING     → wird für SELECT, UPDATE (row-lookup) und DELETE geprüft
--   WITH CHECK → wird für INSERT und UPDATE (new values) geprüft
--
-- Das heißt: DELETE nach Deadline war bisher NICHT durch RLS blockiert.
-- Ein User konnte via direktem API-Aufruf seine Antwort nach Deadline löschen.
--
-- Fix: Deadline-Check auch in USING aufnehmen → sperrt DELETE nach Deadline.
-- SELECT funktioniert weiterhin, weil "Poll members can view responses"
-- (FOR SELECT) ebenfalls greift und Policies per OR verknüpft werden.
-- =============================================================

-- Hilfsfunktion: prüft ob die Deadline für ein poll_date_id noch offen ist
-- (wiederverwendbar, vermeidet Code-Duplikation in den Policies)
CREATE OR REPLACE FUNCTION is_poll_voting_open(p_poll_date_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT p.deadline IS NULL OR p.deadline >= CURRENT_DATE
      FROM polls p
      JOIN poll_dates pd ON pd.poll_id = p.id
      WHERE pd.id = p_poll_date_id
    ),
    false  -- poll_date_id existiert nicht → kein Zugriff
  )
$$;

-- Policy neu anlegen: Deadline-Check jetzt in BOTH USING und WITH CHECK
DROP POLICY IF EXISTS "Users can manage own responses" ON poll_responses;
CREATE POLICY "Users can manage own responses" ON poll_responses
  FOR ALL
  USING (
    -- Eigene Zeile UND Abstimmung noch offen (sperrt UPDATE + DELETE nach Deadline)
    auth.uid() = user_id
    AND is_poll_voting_open(poll_date_id)
  )
  WITH CHECK (
    -- Gleiche Bedingung für INSERT und UPDATE (new values)
    auth.uid() = user_id
    AND is_poll_voting_open(poll_date_id)
  );
