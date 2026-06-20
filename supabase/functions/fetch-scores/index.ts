import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { alignFixture } from "./align.ts";
import { isPollable } from "./pollable.ts";

const FD_BASE = "https://api.football-data.org/v4";
const SOURCE = "fetch-scores";

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
  // Live-clock fields, present only with X-Api-Version: v4.1 and while in play.
  minute?: number | null;
  injuryTime?: number | null;
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
  minute: number | null;
  injury_time: number | null;
  kickoff_at: string;
}

// Diagnostic / throttle headers documented at
// https://docs.football-data.org/general/v4/lookup_tables.html#_response_headers
interface FdRateHeaders {
  apiVersion: string | null;
  client: string | null;
  requestsAvailable: number | null;
  resetSeconds: number | null;
}

const FD_LOW_AVAILABLE_THRESHOLD = 3;

function readFdHeaders(res: Response): FdRateHeaders {
  const toInt = (v: string | null): number | null => {
    if (v == null) return null;
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : null;
  };
  return {
    apiVersion: res.headers.get("X-API-Version"),
    client: res.headers.get("X-Authenticated-Client"),
    requestsAvailable: toInt(res.headers.get("X-RequestsAvailable")),
    resetSeconds: toInt(res.headers.get("X-RequestCounter-Reset")),
  };
}

function fdHeaderWarning(h: FdRateHeaders): string | null {
  const w: string[] = [];
  if (h.client === "anonymous") w.push("client=anonymous");
  if (h.requestsAvailable != null && h.requestsAvailable < FD_LOW_AVAILABLE_THRESHOLD) {
    w.push(`available=${h.requestsAvailable}`);
  }
  return w.length > 0 ? w.join(",") : null;
}

function fdHeaderSummary(h: FdRateHeaders): string {
  return `client=${h.client ?? "?"},available=${h.requestsAvailable ?? "?"},reset=${h.resetSeconds ?? "?"}s`;
}

