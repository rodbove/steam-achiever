import type {
  OwnedGamesResponse,
  SchemaResponse,
  PlayerAchievementsResponse,
  GlobalPercentagesResponse,
} from './steam-types';

const BASE = 'https://api.steampowered.com';

function getKey(): string {
  const k = process.env.STEAM_API_KEY;
  if (!k || k === 'your_steam_key_here') {
    throw new Error('STEAM_API_KEY missing in .env.local');
  }
  return k;
}

// Steam will rate-limit aggressive callers. Be polite.
async function steamFetch<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    if (res.status === 403) {
      throw new Error(
        'Steam returned 403 - profile might be private, or the game has no public stats',
      );
    }
    if (res.status === 429) {
      throw new Error('Steam rate limit hit - wait a minute and retry');
    }
    throw new Error(`Steam API ${res.status}: ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export async function getOwnedGames(steamId: string): Promise<OwnedGamesResponse> {
  const url = `${BASE}/IPlayerService/GetOwnedGames/v0001/?key=${getKey()}&steamid=${steamId}&include_appinfo=true&include_played_free_games=true&format=json`;
  return steamFetch(url);
}

export async function getSchemaForGame(appid: number): Promise<SchemaResponse> {
  const url = `${BASE}/ISteamUserStats/GetSchemaForGame/v2/?key=${getKey()}&appid=${appid}&format=json`;
  return steamFetch(url);
}

export async function getPlayerAchievements(
  steamId: string,
  appid: number,
): Promise<PlayerAchievementsResponse> {
  const url = `${BASE}/ISteamUserStats/GetPlayerAchievements/v0001/?appid=${appid}&key=${getKey()}&steamid=${steamId}&l=english`;
  return steamFetch(url);
}

export async function getGlobalPercentages(
  appid: number,
): Promise<GlobalPercentagesResponse> {
  const url = `${BASE}/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v0002/?gameid=${appid}&format=json`;
  return steamFetch(url);
}

// Polite parallel runner — caps concurrency so Steam doesn't 429 us.
export async function pool<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
): Promise<Array<R | Error>> {
  const results: Array<R | Error> = new Array(items.length);
  let cursor = 0;

  async function next(): Promise<void> {
    while (cursor < items.length) {
      const i = cursor++;
      try {
        results[i] = await worker(items[i]);
      } catch (e) {
        results[i] = e instanceof Error ? e : new Error(String(e));
      }
    }
  }

  const runners = Array.from({ length: Math.min(concurrency, items.length) }, () => next());
  await Promise.all(runners);
  return results;
}
