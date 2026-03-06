-- Profiles: alle eingeloggten User duerfen alle Profile lesen (fuer Teilnehmer-Auswahl)
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON profiles;
CREATE POLICY "Authenticated users can view all profiles" ON profiles
  FOR SELECT TO authenticated USING (true);

-- =============================================================
-- Tabellen anlegen (alle zuerst, damit Policies sich gegenseitig referenzieren koennen)
-- =============================================================

CREATE TABLE IF NOT EXISTS polls (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title      TEXT        NOT NULL CONSTRAINT poll_title_length CHECK (char_length(title) >= 2 AND char_length(title) <= 100),
  created_by UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS poll_dates (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  date    DATE NOT NULL,
  UNIQUE (poll_id, date)
);

-- user_id references profiles.id so PostgREST can auto-join profiles(display_name)
CREATE TABLE IF NOT EXISTS poll_participants (
  poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (poll_id, user_id)
);

-- user_id references profiles.id so PostgREST can auto-join profiles(display_name)
CREATE TABLE IF NOT EXISTS poll_responses (
  poll_date_id UUID        NOT NULL REFERENCES poll_dates(id) ON DELETE CASCADE,
  user_id      UUID        NOT NULL REFERENCES profiles(id)   ON DELETE CASCADE,
  available    BOOLEAN     NOT NULL,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (poll_date_id, user_id)
);

-- =============================================================
-- RLS aktivieren
-- =============================================================

ALTER TABLE polls          ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_dates     ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_responses ENABLE ROW LEVEL SECURITY;

-- =============================================================
-- Policies: polls
-- =============================================================

DROP POLICY IF EXISTS "Poll members can view polls" ON polls;
CREATE POLICY "Poll members can view polls" ON polls
  FOR SELECT USING (
    auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM poll_participants
      WHERE poll_participants.poll_id = polls.id
        AND poll_participants.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Authenticated users can create polls" ON polls;
CREATE POLICY "Authenticated users can create polls" ON polls
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Creator can update polls" ON polls;
CREATE POLICY "Creator can update polls" ON polls
  FOR UPDATE USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "Creator can delete polls" ON polls;
CREATE POLICY "Creator can delete polls" ON polls
  FOR DELETE USING (auth.uid() = created_by);

-- =============================================================
-- Policies: poll_dates
-- =============================================================

DROP POLICY IF EXISTS "Poll members can view poll dates" ON poll_dates;
CREATE POLICY "Poll members can view poll dates" ON poll_dates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM polls
      WHERE polls.id = poll_dates.poll_id
        AND (
          polls.created_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM poll_participants
            WHERE poll_participants.poll_id = polls.id
              AND poll_participants.user_id = auth.uid()
          )
        )
    )
  );

DROP POLICY IF EXISTS "Creator can manage poll dates" ON poll_dates;
CREATE POLICY "Creator can manage poll dates" ON poll_dates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM polls
      WHERE polls.id = poll_dates.poll_id
        AND polls.created_by = auth.uid()
    )
  );

-- =============================================================
-- Policies: poll_participants
-- =============================================================

DROP POLICY IF EXISTS "Poll members can view participants" ON poll_participants;
CREATE POLICY "Poll members can view participants" ON poll_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM polls
      WHERE polls.id = poll_participants.poll_id
        AND (
          polls.created_by = auth.uid()
          OR poll_participants.user_id = auth.uid()
        )
    )
  );

DROP POLICY IF EXISTS "Creator can manage participants" ON poll_participants;
CREATE POLICY "Creator can manage participants" ON poll_participants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM polls
      WHERE polls.id = poll_participants.poll_id
        AND polls.created_by = auth.uid()
    )
  );

-- =============================================================
-- Policies: poll_responses
-- =============================================================

DROP POLICY IF EXISTS "Poll members can view responses" ON poll_responses;
CREATE POLICY "Poll members can view responses" ON poll_responses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM poll_dates
      JOIN polls ON polls.id = poll_dates.poll_id
      WHERE poll_dates.id = poll_responses.poll_date_id
        AND (
          polls.created_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM poll_participants
            WHERE poll_participants.poll_id = polls.id
              AND poll_participants.user_id = auth.uid()
          )
        )
    )
  );

DROP POLICY IF EXISTS "Users can manage own responses" ON poll_responses;
CREATE POLICY "Users can manage own responses" ON poll_responses
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =============================================================
-- Indexes
-- =============================================================

CREATE INDEX IF NOT EXISTS polls_created_by_idx           ON polls(created_by);
CREATE INDEX IF NOT EXISTS poll_dates_poll_id_idx         ON poll_dates(poll_id);
CREATE INDEX IF NOT EXISTS poll_participants_poll_id_idx  ON poll_participants(poll_id);
CREATE INDEX IF NOT EXISTS poll_participants_user_id_idx  ON poll_participants(user_id);
CREATE INDEX IF NOT EXISTS poll_responses_date_id_idx     ON poll_responses(poll_date_id);
CREATE INDEX IF NOT EXISTS poll_responses_user_id_idx     ON poll_responses(user_id);
