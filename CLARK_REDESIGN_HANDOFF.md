# Clark Index redesign: handoff

**Date:** 2026-10-12 · **Branch:** `main` (all work committed) · **Last commit:** `e64031a8`
**Read first:** `CLARK_OVERHAUL_PLAN.md` (the spec; §15 = LLM cost rules), then the mockups.

---

## 1. Where things stand

| Area | Status |
|---|---|
| P0 report fixes (validator, odds math, password reset, key players/injuries) | Done, committed (`76cc2a2f`) |
| Approved design | Static mockups in `primary-ui/public/mockups/` (open `http://localhost:8080/mockups`) |
| App shell (Rail, community bar, logo masthead, nav, phone tab bar, dark mode) | **Built** (`41b11e04`) |
| Games page | **Built** (`41b11e04`) |
| Game page | **Built** (`e64031a8`) |
| Home, landing, My season (+ settings tab), Leaderboard, Team/roster | Not started in React (mockups exist) |
| Live system P1 (`supabase/functions/live-sync`) | Function code written; **no `live_games`/`live_plays` tables, no cron, not deployed** |
| Chat, comments, polls, Fade Clark, head-to-head scoring, streaks, leaderboards | Backend not started |
| Clark Report in Clark's voice, in depth | Not started (pipeline work, see §5) |

Tests: `cd primary-ui && npx vitest run` → 323 passing. `npx tsc --noEmit -p tsconfig.app.json` is clean apart from pre-existing `import.meta.env` typing errors.

Run locally: dev server config `clark-index` in `.claude/launch.json` (`npm run dev --prefix primary-ui`, port 8080).

---

## 2. Decisions the owners made (don't relitigate)

- **Look:** The Athletic-style masthead + a rotating score ticker on every page; Sleeper-style functionality on the game page (tabs, live plays, chat beside the game), but **not** a Sleeper-style home. Playful, not corporate.
- **Brand:** their logo (`primary-ui/public/brand/clark-logo.jpg`, red circle with helmet + chart line). Brand red `#C8272D`. **Clark has his own red→orange gradient** (`--clark`) on everything that's his. Display font Montserrat 800/900, report body Newsreader, UI Inter. Light default, dark toggle.
- **Clark is personified** as a **"stats-nerd buddy"**: first person, friendly, excited about numbers, plain English, admits uncertainty ("Not a lock! If X, I'm wrong."). Reference report: `public/mockups/report.html`.
- **Reports must be in depth:** deciding matchup with stat tables + league ranks, both sides of the ball, players with injury impact on Clark's %, how the underdog wins, "what would change my mind", what the % means, Clark vs the line, numbers drawer.
- **NFL logos stay** (ESPN CDN via `getEspnLogoUrl`). The owners reversed the custom-badge idea after hearing the risk; revisit with a lawyer before monetizing.
- **Legal hygiene still in force:** no trademarked show names in UI ("Sunday night", not "Sunday Night Football"); the ticker is called **"The Rail"**; no fake player headshots; move live data off ESPN's unofficial API before monetizing.
- **Crew picks removed** from game/home. The founders ("the crew": Takuo/SEA, Nick/NYG, Zane/BUF, cropped from `public/founders/group.jpg`) appear only on the landing page.
- **LLM rule:** cheapest path always (see plan §15). Templates first; generate text once offline and cache; free tiers (Gemini Flash-Lite, backups Groq / Cloudflare Workers AI); nothing calls a model per page view.
- **Workflow:** build one page/feature, run the local preview, stop for the owner to review, continue on "continue". Commit per step (conventional commits).

---

## 3. Code map (new pieces)

