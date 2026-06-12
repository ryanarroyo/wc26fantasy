import { createClient } from "@/lib/supabase/server";
import type { MatchWithTeams } from "@/lib/types/database";
import { ScheduleView } from "@/components/schedule/schedule-view";

export default async function SchedulePage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("matches")
    .select(
      "*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*), winner_team:teams!matches_winner_team_id_fkey(*)"
    )
    .order("kickoff_at")
    .order("match_number");

  const matches = (data ?? []) as MatchWithTeams[];

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold">Match Schedule</h1>
      <ScheduleView matches={matches} />
    </div>
  );
}
