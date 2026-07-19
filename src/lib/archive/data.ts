// Static snapshot of the final 2026 tournament state, exported from Supabase
// on 2026-07-19 after the final. The archived site renders entirely from
// these fixtures — there is no database behind it anymore.
import teamsJson from "@/data/archive/teams.json";
import matchesJson from "@/data/archive/matches.json";
import leaguesJson from "@/data/archive/leagues.json";
import userScoresJson from "@/data/archive/user_scores.json";
import h2hJson from "@/data/archive/h2h.json";
import type {
  H2HDraft,
  H2HDraftPick,
  H2HScore,
  H2HTeamStatus,
  League,
  LeagueMember,
  MatchWithTeams,
  Profile,
  Team,
  UserScore,
} from "@/lib/types/database";

export const ARCHIVE_DATE = "2026-07-19";

type ArchiveMember = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
};

export type ArchiveLeague = League & {
  members: (LeagueMember & { profile: Profile; user_score: UserScore | null })[];
};

// The snapshot omits columns that only mattered while the app was live
// (external_id, timestamps, invite codes…); backfill them so the existing
// component types keep working.
const teams: Team[] = (teamsJson as Omit<Team, "external_id" | "created_at">[]).map(
  (t) => ({ ...t, external_id: null, created_at: "" })
);

const teamById = new Map(teams.map((t) => [t.id, t]));

const matches: MatchWithTeams[] = (
  matchesJson as unknown as Omit<
    MatchWithTeams,
    | "home_team"
    | "away_team"
    | "winner_team"
    | "minute"
    | "injury_time"
    | "external_id"
    | "created_at"
    | "updated_at"
  >[]
).map((m) => ({
  ...m,
  minute: null,
  injury_time: null,
  external_id: null,
  created_at: "",
  updated_at: "",
  home_team: m.home_team_id != null ? teamById.get(m.home_team_id) ?? null : null,
  away_team: m.away_team_id != null ? teamById.get(m.away_team_id) ?? null : null,
  winner_team:
    m.winner_team_id != null ? teamById.get(m.winner_team_id) ?? null : null,
}));

const userScores = new Map(
  (userScoresJson as Omit<UserScore, "updated_at">[]).map((s) => [
    s.user_id,
    { ...s, updated_at: ARCHIVE_DATE } as UserScore,
  ])
);

type RawLeague = {
  id: string;
  name: string;
  mode: League["mode"];
  owner_id: string;
  created_at: string;
  members: ArchiveMember[];
};

const leagues: ArchiveLeague[] = (leaguesJson as RawLeague[]).map((l) => ({
  id: l.id,
  name: l.name,
  invite_code: "",
  owner_id: l.owner_id,
  max_members: 50,
  mode: l.mode,
  created_at: l.created_at,
  members: l.members.map((m, i) => ({
    id: i + 1,
    league_id: l.id,
    user_id: m.user_id,
    joined_at: "",
    profile: {
      id: m.user_id,
      display_name: m.display_name,
      avatar_url: m.avatar_url,
      created_at: "",
      updated_at: "",
    },
    user_score: userScores.get(m.user_id) ?? null,
  })),
}));

type RawH2H = {
  drafts: Pick<H2HDraft, "league_id" | "status" | "first_pick_user_id">[];
  scores: Omit<H2HScore, "updated_at">[];
  picks: Omit<H2HDraftPick, "id" | "picked_at">[];
  team_statuses: Record<string, H2HTeamStatus[]>;
};

const h2h = h2hJson as unknown as RawH2H;

export function getTeams(): Team[] {
  return teams;
}

export function getMatches(): MatchWithTeams[] {
  return matches;
}

export function getLeagues(): ArchiveLeague[] {
  return leagues;
}

export function getLeague(id: string): ArchiveLeague | undefined {
  return leagues.find((l) => l.id === id);
}

export function getH2HDraft(leagueId: string): H2HDraft | null {
  const d = h2h.drafts.find((d) => d.league_id === leagueId);
  if (!d) return null;
  return {
    ...d,
    current_pick_number: 48,
    current_turn_started_at: null,
    cancel_requested_by: null,
    created_at: "",
    updated_at: "",
  };
}

export function getH2HScores(leagueId: string): H2HScore[] {
  return h2h.scores
    .filter((s) => s.league_id === leagueId)
    .map((s) => ({ ...s, updated_at: ARCHIVE_DATE }));
}

export function getH2HPicks(leagueId: string): H2HDraftPick[] {
  return h2h.picks
    .filter((p) => p.league_id === leagueId)
    .map((p) => ({ ...p, id: p.pick_number, picked_at: "" }));
}

export function getH2HTeamStatuses(leagueId: string): H2HTeamStatus[] {
  return h2h.team_statuses[leagueId] ?? [];
}
