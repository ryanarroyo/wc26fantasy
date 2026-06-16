// Unit tests for the score-orientation alignment that guards against the
// reversed-score bug (a decisive result stored backwards because external_id
// was backfilled from an unordered team pair). Run with: `deno test`.
import { assertEquals } from "jsr:@std/assert";
import { alignFixture, type AlignInput } from "./align.ts";

// Base: a finished, decisive match in matching orientation (no penalties).
function base(overrides: Partial<AlignInput> = {}): AlignInput {
  return {
    ourHomeTeamId: 10,
    ourAwayTeamId: 20,
    fdHomeTeamId: 10,
    fdAwayTeamId: 20,
    fdHomeScore: 1,
    fdAwayScore: 5,
    fdHomePen: null,
    fdAwayPen: null,
    fdWinner: "AWAY_TEAM",
    finished: true,
    ...overrides,
  };
}

Deno.test("same orientation: scores copied straight, winner by identity", () => {
  const r = alignFixture(base());
  assertEquals(r, {
    ok: true,
    flipped: false,
    homeTeamId: 10,
    awayTeamId: 20,
    homeScore: 1,
    awayScore: 5,
    homePen: null,
    awayPen: null,
    winnerTeamId: 20, // AWAY_TEAM == fd away == 20
  });
});

Deno.test("flipped orientation (the Tunisia/Sweden bug): scores realigned, winner stays correct", () => {
  // Ours: home=Tunisia(23), away=Sweden(24).
  // Provider lists the fixture the other way: home=Sweden(24) won 5, away=Tunisia(23) lost 1.
  const r = alignFixture({
    ourHomeTeamId: 23,
    ourAwayTeamId: 24,
    fdHomeTeamId: 24,
    fdAwayTeamId: 23,
    fdHomeScore: 5,
    fdAwayScore: 1,
    fdHomePen: null,
    fdAwayPen: null,
    fdWinner: "HOME_TEAM", // provider home == Sweden(24)
    finished: true,
  });
  assertEquals(r.ok, true);
  if (r.ok) {
    assertEquals(r.flipped, true);
    assertEquals(r.homeTeamId, 23); // Tunisia stays our home
    assertEquals(r.awayTeamId, 24); // Sweden stays our away
    assertEquals(r.homeScore, 1); // Tunisia 1
    assertEquals(r.awayScore, 5); // Sweden 5
    assertEquals(r.winnerTeamId, 24); // Sweden wins — NOT the home slot
  }
});

Deno.test("team mismatch: refuses to produce a scoreline", () => {
  const r = alignFixture(base({ fdHomeTeamId: 10, fdAwayTeamId: 30 }));
  assertEquals(r.ok, false);
  if (!r.ok) {
    assertEquals(r.reason, "team_mismatch");
    assertEquals(r.ourHomeTeamId, 10);
    assertEquals(r.ourAwayTeamId, 20);
    assertEquals(r.fdHomeTeamId, 10);
    assertEquals(r.fdAwayTeamId, 30);
  }
});

Deno.test("knockout slots NULL: orientation adopted from provider, slots filled", () => {
  const r = alignFixture(base({
    ourHomeTeamId: null,
    ourAwayTeamId: null,
    fdHomeTeamId: 10,
    fdAwayTeamId: 20,
    fdWinner: "AWAY_TEAM",
  }));
  assertEquals(r.ok, true);
  if (r.ok) {
    assertEquals(r.flipped, false);
    assertEquals(r.homeTeamId, 10);
    assertEquals(r.awayTeamId, 20);
    assertEquals(r.homeScore, 1);
    assertEquals(r.awayScore, 5);
    assertEquals(r.winnerTeamId, 20);
  }
});

Deno.test("partial fill: one known slot still aligns correctly", () => {
  // Our away is known (24); home slot empty. Provider has home=23, away=24.
  const r = alignFixture(base({
    ourHomeTeamId: null,
    ourAwayTeamId: 24,
    fdHomeTeamId: 23,
    fdAwayTeamId: 24,
    fdHomeScore: 2,
    fdAwayScore: 0,
    fdWinner: "HOME_TEAM",
  }));
  assertEquals(r.ok, true);
  if (r.ok) {
    assertEquals(r.flipped, false);
    assertEquals(r.homeTeamId, 23);
    assertEquals(r.awayTeamId, 24);
    assertEquals(r.homeScore, 2);
    assertEquals(r.awayScore, 0);
    assertEquals(r.winnerTeamId, 23);
  }
});

Deno.test("draw: winner null and symmetric under flip", () => {
  const straight = alignFixture(base({
    fdHomeScore: 2,
    fdAwayScore: 2,
    fdWinner: "DRAW",
  }));
  const flipped = alignFixture(base({
    fdHomeTeamId: 20,
    fdAwayTeamId: 10,
    fdHomeScore: 2,
    fdAwayScore: 2,
    fdWinner: "DRAW",
  }));
  assertEquals(straight.ok && straight.winnerTeamId, null);
  assertEquals(flipped.ok && flipped.flipped, true);
  // A 2-2 draw reads the same in either orientation.
  if (straight.ok && flipped.ok) {
    assertEquals(straight.homeScore, flipped.homeScore);
    assertEquals(straight.awayScore, flipped.awayScore);
    assertEquals(flipped.winnerTeamId, null);
  }
});

Deno.test("penalties realign with the flip", () => {
  const r = alignFixture({
    ourHomeTeamId: 23,
    ourAwayTeamId: 24,
    fdHomeTeamId: 24,
    fdAwayTeamId: 23,
    fdHomeScore: 1,
    fdAwayScore: 1,
    fdHomePen: 4, // provider home (Sweden) won the shootout 4-3
    fdAwayPen: 3,
    fdWinner: "HOME_TEAM",
    finished: true,
  });
  assertEquals(r.ok, true);
  if (r.ok) {
    assertEquals(r.flipped, true);
    assertEquals(r.homePen, 3); // Tunisia (our home) scored 3 pens
    assertEquals(r.awayPen, 4); // Sweden (our away) scored 4 pens
    assertEquals(r.winnerTeamId, 24); // Sweden
  }
});

Deno.test("not finished: no winner even if provider reports one", () => {
  const r = alignFixture(base({ finished: false, fdWinner: "AWAY_TEAM" }));
  assertEquals(r.ok && r.winnerTeamId, null);
});
