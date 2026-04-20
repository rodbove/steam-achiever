'use server';

import { buildAchievementBoard, flattenAchievements } from '@/lib/aggregator';
import { refineWithLlm } from '@/lib/llm-refiner';
import { cacheClear } from '@/lib/cache';
import type { ScoredAchievement } from '@/lib/steam-types';

export interface BoardResult {
  ok: boolean;
  achievements?: ScoredAchievement[];
  gameCount?: number;
  errors?: string[];
  message?: string;
}

export async function loadBoard(steamId: string, useLlm: boolean): Promise<BoardResult> {
  if (!/^\d{17}$/.test(steamId)) {
    return { ok: false, message: 'SteamID64 should be a 17-digit number' };
  }

  try {
    const { games, errors } = await buildAchievementBoard(steamId);
    let all = flattenAchievements(games);

    if (useLlm) {
      all = await refineWithLlm(all);
    }

    // Default sort: lowest estimated time, then highest global %
    all.sort((a, b) => {
      if (a.estimatedMinutes !== b.estimatedMinutes) {
        return a.estimatedMinutes - b.estimatedMinutes;
      }
      return b.globalPercent - a.globalPercent;
    });

    return { ok: true, achievements: all, gameCount: games.length, errors };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}

export async function clearCache(steamId?: string): Promise<{ ok: boolean }> {
  if (steamId) {
    await cacheClear(`owned:${steamId}`);
    await cacheClear(`player:${steamId}`);
  } else {
    await cacheClear();
  }
  return { ok: true };
}
