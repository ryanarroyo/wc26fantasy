"use client";

import { useRealtimeMatches } from "@/hooks/use-realtime-matches";

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  useRealtimeMatches();
  return <>{children}</>;
}
