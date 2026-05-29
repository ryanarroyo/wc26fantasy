-- ADR-0001 Q2/Q3/Q10: schedule fetch-scores via pg_cron + pg_net every 5 minutes,
-- gated by per-match polling window. Idempotent.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Drop any existing schedule by this name (idempotent re-runs)
DO $$
DECLARE
  v_jobid bigint;
BEGIN
  SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = 'fetch-scores-sync';
  IF v_jobid IS NOT NULL THEN
    PERFORM cron.unschedule(v_jobid);
  END IF;
END $$;

-- The cron body: gate on window, then fire-and-forget POST to fetch-scores.
-- Reads CRON_SECRET from Supabase Vault (entry name = 'cron_secret').
-- Silently skips if vault entry missing.
SELECT cron.schedule(
  'fetch-scores-sync',
  '*/5 * * * *',
  $job$
    DO $body$
    DECLARE
      v_should_poll boolean := false;
      v_secret text;
    BEGIN
      SELECT EXISTS (
        SELECT 1 FROM public.matches
        WHERE
          -- Active scheduled or live match in window
          (status IN ('SCHEDULED','LIVE')
            AND kickoff_at BETWEEN now() - interval '165 minutes' AND now() + interval '5 minutes')
          -- Finished match still within 24h re-poll window (catches corrections)
          OR (status = 'FINISHED' AND now() < kickoff_at + interval '24 hours')
          -- Postponed match within 7 day staleness window (catches reschedules)
          OR (status = 'POSTPONED' AND now() < kickoff_at + interval '7 days')
      ) INTO v_should_poll;

      IF NOT v_should_poll THEN RETURN; END IF;

      SELECT decrypted_secret INTO v_secret
      FROM vault.decrypted_secrets
      WHERE name = 'cron_secret'
      LIMIT 1;

      IF v_secret IS NULL THEN
        RAISE LOG 'fetch-scores-sync: cron_secret not in vault, skipping';
        RETURN;
      END IF;

      PERFORM net.http_post(
        url := 'https://hhafkmzuqgobmvuiblko.supabase.co/functions/v1/fetch-scores',
        headers := jsonb_build_object(
          'x-cron-secret', v_secret,
          'Content-Type', 'application/json'
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 15000
      );
    END;
    $body$;
  $job$
);

COMMENT ON EXTENSION pg_cron IS 'Job scheduler for fetch-scores sync (ADR-0001)';
COMMENT ON EXTENSION pg_net IS 'Async HTTP for invoking fetch-scores edge function (ADR-0001)';
