import { createClient } from "@/lib/supabase/server";
import { GroupStage } from "@/components/bracket/group-stage";
import { KnockoutBracket } from "@/components/bracket/knockout-bracket";
import { SyncStatus } from "@/components/bracket/sync-status";
import { MatchBanner } from "@/components/schedule/match-banner";
import type { Team, MatchWithTeams } from "@/lib/types/database";
import { BracketTabs } from "./bracket-tabs";

export default async function BracketPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const params = await searchParams;
  const view = params.view ?? "groups";
  const supabase = await createClient();

  const [teamsResult, matchesResult] = await Promise.all([
    supabase.from("teams").select("*").order("group_letter").order("name"),
    supabase
      .from("matches")
      .select(
        "*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*), winner_team:teams!matches_winner_team_id_fkey(*)"
      )
      .order("match_number"),
  ]);

  const teams = (teamsResult.data ?? []) as Team[];
  const matches = (matchesResult.data ?? []) as MatchWithTeams[];
  const liveMatches = matches.filter((m) => m.status === "LIVE");

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tournament Bracket</h1>
        <BracketTabs currentView={view} />
      </div>

      {liveMatches.length > 0 && (
        <section className="mb-8 rounded-xl border border-live/40 bg-live/5 p-3 sm:p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-live">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-live" />
            Live Now
          </h2>
          <div className="space-y-3">
            {liveMatches.map((match) => (
              <MatchBanner key={match.id} match={match} />
            ))}
          </div>
        </section>
      )}

      {view === "groups" ? (
        <GroupStage teams={teams} matches={matches} />
      ) : (
        <KnockoutBracket matches={matches} />
      )}

      <div className="mt-8 border-t pt-4">
        <SyncStatus />
      </div>
    </div>
  );
}
