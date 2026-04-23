import Anthropic from '@anthropic-ai/sdk';
import type { ScoredAchievement } from './steam-types';
import { cacheGet, cacheSet } from './cache';

const REFINE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days - LLM judgments are stable

interface LlmJudgement {
  estimatedMinutes: number;
  difficulty: 1 | 2 | 3 | 4 | 5;
  reason: string;
  requiresDLC?: boolean;
}

export async function refineWithLlm(
  achievements: ScoredAchievement[],
  signal?: AbortSignal,
): Promise<ScoredAchievement[]> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key || key === 'your_anthropic_key_here') {
    return achievements; // silent no-op
  }

  const client = new Anthropic({ apiKey: key });

  // Only refine the top candidates - those with low estimated time but ambiguous signal
  // (saves tokens, focuses LLM on the actually-useful picks)
  const candidates = achievements
    .filter((a) => a.estimatedMinutes <= 120 && !a.llmRefined)
    .slice(0, 30);

  if (candidates.length === 0) return achievements;

  // Check cache first
  const toQuery: ScoredAchievement[] = [];
  const cachedJudgements = new Map<string, LlmJudgement>();
  for (const c of candidates) {
    const ck = `llm3:${c.appid}:${c.apiname}`;
    const hit = await cacheGet<LlmJudgement>(ck, REFINE_TTL);
    if (hit) cachedJudgements.set(ck, hit);
    else toQuery.push(c);
  }

  if (toQuery.length > 0) {
    // Batch into one prompt to save round-trips
    const items = toQuery.map((a, i) => ({
      i,
      game: a.gameName,
      name: a.displayName,
      desc: a.description || '(no description)',
      globalPct: a.globalPercent,
    }));

    const prompt = `You are an expert on Steam achievements. For each achievement below, estimate:
1. estimatedMinutes: realistic time for an average player who already owns/plays the game to unlock it (focused effort, not idle play)
2. difficulty: 1-5 (1=trivial menu click, 2=15min task, 3=hour-ish session, 4=skill or grind, 5=brutal)
3. reason: 8 words max, why
4. requiresDLC: true if the achievement is locked behind a paid DLC/expansion the base game owner wouldn't have (e.g. story DLCs, song packs, content packs). false otherwise. Be conservative — only flag true if you're confident.

Respond with a JSON array, one object per achievement, in the same order. No prose, no markdown fences.

Achievements:
${JSON.stringify(items, null, 2)}`;

    try {
      const res = await client.messages.create(
        {
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 4000,
          messages: [{ role: 'user', content: prompt }],
        },
        { signal },
      );

      const text = res.content
        .filter((b) => b.type === 'text')
        .map((b) => (b as { text: string }).text)
        .join('');

      const cleaned = text.replace(/```json\s*|\s*```/g, '').trim();
      const judgements = JSON.parse(cleaned) as LlmJudgement[];

      for (let i = 0; i < toQuery.length; i++) {
        const j = judgements[i];
        if (!j) continue;
        const ck = `llm3:${toQuery[i].appid}:${toQuery[i].apiname}`;
        await cacheSet(ck, j);
        cachedJudgements.set(ck, j);
      }
    } catch (e) {
      console.error('LLM refinement failed:', e);
      // fall through with whatever we cached
    }
  }

  // Apply judgements
  return achievements.map((a) => {
    const ck = `llm3:${a.appid}:${a.apiname}`;
    const j = cachedJudgements.get(ck);
    if (!j) return a;
    return {
      ...a,
      estimatedMinutes: j.estimatedMinutes,
      difficulty: j.difficulty,
      scoreReason: `AI: ${j.reason}`,
      llmRefined: true,
      requiresDLC: j.requiresDLC ?? false,
    };
  });
}
