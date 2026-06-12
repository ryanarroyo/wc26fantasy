"use client";

import { useEffect, useRef, useState } from "react";
import type { MatchWithTeams } from "@/lib/types/database";
import { MatchBanner } from "./match-banner";

type DayGroup = {
  key: string;
  id: string;
  label: string; // full, e.g. "Thursday, Jun 11"
  chipLabel: string; // compact, e.g. "Thu 11"
  isToday: boolean;
  matches: MatchWithTeams[];
};

function dayId(key: string) {
  return "day-" + key.replace(/\//g, "-");
}

// Group matches by the viewer's local calendar day. kickoff_at is a UTC
// timestamptz, so both the day boundaries and the labels depend on the
// browser's timezone — grouping has to happen on the client.
function groupByLocalDay(matches: MatchWithTeams[]): DayGroup[] {
  const todayKey = new Date().toLocaleDateString("en-US");
  const groups: DayGroup[] = [];
  const byKey = new Map<string, DayGroup>();

  for (const match of matches) {
    const kickoff = new Date(match.kickoff_at);
    const key = kickoff.toLocaleDateString("en-US");

    let group = byKey.get(key);
    if (!group) {
      group = {
        key,
        id: dayId(key),
        label: kickoff.toLocaleDateString("en-US", {
          weekday: "long",
          month: "short",
          day: "numeric",
        }),
        chipLabel: kickoff.toLocaleDateString("en-US", {
          weekday: "short",
          day: "numeric",
        }),
        isToday: key === todayKey,
        matches: [],
      };
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
  const [activeId, setActiveId] = useState<string | null>(null);
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());

  useEffect(() => setMounted(true), []);

  const groups = mounted ? groupByLocalDay(matches) : [];
  const liveMatches = mounted
    ? matches.filter((m) => m.status === "LIVE")
    : [];

  // Track which day section is at the top of the viewport so the matching
  // jump-to chip can be highlighted while scrolling.
  useEffect(() => {
    if (!mounted || matches.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort(
            (a, b) => a.boundingClientRect.top - b.boundingClientRect.top
          );
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-64px 0px -75% 0px", threshold: 0 }
    );

    sectionRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [mounted, matches]);

  // Keep the active chip in view within the horizontal jump bar.
  useEffect(() => {
    if (!activeId) return;
    document
      .getElementById("chip-" + activeId)
      ?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [activeId]);

  function jumpTo(id: string) {
    sectionRefs.current
      .get(id)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

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

  return (
    <div>
      {/* Day jump-to bar */}
      <div className="sticky top-0 z-20 -mx-4 mb-6 border-b border-border bg-background/95 px-4 py-2 backdrop-blur">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {groups.map((group) => (
            <button
              key={group.id}
              id={"chip-" + group.id}
              onClick={() => jumpTo(group.id)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                activeId === group.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : `border-border text-muted-foreground hover:text-foreground ${
                      group.isToday ? "ring-1 ring-primary/50" : ""
                    }`
              }`}
            >
              {group.chipLabel}
            </button>
          ))}
        </div>
      </div>

      {/* Live now — pinned above the day-by-day schedule */}
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

      {/* Day-by-day schedule */}
      <div className="space-y-8">
        {groups.map((group) => (
          <section
            key={group.id}
            id={group.id}
            ref={(el) => {
              if (el) sectionRefs.current.set(group.id, el);
              else sectionRefs.current.delete(group.id);
            }}
            className="scroll-mt-20"
          >
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {group.label}
              {group.isToday && (
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
                  TODAY
                </span>
              )}
            </h2>
            <div className="space-y-3">
              {group.matches.map((match) => (
                <MatchBanner key={match.id} match={match} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
