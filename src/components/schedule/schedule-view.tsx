"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { MatchWithTeams } from "@/lib/types/database";
import { MatchBanner } from "./match-banner";

type DayGroup = {
  key: string;
  label: string; // full, e.g. "Thursday, Jun 11"
  weekday: string; // e.g. "Thu"
  dateLabel: string; // compact, e.g. "Jun 11"
  isToday: boolean;
  isPast: boolean; // whole day is in the past
  hasLive: boolean;
  matches: MatchWithTeams[];
};

// Group matches by the viewer's local calendar day. kickoff_at is a UTC
// timestamptz, so both the day boundaries and the labels depend on the
// browser's timezone — grouping has to happen on the client.
function groupByLocalDay(matches: MatchWithTeams[]): DayGroup[] {
  const now = new Date();
  const todayKey = now.toLocaleDateString("en-US");
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime();

  const groups: DayGroup[] = [];
  const byKey = new Map<string, DayGroup>();

  for (const match of matches) {
    const kickoff = new Date(match.kickoff_at);
    const key = kickoff.toLocaleDateString("en-US");

    let group = byKey.get(key);
    if (!group) {
      group = {
        key,
        label: kickoff.toLocaleDateString("en-US", {
          weekday: "long",
          month: "short",
          day: "numeric",
        }),
        weekday: kickoff.toLocaleDateString("en-US", { weekday: "short" }),
        dateLabel: kickoff.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        isToday: key === todayKey,
        isPast: new Date(
          kickoff.getFullYear(),
          kickoff.getMonth(),
          kickoff.getDate()
        ).getTime() < startOfToday,
        hasLive: false,
        matches: [],
      };
      byKey.set(key, group);
      groups.push(group);
    }
    group.matches.push(match);
    if (match.status === "LIVE") group.hasLive = true;
  }

  return groups;
}

// Default day to land on: today if it has matches, otherwise the next day with
// an upcoming kickoff, otherwise the most recent day.
function defaultDayKey(groups: DayGroup[]): string | null {
  if (groups.length === 0) return null;

  const today = groups.find((g) => g.isToday);
  if (today) return today.key;

  const now = Date.now();
  const upcoming = groups.find((g) =>
    g.matches.some((m) => new Date(m.kickoff_at).getTime() >= now)
  );
  if (upcoming) return upcoming.key;

  return groups[groups.length - 1].key;
}

export function ScheduleView({ matches }: { matches: MatchWithTeams[] }) {
  // Gate on mount so the server/first-client render match (no hydration
  // mismatch); grouping needs the local timezone, only known on the client.
  const [mounted, setMounted] = useState(false);
  // null until the user taps a day; the effective day is derived below so a
  // manual choice survives live (realtime) re-renders without an effect.
  const [pickedKey, setPickedKey] = useState<string | null>(null);
  const railRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  const groups = useMemo(
    () => (mounted ? groupByLocalDay(matches) : []),
    [mounted, matches]
  );
  const liveMatches = useMemo(
    () => (mounted ? matches.filter((m) => m.status === "LIVE") : []),
    [mounted, matches]
  );

  const selectedKey =
    pickedKey && groups.some((g) => g.key === pickedKey)
      ? pickedKey
      : defaultDayKey(groups);
  const selected = groups.find((g) => g.key === selectedKey) ?? null;

  // Keep the selected day centered in the horizontal rail. Scroll only the rail
  // (not the page) so this can never disturb the user's vertical scroll.
  useEffect(() => {
    const rail = railRef.current;
    if (!rail || !selectedKey) return;
    const pill = rail.querySelector<HTMLElement>(
      `[data-day-key="${CSS.escape(selectedKey)}"]`
    );
    if (!pill) return;
    rail.scrollTo({
      left: pill.offsetLeft - (rail.clientWidth - pill.clientWidth) / 2,
      behavior: "smooth",
    });
  }, [selectedKey]);

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
      {/* Live now — always pinned at the top so the live game is the first
          thing you see, no matter which day is being browsed. */}
      {liveMatches.length > 0 && (
        <section className="mb-6 rounded-xl border border-live/40 bg-live/5 p-3 sm:p-4">
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

      {/* Sticky date selector — tapping a day filters the list to that day. */}
      <div className="sticky top-0 z-20 -mx-4 mb-6 border-b border-border bg-background/95 px-4 py-2 backdrop-blur">
        <div
          ref={railRef}
          className="relative flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {groups.map((group) => {
            const isSelected = group.key === selectedKey;
            return (
              <button
                key={group.key}
                data-day-key={group.key}
                onClick={() => setPickedKey(group.key)}
                aria-pressed={isSelected}
                className={`flex shrink-0 flex-col items-center rounded-xl border px-3 py-1.5 leading-tight transition-colors ${
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground"
                    : `border-border hover:border-muted-foreground/50 ${
                        group.isPast
                          ? "text-muted-foreground/70"
                          : "text-foreground"
                      } ${group.isToday ? "ring-1 ring-primary/50" : ""}`
                }`}
              >
                <span className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide">
                  {group.weekday}
                  {group.hasLive && (
                    <span
                      className={`inline-block h-1.5 w-1.5 animate-pulse rounded-full ${
                        isSelected ? "bg-primary-foreground" : "bg-live"
                      }`}
                    />
                  )}
                </span>
                <span className="text-sm font-bold tabular-nums">
                  {group.dateLabel}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day */}
      {selected && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {selected.label}
            {selected.isToday && (
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
                TODAY
              </span>
            )}
            <span className="font-normal normal-case opacity-70">
              · {selected.matches.length}{" "}
              {selected.matches.length === 1 ? "match" : "matches"}
            </span>
          </h2>
          <div className="space-y-3">
            {selected.matches.map((match) => (
              <MatchBanner key={match.id} match={match} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
