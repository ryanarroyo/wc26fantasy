export type Team = {
  id: number;
  name: string;
  code: string;
  flag_url: string;
  group_letter: string;
  api_football_id: number | null;
  created_at: string;
};

export type Match = {
  id: number;
  round: "GROUP" | "R32" | "R16" | "QF" | "SF" | "3RD" | "FINAL";
  group_letter: string | null;
  match_number: number;
  home_team_id: number | null;
  away_team_id: number | null;
  home_score: number | null;
  away_score: number | null;
  home_penalties: number | null;
  away_penalties: number | null;
  winner_team_id: number | null;
  status: "SCHEDULED" | "LIVE" | "FINISHED" | "POSTPONED";
  kickoff_at: string;
  venue: string | null;
  api_football_id: number | null;
  created_at: string;
  updated_at: string;
};

export type Profile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type Prediction = {
  id: number;
  user_id: string;
  match_id: number;
  predicted_home: number;
  predicted_away: number;
  predicted_winner_id: number | null;
  points_earned: number;
  created_at: string;
  updated_at: string;
};

export type League = {
  id: string;
  name: string;
  invite_code: string;
  owner_id: string;
  max_members: number;
  created_at: string;
};

export type LeagueMember = {
  id: number;
  league_id: string;
  user_id: string;
  joined_at: string;
};

export type UserScore = {
  user_id: string;
  total_points: number;
  group_points: number;
  r32_points: number;
  r16_points: number;
  qf_points: number;
  sf_points: number;
  final_points: number;
  correct_results: number;
  correct_scores: number;
  updated_at: string;
};

// Joined types for UI
export type MatchWithTeams = Match & {
  home_team: Team | null;
  away_team: Team | null;
  winner_team: Team | null;
};

export type PredictionWithMatch = Prediction & {
  match: MatchWithTeams;
};

export type LeagueMemberWithProfile = LeagueMember & {
  profile: Profile;
  user_score: UserScore | null;
};
