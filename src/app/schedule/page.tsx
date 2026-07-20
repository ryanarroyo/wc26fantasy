import { getMatches } from "@/lib/archive/data";
import { ScheduleView } from "@/components/schedule/schedule-view";

export default function SchedulePage() {
  const matches = [...getMatches()].sort(
    (a, b) =>
      new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime() ||
      a.match_number - b.match_number
  );

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold">Match Schedule</h1>
      <ScheduleView matches={matches} />
    </div>
  );
}
