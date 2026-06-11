"use client";

import { useEffect, useState } from "react";

// Renders a match kickoff timestamp in the viewer's local timezone.
// kickoff_at is a UTC timestamptz; formatting must happen on the client so it
// reflects the browser's timezone rather than the server's (UTC on Vercel).
// We gate on mount so the server/first-client render match (no hydration
// mismatch), then fill in the localized label after mounting.
export function KickoffTime({ kickoffAt }: { kickoffAt: string }) {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    const kickoff = new Date(kickoffAt);
    const date = kickoff.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    const time = kickoff.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
    setLabel(`${date} ${time}`);
  }, [kickoffAt]);

  // Reserve space with a non-breaking space until the local time is computed.
  return <span suppressHydrationWarning>{label ?? " "}</span>;
}
