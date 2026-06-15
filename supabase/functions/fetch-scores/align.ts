// Pure alignment of a provider fixture onto OUR home/away orientation.
//
// `external_id` was backfilled from an *unordered* team pair (see migration
// 20260528000002), so the provider's "home" is NOT guaranteed to be our home.
// Writing the provider's raw home/away scores onto our columns stored every
// decisive match whose seeded orientation was reversed with a flipped scoreline
// and `winner_team_id` pointing at the loser. A reversed row is internally
// self-consistent, so it can only be caught by comparing against the provider.
//
// This logic is extracted as a pure function (no I/O, no Deno APIs) so it can be
// unit-tested in isolation — see align_test.ts.

export type FdWinner = "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null;

export interface AlignInput {
  /** Our stored team ids. NULL for knockout slots not yet drawn. */
  ourHomeTeamId: number | null;
  ourAwayTeamId: number | null;
  /** Provider's home/away teams, already mapped to OUR team ids (NULL if unmapped). */
  fdHomeTeamId: number | null;
  fdAwayTeamId: number | null;
  /** Provider scores/penalties in the provider's own orientation. */
  fdHomeScore: number | null;
  fdAwayScore: number | null;
  fdHomePen: number | null;
  fdAwayPen: number | null;
  /** Provider winner + whether the match has finished. */
  fdWinner: FdWinner;
  finished: boolean;
}

export interface AlignedFixture {
  ok: true;
  /** True when the provider's orientation is the reverse of ours. */
  flipped: boolean;
  homeTeamId: number | null;
  awayTeamId: number | null;
  homeScore: number | null;
  awayScore: number | null;
  homePen: number | null;
  awayPen: number | null;
  /** Keyed to the actual team id, so orientation can't flip the winner. */
  winnerTeamId: number | null;
}

export interface AlignMismatch {
  ok: false;
  reason: "team_mismatch";
  /** Resolved our-side ids (after knockout fill) and the provider's ids. */
  ourHomeTeamId: number | null;
  ourAwayTeamId: number | null;
  fdHomeTeamId: number | null;
  fdAwayTeamId: number | null;
}

export type AlignResult = AlignedFixture | AlignMismatch;

/**
 * Align a provider fixture onto our home/away orientation by team identity.
 * Returns `{ ok: false, reason: "team_mismatch" }` when the provider's teams
 * line up with neither orientation (external_id points at the wrong fixture) —
 * the caller should refuse to write rather than store an untrusted scoreline.
 */
export function alignFixture(input: AlignInput): AlignResult {
  const {
    ourHomeTeamId,
    ourAwayTeamId,
    fdHomeTeamId,
    fdAwayTeamId,
    fdHomeScore,
    fdAwayScore,
    fdHomePen,
    fdAwayPen,
    fdWinner,
    finished,
  } = input;

  // Resolve our team slots. Knockout slots stay NULL until the provider
  // populates them; filling from the provider also establishes orientation.
  const homeTeamId = ourHomeTeamId ?? fdHomeTeamId;
  const awayTeamId = ourAwayTeamId ?? fdAwayTeamId;

  // Is the provider's home == our home, or is the fixture flipped? Only
  // decidable when all four team ids are known.
  let flipped = false;
  if (
    homeTeamId != null && awayTeamId != null &&
    fdHomeTeamId != null && fdAwayTeamId != null
  ) {
    if (homeTeamId === fdHomeTeamId && awayTeamId === fdAwayTeamId) {
      flipped = false;
    } else if (homeTeamId === fdAwayTeamId && awayTeamId === fdHomeTeamId) {
      flipped = true;
    } else {
      // Teams don't line up either way → external_id maps to the wrong
      // fixture. Refuse to produce a scoreline we can't trust.
      return {
        ok: false,
        reason: "team_mismatch",
        ourHomeTeamId: homeTeamId,
        ourAwayTeamId: awayTeamId,
        fdHomeTeamId,
        fdAwayTeamId,
      };
    }
  }

  // Align scores/penalties to OUR home/away orientation.
  const homeScore = flipped ? fdAwayScore : fdHomeScore;
  const awayScore = flipped ? fdHomeScore : fdAwayScore;
  const homePen = flipped ? fdAwayPen : fdHomePen;
  const awayPen = flipped ? fdHomePen : fdAwayPen;

  // Winner keyed to the actual team id (orientation-independent).
  let winnerTeamId: number | null = null;
  if (finished) {
    if (fdWinner === "HOME_TEAM") winnerTeamId = fdHomeTeamId;
    else if (fdWinner === "AWAY_TEAM") winnerTeamId = fdAwayTeamId;
    // DRAW or null → leave winnerTeamId null
  }

  return {
    ok: true,
    flipped,
    homeTeamId,
    awayTeamId,
    homeScore,
    awayScore,
    homePen,
    awayPen,
    winnerTeamId,
  };
}
