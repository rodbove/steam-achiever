'use client';

import type { ScoredAchievement } from '@/lib/steam-types';
import { DifficultyBars, formatMinutes } from './Difficulty';

interface Props {
  achievement: ScoredAchievement;
  index: number;
  isTopPick?: boolean;
}

export function AchievementCard({ achievement: a, index, isTopPick }: Props) {
  const iconUrl = a.icon
    ? `https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/apps/${a.appid}/${a.icon.split('/').pop() ?? a.icon}`
    : null;

  return (
    <article
      className="rise group flex gap-4 border-b border-ink/15 px-4 py-4 transition-colors hover:bg-ink/[0.03]"
      style={{ animationDelay: `${Math.min(index * 25, 600)}ms` }}
    >
      <div className="relative flex-shrink-0">
        <div
          className={`flex h-14 w-14 items-center justify-center overflow-hidden border border-ink/30 bg-ink/5 ${
            isTopPick ? 'ember-pulse' : ''
          }`}
        >
          {iconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={iconUrl}
              alt=""
              width={56}
              height={56}
              className="h-full w-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <span className="font-mono text-[10px] text-ink/40">no icon</span>
          )}
        </div>
        {isTopPick && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center bg-ember text-[10px] font-bold text-bone">
            ★
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="truncate font-display text-lg font-medium leading-tight">
            {a.displayName}
          </h3>
          <span className="flex-shrink-0 font-mono text-xs uppercase tracking-wider text-ink/50">
            {formatMinutes(a.estimatedMinutes)}
          </span>
        </div>

        <p className="mt-0.5 truncate font-mono text-[11px] uppercase tracking-wider text-ink/60">
          {a.gameName}
        </p>

        {a.description && (
          <p className="mt-1.5 line-clamp-2 text-sm text-ink/75">{a.description}</p>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink/55">
          <span className="flex items-center gap-1.5">
            <DifficultyBars level={a.difficulty} />
          </span>
          <span className="font-mono">{a.globalPercent.toFixed(1)}% globally</span>
          {a.llmRefined && (
            <span className="font-mono uppercase tracking-wider text-ember">AI scored</span>
          )}
          {a.hidden && (
            <span className="font-mono uppercase tracking-wider text-rust">hidden</span>
          )}
          <span className="italic text-ink/45">{a.scoreReason}</span>
        </div>
      </div>
    </article>
  );
}
