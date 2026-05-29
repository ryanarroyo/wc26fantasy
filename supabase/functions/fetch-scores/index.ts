import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const FD_BASE = "https://api.football-data.org/v4";
const SOURCE = "fetch-scores";

// Lifecycle windows from ADR-0001 Q10
const PRE_WINDOW_MS = 5 * 60 * 1000;
const POST_WINDOW_MS = 165 * 60 * 1000;
const FINISHED_REPOLL_MS = 24 * 60 * 60 * 1000;
const POSTPONED_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

type OurStatus = "SCHEDULED" | "LIVE" | "FINISHED" | "POSTPONED" | "CANCELLED";

function mapStatus(s: string): OurStatus {
  switch (s) {
    case "SCHEDULED":
    case "TIMED":
      return "SCHEDULED";
    case "IN_PLAY":
    case "PAUSED":
      return "LIVE";
    case "FINISHED":
    case "AWARDED":
      return "FINISHED";
    case "POSTPONED":
    case "SUSPENDED":
      return "POSTPONED";
    case "CANCELLED":
      return "CANCELLED";
    default:
      return "SCHEDULED";
  }
}

interface FdFixture {
  id: number;
  utcDate: string;
  status: string;
  stage: string;
  homeTeam: { id: number | null };
  awayTeam: { id: number | null };
  score: {
    winner: "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null;
    fullTime: { home: number | null; away: number | null };
    penalties?: { home: number | null; away: number | null } | null;
  };
}

interface OurMatch {
  id: number;
  external_id: number | null;
  status: OurStatus;
  home_team_id: number | null;
  away_team_id: number | null;
  home_score: number | null;
  away_score: number | null;
  home_penalties: number | null;
  away_penalties: number | null;
  winner_team_id: number | null;
  kickoff_at: string;
}

function isPollable(m: OurMatch, now: number): boolean {
  const kickoff = new Date(m.kickoff_at).getTime();
  if (m.status === "SCHEDULED" || m.status === "LIVE") {
    return kickoff - PRE_WINDOW_MS <= now && now <= kickoff + POST_WINDOW_MS;
  }
  if (m.status === "FINISHED") {
    return now <= kickoff + FINISHED_REPOLL_MS;
  }
  if (m.status === "POSTPONED") {
    return now <= kickoff + POSTPONED_MAX_AGE_MS;
  }
  return false;
}

