-- Give LIVE matches a 6h polling window in the pg_cron gate, matching the
-- edge function's LIVE_WINDOW_MS (supabase/functions/fetch-scores/pollable.ts).
--
-- The gate decides whether to invoke fetch-scores each minute. It previously
-- shared the 165-minute SCHEDULED post-window for LIVE matches, so a long
-- running in-play game (delayed kickoff, extra time, penalties, weather/VAR
-- stoppages) that crossed kickoff_at + 165min could stop being polled and
-- freeze on "Live Now" forever — it never received the FINISHED update. The
-- function's isPollable was fixed to poll LIVE for 6h, but the gate is a second
-- copy of the same window: during a lull with nothing else in range it would
-- skip invoking the function entirely, so the function fix never gets a chance
-- to run. Splitting LIVE out with a 6h window closes that gap.
--
-- Reproduces the full current job body (including the undrawn-knockout clause)
-- and only widens the LIVE window. Idempotent: unschedule + reschedule.

DO $$
DECLARE
  v_jobid bigint;
BEGIN
  SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = 'fetch-scores-sync';
  IF v_jobid IS NOT NULL THEN
    PERFORM cron.unschedule(v_jobid);
  END IF;
END $$;

SELECT cron.schedule(
  'fetch-scores-sync',
  '* * * * *',
  $job$
    DO $body$
    DECLARE
      v_should_poll boolean := false;
      v_secret text;
    BEGIN
      SELECT EXISTS (
        SELECT 1 FROM public.matches
        WHERE
          -- Drawn scheduled match near kickoff
          (status = 'SCHEDULED'
            AND kickoff_at BETWEEN now() - interval '165 minutes' AND now() + interval '5 minutes')
          -- In-play match: poll until it resolves, well past the SCHEDULED window
          OR (status = 'LIVE'
            AND kickoff_at BETWEEN now() - interval '6 hours' AND now() + interval '5 minutes')
          -- Finished match still within 24h re-poll window (catches corrections)
          OR (status = 'FINISHED' AND now() < kickoff_at + interval '24 hours')
          -- Postponed match within 7 day staleness window (catches reschedules)
          OR (status = 'POSTPONED' AND now() < kickoff_at + interval '7 days')
          -- Undrawn knockout fixture: poll ahead so the provider can fill teams
          OR (status = 'SCHEDULED'
            AND (home_team_id IS NULL OR away_team_id IS NULL)
            AND now() <= kickoff_at + interval '165 minutes')
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
