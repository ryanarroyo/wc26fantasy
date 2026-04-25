import Link from "next/link";

export const metadata = {
  title: "How to Play — WC Fantasy 2026",
  description:
    "Scoring rules, bonuses, and pro tips for World Cup Fantasy 2026.",
};

const ROUND_SCORING = [
  { round: "Group Stage", result: 2, exact: 3, winner: "—" },
  { round: "Round of 32", result: 4, exact: 4, winner: 2 },
  { round: "Round of 16", result: 6, exact: 5, winner: 3 },
  { round: "Quarterfinals", result: 8, exact: 6, winner: 4 },
  { round: "Semifinals", result: 12, exact: 8, winner: 5 },
  { round: "3rd Place", result: 10, exact: 6, winner: 4 },
  { round: "Final", result: 16, exact: 10, winner: 6 },
];

const UPSET_TIERS = [
  { gap: "10–19", label: "Small upset", win: 2, draw: 1 },
  { gap: "20–39", label: "Medium upset", win: 4, draw: 2 },
  { gap: "40+", label: "Huge upset", win: 8, draw: 4 },
];

function SectionHeader({
  number,
  title,
  subtitle,
}: {
  number: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-4 flex items-baseline gap-3">
      <span className="text-sm font-mono text-muted-foreground">{number}</span>
      <div>
        <h2 className="text-xl font-bold text-foreground">{title}</h2>
        {subtitle && (
          <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

function ExampleCard({
  title,
  scenario,
  breakdown,
  total,
  highlight,
}: {
  title: string;
  scenario: string;
  breakdown: Array<{ label: string; pts: string }>;
  total: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-5 ${
        highlight
          ? "border-amber-500/40 bg-gradient-to-br from-amber-500/10 to-amber-500/5"
          : "border-border bg-card"
      }`}
    >
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {title}
      </div>
      <p className="mt-2 text-sm text-foreground">{scenario}</p>
      <div className="mt-4 space-y-1 border-t border-border/50 pt-3 text-sm">
        {breakdown.map((line, i) => (
          <div key={i} className="flex items-baseline justify-between">
            <span className="text-muted-foreground">{line.label}</span>
            <span className="font-mono">{line.pts}</span>
          </div>
        ))}
        <div className="flex items-baseline justify-between border-t border-border/50 pt-2 text-base font-bold">
          <span>Total</span>
          <span className={highlight ? "text-amber-500" : "text-primary"}>
            {total}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function HowToPlayPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      {/* Header */}
      <header className="mb-12 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
          How to Play
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          Pick scores. Stack bonuses. Outsmart your friends.
        </p>
      </header>

      {/* Section 1: The basics */}
      <section className="mb-14">
        <SectionHeader number="01" title="The basics" />
        <div className="rounded-xl border border-border bg-card p-6">
          <p className="text-sm leading-relaxed text-foreground">
            For every match in the World Cup — all{" "}
            <span className="font-semibold">104 of them</span> — you predict the
            exact score. Closer to reality means more points. Compete with
            friends in private leagues; there's no public leaderboard.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="mt-1 inline-block h-1 w-1 rounded-full bg-primary" />
              Predictions lock at kickoff — no edits after a match starts.
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 inline-block h-1 w-1 rounded-full bg-primary" />
              Scores update automatically during matches via real-time data.
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 inline-block h-1 w-1 rounded-full bg-primary" />
              Wrong picks earn 0 — you can never lose points, only fail to
              earn them.
            </li>
          </ul>
        </div>
      </section>

      {/* Section 2: Base scoring */}
      <section className="mb-14">
        <SectionHeader
          number="02"
          title="Base scoring"
          subtitle="Each round pays differently. Later rounds matter more."
        />
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 text-left font-medium">Round</th>
                  <th
                    className="px-3 py-3 text-center font-medium"
                    title="Picked the winner (or draw) correctly"
                  >
                    Correct Result
                  </th>
                  <th
                    className="px-3 py-3 text-center font-medium"
                    title="Bonus on top of correct result"
                  >
                    Exact Score
                  </th>
                  <th
                    className="px-3 py-3 text-center font-medium"
                    title="Knockouts only — bonus for picking the penalty winner when you predicted a draw"
                  >
                    Penalty Winner
                  </th>
                </tr>
              </thead>
              <tbody>
                {ROUND_SCORING.map((r) => (
                  <tr key={r.round} className="border-b border-border/50">
                    <td className="px-4 py-2.5 font-medium">{r.round}</td>
                    <td className="px-3 py-2.5 text-center font-mono">
                      {r.result}
                    </td>
                    <td className="px-3 py-2.5 text-center font-mono text-primary">
                      +{r.exact}
                    </td>
                    <td className="px-3 py-2.5 text-center font-mono text-muted-foreground">
                      {typeof r.winner === "number" ? `+${r.winner}` : r.winner}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-border/50 bg-muted/10 px-4 py-3 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Stack them:</span> if
            you predict the exact score in a knockout match, you get the result
            points + the exact score bonus + (if applicable) the penalty winner
            bonus.
          </div>
        </div>
      </section>

      {/* Section 3: Confidence multiplier */}
      <section className="mb-14">
        <SectionHeader
          number="03"
          title="Confidence multiplier"
          subtitle="Bet big on the picks you're sure about."
        />
        <div className="rounded-xl border border-secondary/30 bg-secondary/5 p-6">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-secondary/20">
              <svg
                className="h-4 w-4 text-secondary"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm leading-relaxed text-foreground">
                Star up to <span className="font-semibold">3 picks per round</span>{" "}
                as confident. Confident picks pay{" "}
                <span className="font-semibold text-secondary">1.5×</span> points
                (rounded up). Use them on matches you can't see going any other
                way.
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                Example: a confident exact-score pick in the group stage worth 5
                base points pays out{" "}
                <span className="font-mono">CEIL(5 × 1.5) = 8 pts</span>.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: Upset bonus */}
      <section className="mb-14">
        <SectionHeader
          number="04"
          title="Upset bonus"
          subtitle="Reward for calling the shocker before it happens."
        />
        <div className="rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-amber-500/5 p-6">
          <p className="text-sm leading-relaxed text-foreground">
            Every team has a FIFA ranking. When a much-lower-ranked team beats
            (or draws) a higher-ranked one, anyone who predicted that result
            earns a bonus on top of base points. The bigger the rank gap, the
            bigger the bonus:
          </p>

          <div className="mt-4 overflow-hidden rounded-lg border border-amber-500/20 bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-amber-500/20 bg-amber-500/5 text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-2.5 text-left font-medium">
                    Rank gap
                  </th>
                  <th className="px-3 py-2.5 text-left font-medium">Tier</th>
                  <th className="px-3 py-2.5 text-center font-medium">
                    Bonus (Win)
                  </th>
                  <th
                    className="px-3 py-2.5 text-center font-medium"
                    title="Half bonus when you predict a draw and the underdog draws a higher-ranked team"
                  >
                    Bonus (Draw)
                  </th>
                </tr>
              </thead>
              <tbody>
                {UPSET_TIERS.map((t) => (
                  <tr key={t.gap} className="border-b border-amber-500/10">
                    <td className="px-4 py-2.5 font-mono">{t.gap}</td>
                    <td className="px-3 py-2.5 font-medium">{t.label}</td>
                    <td className="px-3 py-2.5 text-center font-mono font-bold text-amber-500">
                      +{t.win}
                    </td>
                    <td className="px-3 py-2.5 text-center font-mono text-amber-500/70">
                      +{t.draw}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="mt-4 space-y-2 text-xs text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="mt-1 inline-block h-1 w-1 rounded-full bg-amber-500" />
              <span>
                You only get the bonus if you{" "}
                <span className="font-medium text-foreground">
                  picked the underdog
                </span>{" "}
                (or predicted the draw) AND the result happened.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 inline-block h-1 w-1 rounded-full bg-amber-500" />
              <span>
                Confidence stacks — confident upset picks multiply the bonus by
                1.5.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 inline-block h-1 w-1 rounded-full bg-amber-500" />
              <span>
                <span className="font-medium text-foreground">
                  Per-round cap:
                </span>{" "}
                only your top 3 upset bonuses per round count. One miracle round
                can't run away with the league.
              </span>
            </li>
          </ul>
        </div>
      </section>

      {/* Section 5: Worked examples */}
      <section className="mb-14">
        <SectionHeader
          number="05"
          title="Worked examples"
          subtitle="See how the math plays out."
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <ExampleCard
            title="Group · close call"
            scenario="You picked Brazil 2-0 Croatia. Actual: Brazil 1-0. Correct result, wrong score."
            breakdown={[
              { label: "Correct result (group)", pts: "+2" },
              { label: "Exact score", pts: "—" },
            ]}
            total="2 pts"
          />

          <ExampleCard
            title="Group · perfect & confident"
            scenario="You picked Spain 3-1 Saudi Arabia and starred it. Actual: Spain 3-1."
            breakdown={[
              { label: "Result + exact (5 base)", pts: "5" },
              { label: "Confidence ×1.5 (CEIL)", pts: "→ 8" },
            ]}
            total="8 pts"
          />

          <ExampleCard
            title="Group · the shocker"
            scenario="You picked Saudi Arabia 2-1 Argentina. Actual: Saudi 2-1. Rank gap: 58."
            breakdown={[
              { label: "Result + exact (group)", pts: "5" },
              { label: "🎯 Huge upset (win)", pts: "+8" },
            ]}
            total="13 pts"
            highlight
          />

          <ExampleCard
            title="Group · shocker + confident"
            scenario="Same Saudi 2-1 Argentina pick, but you marked it confident."
            breakdown={[
              { label: "Base ×1.5 (CEIL(5×1.5))", pts: "8" },
              { label: "🎯 Upset ×1.5 (CEIL(8×1.5))", pts: "+12" },
            ]}
            total="20 pts"
            highlight
          />

          <ExampleCard
            title="Knockout · QF exact"
            scenario="You picked France 2-1 Germany in the QF. Actual: France 2-1."
            breakdown={[
              { label: "Correct result (QF)", pts: "+8" },
              { label: "Exact score bonus", pts: "+6" },
            ]}
            total="14 pts"
          />

          <ExampleCard
            title="Knockout · drew, picked penalty"
            scenario="You picked R16 Brazil 1-1 (draw), Brazil on penalties. Actual: 1-1, Brazil wins on PKs."
            breakdown={[
              { label: "Correct result (R16)", pts: "+6" },
              { label: "Exact score", pts: "+5" },
              { label: "Penalty winner", pts: "+3" },
            ]}
            total="14 pts"
          />
        </div>
      </section>

      {/* Section 6: Pro tips */}
      <section className="mb-14">
        <SectionHeader
          number="06"
          title="Pro tips"
          subtitle="What separates the champions."
        />
        <div className="space-y-3">
          {[
            {
              title: "Save confidence picks for sure things",
              body: "Don't burn all 3 stars on speculative knockouts. The 1.5× multiplier shines on high-base scenarios — confident exact-score picks in late rounds are gold.",
            },
            {
              title: "Don't sleep on upsets",
              body: "The cap means you can't farm them, but 1–2 well-timed upset calls per round add real points. Watch for tournament storylines: a host nation, a hot underdog, a wounded favorite.",
            },
            {
              title: "Predict everything",
              body: "Even a wild guess earns 0, never negative. Always submit a pick — you might accidentally call an upset.",
            },
            {
              title: "Group draws are valuable",
              body: "1-1 and 0-0 draws are common in groups. Predicting one against a much-higher-ranked team triggers the half-upset bonus.",
            },
            {
              title: "Remember the deadline",
              body: "Predictions lock the moment a match starts. If the bracket changes (knockout teams advancing), come back to predict the new matchups.",
            },
          ].map((tip) => (
            <div
              key={tip.title}
              className="rounded-xl border border-border bg-card p-4"
            >
              <h3 className="text-sm font-semibold text-foreground">
                {tip.title}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">{tip.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Section 7: Tournament format */}
      <section className="mb-14">
        <SectionHeader
          number="07"
          title="The 2026 format (it's new)"
          subtitle="First time at 48 teams — here's how it shakes out."
        />
        <div className="rounded-xl border border-border bg-card p-6 text-sm leading-relaxed text-foreground">
          <p>
            <span className="font-semibold">48 teams</span> split into{" "}
            <span className="font-semibold">12 groups of 4</span>. Each team
            plays 3 group matches (72 total).
          </p>
          <p className="mt-3">
            The <span className="font-semibold">top 2</span> from each group
            advance, plus the <span className="font-semibold">8 best 3rd-place</span>{" "}
            finishers — making{" "}
            <span className="font-semibold">32 teams</span> in the new{" "}
            <span className="font-semibold">Round of 32</span>.
          </p>
          <p className="mt-3">
            From there it's a single-elimination bracket: R32 → R16 → QF → SF →
            Final. Plus a 3rd-place playoff. <strong>104 matches in total.</strong>
          </p>
        </div>
      </section>

      {/* CTA */}
      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-8 text-center">
        <h3 className="text-lg font-bold text-foreground">Ready to play?</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Lock in your predictions before kickoff. The early bird catches the
          upset bonus.
        </p>
        <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/predictions"
            className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Make predictions
          </Link>
          <Link
            href="/leagues"
            className="rounded-full border border-border px-6 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Join a league
          </Link>
        </div>
      </div>
    </div>
  );
}
