import Link from "next/link";
import { getLeagues } from "@/lib/archive/data";

export default function LeaguesPage() {
  const leagues = getLeagues();

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Leagues</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Final leaderboards from the 2026 tournament. Leagues are archived and
          read-only.
        </p>
      </div>

      <div className="space-y-3">
        {leagues.map((league) => (
          <Link
            key={league.id}
            href={`/leagues/${league.id}`}
            className="block rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/50"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-foreground">
                    {league.name}
                  </h3>
                  {league.mode === "H2H_DRAFT" && (
                    <span className="rounded-full bg-secondary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-secondary">
                      H2H
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {league.members.length}{" "}
                  {league.members.length === 1 ? "member" : "members"}
                </p>
                {league.members.length > 0 && (
                  <div className="mt-2 flex items-center gap-1.5">
                    {league.members.slice(0, 5).map((member) => (
                      <div
                        key={member.user_id}
                        className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                      >
                        {member.profile.avatar_url && (
                          <img
                            src={member.profile.avatar_url}
                            alt=""
                            className="h-3.5 w-3.5 rounded-full"
                          />
                        )}
                        <span>{member.profile.display_name}</span>
                      </div>
                    ))}
                    {league.members.length > 5 && (
                      <span className="text-xs text-muted-foreground">
                        +{league.members.length - 5} more
                      </span>
                    )}
                  </div>
                )}
              </div>
              <svg
                className="h-5 w-5 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
