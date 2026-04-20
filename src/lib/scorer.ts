import type { ScoredAchievement } from './steam-types';

// Patterns that strongly suggest the achievement is grindy/long
const GRIND_PATTERNS: Array<{ re: RegExp; minutes: number; reason: string }> = [
  { re: /\b(100|1000|10000|500|250)\b.*\b(kill|win|defeat|complete|collect|find)/i, minutes: 600, reason: 'Large-count grind' },
  { re: /\b(all|every)\s+(achievement|trophy|level|stage|chapter|collectible|secret)/i, minutes: 1200, reason: 'Full completion' },
  { re: /\b(no.death|deathless|without dying|pacifist|no damage)/i, minutes: 240, reason: 'Skill challenge / no-death' },
  { re: /\b(speedrun|under \d+ (min|hour|second))/i, minutes: 180, reason: 'Speedrun-style' },
  { re: /\b(legendary|nightmare|insane|hardest|max difficulty)\b/i, minutes: 360, reason: 'Highest difficulty' },
  { re: /\bmultiplayer|online|pvp|ranked|competitive\b/i, minutes: 240, reason: 'Multiplayer/online' },
  { re: /\b(prestige|max(?:imum)? level|level \d{2,})/i, minutes: 600, reason: 'Max level grind' },
];

// Patterns that suggest quick/easy
const QUICK_PATTERNS: Array<{ re: RegExp; minutes: number; reason: string }> = [
  { re: /\b(start|begin|launch|first time|tutorial|intro|prologue)/i, minutes: 5, reason: 'Tutorial / first-time' },
  { re: /\b(open|view|access)\s+(menu|map|inventory|settings)/i, minutes: 2, reason: 'Menu interaction' },
  { re: /\b(complete|finish)\s+(chapter 1|level 1|first)/i, minutes: 30, reason: 'Early-game milestone' },
  { re: /\b(welcome|hello|getting started)/i, minutes: 3, reason: 'Welcome achievement' },
];

interface ScoreInput {
  appid: number;
  gameName: string;
  apiname: string;
  displayName: string;
  description: string;
  hidden: boolean;
  icon: string;
  globalPercent: number;
  yourPlaytimeMinutes: number;
}

export function scoreAchievement(input: ScoreInput): ScoredAchievement {
  const text = `${input.displayName} ${input.description}`;

  // Start with global % as the primary signal
  // 90%+ = almost certainly trivial, 50% = moderate, <5% = hard/grindy
  let estimatedMinutes: number;
  let baseReason: string;

  if (input.globalPercent >= 80) {
    estimatedMinutes = 10;
    baseReason = `${input.globalPercent.toFixed(1)}% of players have it`;
  } else if (input.globalPercent >= 50) {
    estimatedMinutes = 45;
    baseReason = `${input.globalPercent.toFixed(1)}% common`;
  } else if (input.globalPercent >= 25) {
    estimatedMinutes = 120;
    baseReason = `${input.globalPercent.toFixed(1)}% uncommon`;
  } else if (input.globalPercent >= 10) {
    estimatedMinutes = 300;
    baseReason = `${input.globalPercent.toFixed(1)}% rare`;
  } else if (input.globalPercent >= 3) {
    estimatedMinutes = 600;
    baseReason = `${input.globalPercent.toFixed(1)}% very rare`;
  } else {
    estimatedMinutes = 1200;
    baseReason = `${input.globalPercent.toFixed(1)}% extremely rare`;
  }

  // Refine with text patterns
  let patternReason = '';
  for (const p of QUICK_PATTERNS) {
    if (p.re.test(text)) {
      estimatedMinutes = Math.min(estimatedMinutes, p.minutes);
      patternReason = p.reason;
      break;
    }
  }
  if (!patternReason) {
    for (const p of GRIND_PATTERNS) {
      if (p.re.test(text)) {
        estimatedMinutes = Math.max(estimatedMinutes, p.minutes);
        patternReason = p.reason;
        break;
      }
    }
  }

  // If you've already played a lot, very common achievements you don't have
  // are probably annoying for some reason — bump them up slightly
  if (input.yourPlaytimeMinutes > 600 && input.globalPercent > 70) {
    estimatedMinutes = Math.max(estimatedMinutes, 60);
    patternReason = patternReason || 'Common but you missed it - probably finicky';
  }

  // Difficulty 1-5 from final estimate
  let difficulty: 1 | 2 | 3 | 4 | 5;
  if (estimatedMinutes <= 15) difficulty = 1;
  else if (estimatedMinutes <= 60) difficulty = 2;
  else if (estimatedMinutes <= 240) difficulty = 3;
  else if (estimatedMinutes <= 600) difficulty = 4;
  else difficulty = 5;

  const reason = patternReason ? `${baseReason} · ${patternReason}` : baseReason;

  return {
    ...input,
    estimatedMinutes,
    difficulty,
    scoreReason: reason,
  };
}
