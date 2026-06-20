// Unit tests for match pollability — in particular the rule that lets an
// undrawn knockout fixture populate its teams as soon as the feeding round
// finishes, instead of staying blank until ~5 min before kickoff. Run with:
// `deno test`.
import { assertEquals } from "jsr:@std/assert";
import {
  FINISHED_REPOLL_MS,
  isPollable,
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

Deno.test("LIVE match honours the post window", () => {
  const m = match({ status: "LIVE" });
  assertEquals(isPollable(m, KICKOFF_MS + POST_WINDOW_MS - 1), true);
  assertEquals(isPollable(m, KICKOFF_MS + POST_WINDOW_MS + 1), false);
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
