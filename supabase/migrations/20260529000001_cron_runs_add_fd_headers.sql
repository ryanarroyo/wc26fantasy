-- Persist football-data.org diagnostic/throttle headers per fetch-scores run.
-- Lets us watch trends, catch silent downgrades to the anonymous quota, and
-- have a "retry-after" signal on 429s.
-- See https://docs.football-data.org/general/v4/lookup_tables.html#_response_headers
ALTER TABLE public.cron_runs
  ADD COLUMN fd_api_version text,
  ADD COLUMN fd_client text,
  ADD COLUMN fd_requests_available int,
  ADD COLUMN fd_reset_seconds int;

COMMENT ON COLUMN public.cron_runs.fd_api_version IS 'FD response X-API-Version header.';
COMMENT ON COLUMN public.cron_runs.fd_client IS 'FD response X-Authenticated-Client header; "anonymous" means our X-Auth-Token did not authenticate.';
COMMENT ON COLUMN public.cron_runs.fd_requests_available IS 'FD response X-RequestsAvailable; remaining requests in the current throttle window.';
COMMENT ON COLUMN public.cron_runs.fd_reset_seconds IS 'FD response X-RequestCounter-Reset; seconds until the request counter resets.';
