# Achiever

A personal Steam achievement hunting log. Surfaces the easiest unlocked achievements across your library so you can knock a few out daily.

## How it works

1. Pulls your owned games via the Steam Web API
2. For each played game, fetches the achievement schema, your unlocks, and the global unlock %
3. Scores every locked achievement via heuristic (global % + name/description patterns)
4. Optionally refines the top candidates through Claude for sharper time estimates
5. Sorts by estimated time, surfaces a "today's hunt" of 4 quick picks across different games

Everything is cached locally in SQLite so you don't hammer the Steam API.

## Setup

```bash
npm install
cp .env.local.example .env.local
# edit .env.local with your STEAM_API_KEY (and optionally ANTHROPIC_API_KEY)
npm run dev
```

Open http://localhost:3000.

## Required

- **Steam API key** — free at https://steamcommunity.com/dev/apikey
- **Public Steam profile** — your profile and game details must be set to public, or the achievement endpoints return 403
- **Your SteamID64** — the 17-digit number, not the vanity URL. Find it at https://steamid.io

## Optional

- **Anthropic API key** — enables the AI refinement pass, which gives sharper estimates for the top ~30 candidates per load. Costs cents per refresh, results cached for 30 days.

## Notes

- First load is slow (one schema fetch per game). Subsequent loads hit the cache.
- "Refresh data" clears the player-state cache (your unlocks, owned games) but keeps schemas.
- Cache lives at `.cache/steam.db`. Delete the directory to fully reset.
- Heuristic estimates are rough. AI-refined ones are marked but still not gospel.

## Project structure

```
src/
  app/
    page.tsx          - main dashboard
    actions.ts        - server actions
    layout.tsx        - root layout
    globals.css       - design system
  components/
    SteamIdForm.tsx   - empty-state form
    Filters.tsx       - time/game/search filters + today's hunt picker
    AchievementCard.tsx
    Difficulty.tsx
  lib/
    steam-client.ts   - Steam API wrapper
    steam-types.ts    - response types
    cache.ts          - SQLite cache
    scorer.ts         - heuristic scoring
    aggregator.ts     - orchestrates everything
    llm-refiner.ts    - Claude-based refinement
```
