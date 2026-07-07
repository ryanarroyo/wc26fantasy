// Unit tests for match pollability — in particular the rule that lets an
// undrawn knockout fixture populate its teams as soon as the feeding round
// finishes, instead of staying blank until ~5 min before kickoff. Run with:
// `deno test`.
import { assertEquals } from "jsr:@std/assert";
import {
  FINISHED_REPOLL_MS,
  isFinishedDowngrade,
  isPollable,
  isUndecidedKnockoutFinish,
  LIVE_WINDOW_MS,
  POST_WINDOW_MS,
  POSTPONED_MAX_AGE_MS,
  PRE_WINDOW_MS,
  type PollableMatch,
} from "./pollable.ts";

const KICKOFF = "2026-07-04T17:00:00Z";
const KICKOFF_MS = new Date(KICKOFF).getTime();

function match(overrides: Partial<PollableMatch> = {}): PollableMatch {
  return {
    status: "SCHEDULED",
    kickoff_at: KICKOFF,
    home_team_id: 10,
    away_team_id: 20,
    ...overrides,
  };
}

Deno.test("drawn SCHEDULED match is not pollable long before kickoff", () => {
  // Both slots filled → normal pre-window applies, so days out it stays off.
  assertEquals(isPollable(match(), KICKOFF_MS - 24 * 60 * 60 * 1000), false);
});

Deno.test("drawn SCHEDULED match becomes pollable inside the pre-window", () => {
  assertEquals(isPollable(match(), KICKOFF_MS - PRE_WINDOW_MS + 1), true);
});

Deno.test("undrawn knockout (null home) is pollable days before kickoff", () => {
  const m = match({ home_team_id: null });
  assertEquals(isPollable(m, KICKOFF_MS - 5 * 24 * 60 * 60 * 1000), true);
});

Deno.test("undrawn knockout (null away) is pollable days before kickoff", () => {
  const m = match({ away_team_id: null });
  assertEquals(isPollable(m, KICKOFF_MS - 5 * 24 * 60 * 60 * 1000), true);
});

Deno.test("undrawn knockout stops being pollable after the post window", () => {
  const m = match({ home_team_id: null, away_team_id: null });
  assertEquals(isPollable(m, KICKOFF_MS + POST_WINDOW_MS + 1), false);
});

Deno.test("LIVE match keeps polling past the SCHEDULED post window", () => {
  // Once in-play, a game must keep being reconciled until it reaches a terminal
  // status. A long-running match (delayed kickoff, extra time, penalties) that
  // crosses POST_WINDOW_MS would otherwise freeze on "Live Now" forever because
  // it never receives the FINISHED update.
  const m = match({ status: "LIVE" });
  assertEquals(isPollable(m, KICKOFF_MS + POST_WINDOW_MS + 1), true);
});

Deno.test("LIVE match is pollable within the live window only", () => {
  const m = match({ status: "LIVE" });
  assertEquals(isPollable(m, KICKOFF_MS + LIVE_WINDOW_MS - 1), true);
  assertEquals(isPollable(m, KICKOFF_MS + LIVE_WINDOW_MS + 1), false);
});

Deno.test("FINISHED match is re-pollable within the repoll window only", () => {
  const m = match({ status: "FINISHED" });
  assertEquals(isPollable(m, KICKOFF_MS + FINISHED_REPOLL_MS - 1), true);
  assertEquals(isPollable(m, KICKOFF_MS + FINISHED_REPOLL_MS + 1), false);
});

Deno.test("POSTPONED match is pollable within the max-age window only", () => {
  const m = match({ status: "POSTPONED" });
  assertEquals(isPollable(m, KICKOFF_MS + POSTPONED_MAX_AGE_MS - 1), true);
  assertEquals(isPollable(m, KICKOFF_MS + POSTPONED_MAX_AGE_MS + 1), false);
});

Deno.test("CANCELLED match is never pollable", () => {
  assertEquals(isPollable(match({ status: "CANCELLED" }), KICKOFF_MS), false);
});

Deno.test("provider re-reporting a FINISHED match as not-finished is a downgrade", () => {
  // The bug that froze CIV–NOR (R32) on the schedule: a finished match the
  // provider briefly re-reported as TIMED/IN_PLAY got reverted to SCHEDULED,
  // losing its scoreline and stranding winner_team_id, then fell out of its
  // poll window and could never recover.
  assertEquals(isFinishedDowngrade("FINISHED", "SCHEDULED"), true);
  assertEquals(isFinishedDowngrade("FINISHED", "LIVE"), true);
  assertEquals(isFinishedDowngrade("FINISHED", "POSTPONED"), true);
  assertEquals(isFinishedDowngrade("FINISHED", "CANCELLED"), true);
});

Deno.test("a FINISHED match staying FINISHED is not a downgrade", () => {
  // Same-status repolls must still apply score/winner corrections.
  assertEquals(isFinishedDowngrade("FINISHED", "FINISHED"), false);
});

Deno.test("normal forward transitions are not downgrades", () => {
  assertEquals(isFinishedDowngrade("SCHEDULED", "LIVE"), false);
  assertEquals(isFinishedDowngrade("LIVE", "FINISHED"), false);
  assertEquals(isFinishedDowngrade("SCHEDULED", "FINISHED"), false);
});

function knockoutFinish(
  overrides: Partial<Parameters<typeof isUndecidedKnockoutFinish>[0]> = {},
) {
  return {
    isKnockout: true,
    homeScore: 0,
    awayScore: 0,
    homePenalties: null,
    awayPenalties: null,
    winnerTeamId: null,
    ...overrides,
  };
}

Deno.test("level knockout with no winner or penalties is undecided", () => {
  // The Switzerland–Colombia (R16) freeze: provider flips a 0-0 knockout to
  // FINISHED at the end of regular time, before extra time.
  assertEquals(isUndecidedKnockoutFinish(knockoutFinish()), true);
  assertEquals(
    isUndecidedKnockoutFinish(knockoutFinish({ homeScore: 1, awayScore: 1 })),
    true,
  );
});

Deno.test("a decided knockout is not undecided", () => {
  // Winner in extra time.
  assertEquals(
    isUndecidedKnockoutFinish(
      knockoutFinish({ homeScore: 1, awayScore: 0, winnerTeamId: 10 }),
    ),
    false,
  );
  // Level after 120' but decided on penalties.
  assertEquals(
    isUndecidedKnockoutFinish(
      knockoutFinish({ homePenalties: 4, awayPenalties: 3, winnerTeamId: 10 }),
    ),
    false,
  );
});

Deno.test("a level group-stage draw is a legitimate finish, not undecided", () => {
  assertEquals(
    isUndecidedKnockoutFinish(knockoutFinish({ isKnockout: false })),
    false,
  );
});

Deno.test("an unplayed knockout (null scores) is not treated as an undecided finish", () => {
  assertEquals(
    isUndecidedKnockoutFinish(
      knockoutFinish({ homeScore: null, awayScore: null }),
    ),
    false,
  );
});
