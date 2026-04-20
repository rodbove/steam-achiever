export interface OwnedGame {
  appid: number;
  name: string;
  playtime_forever: number; // minutes
  playtime_2weeks?: number;
  img_icon_url: string;
  has_community_visible_stats?: boolean;
}

export interface OwnedGamesResponse {
  response: {
    game_count: number;
    games: OwnedGame[];
  };
}

export interface AchievementSchema {
  name: string; // internal id
  displayName: string;
  hidden: 0 | 1;
  description?: string;
  icon: string;
  icongray: string;
}

export interface SchemaResponse {
  game: {
    gameName: string;
    gameVersion: string;
    availableGameStats?: {
      achievements?: AchievementSchema[];
    };
  };
}

export interface PlayerAchievement {
  apiname: string;
  achieved: 0 | 1;
  unlocktime: number;
}

export interface PlayerAchievementsResponse {
  playerstats: {
    steamID: string;
    gameName: string;
    achievements?: PlayerAchievement[];
    success: boolean;
    error?: string;
  };
}

export interface GlobalPercentage {
  name: string;
  percent: number;
}

export interface GlobalPercentagesResponse {
  achievementpercentages: {
    achievements: GlobalPercentage[];
  };
}

// Our internal merged shape
export interface ScoredAchievement {
  appid: number;
  gameName: string;
  apiname: string;
  displayName: string;
  description: string;
  hidden: boolean;
  icon: string;
  globalPercent: number; // 0-100
  // Heuristic-derived
  estimatedMinutes: number;
  difficulty: 1 | 2 | 3 | 4 | 5; // 1 = trivial, 5 = brutal
  scoreReason: string;
  // LLM-refined (optional)
  llmRefined?: boolean;
  // Game context
  yourPlaytimeMinutes: number;
}
