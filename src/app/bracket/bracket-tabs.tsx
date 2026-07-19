"use client";

import { useState } from "react";
import { GroupStage } from "@/components/bracket/group-stage";
import { KnockoutBracket } from "@/components/bracket/knockout-bracket";
import type { MatchWithTeams, Team } from "@/lib/types/database";

// Tab state lives client-side (no ?view= URL param) so the page can be
// statically exported.
export function BracketView({
  teams,
  matches,
}: {
  teams: Team[];
  matches: MatchWithTeams[];
}) {
  const [view, setView] = useState<"groups" | "knockout">("groups");

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tournament Bracket</h1>
        <div className="flex rounded-lg border border-border bg-card p-1">
          {(["groups", "knockout"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                view === v
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {view === "groups" ? (
        <GroupStage teams={teams} matches={matches} />
      ) : (
        <KnockoutBracket matches={matches} />
      )}
    </>
  );
}
