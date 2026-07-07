// Pure match-pollability logic, extracted from index.ts so it can be unit
// tested without the Deno edge runtime — same rationale as align.ts.
//
// Lifecycle windows from ADR-0001 Q10.
export const PRE_WINDOW_MS = 5 * 60 * 1000;
export const POST_WINDOW_MS = 165 * 60 * 1000;
// A match the provider has confirmed in-play must keep being polled until it
// reaches a terminal status — otherwise a long-running LIVE game (delayed
// kickoff, extra time, penalties, weather/VAR stoppages) crosses the SCHEDULED
// post-window and freezes on "Live Now" forever, since it never receives the
// FINISHED update. One /competitions/WC/matches call already returns every
// fixture, so this longer window costs no additional provider requests; the
// ceiling only bounds the pathological case where the provider itself leaves a
// fixture IN_PLAY indefinitely.
export const LIVE_WINDOW_MS = 6 * 60 * 60 * 1000;
export const FINISHED_REPOLL_MS = 24 * 60 * 60 * 1000;
export const POSTPONED_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export type PollableStatus =
  | "SCHEDULED"
  | "LIVE"
  | "FINISHED"
  | "POSTPONED"
  | "CANCELLED";

export interface PollableMatch {
  status: PollableStatus;
  kickoff_at: string;
  /** Knockout slots are NULL until the provider draws the matchup. */
  home_team_id: number | null;
  away_team_id: number | null;
}

/**
 * Whether a match should be reconciled against the provider on this poll.
 *
 * A knockout fixture whose team slots aren't drawn yet is polled well ahead of
 * its kickoff so the provider can fill the matchup as soon as the feeding round
 * finishes — otherwise the bracket (and the H2H scoring that infers a team's
 * reached round from the matches it appears in) stays blank until ~5 min before
 * the match, which makes a freshly-advanced team look eliminated for days. One
 * `/competitions/WC/matches` call already returns every fixture, so polling
 * these extra rows costs no additional provider requests.
 */
export function isPollable(m: PollableMatch, now: number): boolean {
  const kickoff = new Date(m.kickoff_at).getTime();
  if (
    m.status === "SCHEDULED" &&
    (m.home_team_id === null || m.away_team_id === null)
  ) {
    return now <= kickoff + POST_WINDOW_MS;
  }
  if (m.status === "LIVE") {
    // Already in-play: poll until it resolves, well past the SCHEDULED window.
    return now <= kickoff + LIVE_WINDOW_MS;
  }
  if (m.status === "SCHEDULED") {
    return kickoff - PRE_WINDOW_MS <= now && now <= kickoff + POST_WINDOW_MS;
  }
  if (m.status === "FINISHED") {
    return now <= kickoff + FINISHED_REPOLL_MS;
  }
  if (m.status === "POSTPONED") {
    return now <= kickoff + POSTPONED_MAX_AGE_MS;
  }
  return false;
}

/**
 * Whether applying the provider's status to an already-FINISHED match would
 * regress it out of that terminal state.
 *
 * FINISHED is re-pollable for 24h so genuine score *corrections* are caught,
 * but football-data.org intermittently re-reports a just-finished fixture as
 * TIMED/IN_PLAY for a poll or two (knockout re-seeding, transient glitches).
 * Honouring that downgrade wipes the stored scoreline, strands `winner_team_id`
 * (only ever written on a FINISHED poll, so it survives a status revert), and —
 * once the match is past its SCHEDULED post-window — drops it out of isPollable
 * so it can never recover, freezing it as an "upcoming" game on the schedule.
 *
 * So FINISHED is terminal under normal polling: the 24h re-poll exists to fix
 * scores, not to un-finish a match. Deliberate corrections go through repair
 * mode, which bypasses this guard.
 */
export function isFinishedDowngrade(
  current: PollableStatus,
  next: PollableStatus,
): boolean {
  return current === "FINISHED" && next !== "FINISHED";
}

/**
 * Whether a fixture the provider reports (or we've stored) as FINISHED is a
 * knockout tie that isn't actually decided yet — level score, no penalty
 * shootout, no winner.
 *
 * A knockout can only truly end with a decided winner (extra time or penalties).
 * football-data.org, however, momentarily flips a level knockout to FINISHED at
 * the final whistle of *regular* time — winner "DRAW", no penalties — before it
 * resumes for extra time. Finalizing that snapshot writes e.g. 0-0 and, because
 * isFinishedDowngrade then treats the resume-to-LIVE as a protected downgrade,
 * freezes the match on the schedule as a 0-0 "FT" forever (Switzerland–Colombia,
 * R16). So this "finish" must be treated as still in-play, both when it arrives
 * (don't finalize) and when it's already stored (allow it to un-finish).
 *
 * Group-stage games may legitimately end level, so this is knockout-only.
 */
export function isUndecidedKnockoutFinish(f: {
  isKnockout: boolean;
  homeScore: number | null;
  awayScore: number | null;
  homePenalties: number | null;
  awayPenalties: number | null;
  winnerTeamId: number | null;
}): boolean {
  if (!f.isKnockout) return false;
  if (f.winnerTeamId != null) return false;
  if (f.homePenalties != null || f.awayPenalties != null) return false;
  return f.homeScore != null && f.homeScore === f.awayScore;
}
