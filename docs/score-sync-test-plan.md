# Score-sync test plan

Runbook for the three pre-tournament verification layers described in ADR-0001 §9. Test layer A (dry-run) already passed 2026-05-28. Layers B and C are date-dependent.

## Layer A: dry-run smoke test ✅ (completed 2026-05-28)

Confirms auth, vendor reachability, schema parsing, fixture-to-match mapping, and the window gate. Does not write to the DB.

**Command:**
```bash
curl -i "https://hhafkmzuqgobmvuiblko.supabase.co/functions/v1/fetch-scores?dry_run=true" \
  -H "x-cron-secret: $CRON_SECRET"
```

**Expected (during dormant window, i.e. > 5 min before kickoff #1):**
- HTTP 200
- `fixtures_returned: 104`
- `matches_updated: 0`
- `changes: []`
- `duration_ms < 5000`

**Re-run any time** as a quick health check. Costs one football-data.org call; no DB side effects.

---

## Layer B: synthetic-match end-to-end (June 4–10)

This is the single highest-value test. It exercises the **write path** — cron firing, gate logic, edge function writes, `calculate_prediction_points` cascade, and the H2H scoring trigger — by pointing one row in our `matches` table at a real fixture happening in the test window.

### Prerequisites

- `CRON_SECRET` set in both Edge Function secrets and Supabase Vault as `cron_secret`
- Both extensions (`pg_cron`, `pg_net`) enabled (already done in migration `20260528000003`)
- A live international friendly between June 4 and June 10, 2026

### Step 1 — pick a friendly

```bash
curl -s "https://api.football-data.org/v4/matches?dateFrom=2026-06-04&dateTo=2026-06-10" \
  -H "X-Auth-Token: $FD_API_KEY" | jq '.matches[] | {id, utcDate, competition: .competition.name, home: .homeTeam.name, away: .awayTeam.name, status}'
```

Pick a fixture where:
- It hasn't kicked off yet (status `TIMED` or `SCHEDULED`)
- Kickoff is within the next few hours, ideally during a stretch you can watch
- Both teams have `id` populated

Record the `id` (call it `FX_ID`), `utcDate`, and home/away `id`s.

### Step 2 — insert the synthetic match

```sql
-- A throwaway match row. Use a high ID to make it visually obvious it's a test row.
-- home_team_id and away_team_id can be any two existing teams (we won't grade predictions on this).
INSERT INTO public.matches (
  id, round, group_letter, match_number,
  home_team_id, away_team_id,
  external_id, kickoff_at, venue, status
) VALUES (
  9999,
  'GROUP', 'A', 9999,
  1, 2,                                    -- placeholder teams
  <FX_ID>::int,
  '<FD utcDate>'::timestamptz,
  'TEST',
  'SCHEDULED'
);
```

Replace `<FX_ID>` and `<FD utcDate>` with the values from Step 1.

### Step 3 — watch the cron fire

The cron runs every 5 min. Once `now()` is within `kickoff_at − 5 min` to `kickoff_at + 165 min` of the synthetic match, the gate opens and the function fires.

**Check the gate opens:**
```sql
SELECT EXISTS (
  SELECT 1 FROM public.matches
  WHERE id = 9999
    AND status IN ('SCHEDULED','LIVE')
    AND kickoff_at BETWEEN now() - interval '165 minutes' AND now() + interval '5 minutes'
) AS gate_open;
```

**Watch cron runs come in:**
```sql
SELECT ran_at, success, fixtures_returned, matches_updated, http_status, error_message, duration_ms
FROM public.cron_runs
WHERE source = 'fetch-scores'
ORDER BY ran_at DESC
LIMIT 10;
```

Expect: one row every ~5 min once the gate opens. `matches_updated` should be ≥ 1 by the time the fixture goes LIVE.

**Watch the synthetic match transition:**
```sql
SELECT id, status, home_score, away_score, winner_team_id, updated_at
FROM public.matches WHERE id = 9999;
```

Expected progression:
1. `SCHEDULED` → `LIVE` (around kickoff)
2. `LIVE` with scores updating (1H, HT, 2H)
3. `FINISHED` (with final scores + `winner_team_id` set)

### Step 4 — verify the scoring cascade

When the synthetic match flips to `FINISHED`, the function calls `calculate_prediction_points(p_match_id := 9999)`. There are no real predictions for match 9999 (since it didn't exist when users were predicting), so this should run cleanly but produce no row updates.

The H2H `h2h_match_change_trigger` will also fire on the status / score / winner_team_id changes. Same reasoning — no H2H leagues reference team_ids of the placeholders, so no cascade work happens, but the trigger should run without error.

**Check Postgres logs for any errors:**
```
Supabase Dashboard → Logs → Postgres logs → filter `h2h_on_match_change` or `calculate_prediction_points`
```

### Step 5 — clean up

```sql
DELETE FROM public.matches WHERE id = 9999;

-- The cron_runs entries from the test are real data; leave them or prune:
-- DELETE FROM public.cron_runs WHERE ran_at < now() - interval '7 days';
```

### Failure modes to watch for

| Symptom | Likely cause | Fix |
|---|---|---|
| Gate never opens | `kickoff_at` wrong; clock skew | Verify `utcDate` matched FD response exactly |
| Cron fires but `matches_updated` stays 0 | FD fixture ID mismatch (typo) | Re-check the `external_id` you inserted |
| Cron fires, function returns 401 | `cron_secret` Vault value ≠ `CRON_SECRET` Edge Function secret | Re-set both to the same value |
| Function 502 with `FD <status>` | football-data.org rate limit or auth | Wait 1 min and retry; check `FD_API_KEY` Edge Function secret |
| Function 500 with DB error | `cron_runs` insert RLS denied | Confirm `SUPABASE_SERVICE_ROLE_KEY` Edge Function secret is set |
| Status flip `LIVE` → `FINISHED` but no `winner_team_id` | Match was a draw OR teams not yet known | If draw: this is correct (NULL). Otherwise check FD response |

---

## Layer C: pre-flight check (June 10, 2026)

24h before kickoff #1. Final go/no-go. Single dry-run call against real WC fixtures.

### Command

```bash
curl -s "https://hhafkmzuqgobmvuiblko.supabase.co/functions/v1/fetch-scores?dry_run=true" \
  -H "x-cron-secret: $CRON_SECRET" | jq .
```

### Pass criteria

- HTTP 200
- `fixtures_returned: 104`
- `matches_updated: 0` (no match is yet inside its 5-min pre-kickoff window — first match is ~24h away)
- `changes: []` or contains only `kickoff_at` drift updates (if FIFA shifted any times)
- No `error_message`

### Sanity checks (run in SQL editor)

```sql
-- All 104 matches still have external_id and reasonable kickoffs?
SELECT
  COUNT(*) AS total,
  COUNT(external_id) AS with_ext_id,
  MIN(kickoff_at) AS first_kickoff,
  MAX(kickoff_at) AS last_kickoff
FROM public.matches;
-- Expected: 104, 104, '2026-06-11 19:00:00+00', '2026-07-19 19:00:00+00'

-- All 48 teams still mapped?
SELECT COUNT(*) AS total, COUNT(external_id) AS with_ext_id FROM public.teams;
-- Expected: 48, 48

-- Cron schedule active?
SELECT jobname, schedule, active FROM cron.job WHERE jobname = 'fetch-scores-sync';
-- Expected: fetch-scores-sync, */5 * * * *, true

-- Vault entries present?
SELECT name FROM vault.secrets WHERE name IN ('cron_secret');
-- Expected: cron_secret (one row)

-- Recent cron runs (should all be successful skips since gate is closed)
SELECT
  COUNT(*) AS runs_last_24h,
  COUNT(*) FILTER (WHERE success) AS successes,
  COUNT(*) FILTER (WHERE NOT success) AS failures
FROM public.cron_runs
WHERE ran_at > now() - interval '24 hours';
-- Expected: 0 / 0 / 0 (gate is closed, function never invoked) — or non-zero only if Layer B was run
```

### Go conditions

- All sanity checks pass
- Dry-run returns expected shape
- Footer on bracket page renders (manually verify in browser)

### No-go: what to do

- If any team or match has NULL `external_id`: re-run backfill migration
- If `cron.job` table empty: re-run schedule migration
- If Vault `cron_secret` missing: re-add via `SELECT vault.create_secret(...)`
- If dry-run returns errors: check Edge Function logs in Supabase Dashboard

---

## Post-tournament cleanup

After the final on July 19:

```sql
-- Unschedule the cron (stops the every-5-min fires)
SELECT cron.unschedule((SELECT jobid FROM cron.job WHERE jobname = 'fetch-scores-sync'));

-- Optional: keep cron_runs for archive, or prune
DELETE FROM public.cron_runs WHERE ran_at < now() - interval '30 days';
```

The Edge Function and migrations stay deployed; only the schedule is removed.
