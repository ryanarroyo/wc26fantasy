import type { MatchWithTeams, Team } from "@/lib/types/database";

const ROUND_LABELS: Record<string, string> = {
  GROUP: "Group Stage",
  R32: "Round of 32",
  R16: "Round of 16",
  QF: "Quarterfinals",
  SF: "Semifinals",
  "3RD": "3rd Place",
  FINAL: "Final",
};

function roundLabel(match: MatchWithTeams): string {
  if (match.round === "GROUP" && match.group_letter) {
    return `Group ${match.group_letter}`;
  }
  return ROUND_LABELS[match.round] ?? match.round;
}

function PinIcon() {
  return (
    <svg
      className="h-3 w-3 shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function TeamSide({
  team,
  side,
  winner,
}: {
  team: Team | null;
  side: "home" | "away";
  winner: boolean;
}) {
  const isHome = side === "home";

  const flag = team ? (
    <img
      src={team.flag_url}
      alt={team.name}
      className="h-7 w-10 shrink-0 rounded-sm object-cover shadow sm:h-8 sm:w-12"
    />
  ) : (
    <div className="h-7 w-10 shrink-0 rounded bg-muted sm:h-8 sm:w-12" />
  );

  const name = team ? (
    <span
      className={`min-w-0 truncate text-sm font-semibold sm:text-base ${
        winner ? "text-primary" : ""
      }`}
    >
      <span className="hidden sm:inline">{team.name}</span>
      <span className="sm:hidden">{team.code}</span>
    </span>
  ) : (
    <span className="text-sm text-muted-foreground">TBD</span>
  );

  return (
    <div
      className={`flex flex-1 items-center gap-2 sm:gap-3 ${
        isHome ? "justify-end text-right" : "justify-start text-left"
      }`}
    >
      {isHome ? (
        <>
          {name}
          {flag}
        </>
      ) : (
        <>
          {flag}
          {name}
        </>
      )}
    </div>
  );
}

export function MatchBanner({ match }: { match: MatchWithTeams }) {
  const isLive = match.status === "LIVE";
  const isFinished = match.status === "FINISHED";
  const showScore = isLive || isFinished;

  const time = new Date(match.kickoff_at).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div
      className={`rounded-xl border bg-card px-4 py-3 transition-colors sm:px-6 sm:py-4 ${
        isLive ? "border-live" : "border-border"
      }`}
    >
      {/* Meta row: round / match number + venue */}
      <div className="mb-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="shrink-0 font-medium uppercase tracking-wide">
          {roundLabel(match)}
          <span className="ml-2 font-normal normal-case opacity-70">
            Match {match.match_number}
          </span>
        </span>
        {match.venue && (
          <span className="flex min-w-0 items-center gap-1">
            <PinIcon />
            <span className="truncate">{match.venue}</span>
          </span>
        )}
      </div>

      {/* Main row: time | teams + score */}
      <div className="flex items-center gap-3 sm:gap-6">
        <div className="w-14 shrink-0 text-center sm:w-20">
          {isLive ? (
            <span className="flex items-center justify-center gap-1 text-sm font-bold text-live">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-live" />
              LIVE
            </span>
          ) : isFinished ? (
            <span className="text-sm font-bold text-primary">FT</span>
          ) : (
            <span className="text-base font-bold sm:text-lg">{time}</span>
          )}
        </div>

        <div className="flex flex-1 items-center gap-2 sm:gap-4">
          <TeamSide
            team={match.home_team}
            side="home"
            winner={isFinished && match.winner_team_id === match.home_team_id}
          />

          <div className="flex shrink-0 flex-col items-center">
            {showScore ? (
              <span className="text-lg font-bold tabular-nums sm:text-2xl">
                {match.home_score ?? "-"}
                <span className="mx-1 text-muted-foreground">:</span>
                {match.away_score ?? "-"}
              </span>
            ) : (
              <span className="text-xs font-medium text-muted-foreground sm:text-sm">
                vs
              </span>
            )}
            {match.home_penalties !== null && match.away_penalties !== null && (
              <span className="text-[10px] text-muted-foreground">
                pens {match.home_penalties}–{match.away_penalties}
              </span>
            )}
          </div>

          <TeamSide
            team={match.away_team}
            side="away"
            winner={isFinished && match.winner_team_id === match.away_team_id}
          />
        </div>
      </div>
    </div>
  );
}
