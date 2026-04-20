'use client';

import { Suspense, useEffect, useMemo, useState, useTransition } from 'react';
import { useSearchParams } from 'next/navigation';
import { loadBoard, clearCache, type BoardResult } from './actions';
import { SteamIdForm } from '@/components/SteamIdForm';
import { Filters, applyFilters, pickTodaysHunt, type FilterState } from '@/components/Filters';
import { AchievementCard } from '@/components/AchievementCard';
import { Header } from '@/components/Header';
import type { ScoredAchievement } from '@/lib/steam-types';

const STORAGE_KEY = 'achiever:steamid';

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeInner />
    </Suspense>
  );
}

function HomeInner() {
  const [steamId, setSteamId] = useState<string>('');
  const [board, setBoard] = useState<BoardResult | null>(null);
  const [pending, startTransition] = useTransition();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<FilterState>({
    time: 'all',
    search: '',
    game: searchParams.get('game') ?? '',
    sort: 'quick',
    hideDLC: false,
  });

  const handleLoad = (id: string, useLlm: boolean) => {
    localStorage.setItem(STORAGE_KEY, id);
    setSteamId(id);
    startTransition(async () => {
      const result = await loadBoard(id, useLlm);
      setBoard(result);
    });
  };

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const envId = process.env.NEXT_PUBLIC_DEFAULT_STEAM_ID;
    const id = stored || envId || '';
    if (id) {
      setSteamId(id);
      // Auto-load if we have an env-default or a stored id
      startTransition(async () => {
        const result = await loadBoard(id, true);
        setBoard(result);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = () => {
    if (!steamId) return;
    startTransition(async () => {
      await clearCache(steamId);
      const result = await loadBoard(steamId, true);
      setBoard(result);
    });
  };

  const handleReset = () => {
    localStorage.removeItem(STORAGE_KEY);
    setSteamId('');
    setBoard(null);
  };

  const allAchievements = board?.achievements ?? [];
  const filtered = useMemo(() => applyFilters(allAchievements, filters), [allAchievements, filters]);
  const todaysHunt = useMemo(() => pickTodaysHunt(allAchievements, 4), [allAchievements]);

  // Per-game counts for filter dropdown
  const gameOptions = useMemo(() => {
    const map = new Map<number, { name: string; count: number }>();
    for (const a of allAchievements) {
      const cur = map.get(a.appid);
      if (cur) cur.count++;
      else map.set(a.appid, { name: a.gameName, count: 1 });
    }
    return Array.from(map.entries())
      .map(([appid, { name, count }]) => ({ appid, name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allAchievements]);

  return (
    <main className="mx-auto max-w-5xl px-6 py-8 sm:px-10 sm:py-12">
      <Header />

      {!board && (
        <section className="mt-12 rise">
          <div className="border-2 border-ink p-6 sm:p-8">
            <h2 className="font-display text-3xl font-medium leading-tight">
              the hunting log<span className="text-ember">.</span>
            </h2>
            <p className="mt-2 max-w-md text-ink/70">
              find the easiest achievements in games you already play. ranks every locked
              achievement across your library by estimated time.
            </p>
            <div className="mt-6">
              <SteamIdForm onSubmit={handleLoad} loading={pending} initialId={steamId} />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Tip num="01" title="public profile">
              your Steam profile + game details must be set to public for the API to see your
              unlocks.
            </Tip>
            <Tip num="02" title="first load is slow">
              we fetch every game's schema once. subsequent loads hit the local cache.
            </Tip>
            <Tip num="03" title="grain of salt">
              estimates are heuristic. AI-refined picks are marked. neither is gospel.
            </Tip>
          </div>
        </section>
      )}

      {board && !board.ok && (
        <section className="mt-8 border-2 border-rust bg-rust/5 p-6">
          <p className="font-display text-xl font-medium text-rust">something broke</p>
          <p className="mt-2 font-mono text-sm">{board.message}</p>
          <button
            onClick={handleReset}
            className="mt-4 border border-ink px-4 py-2 font-mono text-xs uppercase tracking-wider hover:bg-ink hover:text-bone"
          >
            start over
          </button>
        </section>
      )}

      {board?.ok && board.achievements && (
        <section className="mt-10 space-y-10">
          <Stats
            achievements={board.achievements}
            gameCount={board.gameCount ?? 0}
            steamId={steamId}
            onRefresh={handleRefresh}
            onReset={handleReset}
            refreshing={pending}
          />

          {todaysHunt.length > 0 && <TodaysHunt picks={todaysHunt} />}

          <div>
            <h2 className="mb-4 font-display text-2xl font-medium">
              the full ledger<span className="text-ember">.</span>
            </h2>
            <Filters
              filters={filters}
              onChange={setFilters}
              games={gameOptions}
              totalCount={allAchievements.length}
              filteredCount={filtered.length}
            />
            <div className="mt-6 border border-ink/20">
              {filtered.length === 0 ? (
                <p className="p-8 text-center font-mono text-sm text-ink/50">
                  no achievements match these filters
                </p>
              ) : (
                filtered
                  .slice(0, 200)
                  .map((a, i) => (
                    <AchievementCard
                      key={`${a.appid}-${a.apiname}`}
                      achievement={a}
                      index={i}
                    />
                  ))
              )}
              {filtered.length > 200 && (
                <p className="border-t border-ink/15 p-4 text-center font-mono text-xs text-ink/50">
                  showing first 200. narrow filters to see more.
                </p>
              )}
            </div>
          </div>

          {board.errors && board.errors.length > 0 && (
            <details className="border border-ink/20 bg-ink/[0.02] p-4">
              <summary className="cursor-pointer font-mono text-xs uppercase tracking-wider text-ink/60">
                {board.errors.length} non-fatal errors
              </summary>
              <ul className="mt-2 space-y-1 font-mono text-xs text-ink/60">
                {board.errors.map((e, i) => (
                  <li key={i}>· {e}</li>
                ))}
              </ul>
            </details>
          )}
        </section>
      )}

      <footer className="mt-20 border-t border-ink/15 pt-6 font-mono text-[11px] uppercase tracking-wider text-ink/40">
        achiever · uses the steam web api · cache backed by supabase
      </footer>
    </main>
  );
}

function Tip({ num, title, children }: { num: string; title: string; children: React.ReactNode }) {
  return (
    <div className="border border-ink/15 p-4">
      <p className="font-mono text-[10px] uppercase tracking-widest text-ember">{num}</p>
      <p className="mt-1 font-display text-base font-medium">{title}</p>
      <p className="mt-1 text-xs text-ink/65">{children}</p>
    </div>
  );
}

function Stats({
  achievements,
  gameCount,
  steamId,
  onRefresh,
  onReset,
  refreshing,
}: {
  achievements: ScoredAchievement[];
  gameCount: number;
  steamId: string;
  onRefresh: () => void;
  onReset: () => void;
  refreshing: boolean;
}) {
  const quick = achievements.filter((a) => a.estimatedMinutes <= 15).length;
  const medium = achievements.filter((a) => a.estimatedMinutes > 15 && a.estimatedMinutes <= 60).length;
  const refined = achievements.filter((a) => a.llmRefined).length;

  return (
    <div className="border-2 border-ink">
      <div className="grid grid-cols-2 divide-ink/15 border-b-2 border-ink sm:grid-cols-4 sm:divide-x">
        <Stat label="games" value={gameCount} />
        <Stat label="locked" value={achievements.length} />
        <Stat label="≤ 15 min" value={quick} accent />
        <Stat label="ai refined" value={refined} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <p className="font-mono text-[11px] uppercase tracking-wider text-ink/55">
          steamID · {steamId.slice(0, 6)}…{steamId.slice(-4)}
        </p>
        <div className="flex gap-2">
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="border border-ink px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider transition-colors hover:bg-ink hover:text-bone disabled:opacity-40"
          >
            {refreshing ? 'refreshing...' : 'refresh data'}
          </button>
          <button
            onClick={onReset}
            className="border border-ink/30 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider transition-colors hover:bg-ink/10"
          >
            change account
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={`p-4 ${accent ? 'bg-ember/10' : ''}`}>
      <p className="font-display text-3xl font-bold leading-none">{value.toLocaleString()}</p>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-ink/55">{label}</p>
    </div>
  );
}

function TodaysHunt({ picks }: { picks: ScoredAchievement[] }) {
  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="font-display text-2xl font-medium">
          today's hunt<span className="text-ember">.</span>
        </h2>
        <span className="font-mono text-[11px] uppercase tracking-wider text-ink/50">
          one pick per game
        </span>
      </div>
      <div className="border-2 border-ember bg-ember/[0.04]">
        {picks.map((a, i) => (
          <AchievementCard key={`${a.appid}-${a.apiname}`} achievement={a} index={i} isTopPick />
        ))}
      </div>
    </div>
  );
}
