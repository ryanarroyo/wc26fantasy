import { notFound } from "next/navigation";
import { RoundBreakdown } from "@/components/leagues/round-breakdown";
import { H2HLeagueView } from "@/components/leagues/h2h-league-view";
import {
  getH2HDraft,
  getH2HScores,
  getH2HTeamStatuses,
  getLeague,
  getLeagues,
  getMatches,
  getTeams,
} from "@/lib/archive/data";

export const dynamicParams = false;

export function generateStaticParams() {
  return getLeagues().map((l) => ({ id: l.id }));
}

export default async function LeagueDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const league = getLeague(id);
  if (!league) notFound();

  if (league.mode === "H2H_DRAFT") {
    return (
      <H2HLeagueView
        league={league}
        draft={getH2HDraft(id)}
        members={league.members}
        teams={getTeams()}
        scores={getH2HScores(id)}
        matches={getMatches()}
        teamStatuses={getH2HTeamStatuses(id)}
      />
    );
  }

  const sortedMembers = [...league.members].sort(
    (a, b) => (b.user_score?.total_points ?? 0) - (a.user_score?.total_points ?? 0)
  );

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{league.name}</h1>
        <p className="text-sm text-muted-foreground">
          {sortedMembers.length}{" "}
          {sortedMembers.length === 1 ? "member" : "members"} · Final standings
        </p>
      </div>

      <div className="space-y-6">
        {/* Leaderboard */}
        <div className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <h3 className="text-sm font-bold text-foreground">
              Final Leaderboard
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="px-4 py-2 text-left font-medium">#</th>
                  <th className="px-4 py-2 text-left font-medium">Player</th>
                  <th className="px-2 py-2 text-center font-medium">Pts</th>
                  <th className="hidden px-2 py-2 text-center font-medium sm:table-cell">
                    Correct
                  </th>
                  <th className="hidden px-2 py-2 text-center font-medium sm:table-cell">
                    Exact
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedMembers.map((member, index) => (
                  <tr key={member.user_id} className="border-b border-border/50">
                    <td className="px-4 py-2.5 font-bold text-muted-foreground">
                      {index + 1}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        {member.profile.avatar_url && (
                          <img
                            src={member.profile.avatar_url}
                            alt=""
                            className="h-6 w-6 rounded-full"
                          />
                        )}
                        <span>{member.profile.display_name}</span>
                      </div>
                    </td>
                    <td className="px-2 py-2.5 text-center font-bold">
                      {member.user_score?.total_points ?? 0}
                    </td>
                    <td className="hidden px-2 py-2.5 text-center text-muted-foreground sm:table-cell">
                      {member.user_score?.correct_results ?? 0}
                    </td>
                    <td className="hidden px-2 py-2.5 text-center text-muted-foreground sm:table-cell">
                      {member.user_score?.correct_scores ?? 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Points by round */}
        <RoundBreakdown members={sortedMembers} />
      </div>
    </div>
  );
}
