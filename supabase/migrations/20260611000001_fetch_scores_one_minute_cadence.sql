-- Tighten fetch-scores-sync from */5 to every minute, now that we're on the
-- football-data.org paid tier (20 req/min). 1 req/min leaves ~95% headroom.
-- Same guard body as 20260528000003: skip when no match is in window, skip
-- when cron_secret missing from Vault. Idempotent.

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
