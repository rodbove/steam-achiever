'use client';

import type { ScoredAchievement } from '@/lib/steam-types';

export type TimeFilter = 'all' | 'q' | 'm' | 'h';
export type SortMode = 'quick' | 'completion';

export interface FilterState {
  time: TimeFilter;
  search: string;
  game: string; // appid as string, '' = all
  sort: SortMode;
  hideDLC: boolean;
}

interface Props {
  filters: FilterState;
  onChange: (next: FilterState) => void;
  games: { appid: number; name: string; count: number }[];
  totalCount: number;
  filteredCount: number;
}

export function Filters({ filters, onChange, games, totalCount, filteredCount }: Props) {
  const update = (patch: Partial<FilterState>) => onChange({ ...filters, ...patch });

  const chip = (key: TimeFilter, label: string) => (
    <button
      key={key}
      onClick={() => update({ time: key })}
      className={`border px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider transition-colors ${
        filters.time === key
          ? 'border-ink bg-ink text-bone'
          : 'border-ink/30 text-ink/70 hover:border-ink hover:text-ink'
      }`}
    >
      {label}
    </button>
  );

  const sortChip = (key: SortMode, label: string, sub: string) => (
    <button
      key={key}
      onClick={() => update({ sort: key })}
      className={`border px-3 py-1.5 text-left font-mono text-[11px] uppercase tracking-wider transition-colors ${
        filters.sort === key
          ? 'border-ember bg-ember text-bone'
          : 'border-ink/30 text-ink/70 hover:border-ink hover:text-ink'
      }`}
    >
      <span>{label}</span>
      <span className="ml-2 opacity-60 normal-case">{sub}</span>
    </button>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {sortChip('quick', 'quick wins', 'fastest first')}
        {sortChip('completion', 'push to 100%', 'most unlocked games first')}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {chip('all', 'all')}
        {chip('q', '≤ 15 min')}
        {chip('m', '≤ 1 h')}
        {chip('h', '≤ 4 h')}
        <label className="ml-auto flex cursor-pointer items-center gap-2 border border-ink/30 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider hover:border-ink">
          <input
            type="checkbox"
            checked={filters.hideDLC}
            onChange={(e) => update({ hideDLC: e.target.checked })}
            className="h-3.5 w-3.5 accent-ember"
          />
          <span>hide DLC-gated</span>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          placeholder="search achievements..."
          value={filters.search}
          onChange={(e) => update({ search: e.target.value })}
          className="flex-1 min-w-[200px] border border-ink/30 bg-bone px-3 py-2 font-mono text-sm placeholder:text-ink/40 focus:border-ink focus:outline-none"
        />
        <select
          value={filters.game}
          onChange={(e) => update({ game: e.target.value })}
          className="border border-ink/30 bg-bone px-3 py-2 font-mono text-sm focus:border-ink focus:outline-none"
        >
          <option value="">all games ({games.length})</option>
          {games.map((g) => (
            <option key={g.appid} value={String(g.appid)}>
              {g.name} ({g.count})
            </option>
          ))}
        </select>
      </div>

      <p className="font-mono text-[11px] uppercase tracking-wider text-ink/50">
        showing {filteredCount} of {totalCount} achievements
      </p>
    </div>
  );
}

export function applyFilters(
  list: ScoredAchievement[],
  filters: FilterState,
): ScoredAchievement[] {
  const filtered = list.filter((a) => {
    if (filters.time === 'q' && a.estimatedMinutes > 15) return false;
    if (filters.time === 'm' && a.estimatedMinutes > 60) return false;
    if (filters.time === 'h' && a.estimatedMinutes > 240) return false;
    if (filters.game && String(a.appid) !== filters.game) return false;
    if (filters.hideDLC && a.requiresDLC) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const hay = `${a.displayName} ${a.gameName} ${a.description}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (filters.sort === 'completion') {
      // Highest completion % first, then easiest within that game
      if (b.gameUnlockRatio !== a.gameUnlockRatio) {
        return b.gameUnlockRatio - a.gameUnlockRatio;
      }
      if (a.estimatedMinutes !== b.estimatedMinutes) {
        return a.estimatedMinutes - b.estimatedMinutes;
      }
      return b.globalPercent - a.globalPercent;
    }
    // 'quick' — fastest first, then most common
    if (a.estimatedMinutes !== b.estimatedMinutes) {
      return a.estimatedMinutes - b.estimatedMinutes;
    }
    return b.globalPercent - a.globalPercent;
  });

  return sorted;
}

// Pick a varied "today's hunt" - different games, low time
export function pickTodaysHunt(list: ScoredAchievement[], n = 4): ScoredAchievement[] {
  const seenGames = new Set<number>();
  const picks: ScoredAchievement[] = [];
  // list is already sorted by estimatedMinutes asc
  for (const a of list) {
    if (seenGames.has(a.appid)) continue;
    if (a.estimatedMinutes > 60) break; // only suggest realistic daily picks
    picks.push(a);
    seenGames.add(a.appid);
    if (picks.length >= n) break;
  }
  return picks;
}
