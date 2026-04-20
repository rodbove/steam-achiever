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

export interface GameProgress {
  appid: number;
  name: string;
  iconUrl: string | null;
  playtimeMinutes: number;
  unlockedCount: number;
  totalAchievements: number;
  ratio: number; // 0-1
}

export interface GamesResult {
  ok: boolean;
  games?: GameProgress[];
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

export async function loadGamesProgress(steamId: string): Promise<GamesResult> {
  if (!/^\d{17}$/.test(steamId)) {
    return { ok: false, message: 'SteamID64 should be a 17-digit number' };
  }

  try {
    const { games, errors } = await buildAchievementBoard(steamId);
    const progress: GameProgress[] = games.map((g) => {
      const icon = g.game.img_icon_url
        ? `https://media.steampowered.com/steamcommunity/public/images/apps/${g.game.appid}/${g.game.img_icon_url}.jpg`
        : null;
      return {
        appid: g.game.appid,
        name: g.game.name,
        iconUrl: icon,
        playtimeMinutes: g.game.playtime_forever,
        unlockedCount: g.unlockedCount,
        totalAchievements: g.totalAchievements,
        ratio: g.totalAchievements > 0 ? g.unlockedCount / g.totalAchievements : 0,
      };
    });
    progress.sort((a, b) => {
      if (b.ratio !== a.ratio) return b.ratio - a.ratio;
      return b.unlockedCount - a.unlockedCount;
    });
    return { ok: true, games: progress, errors };
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
