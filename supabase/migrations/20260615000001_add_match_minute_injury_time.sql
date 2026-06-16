-- Add live clock fields for in-play matches.
--
-- football-data.org exposes the current `minute` and `injuryTime` of a fixture
-- when the request sends the `X-Api-Version: v4.1` header (Livescore plan add-on).
-- The fetch-scores Edge Function populates these while a match is LIVE and clears
-- them back to NULL once it leaves the LIVE state, so they are only ever set for
-- matches currently in play.

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS minute smallint,
  ADD COLUMN IF NOT EXISTS injury_time smallint;

COMMENT ON COLUMN public.matches.minute IS
  'Current minute of play while LIVE (from football-data.org v4.1); NULL otherwise.';
COMMENT ON COLUMN public.matches.injury_time IS
  'Added/injury minutes in the current period while LIVE (from football-data.org v4.1); NULL otherwise.';
