import {
  getOwnedGames,
  getSchemaForGame,
  getPlayerAchievements,
  getGlobalPercentages,
  pool,
} from './steam-client';
import { cacheGet, cacheSet, TTL } from './cache';
import { scoreAchievement } from './scorer';
import type {
  OwnedGame,
  OwnedGamesResponse,
  SchemaResponse,
  PlayerAchievementsResponse,
  GlobalPercentagesResponse,
  ScoredAchievement,
} from './steam-types';

async function cachedOwnedGames(steamId: string): Promise<OwnedGamesResponse> {
  const key = `owned:${steamId}`;
  const hit = await cacheGet<OwnedGamesResponse>(key, TTL.ownedGames);
  if (hit) return hit;
  const fresh = await getOwnedGames(steamId);
  await cacheSet(key, fresh);
  return fresh;
}

async function cachedSchema(appid: number): Promise<SchemaResponse> {
  const key = `schema:${appid}`;
  const hit = await cacheGet<SchemaResponse>(key, TTL.schema);
  if (hit) return hit;
  const fresh = await getSchemaForGame(appid);
  await cacheSet(key, fresh);
  return fresh;
}

async function cachedGlobal(appid: number): Promise<GlobalPercentagesResponse> {
  const key = `global:${appid}`;
  const hit = await cacheGet<GlobalPercentagesResponse>(key, TTL.globalPct);
  if (hit) return hit;
  const fresh = await getGlobalPercentages(appid);
  await cacheSet(key, fresh);
  return fresh;
}

async function cachedPlayerAch(
  steamId: string,
  appid: number,
): Promise<PlayerAchievementsResponse> {
  const key = `player:${steamId}:${appid}`;
  const hit = await cacheGet<PlayerAchievementsResponse>(key, TTL.playerAch);
  if (hit) return hit;
  const fresh = await getPlayerAchievements(steamId, appid);
  await cacheSet(key, fresh);
  return fresh;
}

export interface GameSummary {
  game: OwnedGame;
  totalAchievements: number;
  unlockedCount: number;
  lockedCount: number;
  achievements: ScoredAchievement[];
}

export interface BuildOptions {
  minPlaytimeMinutes?: number; // default: any > 0
  maxGames?: number; // for testing
}

export async function buildAchievementBoard(
  steamId: string,
  opts: BuildOptions = {},
): Promise<{
  games: GameSummary[];
  errors: string[];
}> {
  const minPlaytime = opts.minPlaytimeMinutes ?? 1;
  const errors: string[] = [];

  const owned = await cachedOwnedGames(steamId);
  let games = (owned.response.games ?? [])
    .filter((g) => g.playtime_forever >= minPlaytime)
    .sort((a, b) => b.playtime_forever - a.playtime_forever);

  if (opts.maxGames) games = games.slice(0, opts.maxGames);

  // Fetch schema + global + player in parallel per game, with concurrency cap
  const results = await pool(games, 4, async (g): Promise<GameSummary | null> => {
    try {
      const [schemaRes, globalRes, playerRes] = await Promise.all([
        cachedSchema(g.appid),
        cachedGlobal(g.appid).catch(() => null),
        cachedPlayerAch(steamId, g.appid).catch(() => null),
      ]);

      const schema = schemaRes.game?.availableGameStats?.achievements ?? [];
      if (schema.length === 0) return null; // no achievements

      const globalMap = new Map<string, number>();
      if (globalRes) {
        for (const a of globalRes.achievementpercentages.achievements ?? []) {
          globalMap.set(a.name, a.percent);
        }
      }

      const unlockedSet = new Set<string>();
      if (playerRes?.playerstats.success && playerRes.playerstats.achievements) {
        for (const a of playerRes.playerstats.achievements) {
          if (a.achieved === 1) unlockedSet.add(a.apiname);
        }
      }

      const scored: ScoredAchievement[] = [];
      for (const ach of schema) {
        if (unlockedSet.has(ach.name)) continue; // hide unlocked per user pref
        scored.push(
          scoreAchievement({
            appid: g.appid,
            gameName: g.name,
            apiname: ach.name,
            displayName: ach.displayName || ach.name,
            description: ach.description ?? '',
            hidden: ach.hidden === 1,
            icon: ach.icon,
            globalPercent: globalMap.get(ach.name) ?? 0,
            yourPlaytimeMinutes: g.playtime_forever,
          }),
        );
      }

      return {
        game: g,
        totalAchievements: schema.length,
        unlockedCount: unlockedSet.size,
        lockedCount: schema.length - unlockedSet.size,
        achievements: scored,
      };
    } catch (e) {
      errors.push(`${g.name}: ${e instanceof Error ? e.message : String(e)}`);
      return null;
    }
  });

  const summaries: GameSummary[] = [];
  for (const r of results) {
    if (r instanceof Error) errors.push(r.message);
    else if (r) summaries.push(r);
  }

  return { games: summaries, errors };
}

export function flattenAchievements(games: GameSummary[]): ScoredAchievement[] {
  return games.flatMap((g) => g.achievements);
}
