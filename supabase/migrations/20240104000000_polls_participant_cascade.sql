-- =============================================================
-- Problem: poll_responses.user_id -> profiles.id (kein FK zu poll_participants)
-- Wenn ein Teilnehmer aus poll_participants entfernt wird, bleiben seine
-- poll_responses als verwaiste Datensätze erhalten.
-- Feature Spec PROJ-5: "Teilnehmer entfernt → Antworten werden mitgelöscht"
-- =============================================================

-- Trigger-Funktion: Löscht alle Antworten eines entfernten Teilnehmers
-- für alle Termine der entsprechenden Umfrage
CREATE OR REPLACE FUNCTION cleanup_responses_on_participant_remove()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM poll_responses
  WHERE user_id = OLD.user_id
    AND poll_date_id IN (
      SELECT id FROM poll_dates WHERE poll_id = OLD.poll_id
    );
  RETURN OLD;
END;
$$;

-- Trigger auf poll_participants: Läuft nach jedem DELETE einer Zeile
DROP TRIGGER IF EXISTS trg_cleanup_responses_on_participant_remove ON poll_participants;
CREATE TRIGGER trg_cleanup_responses_on_participant_remove
  AFTER DELETE ON poll_participants
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_responses_on_participant_remove();

-- =============================================================
-- Atomare Poll-Erstellung als PostgreSQL-Funktion
-- Ersetzt den client-seitigen Cleanup-Ansatz (create→on error→delete)
-- durch eine echte Datenbank-Transaktion.
-- =============================================================

CREATE OR REPLACE FUNCTION create_poll(
  p_title       TEXT,
  p_location    TEXT,
  p_description TEXT,
  p_deadline    DATE,
  p_dates       DATE[],
  p_user_ids    UUID[]
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER  -- läuft mit den Rechten des aufrufenden Users (RLS greift)
SET search_path = public
AS $$
DECLARE
  v_poll_id UUID;
BEGIN
  -- Validierung
  IF p_title IS NULL OR char_length(trim(p_title)) < 2 THEN
    RAISE EXCEPTION 'Titel muss mindestens 2 Zeichen lang sein.';
  END IF;
  IF array_length(p_dates, 1) IS NULL OR array_length(p_dates, 1) = 0 THEN
    RAISE EXCEPTION 'Mindestens ein Termin muss ausgewählt werden.';
  END IF;
  IF array_length(p_user_ids, 1) IS NULL OR array_length(p_user_ids, 1) = 0 THEN
    RAISE EXCEPTION 'Mindestens ein Teilnehmer muss ausgewählt werden.';
  END IF;
  IF p_deadline IS NOT NULL AND p_deadline < CURRENT_DATE THEN
    RAISE EXCEPTION 'Das Enddatum muss in der Zukunft liegen.';
  END IF;

  -- 1. Poll anlegen (RLS: auth.uid() = created_by wird durch INSERT-Policy geprüft)
  INSERT INTO polls (title, created_by, location, description, deadline)
  VALUES (
    trim(p_title),
    auth.uid(),
    CASE WHEN trim(p_location) = '' THEN NULL ELSE trim(p_location) END,
    CASE WHEN trim(p_description) = '' THEN NULL ELSE trim(p_description) END,
    p_deadline
  )
  RETURNING id INTO v_poll_id;

  -- 2. Termine eintragen
  INSERT INTO poll_dates (poll_id, date)
  SELECT v_poll_id, unnest(p_dates);

  -- 3. Teilnehmer eintragen
  INSERT INTO poll_participants (poll_id, user_id)
  SELECT v_poll_id, unnest(p_user_ids);

  RETURN v_poll_id;

EXCEPTION
  WHEN OTHERS THEN
    -- Transaktion wird automatisch rolled back → kein Cleanup nötig
    RAISE;
END;
$$;

-- Berechtigung: authentifizierte User dürfen die Funktion aufrufen
GRANT EXECUTE ON FUNCTION create_poll(TEXT, TEXT, TEXT, DATE, DATE[], UUID[]) TO authenticated;
