# ADR-0001: External score sync architecture

**Status:** Accepted
**Date:** 2026-05-28
**Deciders:** Ryan

## Context

The app needs to update 104 World Cup 2026 matches with live and final scores during the tournament (June 11 – July 19, 2026). Match results drive both prediction scoring (`calculate_prediction_points`) and H2H league standings (`h2h_match_change_trigger`). Without an automated score-sync pipeline, the leaderboard requires manual data entry for every match update — infeasible across ~500 score events.

A `fetch-scores` edge function existed in Supabase but had never been invoked, had no scheduler, and pointed at an API-Football endpoint whose free tier does not cover season 2026 (verified 2026-05-28).

This is a personal app for a small group of friends. Operational simplicity and zero recurring cost matter more than industrial-strength reliability.

## Decision

A single coordinated design:

1. **Vendor: football-data.org free tier.** 10 req/min, no daily cap, includes FIFA World Cup as one of 12 free competitions. Chosen over API-Football Pro ($19/mo) to keep the project at $0 recurring, and over scraping/unofficial APIs for stability.

2. **Single-vendor model.** Matches and teams carry one `external_id` column referring to the current provider's ID space. If we ever switch vendors, we rename and re-backfill — we do not multi-source.

3. **Scheduling: `pg_cron` + `pg_net`, every 5 minutes.** In-database scheduling keeps everything in Supabase. The cron SQL gates the call so the edge function fires only when a match is in its polling window — zero external requests on off-days.

4. **Polling window (Strategy A — tight, per-match, unioned).**
   - `SCHEDULED`: `kickoff_at − 5min ≤ now ≤ kickoff_at + 165min`
   - `LIVE`: pollable until `kickoff_at + 6h`. Once the provider confirms a match
     in-play it must keep being reconciled until it reaches a terminal status;
     sharing the 165-min SCHEDULED post-window froze long-running games (delayed
     kickoff, extra time, penalties) on "Live Now" forever because they never
     received the FINISHED update.
   - `FINISHED`: pollable for 24h after `kickoff_at` (catches late corrections)
   - `POSTPONED`: pollable indefinitely, with a 7-day staleness warning (catches reschedules)
   - `CANCELLED`: never polled

5. **Auth: shared-secret header, `verify_jwt: false`.** `CRON_SECRET` lives in Supabase Vault and Edge Function secrets. pg_net sends it as `x-cron-secret`. Chosen over service-role JWT (Option C) because the function does one bounded thing and storing a god-mode key in pg_net calls is a larger blast radius than someone burning our score-fetch quota.

6. **Source of truth for knockout bracket progression: the vendor.** As group stage ends, football-data.org populates team IDs on knockout fixtures. The score-sync function writes those back into our `matches` table. Our app does not implement FIFA bracket rules.

7. **Backfill: one-shot, hardcoded in migration.** A single `/competitions/WC/matches` call produces a hardcoded `UPDATE matches SET external_id = ..., kickoff_at = ..., venue = ... WHERE id = ...` migration for all reachable fixtures. Re-runnable; safe to revert; verifiable before tournament.

8. **Monitoring: `cron_runs` health table + bracket-page "last synced" footer.** Every sync invocation writes a `cron_runs` row. A small UI indicator surfaces staleness so the user (or any league member) notices when sync stalls. Chosen over Discord/Slack webhooks as the marginal value isn't worth the setup.

9. **Pre-tournament verification (three layers):**
   - **Dry-run mode** (`?dry_run=true`) on `fetch-scores` for safe pokes
   - **Synthetic-match end-to-end test** pointed at a live international friendly between June 4–10
   - **Pre-flight check** on June 10: dry-run against WC fixtures, confirm 104 fixtures returned, all teams resolved, all status SCHEDULED

## Consequences

**Positive**
- $0 recurring cost
- Single-system operational footprint (everything in Supabase)
- Window gate means zero wasted vendor requests on off-days
- 5-min lag on live scores — acceptable for a friend league
- Late corrections and postponements both handled
- Knockout progression handled without implementing FIFA bracket logic
- Single ADR captures the coupled set of decisions for future readers

**Negative**
- Tightly coupled to football-data.org's data shape and uptime
- A single 5-min cron firing that fails silently could leave one match update delayed — relies on social alerting via the staleness footer
- Switching vendors requires renaming columns + re-backfilling IDs + rewriting the edge function (intentionally not multi-vendor)
- `verify_jwt: false` on the edge function means leaked `CRON_SECRET` lets attackers burn our vendor quota (capped impact)

## Alternatives considered

- **API-Football Pro ($19/mo)** — keep existing code, no rework. Rejected for cost and because rework was contained.
- **Vercel Cron instead of pg_cron** — better dashboards, but cron + data in different systems and would fire blindly every 5 min. Rejected for the coupling cost.
- **Compute bracket progression in SQL** instead of trusting the vendor for knockout team assignments. Rejected — FIFA tiebreaker rules (head-to-head, GD, fair play, drawing of lots) are gnarly and high-stakes to reimplement.
- **`JSONB external_ids` column** for multi-vendor flexibility. Rejected as overengineering for a 6-week project.
- **Discord/email alerting (Tier 3 monitoring)**. Rejected — the staleness footer plus the user actively watching the tournament covers it.
- **Constant 5-min polling without window gate**. Rejected — wasteful and pre-tournament would have blown the API-Football quota. Window gate is cheap insurance regardless of vendor.

## Verification still pending

The architecture assumes football-data.org publishes all 104 WC 2026 fixtures with stable IDs **up front**, including knockout fixtures with placeholder teams. This must be verified once the API key is registered. If false, fall back to: backfill 72 group matches now, add a separate "discover knockout external_ids" sync step that runs daily during group stage.
