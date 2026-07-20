import { getMatches, getTeams } from "@/lib/archive/data";
import { BracketView } from "./bracket-tabs";

export default function BracketPage() {
  const teams = [...getTeams()].sort(
    (a, b) =>
      a.group_letter.localeCompare(b.group_letter) || a.name.localeCompare(b.name)
  );
  const matches = getMatches();

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6">
      <BracketView teams={teams} matches={matches} />
    </div>
  );
}
