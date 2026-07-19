import { H2HTournamentView } from "@/components/leagues/h2h-tournament-view";
import type {
  H2HDraft,
  H2HDraftStatus,
  H2HScore,
  H2HTeamStatus,
  League,
  LeagueMember,
  MatchWithTeams,
  Profile,
  Team,
} from "@/lib/types/database";

type MemberWithProfile = LeagueMember & { profile: Profile | null };

const STATUS_COPY: Record<H2HDraftStatus, string> = {
  LOBBY: "Draft never started",
  READY: "Draft never started",
  DRAFTING: "Draft never finished",
  COMPLETE: "Draft complete",
  CANCELLED: "Draft cancelled",
};

export function H2HLeagueView({
  league,
  draft,
  members,
  teams = [],
  scores = [],
  matches = [],
  teamStatuses = [],
}: {
  league: League;
  draft: H2HDraft | null;
  members: MemberWithProfile[];
  teams?: Team[];
  scores?: H2HScore[];
  matches?: MatchWithTeams[];
  teamStatuses?: H2HTeamStatus[];
}) {
  const status: H2HDraftStatus = draft?.status ?? "LOBBY";
  const showTournament = status === "COMPLETE" && members.length === 2;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <div className="mb-6">
        <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-secondary/10 px-2 py-0.5 text-xs font-medium text-secondary">
          Head-to-Head Draft
        </div>
        <h1 className="text-2xl font-bold">{league.name}</h1>
        <p className="text-sm text-muted-foreground">
          {members.length} / 2 players · Final result
        </p>
      </div>

      {showTournament ? (
        <div className="mb-6">
          <H2HTournamentView
            members={members}
            teams={teams}
            scores={scores}
            matches={matches}
            teamStatuses={teamStatuses}
          />
        </div>
      ) : (
        <>
          <div className="mb-6 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-muted-foreground">
            {STATUS_COPY[status]} — this league ended without a completed
            tournament.
          </div>
          <div className="mb-6 rounded-xl border border-border bg-card">
            <div className="border-b border-border px-4 py-3">
              <h3 className="text-sm font-bold text-foreground">Players</h3>
            </div>
            <div className="divide-y divide-border/50">
              {members.map((member) => (
                <div key={member.user_id} className="flex items-center gap-2 px-4 py-3">
                  {member.profile?.avatar_url && (
                    <img
                      src={member.profile.avatar_url}
                      alt=""
                      className="h-6 w-6 rounded-full"
                    />
                  )}
                  <span className="text-sm">
                    {member.profile?.display_name ?? "Unknown"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
