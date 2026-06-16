import type { MatchWithTeams } from "@/lib/types/database";

// Live clock label, e.g. "67'" or "45+3'". Falls back to "LIVE" before the
// provider reports a minute (kickoff, half-time, or when the plan does not
// include the live-clock add-on).
export function liveLabel(match: MatchWithTeams): string {
  if (match.minute == null) return "LIVE";
  const injury = match.injury_time ? `+${match.injury_time}` : "";
  return `${match.minute}${injury}'`;
}
