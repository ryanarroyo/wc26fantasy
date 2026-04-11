import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
      <div className="max-w-2xl space-y-6">
        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
          <span className="text-primary">World Cup</span>{" "}
          <span className="text-secondary">2026</span>
        </h1>
        <p className="text-xl text-foreground">Bracket Predictor</p>
        <p className="text-muted-foreground">
          Predict exact scores for every match. Create private leagues, compete
          with friends, and follow the tournament with live score updates.
        </p>

        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/login"
            className="rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Get Started
          </Link>
          <Link
            href="/bracket"
            className="rounded-lg border border-border px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            View Bracket
          </Link>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="text-2xl font-bold text-primary">48</div>
            <div className="mt-1 text-sm text-muted-foreground">Teams</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="text-2xl font-bold text-secondary">104</div>
            <div className="mt-1 text-sm text-muted-foreground">Matches</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="text-2xl font-bold text-accent">12</div>
            <div className="mt-1 text-sm text-muted-foreground">Groups</div>
          </div>
        </div>
      </div>
    </div>
  );
}
