-- Neue optionale Spalten zur polls-Tabelle hinzufügen
ALTER TABLE polls
  ADD COLUMN IF NOT EXISTS location    TEXT        CONSTRAINT poll_location_length    CHECK (char_length(location)    <= 100),
  ADD COLUMN IF NOT EXISTS description TEXT        CONSTRAINT poll_description_length CHECK (char_length(description) <= 500),
  ADD COLUMN IF NOT EXISTS deadline    DATE;

-- RLS-Policy für poll_responses: Schreibzugriff nur wenn Deadline nicht abgelaufen
-- (Deadline-Enforcement auf DB-Ebene, verhindert Manipulationen via Dev-Tools)
DROP POLICY IF EXISTS "Users can manage own responses" ON poll_responses;
CREATE POLICY "Users can manage own responses" ON poll_responses
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND (
      -- Kein Deadline gesetzt: immer erlaubt
      (
        SELECT p.deadline FROM polls p
        JOIN poll_dates pd ON pd.poll_id = p.id
        WHERE pd.id = poll_responses.poll_date_id
      ) IS NULL
      -- Deadline gesetzt aber noch nicht abgelaufen: erlaubt
      OR (
        SELECT p.deadline FROM polls p
        JOIN poll_dates pd ON pd.poll_id = p.id
        WHERE pd.id = poll_responses.poll_date_id
      ) >= CURRENT_DATE
    )
  );
