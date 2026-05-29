# Context

Domain language and conceptual model for the World Cup 2026 Bracket app. This file is the glossary — terms here should be meaningful to anyone reasoning about the product, not just engineers reading code.

## Core concepts

**Match**
A single game between two teams in the tournament. Identified by a `round` and `match_number`. Has a `kickoff_at`, a `venue`, and (eventually) `home_score` / `away_score` / `winner_team_id`. The DB stores 104 matches: 72 group + 32 knockout.

**Round**
The stage of the tournament: `GROUP`, `R32`, `R16`, `QF`, `SF`, `3RD`, `FINAL`. Scoring weights and bonus rules vary by round.

**Group match vs. knockout match**
Group matches have both teams known from day one (group draw). Knockout matches start with `home_team_id` and `away_team_id` NULL and get populated as the tournament progresses (see *Bracket progression*).

**Prediction**
A user's predicted `home_score`, `away_score`, and (for knockouts) `predicted_winner_id` for a specific match. Locked at `kickoff_at` via RLS. May be marked `is_confident` for a 1.5× point multiplier.

**Upset bonus**
Extra points awarded when a user picks the underdog correctly (FIFA rank gap ≥ 10). Magnitude scales with rank gap. Capped at top 3 upset bonuses per round per user.

**Bracket progression**
The process by which group-stage results determine knockout-round matchups. Our app does **not** compute this — see ADR-0001. The *external score provider* is the source of truth for which teams populate each knockout slot.

## Scoring pipeline

**External score provider**
The third-party API we sync match data from. Currently **football-data.org** (free tier). Single-vendor at any time — see ADR-0001.

**Score sync**
The act of polling the external provider for match updates (scores, status, kickoff times, knockout team assignments) and writing them into our `matches` table. Triggers downstream scoring via `calculate_prediction_points` and the H2H scoring trigger.

**Polling window**
The time range around a match when the score sync is allowed to fire. A match enters its window 5 minutes before `kickoff_at` and exits 165 minutes after (covers regulation + ET + penalties). Matches in FINISHED state remain pollable for 24h after kickoff (to catch late corrections). POSTPONED matches are pollable for up to 7 days (to catch reschedules).

**Match lifecycle**
- `SCHEDULED` → `LIVE` → `FINISHED` (happy path)
- `SCHEDULED` → `POSTPONED` → `SCHEDULED` (rescheduled) → ... (postponement path)
- `FINISHED` may be revisited if the provider issues a correction within 24h (e.g., disallowed goal, scoreline correction)
- `CANCELLED` is terminal; not polled

## Leagues

**Standard league**
Private, invite-code-only. Members compete by accumulating prediction points across all 104 matches.

**H2H draft league**
Members draft national teams in a snake/auto-pick draft. Compete head-to-head using their drafted teams' tournament performance. See `H2H_DRAFT_PLAN.md` for the full mechanic.

## Operational concepts

**Cron run record**
A row in `cron_runs` table written by the score-sync edge function on every invocation. Used for both health monitoring (the bracket page footer shows "last synced X min ago") and debug history.
