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
