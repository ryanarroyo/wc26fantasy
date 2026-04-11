import type { Team } from "@/lib/types/database";

export function TeamBadge({
  team,
  size = "sm",
}: {
  team: Team | null;
  size?: "sm" | "md";
}) {
  if (!team) {
    return (
      <div className="flex items-center gap-2">
        <div
          className={`rounded bg-muted ${size === "sm" ? "h-5 w-7" : "h-6 w-8"}`}
        />
        <span className="text-xs text-muted-foreground">TBD</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <img
        src={team.flag_url}
        alt={team.name}
        className={size === "sm" ? "h-4 w-6" : "h-5 w-7"}
      />
      <span className={`font-medium ${size === "sm" ? "text-xs" : "text-sm"}`}>
        {team.code}
      </span>
    </div>
  );
}
