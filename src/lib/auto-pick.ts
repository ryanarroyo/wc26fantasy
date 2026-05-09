type ScoreLine = readonly [number, number];

// Weighted (favorite_goals, other_goals) scorelines drawn from real
// international football frequencies. Favorite is the lower FIFA rank.
const WEIGHTED_SCORELINES: ReadonlyArray<readonly [ScoreLine, number]> = [
  [[1, 0], 14],
  [[1, 1], 12],
  [[2, 1], 11],
  [[2, 0], 10],
  [[0, 0], 8],
  [[2, 2], 5],
  [[3, 1], 6],
  [[3, 0], 5],
  [[3, 2], 3],
  [[3, 3], 1],
  [[4, 0], 2],
  [[4, 1], 2],
  [[4, 2], 1],
  [[5, 1], 1],
];

const TOTAL_WEIGHT = WEIGHTED_SCORELINES.reduce((s, [, w]) => s + w, 0);

function pickWeighted(rand: () => number): ScoreLine {
  let r = rand() * TOTAL_WEIGHT;
  for (const [score, weight] of WEIGHTED_SCORELINES) {
    r -= weight;
    if (r <= 0) return score;
  }
  return WEIGHTED_SCORELINES[0][0];
}

export type AutoPickResult = {
  predicted_home: number;
  predicted_away: number;
  // Only set when the generated scoreline is a draw and a winner is needed.
  predicted_winner_id: number | null;
};

export type AutoPickInput = {
  homeRank: number | null;
  awayRank: number | null;
  homeTeamId: number | null;
  awayTeamId: number | null;
  // When true (knockout rounds), a winner_id is chosen on draws.
  needsWinnerOnDraw: boolean;
  rand?: () => number;
};

// Rank gap below which we treat the matchup as even (random side gets the
// higher score). Tuned so close-ranked matchups don't always favor the same
// side, but clear gaps still skew the result toward the better team.
const EVEN_MATCH_RANK_GAP = 5;

export function autoPickMatch(input: AutoPickInput): AutoPickResult {
  const rand = input.rand ?? Math.random;
  const [favGoals, otherGoals] = pickWeighted(rand);

  let homeGoals: number;
  let awayGoals: number;

  const haveRanks = input.homeRank != null && input.awayRank != null;
  const gap = haveRanks
    ? Math.abs((input.homeRank as number) - (input.awayRank as number))
    : 0;

  if (haveRanks && gap >= EVEN_MATCH_RANK_GAP) {
    const homeIsFavorite =
      (input.homeRank as number) < (input.awayRank as number);
    homeGoals = homeIsFavorite ? favGoals : otherGoals;
    awayGoals = homeIsFavorite ? otherGoals : favGoals;
  } else {
    const homeGetsHigher = rand() < 0.5;
    homeGoals = homeGetsHigher ? favGoals : otherGoals;
    awayGoals = homeGetsHigher ? otherGoals : favGoals;
  }

  let winnerId: number | null = null;
  if (
    input.needsWinnerOnDraw &&
    homeGoals === awayGoals &&
    input.homeTeamId != null &&
    input.awayTeamId != null
  ) {
    winnerId = rand() < 0.5 ? input.homeTeamId : input.awayTeamId;
  }

  return {
    predicted_home: homeGoals,
    predicted_away: awayGoals,
    predicted_winner_id: winnerId,
  };
}
