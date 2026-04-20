'use client';

import type { ScoredAchievement } from '@/lib/steam-types';

export type TimeFilter = 'all' | 'q' | 'm' | 'h';

export interface FilterState {
  time: TimeFilter;
  search: string;
  game: string; // appid as string, '' = all
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

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {chip('all', 'all')}
        {chip('q', '≤ 15 min')}
        {chip('m', '≤ 1 h')}
        {chip('h', '≤ 4 h')}
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
  return list.filter((a) => {
    if (filters.time === 'q' && a.estimatedMinutes > 15) return false;
    if (filters.time === 'm' && a.estimatedMinutes > 60) return false;
    if (filters.time === 'h' && a.estimatedMinutes > 240) return false;
    if (filters.game && String(a.appid) !== filters.game) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const hay = `${a.displayName} ${a.gameName} ${a.description}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
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
