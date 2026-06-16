import { createClient } from "@/lib/supabase/server";

const STALE_THRESHOLD_MIN = 30;

export async function SyncStatus() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("cron_runs")
    .select("ran_at, success, matches_updated, error_message")
    .eq("source", "fetch-scores")
    .order("ran_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) {
    return (
      <p className="text-xs text-gray-500">Scores have not synced yet.</p>
    );
  }

  const ranAt = new Date(data.ran_at);
  const ageMin = Math.max(0, Math.round((Date.now() - ranAt.getTime()) / 60000));
  const stale = ageMin > STALE_THRESHOLD_MIN;
  const failed = data.success === false;
  // A successful run can still carry a message (rate-limit warnings, per-match
  // errors folded in by fetch-scores) — surface those as a warning too.
  const hasMessage = Boolean(data.error_message);

  const label =
    ageMin === 0 ? "moments ago"
    : ageMin === 1 ? "1 min ago"
    : ageMin < 60 ? `${ageMin} min ago`
    : ageMin < 120 ? "1 hour ago"
    : `${Math.floor(ageMin / 60)} hours ago`;

  const cls = failed || stale || hasMessage ? "text-amber-600" : "text-gray-500";
  const prefix = failed ? "Last sync failed " : "Scores last synced ";
  const suffix = data.error_message ? ` — ${data.error_message}` : "";

  return (
    <p className={`text-xs ${cls}`}>
      {prefix}{label}{suffix}
    </p>
  );
}