```
primary-ui/src/
  styles/tokens.css          design tokens (+ legacy aliases so old components still render)
  styles/shell.css           shell, spark slider, toast, clark-tag/card, Games page, game page styles
  lib/theme.ts (+test)       light/dark/system preference; index.html applies it before first paint
  lib/rail.ts (+test)        Rail items, week facts for the community bar, per-week user records
  lib/fx.ts                  confetti(colors,x,y) and toast(text,img)
  hooks/useTheme.ts, hooks/useCurrentWeekGames.ts
  hooks/useGamePick.ts       now also exposes lockAs(pick) (same sign-up gate as lock)
  components/Header.tsx      Rail + CommunityBar + masthead + section nav + MobileTabBar
  components/shell/ScoreRail.tsx, CommunityBar.tsx
  components/layout/nav.ts (+test), MobileTabBar.tsx, PageShell.tsx, Card.tsx
  components/picks/SparkSlider.tsx (+test)   team-logo thumb, team-color sparks, pointer capture
  components/games/GamesView.tsx, GameRow.tsx  scoreboard rows, in-row pick
  components/game/GameView.tsx, GameHeader.tsx, WinProbChart.tsx
  pages/TeamsPage.tsx, LeaderboardPage.tsx (placeholder), MockupsRedirect.tsx
  data/teams.ts (+test)      32 teams with city/name/division
```

Old components (`GameReport.tsx`, `GameCard.tsx`, `SlateSection.tsx`, `LeadGame` removed, landing/home components) still exist; the ones not yet replaced render through the legacy token aliases. Delete them as each page is rebuilt.

Mockup source of truth: `public/mockups/{index,home,games,game,report,landing,my-season,leaderboard,team}.html`, shared `mock.css`, `mock.js` (header, ticker, slider), `features.js` (chat extras, play-by-play extras, Fade/Ask Clark, h2h, confession, Wrapped), `game-data.js`.

---

## 4. Next steps, in order

1. **Home** (signed in): front-page layout from `mockups/home.html` with the Clark Report as the lead story, live strip/big plays (placeholders until P1), Your week, fanbase standings, Clark says card, Clark's confession item.
2. **Landing** (signed out): `mockups/landing.html`: logo hero, gated report preview, 3 steps, Clark's record strip, "Meet the crew".
3. **My season** with Overview / Picks / Settings tabs (`mockups/my-season.html`); move the existing Settings page into the Settings tab.
4. **Leaderboard** and **Team** pages (need data; see P4/P5 in the plan).
5. **Data/pipeline:** the in-depth Clark Report in Clark's voice (§5), season records (`home_season_record`/`away_season_record` are null), player stats with league ranks.
6. **Backend P1/P2:** migration for `live_games`, `live_plays`, `results`, `chat_messages`, `comments`, polls; deploy `live-sync` + cron; then wire the Live and Chat tabs and the small features.

---

## 5. Clark Report generation (plan, not built)

In `nfl-prediction/src/export_predictions.py`: after computing factors, build a compact JSON of the game's stats (ranks, matchup tables, injuries) and ask Gemini Flash-Lite (free tier) for the report in Clark's voice using **only** those numbers; store as new fields in `predictions.json` (e.g. `clark_report: {headline, dek, sections[]}`). Validate every number in the output against the input before accepting (extend `validate_report.py`); on failure or quota, fall back to templates written in Clark's voice. ~272 calls per season, which is well within the free tier.

---

## 6. Known issues / gotchas

- `--accent` is shadcn's HSL variable; the brand color token is `--brand`. Don't reuse `--accent`.
- `/mockups` is caught by the SPA router; `MockupsRedirect` sends it to `/mockups/index.html`.
- The browser preview pane is often "hidden", which pauses CSS animations and blocks `scrollIntoView` in screenshots; verify via DOM queries when that happens.
- Grid children need `minmax(0, 1fr)` or they overflow on phones (fixed on Games and game page; watch for it on new pages).
- `FoundersPortrait.tsx` logs a React warning for `fetchPriority`; harmless, fix when the landing page is rebuilt.
- Supabase: see the memory note on schema drift; `supabase/README.md` covers migrations (`npx supabase db push`).
- Session cost was high (~$265); the owner asked earlier to keep work lean: one page per step, no parallel agents.
