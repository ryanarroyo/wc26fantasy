"use client";

import { useRouter } from "next/navigation";

export function BracketTabs({ currentView }: { currentView: string }) {
  const router = useRouter();

  return (
    <div className="flex rounded-lg border border-border bg-card p-1">
      <button
        onClick={() => router.push("/bracket?view=groups")}
        className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
          currentView === "groups"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        Groups
      </button>
      <button
        onClick={() => router.push("/bracket?view=knockout")}
        className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
          currentView === "knockout"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        Knockout
      </button>
    </div>
  );
}
