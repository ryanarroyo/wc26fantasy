"use client";

import type { MatchWithTeams, Prediction } from "@/lib/types/database";

type PredictionInput = {
  match_id: number;
  predicted_home: number;
  predicted_away: number;
  predicted_winner_id: number | null;
};

export function PredictionCard({
  match,
  prediction,
  existingPrediction,
  onUpdate,
}: {
  match: MatchWithTeams;
  prediction: PredictionInput | null;
  existingPrediction: Prediction | null;
  onUpdate: (matchId: number, field: string, value: number | null) => void;
}) {
  const kickoff = new Date(match.kickoff_at);
  const isLocked = kickoff <= new Date();
  const isFinished = match.status === "FINISHED";
  const isKnockout = match.round !== "GROUP";

  const homeScore = prediction?.predicted_home ?? 0;
  const awayScore = prediction?.predicted_away ?? 0;
  const isDraw = homeScore === awayScore && isKnockout;

  return (
    <div
      className={`rounded-xl border bg-card p-4 ${
        isLocked ? "border-border opacity-75" : "border-border"
      }`}
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Match {match.match_number}
          {match.group_letter ? ` - Group ${match.group_letter}` : ` - ${match.round}`}
        </span>
        <div className="flex items-center gap-2">
          {isLocked && (
            <span className="flex items-center gap-1 text-secondary">
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                  clipRule="evenodd"
                />
              </svg>
              Locked
            </span>
          )}
          {isFinished && existingPrediction && (
            <span
              className={`font-bold ${existingPrediction.points_earned > 0 ? "text-primary" : "text-destructive"}`}
            >
              +{existingPrediction.points_earned} pts
            </span>
          )}
        </div>
      </div>

      {/* Match prediction inputs */}
      <div className="space-y-2">
        {/* Home team */}
        <div className="flex items-center gap-3">
          <div className="flex flex-1 items-center gap-2">
            {match.home_team ? (
              <>
                <img src={match.home_team.flag_url} alt="" className="h-4 w-6" />
                <span className="text-sm font-medium">{match.home_team.code}</span>
              </>
            ) : (
              <span className="text-sm text-muted-foreground">TBD</span>
            )}
          </div>
          <input
            type="number"
            min={0}
            max={20}
            value={isLocked ? (existingPrediction?.predicted_home ?? "-") : homeScore}
            onChange={(e) =>
              onUpdate(match.id, "predicted_home", parseInt(e.target.value) || 0)
            }
            disabled={isLocked || !match.home_team}
            className="w-14 rounded-md border border-border bg-background px-2 py-1 text-center text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50"
          />
          {isFinished && (
            <span className="w-8 text-center text-sm font-bold text-muted-foreground">
              {match.home_score}
            </span>
          )}
        </div>

        {/* Away team */}
        <div className="flex items-center gap-3">
          <div className="flex flex-1 items-center gap-2">
            {match.away_team ? (
              <>
                <img src={match.away_team.flag_url} alt="" className="h-4 w-6" />
                <span className="text-sm font-medium">{match.away_team.code}</span>
              </>
            ) : (
              <span className="text-sm text-muted-foreground">TBD</span>
            )}
          </div>
          <input
            type="number"
            min={0}
            max={20}
            value={isLocked ? (existingPrediction?.predicted_away ?? "-") : awayScore}
            onChange={(e) =>
              onUpdate(match.id, "predicted_away", parseInt(e.target.value) || 0)
            }
            disabled={isLocked || !match.away_team}
            className="w-14 rounded-md border border-border bg-background px-2 py-1 text-center text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50"
          />
          {isFinished && (
            <span className="w-8 text-center text-sm font-bold text-muted-foreground">
              {match.away_score}
            </span>
          )}
        </div>
      </div>

      {/* Knockout penalty winner selector */}
      {isKnockout && isDraw && !isLocked && match.home_team && match.away_team && (
        <div className="mt-3 border-t border-border pt-3">
          <p className="mb-2 text-xs text-muted-foreground">
            Draw predicted — who wins on penalties?
          </p>
          <div className="flex gap-2">
            <button
              onClick={() =>
                onUpdate(match.id, "predicted_winner_id", match.home_team_id)
              }
              className={`flex-1 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                prediction?.predicted_winner_id === match.home_team_id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {match.home_team.code}
            </button>
            <button
              onClick={() =>
                onUpdate(match.id, "predicted_winner_id", match.away_team_id)
              }
              className={`flex-1 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                prediction?.predicted_winner_id === match.away_team_id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {match.away_team.code}
            </button>
          </div>
        </div>
      )}

      {/* Kickoff time */}
      {!isLocked && (
        <div className="mt-2 text-xs text-muted-foreground">
          {kickoff.toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
          })}{" "}
          at{" "}
          {kickoff.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
          })}
        </div>
      )}
    </div>
  );
}