Deno.serve(async (req) => {
  const startedAt = Date.now();
  const url = new URL(req.url);
  const dryRun = url.searchParams.get("dry_run") === "true";
  // Repair mode reconciles every externally-mapped match against the provider,
  // ignoring the normal polling window, so already-FINISHED matches (older than
  // the 24h repoll window) can be re-aligned and re-scored. Combine with
  // dry_run=true to preview corrections before writing.
  const repair = url.searchParams.get("repair") === "true";

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
    fdHeaders?: FdRateHeaders,
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
      fd_api_version: fdHeaders?.apiVersion ?? null,
      fd_client: fdHeaders?.client ?? null,
      fd_requests_available: fdHeaders?.requestsAvailable ?? null,
      fd_reset_seconds: fdHeaders?.resetSeconds ?? null,
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
      // X-Api-Version v4.1 opts into the `minute` / `injuryTime` live-clock
      // fields (Livescore plan add-on) without altering the stable v4 shape.
      headers: { "X-Auth-Token": fdKey, "X-Api-Version": "v4.1" },
    });
  } catch (e) {
    await recordRun(false, null, 0, 502, `fetch failed: ${e}`);
    return new Response(
      JSON.stringify({ error: `fetch failed: ${e}` }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }

  const fdHeaders = readFdHeaders(fdRes);

  if (!fdRes.ok) {
    const body = await fdRes.text();
    await recordRun(
      false,
      null,
      0,
      fdRes.status,
      `FD ${fdRes.status}: ${body.slice(0, 200)} [${fdHeaderSummary(fdHeaders)}]`,
      fdHeaders,
    );
    return new Response(
      JSON.stringify({ error: `football-data.org ${fdRes.status}`, fd_headers: fdHeaders }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }

  const fdData = await fdRes.json();
  const fixtures: FdFixture[] = fdData.matches ?? [];

  // Load all matches with an external_id, and team external_id → our id map
  const [matchesRes, teamsRes] = await Promise.all([
    sb.from("matches").select(
      "id, external_id, status, home_team_id, away_team_id, home_score, away_score, home_penalties, away_penalties, winner_team_id, minute, injury_time, kickoff_at",
    ).not("external_id", "is", null),
    sb.from("teams").select("id, external_id").not("external_id", "is", null),
  ]);

  if (matchesRes.error || teamsRes.error) {
    const err = matchesRes.error?.message ?? teamsRes.error?.message ?? "db error";
    await recordRun(false, fixtures.length, 0, 500, err, fdHeaders);
    return new Response(
      JSON.stringify({ error: err, fd_headers: fdHeaders }),
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
    if (!repair && !isPollable(ours, now)) continue;

    const newStatus = mapStatus(fx.status);

    // Map the provider's home/away teams onto our team ids. external_id was
    // backfilled by an *unordered* team pair (see 20260528000002), so the
    // provider's "home" is NOT guaranteed to be our home.
    const fdHomeTeamId =
      fx.homeTeam.id != null ? teamByExt.get(fx.homeTeam.id) ?? null : null;
    const fdAwayTeamId =
      fx.awayTeam.id != null ? teamByExt.get(fx.awayTeam.id) ?? null : null;

    // Align the provider's scoreline onto OUR orientation by team identity, so
    // decisive results can't be stored reversed and winner_team_id can't point
    // at the loser. Pure + unit-tested in align.ts.
    const aligned = alignFixture({
      ourHomeTeamId: ours.home_team_id,
      ourAwayTeamId: ours.away_team_id,
      fdHomeTeamId,
      fdAwayTeamId,
      fdHomeScore: fx.score?.fullTime?.home ?? null,
      fdAwayScore: fx.score?.fullTime?.away ?? null,
      fdHomePen: fx.score?.penalties?.home ?? null,
      fdAwayPen: fx.score?.penalties?.away ?? null,
      fdWinner: fx.score?.winner ?? null,
      finished: newStatus === "FINISHED",
    });

    if (!aligned.ok) {
      // external_id maps to the wrong fixture → refuse to write a scoreline we
      // can't trust, and surface it (folded into the run's health log below).
      changes.push({
        match_id: ours.id,
        external_id: fx.id,
        error:
          `team mismatch: ours=(${aligned.ourHomeTeamId},${aligned.ourAwayTeamId}) ` +
          `fd=(${aligned.fdHomeTeamId},${aligned.fdAwayTeamId})`,
      });
      continue;
    }

    const newHome = aligned.homeTeamId;
    const newAway = aligned.awayTeamId;
    const winnerId = aligned.winnerTeamId;

    // Live clock (v4.1). Only meaningful while in play; cleared to NULL once the
    // match leaves LIVE so finished/scheduled rows never show a stale minute.
    const newMinute = newStatus === "LIVE" ? fx.minute ?? null : null;
    const newInjury = newStatus === "LIVE" ? fx.injuryTime ?? null : null;

    // Build patch with only changed fields
    const patch: Record<string, unknown> = {};
    if (ours.status !== newStatus) patch.status = newStatus;
    if (ours.home_score !== aligned.homeScore) patch.home_score = aligned.homeScore;
    if (ours.away_score !== aligned.awayScore) patch.away_score = aligned.awayScore;
    if (ours.home_penalties !== aligned.homePen) patch.home_penalties = aligned.homePen;
    if (ours.away_penalties !== aligned.awayPen) patch.away_penalties = aligned.awayPen;
    if (ours.home_team_id !== newHome) patch.home_team_id = newHome;
    if (ours.away_team_id !== newAway) patch.away_team_id = newAway;
    if (ours.minute !== newMinute) patch.minute = newMinute;
    if (ours.injury_time !== newInjury) patch.injury_time = newInjury;
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

    // Trigger prediction scoring whenever a match finishes or its score/winner
    // is later corrected (ADR-0001 Q10). The FINISHED transition itself must
    // trigger scoring: a drawn match whose score was already recorded while LIVE
    // changes only `status` on the finishing poll (winner_team_id stays null for
    // a draw), so score/winner-change alone would miss it.
    const becameFinished = "status" in patch && newStatus === "FINISHED";
    const scoreOrWinnerChanged =
      "home_score" in patch ||
      "away_score" in patch ||
      "winner_team_id" in patch;
    if (newStatus === "FINISHED" && (becameFinished || scoreOrWinnerChanged)) {
      const rpc = await sb.rpc("calculate_prediction_points", { p_match_id: ours.id });
      if (!rpc.error) scoringTriggered++;
    }
  }

  const warning = fdHeaderWarning(fdHeaders);
  // Per-match failures (wrong-fixture mappings, row update errors) otherwise
  // live only in the response body, which nothing reads — they'd silently lower
  // matches_updated. Fold a summary into the run's health log so they surface in
  // cron_runs and the in-app sync status.
  const matchErrors = changes.filter((c) => typeof c.error === "string");
  const messageParts: string[] = [];
  if (warning) messageParts.push(`warn: ${warning}`);
  if (matchErrors.length > 0) {
    const detail = matchErrors.map((c) => `#${c.match_id}: ${c.error}`).join("; ");
    messageParts.push(`${matchErrors.length} match error(s): ${detail}`);
  }
  const errorMessage =
    messageParts.length > 0 ? messageParts.join(" | ").slice(0, 500) : undefined;

  await recordRun(
    true,
    fixtures.length,
    matchesUpdated,
    200,
    errorMessage,
    fdHeaders,
  );

  return new Response(
    JSON.stringify({
      dry_run: dryRun,
      repair,
      fixtures_returned: fixtures.length,
      matches_updated: matchesUpdated,
      scoring_triggered: scoringTriggered,
      duration_ms: Date.now() - startedAt,
      fd_headers: fdHeaders,
      ...(warning ? { warning } : {}),
      ...(dryRun || changes.length > 0 ? { changes } : {}),
    }),
    { headers: { "Content-Type": "application/json" } },
  );
});
