"use client";

import { useRouter } from "next/navigation";

const ROUNDS = [
  { value: "GROUP", label: "Groups" },
  { value: "R32", label: "R32" },
  { value: "R16", label: "R16" },
  { value: "QF", label: "QF" },
  { value: "SF", label: "SF" },
  { value: "3RD", label: "3rd" },
  { value: "FINAL", label: "Final" },
];

export function RoundFilter({ currentRound }: { currentRound: string }) {
  const router = useRouter();

  return (
    <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-card p-1">
      {ROUNDS.map((round) => (
        <button
          key={round.value}
          onClick={() =>
            router.push(`/predictions?round=${round.value}`)
          }
          className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
            currentRound === round.value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {round.label}
        </button>
      ))}
    </div>
  );
}
