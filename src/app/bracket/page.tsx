import { createClient } from "@/lib/supabase/server";
import { GroupStage } from "@/components/bracket/group-stage";
import { KnockoutBracket } from "@/components/bracket/knockout-bracket";
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

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tournament Bracket</h1>
        <BracketTabs currentView={view} />
      </div>

      {view === "groups" ? (
        <GroupStage teams={teams} matches={matches} />
      ) : (
        <KnockoutBracket matches={matches} />
      )}
    </div>
  );
}
