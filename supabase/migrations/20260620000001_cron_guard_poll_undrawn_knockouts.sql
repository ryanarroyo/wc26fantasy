-- Align the fetch-scores-sync cron guard with the function's isPollable
-- (supabase/functions/fetch-scores/pollable.ts).
--
-- The function now polls a SCHEDULED knockout fixture whose teams aren't drawn
-- yet so the provider can fill the matchup as soon as the feeding round
-- finishes. But this guard — which decides whether the function is invoked at
-- all — still mirrored only the old windows, so in a quiet gap (nothing in the
-- pre/post window, nothing FINISHED within 24h) the function wouldn't run and a
-- freshly-available draw could sit unwritten until the next match's -5min
-- window. Add the matching clause: an undrawn knockout (a SCHEDULED match with
-- a NULL slot — group rows are always seeded, so this only ever matches
-- knockouts) is pollable up to kickoff + 165 minutes (POST_WINDOW).
--
-- Behavioural note: undrawn knockouts exist for most of the tournament, so this
-- effectively keeps the every-minute poll hot until the FINAL is drawn. That's
-- within budget — the paid football-data.org tier is 20 req/min and each poll
-- is 1 req (see 20260611000001). Same secret/Vault handling, idempotent.

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
          (status IN ('SCHEDULED','LIVE')
            AND kickoff_at BETWEEN now() - interval '165 minutes' AND now() + interval '5 minutes')
          OR (status = 'FINISHED' AND now() < kickoff_at + interval '24 hours')
          OR (status = 'POSTPONED' AND now() < kickoff_at + interval '7 days')
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
