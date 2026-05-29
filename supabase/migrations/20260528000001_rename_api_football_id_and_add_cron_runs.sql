-- Rename vendor-coupled columns to a vendor-neutral name (ADR-0001 §2)
ALTER TABLE public.teams RENAME COLUMN api_football_id TO external_id;
ALTER TABLE public.matches RENAME COLUMN api_football_id TO external_id;

-- Health monitoring table: one row per score-sync invocation (ADR-0001 §8)
CREATE TABLE public.cron_runs (
  id bigserial PRIMARY KEY,
  ran_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL,
  success boolean NOT NULL,
  fixtures_returned int,
  matches_updated int,
  http_status int,
  error_message text,
  duration_ms int
);

CREATE INDEX cron_runs_ran_at_idx ON public.cron_runs (ran_at DESC);

ALTER TABLE public.cron_runs ENABLE ROW LEVEL SECURITY;

-- Readable by any authenticated user (powers the bracket-page staleness footer)
CREATE POLICY cron_runs_select_authenticated ON public.cron_runs
  FOR SELECT
  TO authenticated
  USING (true);

-- Writes are restricted to the service role (used by the edge function); no policy = denied for anon/authenticated.

COMMENT ON TABLE public.cron_runs IS 'Score-sync health log; one row per fetch-scores invocation. See ADR-0001.';
COMMENT ON COLUMN public.teams.external_id IS 'ID at the current external scores provider (football-data.org per ADR-0001).';
COMMENT ON COLUMN public.matches.external_id IS 'ID at the current external scores provider (football-data.org per ADR-0001).';
