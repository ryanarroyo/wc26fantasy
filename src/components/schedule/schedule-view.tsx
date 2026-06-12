"use client";

import { useEffect, useState } from "react";
import type { MatchWithTeams } from "@/lib/types/database";
import { MatchBanner } from "./match-banner";

type DayGroup = { key: string; label: string; matches: MatchWithTeams[] };

// Group matches by the viewer's local calendar day. kickoff_at is a UTC
// timestamptz, so both the day boundaries and the labels depend on the
// browser's timezone — grouping has to happen on the client.
function groupByLocalDay(matches: MatchWithTeams[]): DayGroup[] {
  const groups: DayGroup[] = [];
  const byKey = new Map<string, DayGroup>();

  for (const match of matches) {
    const kickoff = new Date(match.kickoff_at);
    const key = kickoff.toLocaleDateString("en-US");
    const label = kickoff.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });

    let group = byKey.get(key);
    if (!group) {
      group = { key, label, matches: [] };
      byKey.set(key, group);
      groups.push(group);
    }
    group.matches.push(match);
  }

  return groups;
}

export function ScheduleView({ matches }: { matches: MatchWithTeams[] }) {
  // Gate on mount so the server/first-client render match (no hydration
  // mismatch); the grouped list is filled in once we know the local timezone.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-[88px] animate-pulse rounded-xl border border-border bg-card"
          />
        ))}
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <p className="rounded-xl border border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
        No matches scheduled yet.
      </p>
    );
  }

  const groups = groupByLocalDay(matches);

  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <section key={group.key}>
          <h2 className="sticky top-0 z-10 mb-3 bg-background/95 py-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur">
            {group.label}
          </h2>
          <div className="space-y-3">
            {group.matches.map((match) => (
              <MatchBanner key={match.id} match={match} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