Deno.serve(async (req) => {
  const startedAt = Date.now();
  const url = new URL(req.url);
  const dryRun = url.searchParams.get("dry_run") === "true";

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const fdKey = Deno.env.get("FD_API_KEY");
  const cronSecret = Deno.env.get("CRON_SECRET");

  // Auth: shared-secret header (ADR-0001 Q4)
  const provided = req.headers.get("x-cron-secret");
  if (!cronSecret || provided !== cronSecret) {
    return new Response(
      JSON.stringify({ error: "unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  const sb = createClient(supabaseUrl, serviceRoleKey);
  const recordRun = async (
    success: boolean,
    fixturesReturned: number | null,
    matchesUpdated: number,
    httpStatus: number,
    error?: string,
  ) => {
    if (dryRun) return;
    await sb.from("cron_runs").insert({
      source: SOURCE,
      success,
      fixtures_returned: fixturesReturned,
      matches_updated: matchesUpdated,
      http_status: httpStatus,
      error_message: error ?? null,
      duration_ms: Date.now() - startedAt,
    });
  };

  if (!fdKey) {
    await recordRun(false, null, 0, 500, "FD_API_KEY not configured");
    return new Response(
      JSON.stringify({ error: "FD_API_KEY not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  // Fetch from football-data.org
  let fdRes: Response;
  try {
    fdRes = await fetch(`${FD_BASE}/competitions/WC/matches`, {
      headers: { "X-Auth-Token": fdKey },
    });
  } catch (e) {
    await recordRun(false, null, 0, 502, `fetch failed: ${e}`);
    return new Response(
      JSON.stringify({ error: `fetch failed: ${e}` }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }

  if (!fdRes.ok) {
    const body = await fdRes.text();
    await recordRun(false, null, 0, fdRes.status, `FD ${fdRes.status}: ${body.slice(0, 200)}`);
    return new Response(
      JSON.stringify({ error: `football-data.org ${fdRes.status}` }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }

  const fdData = await fdRes.json();
  const fixtures: FdFixture[] = fdData.matches ?? [];

  // Load all matches with an external_id, and team external_id → our id map
  const [matchesRes, teamsRes] = await Promise.all([
    sb.from("matches").select(
      "id, external_id, status, home_team_id, away_team_id, home_score, away_score, home_penalties, away_penalties, winner_team_id, kickoff_at",
    ).not("external_id", "is", null),
    sb.from("teams").select("id, external_id").not("external_id", "is", null),
  ]);

  if (matchesRes.error || teamsRes.error) {
    const err = matchesRes.error?.message ?? teamsRes.error?.message ?? "db error";
    await recordRun(false, fixtures.length, 0, 500, err);
    return new Response(
      JSON.stringify({ error: err }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const matchByExt = new Map<number, OurMatch>();
  for (const m of matchesRes.data as OurMatch[]) {
    if (m.external_id != null) matchByExt.set(m.external_id, m);
  }
  const teamByExt = new Map<number, number>();
  for (const t of teamsRes.data as { id: number; external_id: number | null }[]) {
    if (t.external_id != null) teamByExt.set(t.external_id, t.id);
  }

  const now = Date.now();
  const changes: Array<Record<string, unknown>> = [];
  let matchesUpdated = 0;
  let scoringTriggered = 0;

  for (const fx of fixtures) {
    const ours = matchByExt.get(fx.id);
    if (!ours) continue;
    if (!isPollable(ours, now)) continue;

    const newStatus = mapStatus(fx.status);
    const homeScore = fx.score?.fullTime?.home ?? null;
    const awayScore = fx.score?.fullTime?.away ?? null;
    const homePen = fx.score?.penalties?.home ?? null;
    const awayPen = fx.score?.penalties?.away ?? null;

    // Knockout team backfill: if our team slot is NULL but FD now has it, fill in
    let newHome = ours.home_team_id;
    let newAway = ours.away_team_id;
    if (newHome == null && fx.homeTeam.id != null) {
      newHome = teamByExt.get(fx.homeTeam.id) ?? null;
    }
    if (newAway == null && fx.awayTeam.id != null) {
      newAway = teamByExt.get(fx.awayTeam.id) ?? null;
    }

    // Determine winner_team_id (only meaningful when FINISHED)
    let winnerId: number | null = null;
    if (newStatus === "FINISHED") {
      if (fx.score.winner === "HOME_TEAM") winnerId = newHome;
      else if (fx.score.winner === "AWAY_TEAM") winnerId = newAway;
      // DRAW or null → leave winnerId null
    }

    // Build patch with only changed fields
    const patch: Record<string, unknown> = {};
    if (ours.status !== newStatus) patch.status = newStatus;
    if (ours.home_score !== homeScore) patch.home_score = homeScore;
    if (ours.away_score !== awayScore) patch.away_score = awayScore;
    if (ours.home_penalties !== homePen) patch.home_penalties = homePen;
    if (ours.away_penalties !== awayPen) patch.away_penalties = awayPen;
    if (ours.home_team_id !== newHome) patch.home_team_id = newHome;
    if (ours.away_team_id !== newAway) patch.away_team_id = newAway;
    // Sync kickoff_at from authoritative vendor
    const fdKickoffMs = new Date(fx.utcDate).getTime();
    if (fdKickoffMs !== new Date(ours.kickoff_at).getTime()) {
      patch.kickoff_at = fx.utcDate;
    }
    // Always reconcile winner on finish
    if (newStatus === "FINISHED" && ours.winner_team_id !== winnerId) {
      patch.winner_team_id = winnerId;
    }

    if (Object.keys(patch).length === 0) continue;

    if (dryRun) {
      changes.push({ match_id: ours.id, external_id: fx.id, would_update: patch });
      continue;
    }

    patch.updated_at = new Date().toISOString();
    const upd = await sb.from("matches").update(patch).eq("id", ours.id);
    if (upd.error) {
      changes.push({ match_id: ours.id, external_id: fx.id, error: upd.error.message });
      continue;
    }
    matchesUpdated++;

    // Trigger prediction scoring whenever a FINISHED match has new score/winner data.
    // Covers both first-finish and late-correction cases (ADR-0001 Q10).
    const scoreOrWinnerChanged =
      "home_score" in patch ||
      "away_score" in patch ||
      "winner_team_id" in patch;
    if (newStatus === "FINISHED" && scoreOrWinnerChanged) {
      const rpc = await sb.rpc("calculate_prediction_points", { p_match_id: ours.id });
      if (!rpc.error) scoringTriggered++;
    }
  }

  await recordRun(true, fixtures.length, matchesUpdated, 200);

  return new Response(
    JSON.stringify({
      dry_run: dryRun,
      fixtures_returned: fixtures.length,
      matches_updated: matchesUpdated,
      scoring_triggered: scoringTriggered,
      duration_ms: Date.now() - startedAt,
      ...(dryRun || changes.length > 0 ? { changes } : {}),
    }),
    { headers: { "Content-Type": "application/json" } },
  );
});
