"use client";

import { useMemo, useState } from "react";
import { H2HScoreboard } from "@/components/leagues/h2h-tournament/scoreboard";
import { H2HRosters } from "@/components/leagues/h2h-tournament/rosters";
import { H2HBracket } from "@/components/leagues/h2h-tournament/bracket";
import type { TournamentTab } from "@/lib/h2h/tabs";
import type {
  H2HScore,
  H2HTeamStatus,
  LeagueMember,
  MatchWithTeams,
  Profile,
  Team,
} from "@/lib/types/database";

type MemberWithProfile = LeagueMember & { profile: Profile | null };

const TAB_VALUES: TournamentTab[] = ["scoreboard", "rosters", "bracket"];

// Archived (read-only) view: no realtime, no routing — tab state is local and
// the scores/statuses are the frozen final snapshot.
export function H2HTournamentView({
  members,
  teams,
  scores,
  matches,
  teamStatuses,
}: {
  members: MemberWithProfile[];
  teams: Team[];
  scores: H2HScore[];
  matches: MatchWithTeams[];
  teamStatuses: H2HTeamStatus[];
}) {
  const [tab, setTab] = useState<TournamentTab>("scoreboard");

  // Render from the first member's perspective; there's no signed-in user in
  // the archive.
  const perspectiveUserId = members[0]?.user_id ?? "";

  const teamById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);

  const ownerOfTeam = useMemo(() => {
    const m = new Map<number, string>();
    for (const s of teamStatuses) m.set(s.team_id, s.user_id);
    return m;
  }, [teamStatuses]);

  // Stable ownership colors: first member (by join order) → blue, second → amber.
  const { ownerBorderColors, ownerRingColors } = useMemo(() => {
    const border = new Map<string, string>();
    const ring = new Map<string, string>();
    members.forEach((m, idx) => {
      if (idx === 0) {
        border.set(m.user_id, "border-blue-500");
        ring.set(m.user_id, "ring-blue-500");
      } else {
        border.set(m.user_id, "border-amber-500");
        ring.set(m.user_id, "ring-amber-500");
      }
    });
    return { ownerBorderColors: border, ownerRingColors: ring };
  }, [members]);

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-lg border border-border bg-card p-1">
        {TAB_VALUES.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
              tab === t
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "scoreboard" && (
        <H2HScoreboard
          members={members}
          scores={scores}
          teamStatuses={teamStatuses}
          ownerColors={ownerBorderColors}
          upcomingMatches={[]}
          currentUserId={perspectiveUserId}
          ownerOfTeam={ownerOfTeam}
        />
      )}

      {tab === "rosters" && (
        <H2HRosters
          members={members}
          teamById={teamById}
          teamStatuses={teamStatuses}
          ownerColors={ownerBorderColors}
          currentUserId={perspectiveUserId}
        />
      )}

      {tab === "bracket" && (
        <H2HBracket
          matches={matches}
          ownerOfTeam={ownerOfTeam}
          ownerRingColors={ownerRingColors}
        />
      )}
    </div>
  );
}
