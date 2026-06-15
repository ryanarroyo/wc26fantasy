-- Repair: reversed / mis-mapped match scores
-- ============================================
--
-- Cause: external_id was backfilled by an *unordered* team pair
-- (20260528000002_backfill_external_ids_and_kickoffs.sql), but the score-sync
-- function used to copy the provider's home/away scores straight onto our
-- home/away columns. Any match whose seeded home/away orientation was the
-- reverse of football-data.org got a REVERSED scoreline, and winner_team_id
-- pointed at the loser. Draws are symmetric, so only decisive matches show it.
--
-- IMPORTANT: a reversed row is INTERNALLY self-consistent (higher score sits in
-- the home slot, winner = home team), so it CANNOT be detected from our DB
-- alone — only by comparing against the provider. The authoritative repair is
-- therefore the corrected sync re-run, NOT a SQL UPDATE. The queries below are
-- for triage (before) and verification (after) around that re-run.
--
-- ---------------------------------------------------------------------------
-- STEP 1 — Preview the corrections (dry run, writes nothing).
--   The fixed function aligns scores by team identity and, in repair mode,
--   reconciles ALL externally-mapped matches (not just the polling window).
--
--   curl -s "$SUPABASE_FUNCTIONS_URL/fetch-scores?repair=true&dry_run=true" \
--        -H "x-cron-secret: $CRON_SECRET" | jq
--
--   Review the `changes` array:
--     - `would_update` entries with home_score/away_score → matches to be fixed
--     - `error: "team mismatch ..."` entries → external_id points at the WRONG
--       fixture (a separate, worse problem — fix the mapping before re-running)
--
-- STEP 2 — Apply for real (writes matches + re-runs calculate_prediction_points
--   for every corrected match, which rescoring cascades to predictions):
--
--   curl -s "$SUPABASE_FUNCTIONS_URL/fetch-scores?repair=true" \
--        -H "x-cron-secret: $CRON_SECRET" | jq
-- ---------------------------------------------------------------------------


-- TRIAGE A — eyeball every finished match's stored result.
-- Compare each row against the real-world result to spot reversed scorelines.
select
  m.id,
  m.round,
  m.match_number,
  ht.name  as home_team,
  m.home_score,
  m.away_score,
  at.name  as away_team,
  m.home_penalties,
  m.away_penalties,
  wt.name  as winner,
  m.status,
  m.kickoff_at
from matches m
join teams ht on ht.id = m.home_team_id
join teams at on at.id = m.away_team_id
left join teams wt on wt.id = m.winner_team_id
where m.status = 'FINISHED'
order by m.kickoff_at;


-- TRIAGE B — internally-inconsistent rows.
-- These do NOT catch pure orientation reversal (that stays self-consistent),
-- but they DO catch wrong-fixture mappings and other corruption: a decisive
-- match whose winner is null or the lower-scoring side, a "draw" with a winner
-- but no penalties, or a winner that isn't even one of the two teams.
select
  m.id,
  ht.name as home_team, m.home_score,
  at.name as away_team, m.away_score,
  m.home_penalties, m.away_penalties,
  wt.name as winner
from matches m
join teams ht on ht.id = m.home_team_id
join teams at on at.id = m.away_team_id
left join teams wt on wt.id = m.winner_team_id
where m.status = 'FINISHED'
  and (
    (m.home_score <> m.away_score and (
        m.winner_team_id is null
        or (m.home_score > m.away_score and m.winner_team_id <> m.home_team_id)
        or (m.away_score > m.home_score and m.winner_team_id <> m.away_team_id)
    ))
    or (m.home_score = m.away_score and m.winner_team_id is not null
        and m.home_penalties is null and m.away_penalties is null)
    or (m.winner_team_id is not null
        and m.winner_team_id not in (m.home_team_id, m.away_team_id))
  );


-- VERIFY (after STEP 2) — confirm no inconsistent rows remain (TRIAGE B should
-- return zero), then re-check that prediction points were recomputed. Any match
-- corrected in STEP 2 should have a recent predictions.updated_at / scored row.
select count(*) as inconsistent_finished_matches
from matches m
where m.status = 'FINISHED'
  and m.home_score <> m.away_score
  and (
    m.winner_team_id is null
    or (m.home_score > m.away_score and m.winner_team_id <> m.home_team_id)
    or (m.away_score > m.home_score and m.winner_team_id <> m.away_team_id)
  );

-- Spot-check the two matches from the report (adjust names as needed):
select m.id, ht.name as home, m.home_score, m.away_score, at.name as away,
       wt.name as winner
from matches m
join teams ht on ht.id = m.home_team_id
join teams at on at.id = m.away_team_id
left join teams wt on wt.id = m.winner_team_id
where m.status = 'FINISHED'
  and ((ht.name = 'Sweden' and at.name = 'Tunisia')
    or (ht.name = 'Tunisia' and at.name = 'Sweden'));
