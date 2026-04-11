import type { Team, MatchWithTeams } from "@/lib/types/database";
import { GroupCard } from "./group-card";

const GROUP_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

export function GroupStage({
  teams,
  matches,
}: {
  teams: Team[];
  matches: MatchWithTeams[];
}) {
  const groupMatches = matches.filter((m) => m.round === "GROUP");

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {GROUP_LETTERS.map((letter) => {
        const groupTeams = teams
          .filter((t) => t.group_letter === letter)
          .sort((a, b) => a.name.localeCompare(b.name));
        const gMatches = groupMatches.filter(
          (m) => m.group_letter === letter
        );

        return (
          <GroupCard
            key={letter}
            groupLetter={letter}
            teams={groupTeams}
            matches={gMatches}
          />
        );
      })}
    </div>
  );
}
