"use client";

import { useState } from "react";

export function InviteLink({ inviteCode }: { inviteCode: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const url = `${window.location.origin}/leagues/join?code=${inviteCode}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 rounded-md border border-border bg-background px-3 py-2 font-mono text-sm text-foreground">
        {inviteCode}
      </div>
      <button
        onClick={handleCopy}
        className="rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
      >
        {copied ? "Copied!" : "Copy Link"}
      </button>
    </div>
  );
}
