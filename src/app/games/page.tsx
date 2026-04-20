'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { loadGamesProgress, type GamesResult, type GameProgress } from '../actions';
import { Header } from '@/components/Header';
import { SteamIdForm } from '@/components/SteamIdForm';

const STORAGE_KEY = 'achiever:steamid';

export default function GamesPage() {
  const [steamId, setSteamId] = useState('');
  const [result, setResult] = useState<GamesResult | null>(null);
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState('');

  const load = (id: string) => {
    localStorage.setItem(STORAGE_KEY, id);
    setSteamId(id);
    startTransition(async () => {
      const r = await loadGamesProgress(id);
      setResult(r);
    });
  };

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const envId = process.env.NEXT_PUBLIC_DEFAULT_STEAM_ID;
    const id = stored || envId || '';
    if (id) {
      setSteamId(id);
      startTransition(async () => {
        const r = await loadGamesProgress(id);
        setResult(r);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    if (!result?.games) return [];
    if (!search) return result.games;
    const q = search.toLowerCase();
    return result.games.filter((g) => g.name.toLowerCase().includes(q));
  }, [result, search]);

  const stats = useMemo(() => {
    const games = result?.games ?? [];
    const completed = games.filter((g) => g.ratio >= 1).length;
    const inProgress = games.filter((g) => g.ratio > 0 && g.ratio < 1).length;
    const untouched = games.filter((g) => g.ratio === 0).length;
    const totalUnlocked = games.reduce((s, g) => s + g.unlockedCount, 0);
    const totalPossible = games.reduce((s, g) => s + g.totalAchievements, 0);
    return { completed, inProgress, untouched, totalUnlocked, totalPossible };
  }, [result]);

  return (
    <main className="mx-auto max-w-5xl px-6 py-8 sm:px-10 sm:py-12">
      <Header />

      {!result && !pending && (
        <section className="mt-12 rise">
          <div className="border-2 border-ink p-6 sm:p-8">
            <h2 className="font-display text-3xl font-medium leading-tight">
              games ledger<span className="text-ember">.</span>
            </h2>
            <p className="mt-2 max-w-md text-ink/70">
              every game with achievements, ranked by completion %.
            </p>
            <div className="mt-6">
              <SteamIdForm onSubmit={(id) => load(id)} loading={pending} initialId={steamId} />
            </div>
          </div>
        </section>
      )}

      {pending && !result && (
        <section className="mt-16 text-center">
          <p className="font-mono text-sm uppercase tracking-widest text-ink/60">
            scanning library…
          </p>
        </section>
      )}

      {result && !result.ok && (
        <section className="mt-8 border-2 border-rust bg-rust/5 p-6">
          <p className="font-display text-xl font-medium text-rust">something broke</p>
          <p className="mt-2 font-mono text-sm">{result.message}</p>
        </section>
      )}

      {result?.ok && result.games && (
        <section className="mt-10 space-y-8">
          <div className="border-2 border-ink">
            <div className="grid grid-cols-2 divide-ink/15 border-b-2 border-ink sm:grid-cols-4 sm:divide-x">
              <Stat label="games" value={result.games.length} />
              <Stat label="completed" value={stats.completed} accent />
              <Stat label="in progress" value={stats.inProgress} />
              <Stat
                label="unlocks"
                value={stats.totalUnlocked}
                sub={`of ${stats.totalPossible.toLocaleString()}`}
              />
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <p className="font-mono text-[11px] uppercase tracking-wider text-ink/55">
                steamID · {steamId.slice(0, 6)}…{steamId.slice(-4)}
              </p>
              {pending && (
                <span className="font-mono text-[11px] uppercase tracking-wider text-ember">
                  refreshing…
                </span>
              )}
            </div>
          </div>

          <input
            type="search"
            placeholder="search games..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-ink/30 bg-bone px-3 py-2 font-mono text-sm placeholder:text-ink/40 focus:border-ink focus:outline-none"
          />

          <div className="border border-ink/20">
            {filtered.length === 0 ? (
              <p className="p-8 text-center font-mono text-sm text-ink/50">no games match</p>
            ) : (
              filtered.map((g, i) => <GameRow key={g.appid} game={g} index={i} />)
            )}
          </div>
        </section>
      )}

      <footer className="mt-20 border-t border-ink/15 pt-6 font-mono text-[11px] uppercase tracking-wider text-ink/40">
        achiever · uses the steam web api · cache backed by supabase
      </footer>
    </main>
  );
}

function Stat({
  label,
  value,
  accent,
  sub,
}: {
  label: string;
  value: number;
  accent?: boolean;
  sub?: string;
}) {
  return (
    <div className={`p-4 ${accent ? 'bg-ember/10' : ''}`}>
      <p className="font-display text-3xl font-bold leading-none">{value.toLocaleString()}</p>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-ink/55">
        {label}
        {sub && <span className="ml-1 text-ink/40 normal-case">· {sub}</span>}
      </p>
    </div>
  );
}

function GameRow({ game: g, index }: { game: GameProgress; index: number }) {
  const pct = Math.round(g.ratio * 100);
  const isComplete = pct >= 100;

  return (
    <article
      className="rise flex items-center gap-4 border-b border-ink/15 px-4 py-3 transition-colors hover:bg-ink/[0.03]"
      style={{ animationDelay: `${Math.min(index * 20, 500)}ms` }}
    >
      <div className="flex-shrink-0 border border-ink/30 bg-ink/5">
        {g.iconUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={g.iconUrl} alt="" width={32} height={32} className="block h-8 w-8" />
        ) : (
          <div className="h-8 w-8" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <Link
            href={`/?game=${g.appid}`}
            className="truncate font-display text-base font-medium hover:text-ember"
          >
            {g.name}
          </Link>
          <span
            className={`flex-shrink-0 font-mono text-xs font-medium uppercase tracking-wider ${
              isComplete ? 'text-ember' : 'text-ink/70'
            }`}
          >
            {pct}%
          </span>
        </div>

        <div className="mt-1.5 flex items-center gap-3">
          <div className="h-1.5 flex-1 bg-ink/10">
            <div
              className={`h-full transition-all ${isComplete ? 'bg-ember' : 'bg-ink'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="flex-shrink-0 font-mono text-[11px] text-ink/55">
            {g.unlockedCount}/{g.totalAchievements}
          </span>
        </div>
      </div>
    </article>
  );
}
