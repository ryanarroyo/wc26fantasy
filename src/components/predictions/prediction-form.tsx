"use client";

import { useEffect, useState, useTransition } from "react";
import type { MatchWithTeams, Prediction } from "@/lib/types/database";
import { PredictionCard } from "./prediction-card";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { autoPickMatch } from "@/lib/auto-pick";

const MAX_CONFIDENT = 3;

const ROUND_LABELS: Record<string, string> = {
  GROUP: "Group Stage",
  R32: "Round of 32",
  R16: "Round of 16",
  QF: "Quarterfinals",
  SF: "Semifinals",
  "3RD": "3rd-Place Match",
  FINAL: "Final",
};

type PredictionInput = {
  match_id: number;
  predicted_home: number;
  predicted_away: number;
  predicted_winner_id: number | null;
};

export function PredictionForm({
  matches,
  existingPredictions,
  userId,
  round,
}: {
  matches: MatchWithTeams[];
  existingPredictions: Map<number, Prediction>;
  userId: string;
  round: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [predictions, setPredictions] = useState<Map<number, PredictionInput>>(
    () => {
      const map = new Map<number, PredictionInput>();
      for (const match of matches) {
        const existing = existingPredictions.get(match.id);
        if (existing) {
          map.set(match.id, {
            match_id: match.id,
            predicted_home: existing.predicted_home,
            predicted_away: existing.predicted_away,
            predicted_winner_id: existing.predicted_winner_id,
          });
        }
      }
      return map;
    }
  );

  const [confidences, setConfidences] = useState<Map<number, boolean>>(() => {
    const map = new Map<number, boolean>();
    for (const match of matches) {
      const existing = existingPredictions.get(match.id);
      if (existing) {
        map.set(match.id, existing.is_confident);
      }
    }
    return map;
  });

  const confidentCount = Array.from(confidences.values()).filter(Boolean).length;
  const atConfidentMax = confidentCount >= MAX_CONFIDENT;
  const roundLabel = ROUND_LABELS[round] ?? round;

  // Re-sync local edit state whenever the server sends fresh predictions (e.g.
  // after a save + router.refresh(), or navigating back to this round). useState
  // initializers only run on first mount, so without this the confident counter
  // could keep showing a stale value (e.g. "2/3") while the database already has
  // 3 saved — which then surfaces as a confusing "max reached" error on save.
  // Keyed on a content signature so it only fires when the data actually changes,
  // never mid-typing on unchanged props.
  const existingSignature = Array.from(existingPredictions.values())
    .map(
      (p) =>
        `${p.match_id}:${p.predicted_home}-${p.predicted_away}:${p.predicted_winner_id ?? ""}:${p.is_confident ? 1 : 0}`
    )
    .sort()
    .join("|");

  useEffect(() => {
    const nextPredictions = new Map<number, PredictionInput>();
    const nextConfidences = new Map<number, boolean>();
    for (const match of matches) {
      const existing = existingPredictions.get(match.id);
      if (existing) {
        nextPredictions.set(match.id, {
          match_id: match.id,
          predicted_home: existing.predicted_home,
          predicted_away: existing.predicted_away,
          predicted_winner_id: existing.predicted_winner_id,
        });
        nextConfidences.set(match.id, existing.is_confident);
      }
    }
    setPredictions(nextPredictions);
    setConfidences(nextConfidences);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingSignature]);

  const updatePrediction = (
    matchId: number,
    field: string,
    value: number | null
  ) => {
    setPredictions((prev) => {
      const next = new Map(prev);
      const existing = next.get(matchId) ?? {
        match_id: matchId,
        predicted_home: 0,
        predicted_away: 0,
        predicted_winner_id: null,
      };
      next.set(matchId, { ...existing, [field]: value });
      return next;
    });
    setSuccess(false);
    setError(null);
  };

  const toggleConfidence = (matchId: number) => {
    setConfidences((prev) => {
      const next = new Map(prev);
      const current = next.get(matchId) ?? false;
      if (!current && confidentCount >= MAX_CONFIDENT) {
        setError(
          `You can mark at most ${MAX_CONFIDENT} picks as confident for the whole ${roundLabel}. Turn one off to swap it.`
        );
        return prev;
      }
      next.set(matchId, !current);
      setError(null);
      return next;
    });
    setSuccess(false);
  };

  const handleAutoPick = (overwrite: boolean) => {
    const now = new Date();
    const isKnockout = round !== "GROUP";
    const eligible = matches.filter(
      (m) =>
        m.home_team &&
        m.away_team &&
        new Date(m.kickoff_at) > now &&
        (overwrite || !predictions.has(m.id))
    );

    if (eligible.length === 0) {
      setError(
        overwrite
          ? "No matches available to auto-pick."
          : "All open matches already have a prediction. Use overwrite to replace."
      );
      return;
    }

    setPredictions((prev) => {
      const next = new Map(prev);
      for (const match of eligible) {
        const result = autoPickMatch({
          homeRank: match.home_team?.fifa_rank ?? null,
          awayRank: match.away_team?.fifa_rank ?? null,
          homeTeamId: match.home_team_id,
          awayTeamId: match.away_team_id,
          needsWinnerOnDraw: isKnockout,
        });
        next.set(match.id, {
          match_id: match.id,
          predicted_home: result.predicted_home,
          predicted_away: result.predicted_away,
          predicted_winner_id: result.predicted_winner_id,
        });
      }
      return next;
    });
    setError(null);
    setSuccess(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    const supabase = createClient();
    const now = new Date().toISOString();

    const toSave = Array.from(predictions.values()).filter((p) => {
      const match = matches.find((m) => m.id === p.match_id);
      return match && match.kickoff_at > now;
    });

    if (toSave.length === 0) {
      setError("No predictions to save (all matches may have started).");
      setSaving(false);
      return;
    }

    const { error: upsertError } = await supabase.from("predictions").upsert(
      toSave.map((p) => ({
        user_id: userId,
        match_id: p.match_id,
        predicted_home: p.predicted_home,
        predicted_away: p.predicted_away,
        predicted_winner_id: p.predicted_winner_id,
        is_confident: confidences.get(p.match_id) ?? false,
        updated_at: now,
      })),
      { onConflict: "user_id,match_id" }
    );

    if (upsertError) {
      if (/confident picks per round/i.test(upsertError.message)) {
        // The DB enforces the cap across the whole round, which can exceed what
        // this view last loaded. Explain plainly and refresh so the counter
        // snaps back to the real saved count.
        setError(
          `You already have ${MAX_CONFIDENT} confident picks saved for the ${roundLabel} (the limit is per round, across every match). Turn one off, then save again.`
        );
        startTransition(() => router.refresh());
      } else {
        setError(upsertError.message);
      }
    } else {
      setSuccess(true);
      startTransition(() => router.refresh());
    }
    setSaving(false);
  };

  const predictableCount = matches.filter(
    (m) => new Date(m.kickoff_at) > new Date()
  ).length;

  const unpredictedOpenCount = matches.filter(
    (m) =>
      m.home_team &&
      m.away_team &&
      new Date(m.kickoff_at) > new Date() &&
      !predictions.has(m.id)
  ).length;

  return (
    <div className="space-y-4">
      {predictableCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card p-3">
          <div className="text-xs text-muted-foreground">
            Need a head start? Auto Pick fills realistic random scores for any
            open matches.
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleAutoPick(false)}
              disabled={unpredictedOpenCount === 0}
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              Auto Pick {unpredictedOpenCount > 0 ? `(${unpredictedOpenCount})` : ""}
            </button>
            <button
              type="button"
              onClick={() => handleAutoPick(true)}
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              title="Replace all open predictions in this round with new random picks"
            >
              Re-roll all
            </button>
          </div>
        </div>
      )}

      <div className="flex items-start gap-1.5 px-1 text-xs text-muted-foreground">
        <svg
          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-secondary"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
        </svg>
        <span>
          Tap the star to make a pick <span className="font-medium text-secondary">confident</span> — it
          scores <span className="font-medium">1.5×</span>. You get{" "}
          <span className="font-medium">{MAX_CONFIDENT} per round</span>, covering every match in the{" "}
          {roundLabel}.
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {matches.map((match) => (
          <PredictionCard
            key={match.id}
            match={match}
            prediction={predictions.get(match.id) ?? null}
            existingPrediction={existingPredictions.get(match.id) ?? null}
            isConfident={confidences.get(match.id) ?? false}
            canToggleConfident={!atConfidentMax}
            onUpdate={updatePrediction}
            onToggleConfidence={toggleConfidence}
          />
        ))}
      </div>

      {predictableCount > 0 && (
        <div className="sticky bottom-4 flex items-center justify-between rounded-xl border border-border bg-card p-4 shadow-lg">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>
              {predictions.size} / {matches.length} predictions
            </span>
            <span
              className={`flex items-center gap-1 ${atConfidentMax ? "text-secondary" : "text-muted-foreground"}`}
              title={`Mark up to ${MAX_CONFIDENT} picks as confident for 1.5× points. The limit is per round — these ${MAX_CONFIDENT} cover the entire ${roundLabel}.`}
            >
              <svg
                className="h-3.5 w-3.5 text-secondary"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
              </svg>
              <span>
                {confidentCount}/{MAX_CONFIDENT} confident
                <span className="hidden sm:inline"> · {roundLabel}</span>
                {atConfidentMax && (
                  <span className="ml-1 font-semibold uppercase">· max</span>
                )}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            {error && (
              <span className="text-sm text-destructive">{error}</span>
            )}
            {success && (
              <span className="text-sm text-primary">Saved!</span>
            )}
            <button
              onClick={handleSave}
              disabled={saving || predictions.size === 0}
              className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Predictions"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
