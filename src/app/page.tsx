import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col" style={{ background: "#000" }}>
      {/* Hero */}
      <section className="flex flex-col items-center justify-center px-4 pb-20 pt-16 text-center sm:pt-24">
        <img
          src="/logo.png"
          alt="World Cup Fantasy 2026"
          className="mb-10 w-72 object-contain sm:w-96"
        />

        <h1 className="text-5xl font-extrabold tracking-tight text-white sm:text-7xl">
          World Cup Fantasy
        </h1>
        <p className="mt-2 text-lg font-light tracking-widest uppercase text-white/40">
          2026 Tournament Archive
        </p>

        <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-white/60">
          The tournament is over — Spain beat Argentina 1&ndash;0 in the final
          at MetLife Stadium on July 19, 2026. Every result, bracket, and
          league leaderboard is preserved here.
        </p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
          <Link
            href="/leagues"
            className="rounded-full bg-white px-8 py-3 text-sm font-semibold text-black transition-colors hover:bg-white/90"
          >
            Final Standings
          </Link>
          <Link
            href="/bracket"
            className="rounded-full border border-white/20 px-8 py-3 text-sm font-semibold text-white transition-colors hover:border-white/40 hover:bg-white/5"
          >
            View Bracket
          </Link>
        </div>
        <Link
          href="/how-to-play"
          className="mt-6 text-xs font-medium uppercase tracking-widest text-white/40 transition-colors hover:text-white/70"
        >
          How scoring worked →
        </Link>
      </section>

      {/* Final result */}
      <section className="border-y border-white/10 py-12">
        <div className="mx-auto flex max-w-2xl flex-col items-center justify-center gap-8 sm:flex-row sm:gap-16">
          <div className="text-center">
            <div className="text-4xl font-bold text-white">🇪🇸</div>
            <div className="mt-1 text-xs font-medium uppercase tracking-widest text-white/40">
              Champions: Spain
            </div>
          </div>
          <div className="hidden h-8 w-px bg-white/10 sm:block" />
          <div className="text-center">
            <div className="text-4xl font-bold text-white">1–0</div>
            <div className="mt-1 text-xs font-medium uppercase tracking-widest text-white/40">
              Final vs Argentina
            </div>
          </div>
          <div className="hidden h-8 w-px bg-white/10 sm:block" />
          <div className="text-center">
            <div className="text-4xl font-bold text-white">104</div>
            <div className="mt-1 text-xs font-medium uppercase tracking-widest text-white/40">
              Matches Played
            </div>
          </div>
        </div>
      </section>

      {/* What's preserved */}
      <section className="px-4 py-20">
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-8 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-white/10">
              <svg className="h-6 w-6 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-white">Leaderboards</h3>
            <p className="mt-2 text-sm leading-relaxed text-white/40">
              Every league&apos;s final standings, with points by round and
              upset bonuses, frozen as of the final whistle.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-white/10">
              <svg className="h-6 w-6 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-white">Full Results</h3>
            <p className="mt-2 text-sm leading-relaxed text-white/40">
              All 104 matches from the group stage to the final, including
              every knockout bracket and penalty shootout.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-white/10">
              <svg className="h-6 w-6 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-white">Read-Only</h3>
            <p className="mt-2 text-sm leading-relaxed text-white/40">
              The site is a static archive — no sign-in, no edits. Everything
              you see is the final record.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 text-center text-xs text-white/20">
        <Link
          href="/how-to-play"
          className="text-white/40 transition-colors hover:text-white/70"
        >
          How to Play
        </Link>
        <span className="mx-3 text-white/10">·</span>
        FIFA World Cup 2026 &middot; USA &middot; Mexico &middot; Canada &middot;
        Archived July 2026
      </footer>
    </div>
  );
}
