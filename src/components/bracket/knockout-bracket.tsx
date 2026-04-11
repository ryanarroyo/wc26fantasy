"use client";

import type { MatchWithTeams } from "@/lib/types/database";
import { MatchCard } from "./match-card";

const ROUND_LABELS: Record<string, string> = {
  R32: "Round of 32",
  R16: "Round of 16",
  QF: "Quarterfinals",
  SF: "Semifinals",
  "3RD": "3rd Place",
  FINAL: "Final",
};

const ROUND_ORDER = ["R32", "R16", "QF", "SF", "3RD", "FINAL"];

export function KnockoutBracket({ matches }: { matches: MatchWithTeams[] }) {
  const knockoutMatches = matches.filter((m) => m.round !== "GROUP");

  const matchesByRound = ROUND_ORDER.reduce(
    (acc, round) => {
      acc[round] = knockoutMatches
        .filter((m) => m.round === round)
        .sort((a, b) => a.match_number - b.match_number);
      return acc;
    },
    {} as Record<string, MatchWithTeams[]>
  );

  if (knockoutMatches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="text-4xl">🏆</div>
        <h3 className="mt-4 text-lg font-semibold text-foreground">
          Knockout Stage
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          The knockout bracket will appear once the group stage is complete and
          match slots are populated.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {ROUND_ORDER.map((round) => {
        const roundMatches = matchesByRound[round];
        if (!roundMatches || roundMatches.length === 0) return null;

        return (
          <div key={round}>
            <h3 className="mb-4 text-lg font-bold text-foreground">
              {ROUND_LABELS[round]}
            </h3>
            <div
              className={`grid gap-3 ${
                round === "FINAL" || round === "3RD"
                  ? "grid-cols-1 max-w-md"
                  : round === "SF"
                    ? "grid-cols-1 sm:grid-cols-2 max-w-2xl"
                    : round === "QF"
                      ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
                      : round === "R16"
                        ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
                        : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
              }`}
            >
              {roundMatches.map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
